import { View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  /** Desativa o SafeAreaView (útil para modais ou telas específicas) */
  unsafe?: boolean;
  className?: string;
}

/**
 * Wrapper de tela padrão do app Charlotte.
 * - Background: #16131F (secondary/background)
 * - SafeAreaView incluído por padrão
 * - Flex-1 para ocupar toda a tela
 */
export function Screen({ children, unsafe = false, className = '', ...props }: ScreenProps) {
  const inner = (
    <View className={`flex-1 bg-background ${className}`} {...props}>
      {children}
    </View>
  );

  if (unsafe) return inner;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {inner}
    </SafeAreaView>
  );
}
