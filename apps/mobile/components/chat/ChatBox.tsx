import React from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';
import {
  Play, Pause, SpeakerHigh,
  Globe, Microphone, ArrowsClockwise,
  ChatCenteredText, Lightbulb,
} from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import CharlotteAvatar from '@/components/ui/CharlotteAvatar';
import { translationService, TranslationResult } from '@/lib/translation-service';
import PronunciationScoreCard, { PronunciationData } from '@/components/chat/PronunciationScoreCard';
import { router } from 'expo-router';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;          // remote URL (Charlotte's TTS response)
  audioUri?: string;          // local file URI (user's recorded audio)
  audioDuration?: number;
  isTyping?: boolean;
  isRecording?: boolean;
  timestamp?: Date;
  messageType?: 'text' | 'audio' | 'pronunciation_score';
  technicalFeedback?: string;
  pronunciationData?: PronunciationData; // score card data
  isDemonstration?: boolean;             // Charlotte demonstrating a word via TTS
  isSeparator?: boolean;                 // Visual divider between history and current session
  isExplainMore?: boolean;              // Response to an "Explain more" tap — hides the button
  vocabularySuggestions?: string[];     // Terms Charlotte suggests adding to vocabulary
}

interface ChatBoxProps {
  messages: Message[];
  transcript: string;
  finalTranscript: string;
  isProcessingMessage: boolean;
  isProcessingAudio?: boolean;
  historyLoading?: boolean;
  userLevel: string;
  mode?: 'grammar' | 'pronunciation' | 'chat';
  onPlayAudio?: (messageId: string, uri: string) => void;
  playingMessageId?: string | null;
  /** Called when user taps "Me explique melhor" / "Explain more" in grammar mode */
  onExplainMore?: (originalCorrection: string) => void;
}

// Typing indicator — dots for text, mic pulse for audio
const TypingIndicator = ({ isAudio = false }: { isAudio?: boolean }) => {
  const dots = [0, 1, 2].map(() => React.useRef(new Animated.Value(0)).current);
  const pulse = React.useRef(new Animated.Value(0.5)).current;

  React.useEffect(() => {
    if (isAudio) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.5, duration: 600, useNativeDriver: true }),
        ])
      ).start();
      return () => pulse.stopAnimation();
    } else {
      const animations = dots.map((dot, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 200),
            Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
          ])
        )
      );
      animations.forEach(a => a.start());
      return () => animations.forEach(a => a.stop());
    }
  }, [isAudio]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, alignSelf: 'flex-start' }}>
      <CharlotteAvatar size="xs" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0EFFA', borderRadius: 18, borderTopLeftRadius: 0, paddingHorizontal: 14, paddingVertical: 12 }}>
        {isAudio ? (
          <Animated.View style={{ opacity: pulse }}>
            <Microphone size={16} color="#3D8800" weight="fill" />
          </Animated.View>
        ) : (
          dots.map((dot, i) => (
            <Animated.View
              key={i}
              style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(22,21,58,0.45)', opacity: dot }}
            />
          ))
        )}
      </View>
    </View>
  );
};

// Audio waveform indicator
const AudioRecordingIndicator = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: '#F0EFFA', borderRadius: 18, borderTopLeftRadius: 0, alignSelf: 'flex-start', marginBottom: 16 }}>
    <CharlotteAvatar size="xs" />
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Microphone size={14} color="#3D8800" weight="fill" />
      <AppText style={{ color: 'rgba(22,21,58,0.65)', fontSize: 14 }}>Recording...</AppText>
    </View>
  </View>
);

const MessageBubble: React.FC<{
  message: Message;
  userLevel: string;
  mode?: 'grammar' | 'pronunciation' | 'chat';
  isPlaying: boolean;
  onTogglePlay: () => void;
  onExplainMore?: (originalCorrection: string) => void;
}> = ({ message, userLevel, mode, isPlaying, onTogglePlay, onExplainMore }) => {
  const [showTranslation, setShowTranslation] = React.useState(false);
  const [showTranscription, setShowTranscription] = React.useState(false);
  const [translation, setTranslation] = React.useState('');
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [translationError, setTranslationError] = React.useState(false);
  const [transcription, setTranscription] = React.useState('');
  const openAddWord = (termVal: string) => {
    router.push({ pathname: '/(app)/add-word', params: { term: termVal, source: 'charlotte' } });
  };

  const isUser = message.role === 'user';
  const isNovice = userLevel === 'Novice';
  const hasAudio = !!(message.audioUrl || message.audioUri);
  // Charlotte's audio response — text hidden by default, revealed via "Ver texto"
  const isCharlotteAudio  = !isUser && message.messageType === 'audio' && !!message.audioUrl;
  const isDemonstration   = !!message.isDemonstration;

  const fetchTranslation = async () => {
    if (translation) return; // já temos
    setIsTranslating(true);
    setTranslationError(false);
    try {
      const result: TranslationResult = await translationService.translateToPortuguese(
        message.content,
        'Charlotte English tutor conversation',
        userLevel
      );
      setTranslation(result.success ? result.translatedText : result.translatedText);
      if (!result.success) setTranslationError(true);
    } catch {
      setTranslationError(true);
      setTranslation('Desculpe, não foi possível traduzir esta mensagem no momento.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTranslation = async () => {
    if (!showTranslation && !translation && !isTranslating) {
      await fetchTranslation();
    }
    setShowTranslation(v => !v);
  };

  const handleTranscription = () => {
    // Use the actual content (already available — it's the text sent to TTS)
    setTranscription(message.content || '');
    setShowTranscription(v => !v);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
    <View style={{ flexDirection: 'row', marginBottom: 16, justifyContent: isUser ? 'flex-end' : 'flex-start', alignItems: 'flex-start' }}>
      {/* Avatar for assistant messages — alinhado ao topo */}
      {!isUser && (
        <View style={{ marginRight: 8, marginTop: 2 }}>
          <CharlotteAvatar size="xs" />
        </View>
      )}
      <View style={{ maxWidth: '78%', marginLeft: isUser ? 48 : 0, marginRight: isUser ? 0 : 8 }}>

        {/* Bubble */}
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 20,
            backgroundColor: isUser ? '#A3FF3C' : '#F0EFFA',
            borderBottomRightRadius: isUser ? 0 : 20,
            borderBottomLeftRadius: isUser ? 20 : 20,
            borderTopLeftRadius: isUser ? 20 : 0,
          }}
        >
          {/* Demo badge — shown for pronunciation demonstration messages */}
          {isDemonstration && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              marginBottom: 8,
              backgroundColor: 'rgba(163,255,60,0.12)',
              borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
              alignSelf: 'flex-start',
            }}>
              <SpeakerHigh size={11} color="#3D8800" weight="fill" />
              <AppText style={{ fontSize: 10, fontWeight: '700', color: '#3D8800', textTransform: 'uppercase', letterSpacing: 0.7 }}>
                Demonstration
              </AppText>
            </View>
          )}

          {/* Text content — hidden for Charlotte's audio responses (shown via "Ver texto") */}
          {!!message.content && !isCharlotteAudio && (
            <AppText
              style={{ fontSize: 14, lineHeight: 21, color: isUser ? '#16153A' : '#16153A' }}
            >
              {message.content}
            </AppText>
          )}

          {/* Audio player */}
          {hasAudio && (
            <View
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                ...(!isCharlotteAudio && !isDemonstration && message.content
                  ? { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(22,21,58,0.08)' }
                  : {}),
              }}
            >
              {/* Play/Pause button
                  User bubble  → dark on green
                  Demo bubble  → navy on navy-tint (high contrast on lavender)
                  Charlotte    → navy on navy-tint (replaces near-invisible lime on lavender) */}
              <TouchableOpacity
                onPress={onTogglePlay}
                style={{
                  padding: 7, borderRadius: 20,
                  backgroundColor: isUser
                    ? 'rgba(0,0,0,0.18)'
                    : 'rgba(22,21,58,0.12)',
                }}
              >
                {isPlaying
                  ? <Pause size={14} color={isUser ? '#000' : '#16153A'} weight="fill" />
                  : <Play  size={14} color={isUser ? '#000' : '#16153A'} weight="fill" />
                }
              </TouchableOpacity>

              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 28 }}>
                {Array.from({ length: 22 }).map((_, i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 4 + ((i * 7 + 3) % 16),
                      borderRadius: 2,
                      backgroundColor: isUser
                        ? `rgba(0,0,0,${0.25 + (i % 3) * 0.1})`
                        : `rgba(22,21,58,${0.18 + (i % 3) * 0.08})`,
                    }}
                  />
                ))}
              </View>

              <SpeakerHigh size={14}
                color={isUser ? 'rgba(0,0,0,0.35)' : 'rgba(22,21,58,0.35)'}
                weight="regular"
              />
            </View>
          )}
        </View>


        {/* Action buttons below assistant messages */}
        {!isUser && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6, paddingHorizontal: 2 }}>
            {isNovice && mode === 'chat' && (
              <TouchableOpacity
                onPress={handleTranslation}
                disabled={isTranslating}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                {isTranslating
                  ? <ArrowsClockwise size={12} color="#9896B8" weight="regular" />
                  : <Globe size={12} color="#4B4A72" weight="regular" />
                }
                <AppText style={{ fontSize: 12, color: isTranslating ? '#9896B8' : '#4B4A72' }}>
                  {isTranslating ? 'Traduzindo...' : 'Traduzir'}
                </AppText>
              </TouchableOpacity>
            )}

            {/* "Me explique melhor" — grammar mode, Charlotte messages only, not on greeting or explain-more responses */}
            {mode === 'grammar' && !!message.content && !!onExplainMore && message.id !== 'welcome-0' && !message.isExplainMore && (
              <TouchableOpacity
                onPress={() => onExplainMore(message.content)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Lightbulb size={12} color="#4B4A72" weight="regular" />
                <AppText style={{ fontSize: 12, color: '#4B4A72' }}>
                  {isNovice ? 'Me explique melhor' : 'Explain more'}
                </AppText>
              </TouchableOpacity>
            )}

            {/* "Ver texto" — shows Charlotte's TTS text; available for all levels on audio responses */}
            {isCharlotteAudio && !!message.content && (
              <TouchableOpacity
                onPress={handleTranscription}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <ChatCenteredText size={12} color="#4B4A72" weight="regular" />
                <AppText style={{ fontSize: 12, color: '#4B4A72' }}>
                  {showTranscription
                    ? (userLevel === 'Novice' ? 'Esconder' : 'Hide text')
                    : (userLevel === 'Novice' ? 'Ver texto' : 'Show text')}
                </AppText>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Translation panel — discreto: linha fina + italico, sem box */}
        {showTranslation && (
          <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(22,21,58,0.08)' }}>
            {isTranslating ? (
              <AppText style={{ fontSize: 13, color: '#9896B8', fontStyle: 'italic' }}>
                Traduzindo...
              </AppText>
            ) : (
              <AppText style={{ fontSize: 13, color: '#4B4A72', fontStyle: 'italic', lineHeight: 19 }}>
                {translation || 'Tradução não disponível.'}
              </AppText>
            )}
            {translationError && !isTranslating && (
              <TouchableOpacity
                onPress={() => { setTranslation(''); setTranslationError(false); fetchTranslation(); }}
                style={{ marginTop: 4 }}
              >
                <AppText style={{ fontSize: 11, color: '#9896B8' }}>Tentar novamente</AppText>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Transcription panel */}
        {showTranscription && (
          <View style={{ marginTop: 8, padding: 12, backgroundColor: '#F4F3FA', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(22,21,58,0.1)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 }}>
              <ChatCenteredText size={12} color="#3D8800" weight="regular" />
              <AppText style={{ fontSize: 11, color: '#3D8800', fontWeight: '600' }}>Transcription</AppText>
            </View>
            <AppText style={{ fontSize: 14, color: '#16153A' }}>{transcription}</AppText>
          </View>
        )}


        {/* Vocabulary suggestion chips */}
        {!isUser && !!message.vocabularySuggestions?.length && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {message.vocabularySuggestions.map(term => (
              <TouchableOpacity
                key={term}
                onPress={() => openAddWord(term)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: 'rgba(61,136,0,0.10)',
                  borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
                  borderWidth: 1, borderColor: 'rgba(61,136,0,0.20)',
                }}
              >
                <AppText style={{ fontSize: 12, color: '#3D8800', fontWeight: '600' }}>+ {term}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Timestamp */}
        <AppText style={{ fontSize: 10, color: 'rgba(22,21,58,0.35)', marginTop: 4, paddingHorizontal: 4, textAlign: isUser ? 'right' : 'left' }}>
          {message.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </AppText>
      </View>
    </View>

    </>
  );
};

// Main ChatBox
const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  transcript,
  finalTranscript,
  isProcessingMessage,
  isProcessingAudio = false,
  historyLoading = false,
  userLevel,
  mode,
  onPlayAudio,
  playingMessageId,
  onExplainMore,
}) => {
  const flatListRef = React.useRef<FlatList>(null);

  // FlatList inverted = messages appear at bottom, newest on top
  // We reverse so index 0 = newest (inverted FlatList renders it at bottom)
  const reversedMessages = React.useMemo(() => [...messages].reverse(), [messages]);

  const renderItem = ({ item }: { item: Message }) => {
    if (item.isSeparator) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 12, paddingHorizontal: 16 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(22,21,58,0.08)' }} />
          <View style={{ marginHorizontal: 10 }}>
            <AppText style={{ fontSize: 11, color: '#9896B8' }}>new session</AppText>
          </View>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(22,21,58,0.08)' }} />
        </View>
      );
    }
    if (item.messageType === 'pronunciation_score' && item.pronunciationData) {
      return (
        <PronunciationScoreCard
          data={item.pronunciationData}
          timestamp={item.timestamp}
        />
      );
    }
    return (
      <MessageBubble
        message={item}
        userLevel={userLevel}
        mode={mode}
        isPlaying={playingMessageId === item.id}
        onTogglePlay={() => {
          const uri = item.audioUri ?? item.audioUrl ?? '';
          if (uri) onPlayAudio?.(item.id, uri);
        }}
        onExplainMore={onExplainMore}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F3FA' }}>
      {/* Subtle dot texture — like WhatsApp */}
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <Circle cx="2" cy="2" r="1.1" fill="rgba(22,21,58,0.055)" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#dots)" />
      </Svg>
      {historyLoading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
          <ActivityIndicator size="small" color="#9896B8" />
        </View>
      )}
      <FlatList
        ref={flatListRef}
        data={reversedMessages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        inverted
        style={{ backgroundColor: 'transparent' }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 14, paddingVertical: 12, paddingBottom: 4 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Shown at the "bottom" of the list (top in inverted) */}
            {isProcessingMessage && <TypingIndicator isAudio={isProcessingAudio} />}

            {/* Live transcript while recording */}
            {!!(transcript || finalTranscript) && (
              <View className="bg-primary/10 rounded-xl p-3 mb-4 border border-primary/20">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <Microphone size={12} color="#3D8800" weight="fill" />
                  <AppText className="text-xs font-medium" style={{ color: '#3D8800' }}>Listening...</AppText>
                </View>
                <AppText className="text-sm text-white">
                  <AppText className="text-white/50">{transcript}</AppText>
                  <AppText className="text-white font-medium">{finalTranscript}</AppText>
                </AppText>
              </View>
            )}
          </>
        }
      />
    </View>
  );
};

export default ChatBox;
