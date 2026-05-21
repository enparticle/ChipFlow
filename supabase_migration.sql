-- enCELL Master — Supabase SQL Editor에서 실행하세요
-- 여러 사람이 입력한 실험 데이터를 클라우드에 쌓는 테이블

create table if not exists experimental_logs (
  id               bigserial primary key,
  timestamp        timestamptz default now(),
  chip_id          text not null,
  p1_set real, p2_set real, p3_set real, duration real,
  temp_device real, temp_ambient real,
  m1_loading real, m2_loading real, m3_loading real,
  m1_final real, m2_final real, m3_final real,
  k1 real, k2 real, kout real, alpha real,
  c_eth real, c_wat real, loss_const real, p_offset real,
  q1_pred real, q2_pred real, q3_pred real,
  q1_actual real, q2_actual real, q3_actual real,
  final_volume1_uL real, final_volume2_uL real, final_total_uL real,
  act_volume1_uL real, act_volume2_uL real,
  branch text, champion_name text,
  fluid1 text, fluid2 text
);

create index if not exists idx_logs_chip on experimental_logs(chip_id);
create index if not exists idx_logs_ts   on experimental_logs(timestamp desc);

-- RLS: anon 읽기/쓰기 허용 (내부 팀 도구용)
alter table experimental_logs enable row level security;
create policy "allow all" on experimental_logs for all using (true) with check (true);
