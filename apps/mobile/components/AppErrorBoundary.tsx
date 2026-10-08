import React from 'react';
import { View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/Text';
import { systemIsPt as isPt } from '@/lib/systemLang';

interface State {
  hasError: boolean;
  errorMessage: string;
  errorStack: string;
  showDetails?: boolean;
}

/**
 * Error boundary wrapping the authenticated (app) group.
 * Catches any render-time crash (e.g. ReferenceError, TypeError) that would
 * otherwise freeze the app on the splash/loading screen.
 *
 * On error: shows a friendly message, the technical details behind a toggle
 * (to send to support), and a button to go back to the login screen.
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
            <AppText display style={{ fontSize: 18, fontWeight: '800', color: '#D12A64', marginBottom: 8 }}>
              {isPt ? 'Algo deu errado' : 'Something went wrong'}
            </AppText>
            <AppText style={{ fontSize: 13, color: '#4D4858', marginBottom: 16, lineHeight: 20 }}>
              {isPt
                ? 'O app encontrou um erro inesperado. Volte ao login e tente de novo. Se continuar, envie os detalhes para suporte@queizy.com.'
                : 'The app hit an unexpected error. Go back to sign in and try again. If it keeps happening, send the details to suporte@queizy.com.'}
            </AppText>

            <TouchableOpacity onPress={() => this.setState({ showDetails: !this.state.showDetails })} style={{ marginBottom: 12 }}>
              <AppText style={{ fontSize: 12, color: '#8A8494', textDecorationLine: 'underline' }}>
                {this.state.showDetails ? (isPt ? 'Ocultar detalhes' : 'Hide details') : (isPt ? 'Ver detalhes técnicos' : 'Show technical details')}
              </AppText>
            </TouchableOpacity>

            {this.state.showDetails && (
              <View style={{
                backgroundColor: '#FFEEF4', borderRadius: 10, padding: 14,
                borderWidth: 1, borderColor: '#FFB3CD', marginBottom: 20,
              }}>
                <AppText selectable style={{ fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#D12A64', lineHeight: 18 }}>
                  {this.state.errorMessage}
                  {'\n\n'}
                  {this.state.errorStack.slice(0, 800)}
                </AppText>
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                this.setState({ hasError: false, errorMessage: '', errorStack: '', showDetails: false });
                try { router.replace('/(onboarding)' as any); } catch { /* ignore */ }
              }}
              style={{
                backgroundColor: '#16131F', borderRadius: 14,
                paddingVertical: 14, alignItems: 'center',
              }}
            >
              <AppText style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>
                {isPt ? 'Voltar ao login' : 'Back to sign in'}
              </AppText>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}
