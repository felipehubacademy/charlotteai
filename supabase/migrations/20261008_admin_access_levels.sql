-- Níveis de acesso da gestão: Administrador, Gerente, Financeiro, Atendimento, Colaborador.
-- Converte os papéis antigos (owner, partner, viewer) e troca a restrição.
alter table admin_members drop constraint if exists admin_members_role_check;
update admin_members set role = 'admin' where role = 'owner';
update admin_members set role = 'manager' where role = 'partner';
update admin_members set role = 'collaborator' where role = 'viewer';
alter table admin_members add constraint admin_members_role_check
  check (role in ('admin','manager','finance','support','collaborator'));
