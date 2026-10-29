-- Aceite do convite da gestão: primeiro acesso ao /admin. Quem convidou recebe um aviso por e-mail.
alter table admin_members add column if not exists accepted_at timestamptz;
-- Quem já entrou antes desta mudança: Felipe e Marina (Enzo ainda não aceitou).
update admin_members set accepted_at = created_at where accepted_at is null and email in ('felipe.xavier1987@gmail.com', 'suporte@queizy.com');
