import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/theme';

interface AppTextProps extends TextProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper de texto padrão do app Charlotte.
 * - Cor padrão: segue o tema (light/dark) via useTheme()
 * - Se o componente pai já definiu `color` no style, respeita
 * - Aplica classes NativeWind automaticamente
 * - Ponto único para futura troca de fonte (ex: Inter, Poppins)
 */
export function AppText({ children, className = '', style, ...props }: AppTextProps) {
  const { colors } = useTheme();
  // Só aplica cor do tema se o style não definir color explicitamente
  const flatStyle = StyleSheet.flatten(style);
  const hasExplicitColor = flatStyle?.color != null;

  return (
    <Text
      className={`text-textPrimary ${className}`}
      style={[!hasExplicitColor && { color: colors.textPrimary }, style]}
      // Cap de 1.15x: respeita "fonte grande" do sistema o suficiente pra
      // acessibilidade, mas sem estourar o layout (relato de UI "fora de
      // proporção" em Samsung com fonte/zoom alto). Caller pode sobrescrever.
      maxFontSizeMultiplier={1.15}
      {...props}
    >
      {children}
    </Text>
  );
}
