import React from 'react';
import { Modal, View, TouchableOpacity, Animated } from 'react-native';
import {
  Hand, ChatTeardropText, Microphone, Phone,
  Lightning, RocketLaunch,
} from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';

interface OnboardingStep {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  userLevel: 'Novice' | 'Inter' | 'Advanced';
}

const ICON_SIZE = 48;
const ICON_BG   = 'rgba(220,255,74,0.12)';
const ICON_COLOR = '#DCFF4A';

function buildSteps(isNovice: boolean): OnboardingStep[] {
  return [
    {
      id: 'welcome',
      icon: <Hand size={ICON_SIZE} color={ICON_COLOR} weight="fill" />,
      title: isNovice ? 'Bem-vindo ao Queizy!' : 'Welcome to Queizy!',
      description: isNovice
        ? 'A Charlotte é sua professora de inglês com IA. Vamos explorar como usar o app!'
        : "Charlotte is your AI English tutor. Let's explore what you can do!",
    },
    {
      id: 'text',
      icon: <ChatTeardropText size={ICON_SIZE} color={ICON_COLOR} weight="fill" />,
      title: isNovice ? 'Escreva Mensagens' : 'Write Messages',
      description: isNovice
        ? 'Digite suas mensagens em inglês. Charlotte vai corrigir sua gramática e te dar feedback!'
        : 'Type your messages in English. Charlotte will correct your grammar and give feedback!',
    },
    {
      id: 'audio',
      icon: <Microphone size={ICON_SIZE} color={ICON_COLOR} weight="fill" />,
      title: isNovice ? 'Grave Áudio' : 'Record Audio',
      description: isNovice
        ? 'Pressione o botão de microfone e grave sua voz! Charlotte vai avaliar sua pronúncia.'
        : 'Press the microphone button and speak! Charlotte will evaluate your pronunciation.',
    },
    {
      id: 'live',
      icon: <Phone size={ICON_SIZE} color={ICON_COLOR} weight="fill" />,
      title: isNovice ? 'Voz ao Vivo' : 'Live Voice',
      description: isNovice
        ? 'Use a conversa por voz em tempo real para praticar como se fosse uma ligação!'
        : 'Use real-time voice conversation to practice like a phone call!',
    },
    {
      id: 'xp',
      icon: <Lightning size={ICON_SIZE} color={ICON_COLOR} weight="fill" />,
      title: isNovice ? 'Ganhe XP' : 'Earn XP',
      description: isNovice
        ? 'Cada mensagem e prática de áudio te dá pontos de experiência. Suba de nível!'
        : 'Every message and audio practice earns you experience points. Level up!',
    },
    {
      id: 'ready',
      icon: <RocketLaunch size={ICON_SIZE} color={ICON_COLOR} weight="fill" />,
      title: isNovice ? 'Tudo Pronto!' : "You're All Set!",
      description: isNovice
        ? 'Comece conversando com Charlotte agora. Boa prática!'
        : "Start chatting with Charlotte now. Happy practicing!",
    },
  ];
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onClose,
  onComplete,
  userLevel,
}) => {
  const isNovice = userLevel === 'Novice';
  const steps = React.useMemo(() => buildSteps(isNovice), [isNovice]);

  const [currentStep, setCurrentStep] = React.useState(0);
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  const animateToStep = (nextStep: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep(nextStep);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      animateToStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <View className="flex-1 bg-black/85 items-center justify-center px-6">
        <View className="bg-surface rounded-2xl p-6 w-full max-w-sm">

          {/* Progress dots */}
          <View className="flex-row justify-center gap-1.5 mb-6">
            {steps.map((_, i) => (
              <View
                key={i}
                className={`rounded-full ${
                  i === currentStep ? 'bg-primary w-4 h-2' : 'bg-white/20 w-2 h-2'
                }`}
              />
            ))}
          </View>

          {/* Step content */}
          <Animated.View style={{ opacity: fadeAnim }} className="items-center gap-4 mb-6">
            <View style={{
              width: 88, height: 88, borderRadius: 28,
              backgroundColor: ICON_BG,
              alignItems: 'center', justifyContent: 'center',
            }}>
              {step.icon}
            </View>
            <AppText className="text-xl font-bold text-textPrimary text-center">
              {step.title}
            </AppText>
            <AppText className="text-textSecondary text-sm text-center leading-relaxed">
              {step.description}
            </AppText>
          </Animated.View>

          {/* Actions */}
          <View className="gap-3">
            <Button
              label={isLast ? (isNovice ? 'Começar!' : "Let's Go!") : (isNovice ? 'Próximo' : 'Next')}
              onPress={handleNext}
            />
            {!isLast && (
              <TouchableOpacity onPress={handleSkip} className="items-center py-2">
                <AppText className="text-textSecondary text-sm">
                  {isNovice ? 'Pular tour' : 'Skip tour'}
                </AppText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default OnboardingTour;
