-- Comentários em posts antigos: o cron só olhava os posts dos últimos 7 dias, e comentário novo em post
-- mais velho ficava sem resposta (19/11/2026). Agora confere de hora em hora quantos comentários cada
-- post de até 90 dias tem e só busca os posts em que o número subiu.
alter table public.instagram_posts
  add column if not exists comments_count int,              -- último total visto na Meta
  add column if not exists comments_checked_at timestamptz; -- última conferência dos posts antigos
