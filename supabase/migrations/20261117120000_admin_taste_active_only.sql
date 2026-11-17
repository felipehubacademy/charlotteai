-- /admin: o card "Degustação" conta só quem ainda está nos 5 dias (pode converter com as ofertas da degustação).
-- Quem passou dos 5 dias sem teste nem assinatura vai para "Sem acesso" (tasteEnded mostra quantos são).
-- Dia da degustação igual ao app (lib/taste.ts tasteDay): calendário de Brasília, contado a partir do cadastro
-- ou de 27/10/2026 (dia 20753), o que vier depois; dias 1 a 5 = ativa.
CREATE OR REPLACE FUNCTION public.admin_overview_users(p_now_ms bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with f as (
    select *, taster and greatest(created_day, 20753) >= (p_now_ms - 10800000) / 86400000 - 4 as taste_on
    from public.admin_account_facts(p_now_ms, true)
  )
  select jsonb_build_object(
    'total', count(*),
    'newToday', count(*) filter (where created_day = (p_now_ms - 10800000) / 86400000),
    'new30d', count(*) filter (where created_day >= (p_now_ms - 10800000) / 86400000 - 29),
    'taste', count(*) filter (where taste_on),
    'tasteEnded', count(*) filter (where taster and not taste_on),
    'trial', count(*) filter (where not taster and trial_kind),
    'trialCancelled', count(*) filter (where not taster and trial_kind and subscription_status = 'cancelled'),
    'trialStore', count(*) filter (where not taster and trial_kind and kind = 'trial_store'),
    'trialSite', count(*) filter (where not taster and trial_kind and kind = 'trial_site'),
    'trialLegacy', count(*) filter (where not taster and trial_kind and kind = 'trial_legacy'),
    'paying', count(*) filter (where not taster and paid_kind),
    'payingCancelled', count(*) filter (where not taster and paid_kind and subscription_status = 'cancelled'),
    'noAccess', count(*) filter (where (taster and not taste_on) or (not taster and not trial_kind and not paid_kind))
  )
  from f
$function$;
