-- Assinatura pelo site (subscription_product 'web_*') ainda válida não pode ser rebaixada pelo app.
-- Versões antigas do app (antes da atualização chegar) conferiam só as lojas e gravavam 'expired' por cima
-- de quem assinou pelo site (caso real em 2026-10-20). Só o servidor (webhook do Asaas, reembolso,
-- cancelamento, admin) mexe nessa assinatura; o que vier do app com a sessão do aluno é ignorado.
create or replace function public.protect_web_subscription() returns trigger
language plpgsql security definer set search_path = public, charlotte as $$
begin
  if auth.role() = 'authenticated'
     and old.subscription_product like 'web\_%'
     and old.subscription_expires_at > now()
     and (new.subscription_status is distinct from old.subscription_status
          or new.subscription_product is distinct from old.subscription_product
          or new.subscription_expires_at is distinct from old.subscription_expires_at
          or new.is_active is distinct from old.is_active)
  then
    new.subscription_status := old.subscription_status;
    new.subscription_product := old.subscription_product;
    new.subscription_expires_at := old.subscription_expires_at;
    new.is_active := old.is_active;
  end if;
  return new;
end $$;

drop trigger if exists protect_web_subscription on charlotte.users;
create trigger protect_web_subscription before update on charlotte.users
  for each row execute function public.protect_web_subscription();
