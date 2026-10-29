-- Relatório diário de custos de IA (e-mail às 8h): valor real da OpenAI no dia anterior e créditos
-- da ElevenLabs no ciclo. Uma linha por dia (garante um e-mail só) e histórico para a projeção.
create table if not exists ai_cost_daily (
  day date primary key,
  openai_usd numeric,
  openai_lines jsonb,
  eleven_used integer,
  eleven_limit integer,
  eleven_reset_at timestamptz,
  alerts text[],
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
alter table ai_cost_daily enable row level security;
