-- Segurança, onda 2: assinatura e minutos de Live Voice deixam de ser decididos pelo app.
-- Assinatura: só o servidor grava (webhooks das lojas e do site, /api/subscription/sync). Do app, a mudança é
-- ignorada em silêncio (versões antigas do app ainda tentam gravar e não podem dar erro na tela).
-- Live Voice: o uso só cresce; zerar só na virada do mês (data de reset avançando até hoje, nunca no futuro).
create or replace function charlotte.guard_user_update() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.is_institutional is distinct from old.is_institutional
     or new.is_admin is distinct from old.is_admin
     or new.beta_features is distinct from old.beta_features
     or new.trial_ends_at is distinct from old.trial_ends_at
     or new.hide_from_ranking is distinct from old.hide_from_ranking
     or new.email is distinct from old.email
     or new.created_at is distinct from old.created_at
     or new.signup_welcome_sent_at is distinct from old.signup_welcome_sent_at
     or new.trial_welcome_sent_at is distinct from old.trial_welcome_sent_at
     or coalesce(new.live_voice_bonus_seconds, 0) > coalesce(old.live_voice_bonus_seconds, 0) then
    raise exception 'campo protegido da conta';
  end if;

  new.subscription_status     := old.subscription_status;
  new.subscription_product    := old.subscription_product;
  new.subscription_expires_at := old.subscription_expires_at;
  new.is_active               := old.is_active;

  if new.live_voice_reset_date is distinct from old.live_voice_reset_date
     and (new.live_voice_reset_date is null
          or new.live_voice_reset_date > current_date + 1
          or new.live_voice_reset_date <= coalesce(old.live_voice_reset_date, '1900-01-01'::date)) then
    new.live_voice_reset_date := old.live_voice_reset_date;
  end if;
  if coalesce(new.live_voice_seconds_used, 0) < coalesce(old.live_voice_seconds_used, 0)
     and not (new.live_voice_reset_date is distinct from old.live_voice_reset_date and coalesce(new.live_voice_seconds_used, 0) = 0) then
    new.live_voice_seconds_used := old.live_voice_seconds_used;
  end if;
  return new;
end $$;
