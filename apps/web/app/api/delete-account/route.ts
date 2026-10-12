// app/api/delete-account/route.ts
// Exclui a conta do usuario permanentemente.
// Apple App Store exige que o app oferea esta funcionalidade.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const accessToken = authHeader.slice(7);

    const supabase = getSupabaseAdmin();

    // 1. Verificar o token do usuario
    const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const userId = user.id;
    console.log(`Deleting account for user: ${userId} (${user.email})`);

    // 2. Limpar dados das tabelas do schema charlotte
    //    Usa .schema('charlotte').from() — notacao correta para o Supabase JS client.
    //    Se o banco tiver ON DELETE CASCADE configurado no auth.users,
    //    o deleteUser() abaixo ja cuida de tudo — estas chamadas sao best-effort.
    const charlotteTables = ['practices', 'progress', 'leaderboard_cache'];
    for (const table of charlotteTables) {
      const { error } = await (supabase as any)
        .schema('charlotte')
        .from(table)
        .delete()
        .eq('user_id', userId);
      if (error) console.warn(`Cleanup warning (charlotte.${table}):`, error.message);
    }

    // charlotte.users usa 'id' como PK, nao 'user_id'
    const { error: usersErr } = await (supabase as any)
      .schema('charlotte')
      .from('users')
      .delete()
      .eq('id', userId);
    if (usersErr) console.warn('Cleanup warning (charlotte.users):', usersErr.message);

    // 3. Apagar os áudios do Free Chat (bucket chat-audio, pasta {userId}/{sessionId}/...).
    //    Voz é dado pessoal: sai junto com a conta, antes das mensagens.
    try {
      const bucket = supabase.storage.from('chat-audio');
      const { data: folders } = await bucket.list(userId, { limit: 1000 });
      for (const folder of folders ?? []) {
        const prefix = `${userId}/${folder.name}`;
        // folder.id null = subpasta (sessão); com id = arquivo solto na raiz da pessoa
        if (folder.id) { await bucket.remove([prefix]); continue; }
        for (;;) {
          const { data: files } = await bucket.list(prefix, { limit: 1000 });
          if (!files?.length) break;
          const { error } = await bucket.remove(files.map(f => `${prefix}/${f.name}`));
          if (error) { console.warn('Cleanup warning (chat-audio):', error.message); break; }
          if (files.length < 1000) break;
        }
      }
    } catch (e: any) {
      console.warn('Cleanup warning (chat-audio):', e?.message);
    }

    // 4. Limpar dados das tabelas do schema public
    const publicTables = ['chat_messages', 'user_achievements'];
    for (const table of publicTables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', userId);
      if (error) console.warn(`Cleanup warning (${table}):`, error.message);
    }

    // 5. Deletar o usuario do auth (cascata cuida do resto via FK)
    const { error: deleteErr } = await supabase.auth.admin.deleteUser(userId);
    if (deleteErr) {
      console.error('Failed to delete auth user:', deleteErr.message);
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    console.log(`Account deleted successfully: ${userId}`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
