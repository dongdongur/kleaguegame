-- ============================================================
-- K-레전드 38 친구 기록 DB 설정 (Supabase)
-- 사용법: Supabase 대시보드 > 왼쪽 메뉴 "SQL Editor" > "New query" 에
--         이 파일 내용을 통째로 붙여넣고 오른쪽 아래 "Run" 을 누르세요.
-- 몇 번 실행해도 안전해요. (이미 있는 건 건너뛰고 빠진 것만 추가해요)
-- ============================================================

-- 1) 시즌 결과 표
create table if not exists public.results (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  nickname   text not null check (char_length(nickname) between 1 and 12),
  team_name  text not null check (char_length(team_name) between 1 and 14),
  form       text not null check (form in ('4-3-3','4-4-2','3-5-2','4-2-3-1','4-1-4-1','4-4-1-1','4-3-2-1','4-1-2-1-2','3-4-3','3-4-2-1','5-3-2','5-4-1')),
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

-- 2) 새로 추가된 항목 (난이도, 시즌 번호, 친구 맞대결용 선수단 정보)
alter table public.results add column if not exists diff   text not null default 'easy' check (diff in ('easy','hard'));
alter table public.results add column if not exists season smallint not null default 1 check (season between 1 and 99);
alter table public.results add column if not exists team   jsonb;

-- 포메이션이 12종으로 늘어서, 예전에 만든 표에 걸려 있던 4종 제한을 풀어줘요
alter table public.results drop constraint if exists results_form_check;
alter table public.results add constraint results_form_check
  check (form in ('4-3-3','4-4-2','3-5-2','4-2-3-1','4-1-4-1','4-4-1-1','4-3-2-1','4-1-2-1-2','3-4-3','3-4-2-1','5-3-2','5-4-1'));

-- 3) 친구 맞대결 기록 표
create table if not exists public.duels (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  challenger  text not null check (char_length(challenger) between 1 and 12),
  defender_id bigint not null references public.results(id) on delete cascade,
  cg smallint not null check (cg between 0 and 30),
  dg smallint not null check (dg between 0 and 30),
  winner text not null check (winner in ('challenger','defender'))
);

-- 4) 권한: 누구나 읽기/쓰기만 가능. 수정과 삭제는 대시보드에서만 할 수 있어요.
alter table public.results enable row level security;
alter table public.duels   enable row level security;

drop policy if exists "results read"   on public.results;
drop policy if exists "results insert" on public.results;
create policy "results read"   on public.results for select to anon using (true);
create policy "results insert" on public.results for insert to anon with check (true);

drop policy if exists "duels read"   on public.duels;
drop policy if exists "duels insert" on public.duels;
create policy "duels read"   on public.duels for select to anon using (true);
create policy "duels insert" on public.duels for insert to anon with check (true);

grant select, insert on public.results to anon;
grant select, insert on public.duels   to anon;


-- 5) 선수 키우기(K-라이프) 명예의 전당: 은퇴한 선수 기록을 서버에 올려 친구와 비교해요
create table if not exists public.life_hof (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  nickname    text not null check (char_length(nickname) between 1 and 12),
  name        text not null check (char_length(name) between 1 and 12),
  pos         text not null,
  type_name   text,
  club        text,
  years       smallint not null default 0,
  apps        int not null default 0,
  goals       int not null default 0,
  assists     int not null default 0,
  caps        int not null default 0,
  trophies    smallint not null default 0,
  awards      smallint not null default 0,
  ballon      smallint not null default 0,
  ballon_cand smallint not null default 0,
  wc          smallint not null default 0,
  peak        smallint not null default 0,
  cs          int not null default 0,
  score       int not null default 0,
  grade       text,
  jersey      smallint not null default 0
);
alter table public.life_hof enable row level security;
drop policy if exists "life_hof read"   on public.life_hof;
drop policy if exists "life_hof insert" on public.life_hof;
create policy "life_hof read"   on public.life_hof for select to anon using (true);
create policy "life_hof insert" on public.life_hof for insert to anon with check (true);
grant select, insert on public.life_hof to anon;


-- 6) 영구결번 현황(메인 화면 왼쪽 표시용): 어느 구단의 몇 번이 영구결번이 되었는지
alter table public.life_hof add column if not exists jerseys jsonb;
