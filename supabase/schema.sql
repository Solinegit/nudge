create table if not exists public.answer_stats (
  quote_id integer not null check (quote_id > 0),
  candidate_id text not null check (
    candidate_id in (
      'melenchon',
      'tondelier',
      'attal',
      'edouard-philippe',
      'retailleau',
      'le-pen'
    )
  ),
  answer_count bigint not null default 0 check (answer_count >= 0),
  primary key (quote_id, candidate_id)
);

alter table public.answer_stats enable row level security;

revoke all on public.answer_stats from anon, authenticated;
grant select on public.answer_stats to anon, authenticated;

drop policy if exists "Anyone can read aggregate answer counts" on public.answer_stats;
create policy "Anyone can read aggregate answer counts"
  on public.answer_stats
  for select
  to anon, authenticated
  using (true);

create or replace function public.record_answer(p_quote_id integer, p_candidate_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_quote_id is null or p_quote_id <= 0 then
    raise exception 'Invalid quote id';
  end if;

  insert into public.answer_stats as stats (quote_id, candidate_id, answer_count)
  values (p_quote_id, p_candidate_id, 1)
  on conflict (quote_id, candidate_id)
  do update set answer_count = stats.answer_count + 1;
end;
$$;

revoke all on function public.record_answer(integer, text) from public;
grant execute on function public.record_answer(integer, text) to anon, authenticated;
