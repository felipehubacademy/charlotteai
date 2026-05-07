export const dynamic = 'force-dynamic';

/**
 * app/api/admin/users/route.ts
 * Admin API — list, create, update and delete charlotte users.
 * Protected by ADMIN_SECRET env var.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/microsoft-graph-email-service';
import { inviteTemplate } from '@/lib/email-templates';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? '';

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
interface LearnProgress {
  user_id: string; completed: unknown; module_index: number | null;
  topic_index: number | null; level: string | null;
}
type TrailLevelKey = 'novice' | 'inter' | 'advanced';
interface UserProgress {
  user_id: string; streak_days: number | null; total_xp: number | null; last_practice_date: string | null;
}

function checkAuth(req: NextRequest) {
  const auth = req.headers.get('x-admin-secret') ?? req.nextUrl.searchParams.get('secret') ?? '';
  return ADMIN_SECRET && auth === ADMIN_SECRET;
}

// ── GET /api/admin/users — list all users + stats + engagement ────────────────
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabaseAdmin();

  // Fetch users + engagement data in parallel
  const [
    { data: users, error },
    { data: practices },
    { data: learnProgress },
    { data: userProgress },
  ] = await Promise.all([
    supabase.from('charlotte_users').select('*').order('created_at', { ascending: false }) as unknown as Promise<{ data: CharlotteUser[] | null; error: { message: string } | null }>,
    supabase.from('charlotte_practices').select('user_id, xp_earned, practice_type, created_at') as unknown as Promise<{ data: Practice[] | null; error: unknown }>,
    supabase.from('learn_progress').select('user_id, completed, module_index, topic_index, level') as unknown as Promise<{ data: LearnProgress[] | null; error: unknown }>,
    supabase.from('charlotte_progress').select('user_id, streak_days, total_xp, last_practice_date') as unknown as Promise<{ data: UserProgress[] | null; error: unknown }>,
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

  // ── Aggregate learn_progress per user (all levels) ───────────────────────
  type ProgMap = Record<string, { novice: number; inter: number; advanced: number }>;
  const progMap: ProgMap = {};
  const levelKey: Record<string, TrailLevelKey> = { Novice: 'novice', Inter: 'inter', Advanced: 'advanced' };
  for (const lp of (learnProgress ?? [])) {
    const key = levelKey[lp.level ?? 'Novice'];
    if (!key) continue;
    const uid = String(lp.user_id).toLowerCase();
    const completed = (lp.completed as Array<{ m: number; t: number }>) ?? [];
    if (!progMap[uid]) progMap[uid] = { novice: 0, inter: 0, advanced: 0 };
    progMap[uid][key] = completed.length;
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

  // ── Stats ─────────────────────────────────────────────────────────────────
  const total         = usersWithEng.length;
  const institutional = usersWithEng.filter(u => u.is_institutional).length;
  const subscribers   = usersWithEng.filter(u => u.subscription_status === 'active').length;
  const onTrial       = usersWithEng.filter(u => u.subscription_status === 'trial').length;
  const trialExpired  = usersWithEng.filter(u => {
    if (u.is_institutional) return false;
    // Conta status='expired' OU status='trial' com data já vencida (cron atrasado)
    if (u.subscription_status === 'expired') return true;
    if (u.subscription_status === 'trial' && u.trial_ends_at && new Date(u.trial_ends_at) < now) return true;
    return false;
  }).length;

  const d30   = new Date(now); d30.setDate(d30.getDate() - 30);
  const d60   = new Date(now); d60.setDate(d60.getDate() - 60);
  const last30 = usersWithEng.filter(u => new Date(u.created_at) >= d30).length;
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
    stats: { total, institutional, subscribers, onTrial, trialExpired, last30, growthPct, activeToday, activeWeek },
  });
}

// ── POST /api/admin/users — create a new user ─────────────────────────────────
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    email, password, name,
    charlotte_level       = null,
    is_institutional      = true,
    is_active             = true,
    subscription_status   = 'none',
    must_change_password  = true,
    placement_test_done   = false,
    is_admin              = false,
  } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'email e password são obrigatórios' }, { status: 400 });
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
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id } = body;

  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

  const supabase = getSupabaseAdmin();

  // Deleting auth user cascades to charlotte.users via ON DELETE CASCADE
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
