import { TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AppText } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

const variantStyles: Record<Variant, { container: string; text: string; textColor: string }> = {
  primary: {
    container: 'bg-primary active:opacity-80',
    text: 'font-bold',
    textColor: '#16131F',   // dark navy — NativeWind arbitrary values unreliable in dev
  },
  secondary: {
    container: 'bg-surface border border-primary active:opacity-80',
    text: 'font-semibold',
    textColor: '#DCFF4A',
  },
  ghost: {
    container: 'active:opacity-60',
    text: 'font-semibold',
    textColor: '#9CA3AF',
  },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  className = '',
}: ButtonProps) {
  const styles = variantStyles[variant];

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      className={`
        rounded-xl py-4 px-6 items-center justify-center min-h-[52px]
        ${styles.container}
        ${disabled || loading ? 'opacity-50' : ''}
        ${className}
      `}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={styles.textColor}
        />
      ) : (
        <AppText
          className={`text-base ${styles.text}`}
          style={{ color: styles.textColor }}
        >
          {label}
        </AppText>
      )}
    </TouchableOpacity>
  );
}
