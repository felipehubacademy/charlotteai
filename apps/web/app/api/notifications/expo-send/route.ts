// app/api/notifications/expo-send/route.ts
// Sends push notifications to React Native app via Expo Push API

import { NextRequest, NextResponse } from 'next/server';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;
  channelId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokens, title, body: msgBody, data, priority = 'high' } = body;

    if (!tokens || !title || !msgBody) {
      return NextResponse.json({ error: 'Missing tokens, title, or body' }, { status: 400 });
    }

    const tokenList: string[] = Array.isArray(tokens) ? tokens : [tokens];

    // Validate Expo push tokens
    const validTokens = tokenList.filter(t => t && t.startsWith('ExponentPushToken['));
    if (validTokens.length === 0) {
      return NextResponse.json({ error: 'No valid Expo push tokens' }, { status: 400 });
    }

    // Expo Push API accepts up to 100 messages per request
    const BATCH_SIZE = 100;
    const results = [];

    for (let i = 0; i < validTokens.length; i += BATCH_SIZE) {
      const batch = validTokens.slice(i, i + BATCH_SIZE);
      const messages: ExpoMessage[] = batch.map(token => ({
        to: token,
        title,
        body: msgBody,
        data: data ?? {},
        sound: 'default',
        priority,
        channelId: 'charlotte',
      }));

      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      results.push(...(result.data ?? []));
    }

    const successCount = results.filter((r: any) => r.status === 'ok').length;
    const errorCount = results.filter((r: any) => r.status === 'error').length;

    console.log(`✅ Expo Push: ${successCount} sent, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      sent: successCount,
      errors: errorCount,
      total: validTokens.length,
    });
  } catch (error) {
    console.error('❌ Expo Push error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
