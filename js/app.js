// Nudge — logique du jeu
// Les données (candidats, thèmes, citations) sont chargées depuis data/programmes.json,
// un fichier séparé et modifiable sans toucher au code.

const DATA_URL = "data/programmes.json";
const SCORE_STORAGE_KEY = "nudge-score-v1";

// --- État global ---
let data = null;            // contenu de programmes.json
let currentQuote = null;    // citation en cours de jeu
let answered = false;        // a-t-on répondu à la citation en cours ?
let statsRequestId = 0;
let selectedCandidateId = null;
const score = loadScore();

// --- Éléments DOM ---
const screens = {
  accueil: document.getElementById("ecran-accueil"),
  jeu: document.getElementById("ecran-jeu"),
  revelation: document.getElementById("ecran-revelation"),
};

const els = {
  themeBadge: document.getElementById("theme-badge"),
  citation: document.getElementById("citation"),
  candidats: document.getElementById("candidats"),
  score: document.getElementById("score"),
  scoreReveal: document.getElementById("score-reveal"),
  answerResult: document.getElementById("answer-result"),
  statsStatus: document.getElementById("stats-status"),
  revealTheme: document.getElementById("reveal-theme"),
  comparaison: document.getElementById("comparaison"),
};

// --- Utilitaires ---
function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

function themeById(id) {
  return data.themes.find((t) => t.id === id);
}

function candidateById(id) {
  return data.candidats.find((c) => c.id === id);
}

function quotesFor(themeId, candidateId) {
  return data.citations.filter(
    (c) => c.theme === themeId && c.candidat === candidateId
  );
}

function loadScore() {
  try {
    const saved = JSON.parse(localStorage.getItem(SCORE_STORAGE_KEY));
    if (saved && Number.isSafeInteger(saved.correct) && Number.isSafeInteger(saved.answered)
      && saved.correct >= 0 && saved.answered >= saved.correct) {
      return { correct: saved.correct, answered: saved.answered };
    }
  } catch (e) {
    // Storage may be unavailable; the score still works for this page session.
  }
  return { correct: 0, answered: 0 };
}

function saveScore() {
  try {
    localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(score));
  } catch (e) {
    // Keep the in-memory score if persistent storage is unavailable.
  }
}

function renderScore() {
  const percent = score.answered ? Math.round((score.correct / score.answered) * 100) : 0;
  const value = score.correct + " / " + score.answered + " · " + percent + "%";
  els.score.textContent = value;
  els.scoreReveal.textContent = value;
}

function getStatsConfig() {
  const config = window.NUDGE_STATS_CONFIG || {};
  const supabaseUrl = typeof config.supabaseUrl === "string"
    ? config.supabaseUrl.trim().replace(/\/+$/, "")
    : "";
  const supabaseAnonKey = typeof config.supabaseAnonKey === "string"
    ? config.supabaseAnonKey.trim()
    : "";
  return supabaseUrl && supabaseAnonKey ? { supabaseUrl, supabaseAnonKey } : null;
}

async function supabaseRequest(config, resource, options = {}) {
  const response = await fetch(config.supabaseUrl + "/rest/v1/" + resource, {
    ...options,
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: "Bearer " + config.supabaseAnonKey,
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error("Statistiques indisponibles");
  return response;
}

async function loadAndRenderStats(quoteId, chosenId) {
  const requestId = ++statsRequestId;
  const config = getStatsConfig();
  if (!config) {
    els.statsStatus.textContent = "Les statistiques partagées ne sont pas configurées.";
    return;
  }

  try {
    await supabaseRequest(config, "rpc/record_answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_quote_id: quoteId, p_candidate_id: chosenId }),
    });

    const query = new URLSearchParams({
      select: "candidate_id,answer_count",
      quote_id: "eq." + quoteId,
    });
    const response = await supabaseRequest(config, "answer_stats?" + query.toString());
    if (requestId !== statsRequestId) return;
    renderAnswerStats(await response.json());
  } catch (e) {
    if (requestId === statsRequestId) {
      els.statsStatus.textContent = "Les statistiques partagées sont indisponibles pour le moment.";
    }
  }
}

function renderAnswerStats(rows) {
  const counts = new Map(rows.map((row) => [row.candidate_id, Math.max(0, Number(row.answer_count) || 0)]));
  const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
  els.statsStatus.textContent = "";

  document.querySelectorAll(".stats-percent").forEach((share) => {
    const candidate = candidateById(share.dataset.candidateId);
    if (!candidate) return;
    const count = counts.get(candidate.id) || 0;
    const percent = total ? Math.round((count / total) * 100) : 0;
    share.textContent = percent + "%";
    share.setAttribute("aria-label", percent + " % des joueurs ont choisi " + candidate.nom);
    share.classList.remove("hidden");
  });
}

// Mélange de Fisher-Yates (non destructif)
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- Chargement des données ---
async function loadData() {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error("Impossible de charger les données (" + res.status + ")");
  data = await res.json();
}

// --- Écran de jeu ---
function startRound() {
  statsRequestId += 1;
  answered = false;
  selectedCandidateId = null;
  currentQuote = shuffle(data.citations)[0];

  const theme = themeById(currentQuote.theme);
  els.themeBadge.textContent = theme ? theme.nom : "";
  els.citation.textContent = "« " + currentQuote.texte + " »";

  els.statsStatus.textContent = "";
  document.querySelectorAll(".stats-percent").forEach((share) => {
    share.classList.add("hidden");
    share.textContent = "";
  });
  renderCandidates();
  showScreen("jeu");
}

function renderCandidates() {
  els.candidats.innerHTML = "";
  // Classés de gauche à droite (ordre de l'Assemblée) = position croissante
  const ordered = data.candidats.slice().sort((a, b) => a.position - b.position);
  ordered.forEach((cand) => {
    const btn = document.createElement("button");
    btn.className = "candidat";
    btn.dataset.id = cand.id;

    const nom = document.createElement("span");
    nom.className = "nom";
    nom.textContent = cand.nom;

    const parti = document.createElement("span");
    parti.className = "parti";
    parti.textContent = cand.parti;

    btn.appendChild(nom);
    btn.appendChild(parti);
    btn.addEventListener("click", () => answer(cand.id));
    els.candidats.appendChild(btn);
  });
}

function answer(chosenId) {
  if (answered) return;
  answered = true;

  selectedCandidateId = chosenId;
  const correctId = currentQuote.candidat;
  const correctCand = candidateById(correctId);
  const isCorrect = chosenId === correctId;

  score.answered += 1;
  if (isCorrect) score.correct += 1;
  saveScore();
  renderScore();

  els.statsStatus.textContent = "Chargement des réponses...";
  els.answerResult.textContent = isCorrect
    ? "Bonne réponse : " + correctCand.nom + "."
    : "Votre choix : " + candidateById(chosenId).nom + " · Bonne réponse : " + correctCand.nom + ".";
  els.answerResult.className = "answer-result " + (isCorrect ? "good" : "bad");

  openComparison();
  loadAndRenderStats(currentQuote.id, chosenId);
}

// --- Écran de révélation / comparaison ---
function openComparison() {
  const theme = themeById(currentQuote.theme);
  els.revealTheme.textContent = theme ? theme.nom : "";

  els.comparaison.innerHTML = "";
  const ordered = data.candidats.slice().sort((a, b) => a.position - b.position);

  ordered.forEach((cand) => {
    const quote = quotesFor(currentQuote.theme, cand.id)[0];
    if (!quote) return; // pas de citation pour ce candidat/thème

    const card = document.createElement("article");
    card.className = "carte";
    card.dataset.candidateId = cand.id;
    const isCorrect = cand.id === currentQuote.candidat;
    const isSelected = cand.id === selectedCandidateId;
    if (isCorrect) card.classList.add("surbrillance");
    if (isSelected) card.classList.add("choix-joueur");

    const entete = document.createElement("div");
    entete.className = "entete";
    const nom = document.createElement("span");
    nom.className = "nom";
    nom.textContent = cand.nom + " — " + cand.parti;
    entete.appendChild(nom);

    const markers = document.createElement("span");
    markers.className = "carte-marqueurs";
    if (isSelected) {
      const selectedMarker = document.createElement("span");
      selectedMarker.className = "marqueur marqueur-choix";
      selectedMarker.textContent = "Votre choix";
      markers.appendChild(selectedMarker);
    }
    if (isCorrect) {
      const correctMarker = document.createElement("span");
      correctMarker.className = "marqueur marqueur-bonne-reponse";
      correctMarker.textContent = "Bonne réponse";
      markers.appendChild(correctMarker);
    }
    if (markers.childElementCount) entete.appendChild(markers);

    const link = document.createElement("a");
    link.href = cand.programme.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Voir le programme ↗";
    entete.appendChild(link);

    card.appendChild(entete);

    const extrait = document.createElement("div");
    extrait.className = "carte-extrait";
    const bq = document.createElement("blockquote");
    bq.textContent = "« " + quote.texte + " »";
    extrait.appendChild(bq);

    const share = document.createElement("span");
    share.className = "stats-percent hidden";
    share.dataset.candidateId = cand.id;
    extrait.appendChild(share);
    card.appendChild(extrait);

    const src = quote.source || {};
    if (src.document) {
      const s = document.createElement("p");
      s.className = "src";
      s.innerHTML =
        "Source : " + src.document +
        (src.section ? " — " + src.section : "") +
        (src.url ? ' <a href="' + src.url + '" target="_blank" rel="noopener">(lien)</a>' : "");
      card.appendChild(s);
    }

    els.comparaison.appendChild(card);
  });

  showScreen("revelation");
}

// --- Initialisation ---
async function init() {
  try {
    await loadData();
  } catch (e) {
    document.body.innerHTML =
      '<div style="padding:40px;font-family:sans-serif;color:#e8eaf0">' +
      "Erreur de chargement des données : " + e.message +
      "<br><br>Pour tester en local, lancez un serveur : <code>python3 -m http.server</code>" +
      "</div>";
    return;
  }

  document.getElementById("btn-jouer").addEventListener("click", startRound);
  document.getElementById("btn-retour-jeu").addEventListener("click", startRound);
  renderScore();
}

init();
