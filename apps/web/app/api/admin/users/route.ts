export const dynamic = 'force-dynamic';

/**
 * app/api/admin/users/route.ts
 * Admin API — list, create, update and delete charlotte users.
 * Protected by ADMIN_SECRET env var.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchAll } from '@/lib/learning-stats';
import { getAdmin, can } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/microsoft-graph-email-service';
import { inviteTemplate } from '@/lib/email-templates';


interface CharlotteUser {
  id: string; email: string; name: string | null;
  charlotte_level: string | null; is_institutional: boolean;
  is_active: boolean; subscription_status: string;
  trial_ends_at: string | null; must_change_password: boolean;
  placement_test_done: boolean; created_at: string;
  last_seen_at: string | null;
  [key: string]: unknown;
}
interface Practice {
  user_id: string; xp_earned: number | null;
  practice_type: string; created_at: string;
}
type TrailLevelKey = 'novice' | 'inter' | 'advanced';
interface UserProgress {
  user_id: string; streak_days: number | null; total_xp: number | null; last_practice_date: string | null;
}

// Login próprio (Bearer) com papel que acessa 'users', ou a senha mestra antiga.
async function checkAuth(req: NextRequest, area: 'users' | 'users:write' | 'users:delete' = 'users') {
  const admin = await getAdmin(req);
  return !!admin && can(admin.role, area);
}

// ── GET /api/admin/users — list all users + stats + engagement ────────────────
export async function GET(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabaseAdmin();

  // Fetch users + engagement data in parallel
  const [
    { data: users, error },
    { data: practices },
    { data: learnProgress },
    { data: userProgress },
  ] = await Promise.all([
    // PostgREST devolve no máximo 1000 linhas por consulta: tudo aqui é paginado.
    fetchAll<CharlotteUser>((a, b) => supabase.from('charlotte_users').select('*').order('created_at', { ascending: false }).range(a, b), 200000)
      .then(data => ({ data, error: null as { message: string } | null })),
    fetchAll<Practice>((a, b) => supabase.from('charlotte_practices').select('user_id, xp_earned, practice_type, created_at').order('id').range(a, b), 500000)
      .then(data => ({ data, error: null })),
    fetchAll<{ user_id: string; level: string; module_id: string; unit_id: string; activity_type: string }>((a, b) =>
      supabase.from('learn_history_v2').select('user_id, level, module_id, unit_id, activity_type').eq('completed', true).order('id').range(a, b), 200000)
      .then(data => ({ data, error: null })),
    fetchAll<UserProgress>((a, b) => supabase.from('charlotte_progress').select('user_id, streak_days, total_xp, last_practice_date').order('user_id').range(a, b), 200000)
      .then(data => ({ data, error: null })),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── Aggregate practices per user ──────────────────────────────────────────
  const now   = new Date();
  const d1    = new Date(now); d1.setDate(d1.getDate() - 1);
  const d7    = new Date(now); d7.setDate(d7.getDate() - 7);

  type EngMap = Record<string, {
    totalXP: number; lastActive: string | null;
    lessonCount: number; messageCount: number; sessionDays: Set<string>;
  }>;
  const engMap: EngMap = {};

  for (const p of (practices ?? [])) {
    const uid = String(p.user_id).toLowerCase();
    if (!engMap[uid]) {
      engMap[uid] = { totalXP: 0, lastActive: null, lessonCount: 0, messageCount: 0, sessionDays: new Set() };
    }
    const e = engMap[uid];
    e.totalXP += (p.xp_earned ?? 0);
    if (!e.lastActive || p.created_at > e.lastActive) e.lastActive = p.created_at;
    e.sessionDays.add((p.created_at as string).slice(0, 10));
    if (p.practice_type === 'learn_exercise') e.lessonCount++;
    if (['text_message', 'audio_message', 'grammar_message'].includes(p.practice_type)) e.messageCount++;
  }

  // ── Trilha nova: unidades concluídas (as 4 atividades) por nível ─────────
  type ProgMap = Record<string, { novice: number; inter: number; advanced: number }>;
  const progMap: ProgMap = {};
  const levelKey: Record<string, TrailLevelKey> = { Novice: 'novice', Inter: 'inter', Advanced: 'advanced' };
  const acts = new Map<string, Set<string>>();
  for (const r of (learnProgress ?? [])) {
    const k = `${String(r.user_id).toLowerCase()}|${r.level}|${r.module_id}|${r.unit_id}`;
    acts.set(k, (acts.get(k) ?? new Set()).add(r.activity_type));
  }
  for (const [k, set] of acts) {
    if (set.size < 4) continue;
    const [uid, level] = k.split('|');
    const key = levelKey[level];
    if (!key) continue;
    if (!progMap[uid]) progMap[uid] = { novice: 0, inter: 0, advanced: 0 };
    progMap[uid][key]++;
  }

  // ── Progress map (streak + total_xp + last_practice_date) ───────────────
  type ProgressEntry = { streak: number; totalXP: number; lastPracticeDate: string | null };
  const progressMap: Record<string, ProgressEntry> = {};
  const todayUTC = new Date().toISOString().slice(0, 10);
  const yesterdayUTC = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  for (const up of (userProgress ?? [])) {
    const uid = String(up.user_id).toLowerCase();
    const lpd = up.last_practice_date ?? null;
    // Streak está ativo apenas se praticou hoje ou ontem (UTC como aproximação para admin)
    const activeStreak = lpd === todayUTC || lpd === yesterdayUTC;
    progressMap[uid] = {
      streak:           activeStreak ? (up.streak_days ?? 0) : 0,
      totalXP:          up.total_xp ?? 0,
      lastPracticeDate: lpd,
    };
  }

  // ── Attach engagement to each user ───────────────────────────────────────
  const usersWithEng = (users ?? []).map(u => {
    const uid  = String(u.id).toLowerCase();
    const e    = engMap[uid];
    const p    = progMap[uid];
    const prog = progressMap[uid];
    return {
      ...u,
      engagement: e ? {
        totalXP:      prog?.totalXP ?? e.totalXP, // charlotte_progress.total_xp tem achievements inclusos
        // Usa o mais recente entre: última prática (engMap), last_practice_date
        // do charlotte_progress (fonte confiável, não sofre truncamento de 1000 rows),
        // e last_seen_at (abertura do app).
        lastActive:   [e.lastActive, prog?.lastPracticeDate, u.last_seen_at].filter(Boolean).sort().at(-1) ?? null,
        sessionDays:  e.sessionDays.size,
        lessonCount:  e.lessonCount,
        messageCount: e.messageCount,
      } : (prog ? { totalXP: prog.totalXP, lastActive: [prog.lastPracticeDate, u.last_seen_at].filter(Boolean).sort().at(-1) ?? null, sessionDays: 0, lessonCount: 0, messageCount: 0 } : null),
      trailProgress: p ?? null,
      streak:        prog?.streak ?? 0,
      longestStreak: 0,
    };
  });

  // ── Fase da assinatura (mesma regra do /admin/metrics) ───────────────────
  // pagante: já houve cobrança (loja: revenue_events; site: compra paga) e ainda tem acesso;
  // teste_loja / teste_site: 7 dias grátis com cartão; teste_antigo: teste sem cartão do app (até 21/10).
  const [{ data: paidRows }, { data: siteRows }] = await Promise.all([
    supabase.from('revenue_events').select('app_user_id').gt('price_purchased', 0),
    supabase.from('asaas_checkouts').select('user_id, trial_days, asaas_payment_id, created_at').eq('status', 'paid').eq('sandbox', false).is('refunded_at', null),
  ]);
  const storePaid = new Set(((paidRows ?? []) as { app_user_id: string }[]).map(r => String(r.app_user_id)));
  const sitePaid = new Set(((siteRows ?? []) as { user_id: string; trial_days: number; asaas_payment_id: string | null }[])
    .filter(r => r.asaas_payment_id || !(r.trial_days > 0)).map(r => String(r.user_id)));
  const phaseOf = (u: { id: string; subscription_status: string; subscription_product: string | null; subscription_expires_at: string | null; trial_ends_at: string | null }) => {
    if (u.subscription_status === 'trial') return u.trial_ends_at && new Date(u.trial_ends_at) > now ? 'teste_antigo' : null;
    if (u.subscription_status !== 'active' && u.subscription_status !== 'cancelled') return null;
    if (!u.subscription_expires_at || new Date(u.subscription_expires_at) <= now) return null;
    const p = u.subscription_product ?? '';
    if (p.startsWith('web_')) return sitePaid.has(String(u.id)) ? 'pagante' : 'teste_site';
    if (p === 'monthly' || p === 'yearly') return storePaid.has(String(u.id)) ? 'pagante' : 'teste_loja';
    return null;
  };
  for (const u of usersWithEng as any[]) u.sub_phase = u.is_institutional ? null : phaseOf(u);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const total         = usersWithEng.length;
  const institutional = usersWithEng.filter(u => u.is_institutional).length;
  const subscribers   = (usersWithEng as any[]).filter(u => u.sub_phase === 'pagante').length;
  const onTrial       = (usersWithEng as any[]).filter(u => String(u.sub_phase ?? '').startsWith('teste')).length;
  // De onde vem o teste: loja (cartão na loja), site (cartão no site) ou sem cartão (teste antigo do app).
  const trialBy = (phase: string) => (usersWithEng as any[]).filter(u => u.sub_phase === phase).length;
  const trialSplit = { loja: trialBy('teste_loja'), site: trialBy('teste_site'), semCartao: trialBy('teste_antigo') };
  // Detalhe do card "Em teste grátis" (no passar do mouse): por origem, quantos vão ser cobrados e quando,
  // e quantos cancelaram durante o teste (seguem com acesso até o fim dos 7 dias, sem cobrança).
  const day = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - 3 * 3600000).toISOString().slice(0, 10) : '');
  // Site: o Asaas cobra no fim do teste (início + dias grátis, em data UTC, como em lib/asaas.ts ymd); o acesso
  // tem 1 dia de folga depois disso.
  const siteChargeDay = new Map(((siteRows ?? []) as { user_id: string; trial_days: number; created_at: string }[])
    .filter(r => r.trial_days > 0).map(r => [String(r.user_id), new Date(new Date(r.created_at).getTime() + r.trial_days * 86400000).toISOString().slice(0, 10)]));
  const chargeDay = (u: any) => (String(u.subscription_product ?? '').startsWith('web_') && siteChargeDay.get(String(u.id))) || day(u.subscription_expires_at);
  const detailOf = (phase: string) => {
    const list = (usersWithEng as any[]).filter(u => u.sub_phase === phase);
    const cancelled = list.filter(u => u.subscription_status === 'cancelled');
    const toCharge = list.filter(u => u.subscription_status !== 'cancelled');
    const byDay = new Map<string, number>();
    for (const u of (phase === 'teste_antigo' ? list : toCharge)) {
      const d = phase === 'teste_antigo' ? day(u.trial_ends_at) : chargeDay(u);
      if (d) byDay.set(d, (byDay.get(d) ?? 0) + 1);
    }
    return {
      total: list.length, toCharge: toCharge.length, cancelled: cancelled.length,
      cancelledUntil: cancelled.map(chargeDay).sort().slice(-1)[0] ?? null,
      byDay: [...byDay.entries()].sort().map(([date, count]) => ({ date, count })),
    };
  };
  const trialDetail = { loja: detailOf('teste_loja'), site: detailOf('teste_site'), semCartao: detailOf('teste_antigo') };
  const trialExpired  = usersWithEng.filter(u => {
    if (u.is_institutional) return false;
    // Conta status='expired' OU status='trial' com data já vencida (cron atrasado)
    if (u.subscription_status === 'expired') return true;
    if (u.subscription_status === 'trial' && u.trial_ends_at && new Date(u.trial_ends_at) < now) return true;
    return false;
  }).length;

  // Funil do painel: alunos (sem institucionais) → degustação ou teste grátis → pagantes; e quem cancelou.
  const students = (usersWithEng as any[]).filter(u => !u.is_institutional);
  const totalStudents = students.length;
  // Degustação: nunca entrou em teste nem pagou (status 'none'). Ela dura 5 dias desde o cadastro (lib/taste).
  const tasters = students.filter(u => (u.subscription_status ?? 'none') === 'none');
  const tasteDays = 5;
  const tasteCut = new Date(now.getTime() - tasteDays * 86400000);
  const tasteActive = tasters.filter(u => new Date(u.created_at) >= tasteCut).length;
  const taste = { total: tasters.length, active: tasteActive, ended: tasters.length - tasteActive };
  // Cancelados: desligaram a renovação. Seguem com acesso até o vencimento (no teste ou já pagantes).
  const cancelledList = students.filter(u => u.subscription_status === 'cancelled');
  const cancelled = {
    total: cancelledList.length,
    inTrial: cancelledList.filter(u => String(u.sub_phase ?? '').startsWith('teste')).length,
    paid: cancelledList.filter(u => u.sub_phase === 'pagante').length,
    noAccess: cancelledList.filter(u => !u.sub_phase).length,
  };

  const d30   = new Date(now); d30.setDate(d30.getDate() - 30);
  const d60   = new Date(now); d60.setDate(d60.getDate() - 60);
  const last30 = usersWithEng.filter(u => new Date(u.created_at) >= d30).length;
  // Novos nas últimas 24 h e nas 24 h anteriores (para comparar).
  const d2 = new Date(now); d2.setDate(d2.getDate() - 2);
  const last24h = usersWithEng.filter(u => new Date(u.created_at) >= d1).length;
  const prev24h = usersWithEng.filter(u => new Date(u.created_at) >= d2 && new Date(u.created_at) < d1).length;
  const prev30 = usersWithEng.filter(u => new Date(u.created_at) >= d60 && new Date(u.created_at) < d30).length;
  const growthPct = prev30 === 0 ? null : Math.round(((last30 - prev30) / prev30) * 100);

  // Engagement stats
  const activeToday = usersWithEng.filter(u =>
    u.engagement?.lastActive && new Date(u.engagement.lastActive) >= d1
  ).length;
  const activeWeek = usersWithEng.filter(u =>
    u.engagement?.lastActive && new Date(u.engagement.lastActive) >= d7
  ).length;

  return NextResponse.json({
    users: usersWithEng,
    stats: { total, totalStudents, taste, cancelled, institutional, subscribers, onTrial, trialSplit, trialDetail, trialExpired, last30, last24h, prev24h, growthPct, activeToday, activeWeek },
  });
}

// ── POST /api/admin/users — create a new user ─────────────────────────────────
export async function POST(req: NextRequest) {
  if (!(await checkAuth(req, 'users:write'))) return NextResponse.json({ error: 'Sem permissão para editar alunos.' }, { status: 403 });

  const body = await req.json();
  let { password } = body;
  const {
    email, name,
    charlotte_level       = null,
    is_institutional      = true,
    is_active             = true,
    subscription_status   = 'none',
    must_change_password  = true,
    placement_test_done   = false,
    is_admin              = false,
  } = body;

  // Senha temporária vai no e-mail de convite: espaço colado no começo/fim impede o primeiro login.
  if (typeof password === 'string') password = password.trim();
  // Toda conta precisa de nome, e-mail e senha.
  if (!String(name ?? '').trim() || !String(email ?? '').trim().includes('@') || !password) {
    return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Profile fields shared between create and "already exists" update paths
  const profileFields = {
    name:                name || null,
    is_institutional,
    must_change_password,
    placement_test_done,
    is_active,
    subscription_status: is_institutional ? 'none' : subscription_status,
    is_admin,
    ...(charlotte_level ? { charlotte_level } : {}),
  };

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: name || null, is_institutional },
  });

  if (authError) {
    // ── Usuário já existe no auth.users — tentar atualizar perfil ─────────────
    const alreadyExists =
      /already registered|already been registered/i.test(authError.message ?? '');

    if (!alreadyExists) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 1. Busca UUID em charlotte_users pelo email (caminho mais rápido)
    const { data: existingProfile } = await supabase
      .from('charlotte_users')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    let userId: string | undefined = existingProfile?.id as string | undefined;

    // 2. Último recurso: Management REST API do auth
    if (!userId) {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?filter=${encodeURIComponent(email)}&per_page=1`,
        {
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          },
        },
      );
      const json = await res.json();
      userId = (json?.users?.[0]?.id) as string | undefined;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuário já registrado mas UUID não encontrado. Verifique no Supabase.' },
        { status: 409 },
      );
    }

    // Upsert charlotte_users — cria se não existir, atualiza se existir
    const { error: upsertErr } = await supabase
      .from('charlotte_users')
      .upsert(
        { id: userId, email, charlotte_level: charlotte_level || 'Novice', ...profileFields },
        { onConflict: 'id' },
      );

    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

    // Atualiza senha e confirma email no auth.users
    await supabase.auth.admin.updateUserById(userId, {
      password,
      email,
      email_confirm: true,
    });

    // Envia email de convite
    if (email && name) {
      const { subject, html } = inviteTemplate({ name, email, tempPassword: password });
      sendEmail({ to: email, subject, html }).catch(() => {});
    }

    return NextResponse.json({ success: true, userId, note: 'existing_user_updated' });
  }

  const userId = authData.user.id;

  const { error: profileError } = await supabase
    .from('charlotte_users')
    .update(profileFields)
    .eq('id', userId);

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Envia email de convite (fire-and-forget — nao bloqueia resposta)
  if (email && name) {
    const { subject, html } = inviteTemplate({ name, email, tempPassword: password });
    sendEmail({ to: email, subject, html }).catch(() => {});
  }

  return NextResponse.json({ success: true, userId });
}

// ── PATCH /api/admin/users — update a user ────────────────────────────────────
export async function PATCH(req: NextRequest) {
  if (!(await checkAuth(req, 'users:write'))) return NextResponse.json({ error: 'Sem permissão para editar alunos.' }, { status: 403 });

  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

  const supabase = getSupabaseAdmin();

  // Allowed editable fields (email included — updates both charlotte_users and auth.users)
  const allowed = [
    'name', 'email', 'charlotte_level', 'is_institutional',
    'is_active', 'subscription_status', 'trial_ends_at',
    'must_change_password', 'placement_test_done', 'beta_features',
    'is_admin',
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in fields) updates[key] = fields[key];
  }

  const hasEmail = Boolean(fields.email);

  if (Object.keys(updates).length === 0 && !hasEmail) {
    return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 });
  }

  // Garantir que institucional nunca fique com subscription_status != 'none'
  if (updates.is_institutional === true) updates.subscription_status = 'none';
  else if ('is_institutional' in updates && !updates.is_institutional && 'subscription_status' in updates) {
    // nao faz nada — deixa o valor enviado
  }

  // Update charlotte_users (only if there are fields beyond auth-only)
  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('charlotte_users')
      .update(updates)
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sync email in auth.users (admin bypass — no confirmation email sent)
  if (hasEmail) {
    const { error: emailError } = await supabase.auth.admin.updateUserById(
      id,
      { email: fields.email as string, email_confirm: true },
    );
    if (emailError) return NextResponse.json({ error: emailError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ── DELETE /api/admin/users — delete a user ───────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!(await checkAuth(req, 'users:delete'))) return NextResponse.json({ error: 'Sem permissão para excluir alunos.' }, { status: 403 });

  const body = await req.json();
  const { id } = body;

  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

  const supabase = getSupabaseAdmin();

  // Deleting auth user cascades to charlotte.users via ON DELETE CASCADE
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
