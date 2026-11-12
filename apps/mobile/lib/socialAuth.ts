// lib/socialAuth.ts
// Entrar / criar conta com Google e com a Apple, pela janela nativa do sistema (sem navegador).
// O token que o Google ou a Apple devolvem vai direto para o Supabase (signInWithIdToken).
//
// Os módulos nativos (expo-apple-authentication e google-signin) só existem no binário 2.0.4
// em diante. Carregados com proteção: num binário mais antigo (que recebe o mesmo JS por OTA)
// viram null e os botões simplesmente não aparecem.

/* eslint-disable @typescript-eslint/no-var-requires */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

function optional<T>(load: () => T): T | null {
  try { return load(); } catch { return null; }
}

const AppleAuth = optional(() => require('expo-apple-authentication') as typeof import('expo-apple-authentication'));
const Crypto = optional(() => require('expo-crypto') as typeof import('expo-crypto'));
const GoogleMod = optional(() => require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin'));

const extra = (Constants.expoConfig?.extra ?? {}) as { googleWebClientId?: string; googleIosClientId?: string };

/** Erro de "a pessoa fechou a janela": a tela não mostra mensagem nenhuma. */
export class SocialCancelled extends Error {
  constructor() { super('cancelled'); this.name = 'SocialCancelled'; }
}

export type SocialProvider = 'apple' | 'google';

export interface SocialResult {
  session: Session;
  /** Conta criada agora (primeiro acesso), não um login de conta antiga. */
  isNew: boolean;
  /** Nome que a Apple ou o Google entregou (pode vir vazio). */
  name: string | null;
  /** Só na Apple: código para o servidor desfazer o vínculo quando a conta for excluída. */
  appleAuthorizationCode?: string | null;
}

// ── Disponibilidade ─────────────────────────────────────────────────────────

/** Apple: só no iPhone (a Apple não exige o botão no Android) e com o módulo no binário. */
export async function appleAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios' || !AppleAuth || !Crypto) return false;
  try { return await AppleAuth.isAvailableAsync(); } catch { return false; }
}

/** Google: nos dois sistemas, com o módulo no binário e as credenciais configuradas. */
export function googleAvailable(): boolean {
  if (!GoogleMod || !extra.googleWebClientId) return false;
  if (Platform.OS === 'ios' && !extra.googleIosClientId) return false;
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

let googleConfigured = false;
function configureGoogle() {
  if (googleConfigured || !GoogleMod) return;
  GoogleMod.GoogleSignin.configure({
    // O idToken sai com o cliente Web como público: é ele que o Supabase confere.
    webClientId: extra.googleWebClientId,
    iosClientId: extra.googleIosClientId,
    scopes: ['email', 'profile'],
  });
  googleConfigured = true;
}

// ── Conta nova? ─────────────────────────────────────────────────────────────

function looksNew(session: Session): boolean {
  const created = Date.parse(session.user.created_at ?? '');
  // Criada há menos de 2 minutos = acabou de nascer neste login.
  return Number.isFinite(created) && Date.now() - created < 2 * 60 * 1000;
}

function cleanName(...parts: (string | null | undefined)[]): string | null {
  const n = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  return n || null;
}

// ── Apple ───────────────────────────────────────────────────────────────────

export async function signInWithApple(): Promise<SocialResult> {
  if (!AppleAuth || !Crypto) throw new Error('apple_unavailable');
  // Nonce: a Apple recebe o hash e o Supabase confere com o valor puro.
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  let credential: import('expo-apple-authentication').AppleAuthenticationCredential;
  try {
    credential = await AppleAuth.signInAsync({
      requestedScopes: [
        AppleAuth.AppleAuthenticationScope.FULL_NAME,
        AppleAuth.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e: any) {
    if (e?.code === 'ERR_REQUEST_CANCELED' || e?.code === 'ERR_CANCELED') throw new SocialCancelled();
    throw e;
  }
  if (!credential.identityToken) throw new Error('apple_no_token');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;
  if (!data.session) throw new Error('no_session');

  // A Apple só manda o nome no PRIMEIRO login: grava na hora (no Auth e na tabela do aluno).
  const name = cleanName(credential.fullName?.givenName, credential.fullName?.familyName);
  if (name) {
    await supabase.auth.updateUser({ data: { name, full_name: name } }).catch(() => {});
    await supabase.from('charlotte_users').update({ name }).eq('id', data.session.user.id).is('name', null);
  }

  return {
    session: data.session,
    isNew: looksNew(data.session),
    name,
    appleAuthorizationCode: credential.authorizationCode ?? null,
  };
}

/**
 * Pede de novo o login da Apple só para obter um código novo (usado ao excluir a conta, para o
 * servidor desfazer o vínculo com a Apple). Devolve null se a pessoa cancelar ou não houver Apple.
 */
export async function appleAuthorizationCodeForRevoke(): Promise<string | null> {
  if (!(await appleAvailable()) || !AppleAuth) return null;
  try {
    const credential = await AppleAuth.signInAsync({ requestedScopes: [] });
    return credential.authorizationCode ?? null;
  } catch {
    return null;
  }
}

// ── Google ──────────────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<SocialResult> {
  if (!GoogleMod) throw new Error('google_unavailable');
  const { GoogleSignin, isErrorWithCode, statusCodes } = GoogleMod;
  configureGoogle();

  let idToken: string | null = null;
  let profileName: string | null = null;
  try {
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Sempre mostra o seletor de contas (sem isso, quem tem várias contas cai direto na última usada).
    await GoogleSignin.signOut().catch(() => {});
    const res = await GoogleSignin.signIn();
    if (res.type === 'cancelled') throw new SocialCancelled();
    idToken = res.data.idToken;
    profileName = cleanName(res.data.user.name) ?? cleanName(res.data.user.givenName, res.data.user.familyName);
  } catch (e: any) {
    if (e instanceof SocialCancelled) throw e;
    if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) {
      throw new SocialCancelled();
    }
    throw e;
  }
  if (!idToken) throw new Error('google_no_token');

  const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
  if (error) throw error;
  if (!data.session) throw new Error('no_session');

  return { session: data.session, isNew: looksNew(data.session), name: profileName };
}

/** Sai também da conta Google no aparelho (no próximo login o seletor de contas aparece). */
export async function signOutSocial(): Promise<void> {
  if (!GoogleMod) return;
  try { await GoogleMod.GoogleSignin.signOut(); } catch { /* sem sessão Google */ }
}

/** A conta tem login da Apple? (para pedir o código de revogação ao excluir). */
export function sessionHasApple(session: Session | null): boolean {
  return !!session?.user?.identities?.some(i => i.provider === 'apple')
    || session?.user?.app_metadata?.provider === 'apple'
    || (session?.user?.app_metadata?.providers as string[] | undefined)?.includes('apple') === true;
}
