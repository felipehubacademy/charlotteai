import React from 'react';
import { View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/Text';

interface State {
  hasError: boolean;
  errorMessage: string;
  errorStack: string;
}

/**
 * Error boundary wrapping the authenticated (app) group.
 * Catches any render-time crash (e.g. ReferenceError, TypeError) that would
 * otherwise freeze the app on the splash/loading screen.
 *
 * On error: shows the error message on screen so we can diagnose,
 * plus a button to go back to the login screen.
 */
export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, errorMessage: '', errorStack: '' };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message ?? String(error),
      errorStack: error?.stack ?? '',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      '[AppErrorBoundary] Render crash caught:',
      error.message,
      '\n',
      info.componentStack,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#FAF7F0', paddingTop: Platform.OS === 'ios' ? 60 : 40 }}>
          <ScrollView contentContainerStyle={{ padding: 24 }}>
            <AppText style={{ fontSize: 18, fontWeight: '800', color: '#DC2626', marginBottom: 8 }}>
              Algo deu errado
            </AppText>
            <AppText style={{ fontSize: 13, color: '#4D4858', marginBottom: 16, lineHeight: 20 }}>
              O app encontrou um erro inesperado. Copie o texto abaixo e envie para o suporte.
            </AppText>

            <View style={{
              backgroundColor: '#FEF2F2', borderRadius: 10, padding: 14,
              borderWidth: 1, borderColor: '#FCA5A5', marginBottom: 20,
            }}>
              <AppText style={{ fontSize: 11, fontFamily: 'monospace', color: '#DC2626', lineHeight: 18 }}>
                {this.state.errorMessage}
                {'\n\n'}
                {this.state.errorStack.slice(0, 800)}
              </AppText>
            </View>

            <TouchableOpacity
              onPress={() => {
                this.setState({ hasError: false, errorMessage: '', errorStack: '' });
                try { router.replace('/(onboarding)' as any); } catch { /* ignore */ }
              }}
              style={{
                backgroundColor: '#16131F', borderRadius: 14,
                paddingVertical: 14, alignItems: 'center',
              }}
            >
              <AppText style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>
                Voltar ao login
              </AppText>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}
