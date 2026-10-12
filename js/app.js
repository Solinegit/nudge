// Nudge — logique du jeu
// Les données (candidats, thèmes, citations) sont chargées depuis data/programmes.json,
// un fichier séparé et modifiable sans toucher au code.

const DATA_URL = "data/programmes.json";

// --- État global ---
let data = null;            // contenu de programmes.json
let currentQuote = null;    // citation en cours de jeu
let answered = false;        // a-t-on répondu à la citation en cours ?

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
  feedback: document.getElementById("feedback"),
  btnSuivant: document.getElementById("btn-suivant"),
  btnComparer: document.getElementById("btn-comparer"),
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
  answered = false;
  currentQuote = shuffle(data.citations)[0];

  const theme = themeById(currentQuote.theme);
  els.themeBadge.textContent = theme ? theme.nom : "";
  els.citation.textContent = "« " + currentQuote.texte + " »";

  // Réinitialise le feedback (masqué, boutons cachés)
  els.feedback.classList.add("hidden");
  els.feedback.classList.remove("good", "bad");
  els.feedback.innerHTML = "";
  els.btnSuivant.classList.add("hidden");
  els.btnComparer.classList.add("hidden");

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

    const bord = document.createElement("span");
    bord.className = "bord";
    bord.textContent = cand.bord + " · " + cand.parti;

    btn.appendChild(nom);
    btn.appendChild(bord);
    btn.addEventListener("click", () => answer(cand.id));
    els.candidats.appendChild(btn);
  });
}

function answer(chosenId) {
  if (answered) return;
  answered = true;

  const correctId = currentQuote.candidat;
  const correctCand = candidateById(correctId);
  const isCorrect = chosenId === correctId;

  // Marque les boutons
  document.querySelectorAll(".candidat").forEach((b) => {
    b.disabled = true;
    if (b.dataset.id === correctId) b.classList.add("correct");
    else if (b.dataset.id === chosenId) b.classList.add("wrong");
    else b.classList.add("dimmed");
  });

  // Construit le feedback
  const src = currentQuote.source || {};

  const verdict = document.createElement("div");
  verdict.className = "verdict";
  verdict.textContent = isCorrect ? "Bien joué !" : "Ce n'était pas lui·elle.";
  els.feedback.appendChild(verdict);

  const reveal = document.createElement("p");
  reveal.className = "reveal";
  reveal.innerHTML =
    "Cet extrait est de <strong>" + correctCand.nom + "</strong> (" +
    correctCand.parti + ").";
  els.feedback.appendChild(reveal);

  const source = document.createElement("p");
  source.className = "source";
  const srcLabel = src.document ? src.document : "Programme";
  const srcSection = src.section ? " — " + src.section : "";
  const srcLink = src.url
    ? ' <a href="' + src.url + '" target="_blank" rel="noopener">Voir le programme</a>'
    : "";
  source.innerHTML = "Source : " + srcLabel + srcSection + srcLink;
  els.feedback.appendChild(source);

  // Boutons d'action
  els.btnComparer.classList.remove("hidden");
  els.btnSuivant.classList.remove("hidden");

  els.feedback.classList.remove("hidden");
  els.feedback.classList.add(isCorrect ? "good" : "bad");
}

function nextRound() {
  startRound();
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
    card.className = "carte" + (cand.id === currentQuote.candidat ? " surbrillance" : "");

    const entete = document.createElement("div");
    entete.className = "entete";
    const nom = document.createElement("span");
    nom.className = "nom";
    nom.textContent = cand.nom + " — " + cand.parti;
    entete.appendChild(nom);

    const link = document.createElement("a");
    link.href = cand.programme.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Voir le programme ↗";
    entete.appendChild(link);

    card.appendChild(entete);

    const bq = document.createElement("blockquote");
    bq.textContent = "« " + quote.texte + " »";
    card.appendChild(bq);

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
  els.btnSuivant.addEventListener("click", nextRound);
  els.btnComparer.addEventListener("click", openComparison);
  document.getElementById("btn-retour-jeu").addEventListener("click", startRound);
}

init();
