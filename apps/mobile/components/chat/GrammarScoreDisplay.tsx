import React from 'react';
import { View, Animated } from 'react-native';
import {
  Star, Smiley, ThumbsUp, Lightning, Leaf,
  Target, TrendUp, NotePencil,
  BookOpen, CheckCircle, Warning, Lightbulb,
} from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';

interface GrammarScoreDisplayProps {
  grammarScore: number;
  grammarErrors: number;
  textComplexity: string;
  xpAwarded: number;
  userLevel: 'Novice' | 'Intermediate' | 'Advanced';
}

const GrammarScoreDisplay: React.FC<GrammarScoreDisplayProps> = ({
  grammarScore,
  grammarErrors,
  textComplexity,
  xpAwarded,
  userLevel,
}) => {
  const barWidth = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(barWidth, {
      toValue: grammarScore,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [grammarScore]);

  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#4ade80';
    if (score >= 80) return '#60a5fa';
    if (score >= 70) return '#facc15';
    if (score >= 60) return '#fb923c';
    return '#f87171';
  };

  const getScoreIcon = (score: number) => {
    const size = 26;
    if (score >= 90) return <Star size={size} color="#facc15" weight="fill" />;
    if (score >= 80) return <Smiley size={size} color="#60a5fa" weight="fill" />;
    if (score >= 70) return <ThumbsUp size={size} color="#facc15" weight="fill" />;
    if (score >= 60) return <Lightning size={size} color="#fb923c" weight="fill" />;
    return <Leaf size={size} color="#4ade80" weight="fill" />;
  };

  const getComplexityIcon = (complexity: string) => {
    const size = 16;
    switch (complexity) {
      case 'advanced':     return <Target size={size} color="#a78bfa" weight="fill" />;
      case 'intermediate': return <TrendUp size={size} color="#60a5fa" weight="fill" />;
      case 'simple':       return <Leaf size={size} color="#4ade80" weight="fill" />;
      default:             return <NotePencil size={size} color="#8A8494" weight="fill" />;
    }
  };

  const getEncouragementMessage = (): string => {
    if (userLevel === 'Novice') {
      if (grammarScore >= 80) return "Excellent grammar! You're mastering English!";
      if (grammarScore >= 70) return "Great grammar! Your English is really strong!";
      if (grammarScore >= 60) return "Very good! You're improving fast!";
      return "Keep practicing! Every message helps you improve!";
    } else if (userLevel === 'Intermediate') {
      if (grammarScore >= 85) return "Outstanding grammar! Professional level!";
      if (grammarScore >= 75) return "Great work! Your skills are solid!";
      if (grammarScore >= 65) return "Good progress! Keep refining!";
      return "Keep going! You're getting stronger!";
    } else {
      if (grammarScore >= 90) return "Exceptional mastery! Native-like quality!";
      if (grammarScore >= 80) return "Excellent command! Very impressive!";
      if (grammarScore >= 70) return "Strong performance! Well done!";
      return "Good foundation! Continue challenging yourself!";
    }
  };

  const scoreColor = getScoreColor(grammarScore);

  return (
    <View className="bg-surface/80 rounded-xl p-4 border border-primary/20 mt-3">

      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center space-x-2">
          <BookOpen size={15} color="#DCFF4A" weight="fill" />
          <AppText className="text-primary font-medium text-sm">Grammar Analysis</AppText>
        </View>
        <View className="flex-row items-center space-x-1">
          <AppText className="text-xs text-white/60">+{xpAwarded} XP</AppText>
          <Star size={13} color="#facc15" weight="fill" />
        </View>
      </View>

      {/* Score principal */}
      <View className="items-center mb-4">
        <View className="flex-row items-center space-x-3">
          <AppText style={{ color: scoreColor }} className="text-2xl font-bold">
            {grammarScore}/100
          </AppText>
          {getScoreIcon(grammarScore)}
        </View>
        <AppText className="text-xs text-white/60 mt-1">Grammar Score</AppText>
      </View>

      {/* Detalhes: erros + complexidade */}
      <View className="flex-row gap-3 mb-3">
        <View className="flex-1 bg-black/20 rounded-lg p-3 items-center">
          <View className="mb-1">
            {grammarErrors === 0
              ? <CheckCircle size={18} color="#4ade80" weight="fill" />
              : <Warning size={18} color="#fb923c" weight="fill" />
            }
          </View>
          <AppText className="text-sm font-medium text-white">
            {grammarErrors === 0
              ? 'No errors!'
              : `${grammarErrors} error${grammarErrors > 1 ? 's' : ''}`}
          </AppText>
          <AppText className="text-xs text-white/60">Found</AppText>
        </View>

        <View className="flex-1 bg-black/20 rounded-lg p-3 items-center">
          <View className="mb-1">{getComplexityIcon(textComplexity)}</View>
          <AppText className="text-sm font-medium text-white capitalize">{textComplexity}</AppText>
          <AppText className="text-xs text-white/60">Complexity</AppText>
        </View>
      </View>

      {/* Mensagem de encorajamento */}
      <View className="bg-primary/10 rounded-lg p-3 border border-primary/20 mb-3">
        <View className="flex-row items-start space-x-2">
          <TrendUp size={14} color="#DCFF4A" weight="fill" style={{ marginTop: 2 }} />
          <View className="flex-1">
            <AppText className="text-sm text-white/90 leading-relaxed">
              {getEncouragementMessage()}
            </AppText>
            {grammarScore < 70 && (
              <View className="flex-row items-center space-x-1 mt-1">
                <Lightbulb size={12} color="#facc15" weight="fill" />
                <AppText className="text-xs text-white/60">
                  Tip: Try writing longer sentences and check your punctuation!
                </AppText>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Barra de progresso */}
      <View>
        <View className="flex-row justify-between mb-1">
          <AppText className="text-xs text-white/60">Progress</AppText>
          <AppText className="text-xs text-white/60">{grammarScore}%</AppText>
        </View>
        <View className="w-full bg-black/30 rounded-full h-2 overflow-hidden">
          <Animated.View
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: scoreColor,
              width: barWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            }}
          />
        </View>
      </View>
    </View>
  );
};

export default GrammarScoreDisplay;
