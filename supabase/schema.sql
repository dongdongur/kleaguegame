-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run 하세요. (한 번만)

create table if not exists public.results (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  nickname   text not null check (char_length(nickname) between 1 and 12),
  team_name  text not null check (char_length(team_name) between 1 and 14),
  form       text not null check (form in ('4-3-3','4-4-2','3-5-2','4-2-3-1')),
  mode       text not null check (mode in ('team','pos')),
  manager    text check (manager is null or char_length(manager) <= 20),
  w   smallint not null check (w   between 0 and 38),
  d   smallint not null check (d   between 0 and 38),
  l   smallint not null check (l   between 0 and 38),
  pts smallint not null check (pts between 0 and 114),
  gf  smallint not null check (gf  between 0 and 300),
  ga  smallint not null check (ga  between 0 and 300),
  rank smallint not null check (rank between 1 and 20),
  xi  text[] not null check (array_length(xi, 1) = 11)
);

alter table public.results enable row level security;

-- 누구나 읽기/쓰기만 가능. 수정과 삭제는 대시보드에서만 할 수 있어요.
drop policy if exists "results read"   on public.results;
drop policy if exists "results insert" on public.results;
create policy "results read"   on public.results for select to anon using (true);
create policy "results insert" on public.results for insert to anon with check (true);

grant select, insert on public.results to anon;

-- 상대 난이도(쉬움/어려움) 컬럼 추가. 이미 위 표가 만들어져 있어도 이 부분만 다시 실행하면 돼요.
alter table public.results add column if not exists diff text not null default 'easy' check (diff in ('easy','hard'));
