-- สถานะห้องเกม: อ่านเขียนได้เฉพาะ Edge Function "game" (เปิด RLS โดยไม่มี policy ให้ anon/authenticated)
create table public.rooms (
  code text primary key,
  game text not null,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.rooms enable row level security;
