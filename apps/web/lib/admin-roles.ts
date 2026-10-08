// lib/admin-roles.ts
// Níveis de acesso da gestão (/admin). Fonte única: o servidor aplica estas
// permissões (lib/admin-auth.ts) e a tela de Equipe mostra a mesma matriz.
// Sem dependências de servidor, para poder ser importado no cliente.

export type AdminRole = 'admin' | 'manager' | 'finance' | 'support' | 'collaborator';

export type AdminArea =
  | 'users'          // ver alunos e a ficha (CRM)
  | 'users:write'    // editar e criar alunos; anotações e etiquetas
  | 'users:delete'   // excluir alunos (irreversível)
  | 'support'        // fila de atendimento e atendentes
  | 'notifications'  // enviar push e e-mails em massa
  | 'metrics'        // métricas de uso e custo por aluno
  | 'finance'        // ver financeiro, custos de IA e relatórios
  | 'finance:write'  // lançar, editar e excluir no financeiro; enviar relatório
  | 'team';          // gerenciar quem acessa a gestão e com qual nível

export const AREAS: { id: AdminArea; label: string }[] = [
  { id: 'users',         label: 'Ver alunos' },
  { id: 'users:write',   label: 'Editar alunos' },
  { id: 'users:delete',  label: 'Excluir alunos' },
  { id: 'support',       label: 'Atendimento' },
  { id: 'notifications', label: 'Notificações em massa' },
  { id: 'metrics',       label: 'Métricas' },
  { id: 'finance',       label: 'Ver financeiro' },
  { id: 'finance:write', label: 'Editar financeiro' },
  { id: 'team',          label: 'Equipe e acessos' },
];

export const PERMISSIONS: Record<AdminRole, AdminArea[]> = {
  admin:        ['users', 'users:write', 'users:delete', 'support', 'notifications', 'metrics', 'finance', 'finance:write', 'team'],
  manager:      ['users', 'users:write', 'users:delete', 'support', 'notifications', 'metrics', 'finance', 'finance:write'],
  finance:      ['users', 'metrics', 'finance', 'finance:write'],
  support:      ['users', 'users:write', 'support'],
  collaborator: ['users', 'metrics'],
};

// Ordem do mais amplo ao mais restrito.
export const ROLES: { id: AdminRole; label: string; desc: string }[] = [
  { id: 'admin',        label: 'Administrador', desc: 'Acesso total, incluindo equipe e níveis de acesso.' },
  { id: 'manager',      label: 'Gerente',       desc: 'Todas as áreas, sem gerenciar a equipe.' },
  { id: 'finance',      label: 'Financeiro',    desc: 'Financeiro completo, métricas e consulta de alunos.' },
  { id: 'support',      label: 'Atendimento',   desc: 'Alunos e fila de atendimento.' },
  { id: 'collaborator', label: 'Colaborador',   desc: 'Consulta de alunos e métricas, sem editar.' },
];

export const ROLE_LABEL = Object.fromEntries(ROLES.map(r => [r.id, r.label])) as Record<AdminRole, string>;

export const isAdminRole = (v: unknown): v is AdminRole => ROLES.some(r => r.id === v);

/** Quem recebe o relatório mensal por e-mail: níveis com acesso ao financeiro completo. */
export const REPORT_ROLES: AdminRole[] = (Object.keys(PERMISSIONS) as AdminRole[])
  .filter(r => PERMISSIONS[r].includes('finance:write'));
