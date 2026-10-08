-- Nível Professor (teacher) na gestão.
alter table admin_members drop constraint if exists admin_members_role_check;
alter table admin_members add constraint admin_members_role_check
  check (role in ('admin','manager','teacher','finance','support','collaborator'));
