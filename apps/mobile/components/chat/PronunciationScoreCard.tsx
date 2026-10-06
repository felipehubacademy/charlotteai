import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, ScrollView, Pressable, Platform } from 'react-native';
import {
  Target, TextT, Wind, CheckCircle, MusicNotes,
  X as XIcon,
} from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import CharlotteAvatar from '@/components/ui/CharlotteAvatar';

// ── Palette ────────────────────────────────────────────────────
const C = {
  card:      '#FFFFFF',
  navy:      '#16131F',
  navyMid:   '#4D4858',
  navyLight: '#8A8494',
  ghost:     'rgba(22,19,31,0.06)',
  border:    'rgba(22,19,31,0.10)',
};

const cardShadow = Platform.select({
  ios: {
    shadowColor: 'rgba(22,19,31,0.10)',
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
  },
  android: { elevation: 3 },
});

// ── Types ──────────────────────────────────────────────────────

export interface PronunciationData {
  text: string;
  pronunciationScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore?: number;
  words: Array<{
    word: string;
    accuracyScore: number;
    errorType?: string;
  }>;
}

// ── Metric definitions ─────────────────────────────────────────

const METRICS = [
  {
    label: 'Overall Score',
    Icon: Target,
    description:
      'The combined pronunciation score — a summary of how clearly and naturally you spoke. 85+ is excellent, 70–84 is good, 55–69 is getting there.',
  },
  {
    label: 'Accuracy',
    Icon: TextT,
    description:
      'How correctly you pronounced each individual sound. High accuracy means every letter and syllable was clearly recognisable.',
  },
  {
    label: 'Fluency',
    Icon: Wind,
    description:
      'How smoothly you spoke without too many pauses or hesitations. A fluent speaker sounds relaxed and rhythmic.',
  },
  {
    label: 'Completeness',
    Icon: CheckCircle,
    description:
      'Whether you said all the words in the phrase. A low score usually means a word was omitted or the recording cut off early.',
  },
  {
    label: 'Prosody',
    Icon: MusicNotes,
    description:
      'The music of speech: stress, rhythm, and intonation. Prosody measures whether you put emphasis on the right syllables and spoke with a natural cadence — not flat or robotic.',
  },
];

// ── Helpers ────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 85) return '#22C55E';
  if (score >= 70) return '#F59E0B';
  if (score >= 55) return '#FB923C';
  return '#DC2626';
}

function overallLabel(score: number): string {
  if (score >= 90) return 'Excellent!';
  if (score >= 80) return 'Very good!';
  if (score >= 70) return 'Good job!';
  if (score >= 55) return 'Keep going!';
  return 'Keep practising';
}

// ── ScoreBar ───────────────────────────────────────────────────

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = scoreColor(score);
  return (
    <View style={{ marginBottom: 9 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <AppText style={{ fontSize: 11, color: C.navyLight, fontWeight: '600' }}>{label}</AppText>
        <AppText style={{ fontSize: 11, color, fontWeight: '800' }}>{Math.round(score)}</AppText>
      </View>
      <View style={{ height: 5, backgroundColor: C.ghost, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{
          height: '100%',
          width: `${Math.min(score, 100)}%`,
          backgroundColor: color,
          borderRadius: 3,
        }} />
      </View>
    </View>
  );
}

// ── Metrics Modal ──────────────────────────────────────────────

function MetricsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(22,19,31,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={e => e.stopPropagation()}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            width: '100%',
            maxHeight: '82%',
            paddingTop: 20,
            paddingBottom: 8,
          }}
        >
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 20, marginBottom: 4,
          }}>
            <AppText style={{ fontSize: 16, fontWeight: '800', color: C.navy }}>
              Score Explained
            </AppText>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: C.ghost,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <XIcon size={13} color={C.navyMid} weight="bold" />
            </TouchableOpacity>
          </View>

          <AppText style={{
            fontSize: 12, color: C.navyLight,
            paddingHorizontal: 20, marginBottom: 14, lineHeight: 17,
          }}>
            Charlotte analyses your speech across 5 dimensions:
          </AppText>

          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingBottom: 12 }}>
            <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
              {METRICS.map((m, i) => {
                const IconComp = m.Icon;
                return (
                  <View
                    key={m.label}
                    style={{
                      flexDirection: 'row',
                      paddingVertical: 12,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: C.ghost,
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    <View style={{
                      width: 34, height: 34, borderRadius: 10,
                      backgroundColor: C.ghost,
                      alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <IconComp size={16} color={C.navyMid} weight="regular" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={{ fontSize: 13, fontWeight: '800', color: C.navy, marginBottom: 2 }}>
                        {m.label}
                      </AppText>
                      <AppText style={{ fontSize: 12, color: C.navyMid, lineHeight: 17 }}>
                        {m.description}
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function PronunciationScoreCard({
  data,
  timestamp,
}: {
  data: PronunciationData;
  timestamp?: Date;
}) {
  const [modalVisible, setModalVisible] = useState(false);

  const unavailable  = data.pronunciationScore < 0;
  const overall      = unavailable ? 0 : Math.round(data.pronunciationScore);
  const overallColor = unavailable ? C.navyLight : scoreColor(overall);

  const problemWords = unavailable ? [] : data.words.filter(
    w =>
      (w.errorType === 'Mispronunciation' || w.errorType === 'Omission') &&
      w.accuracyScore < 70
  );

  return (
    <View style={{ flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' }}>

      {/* Avatar */}
      <View style={{ marginRight: 8, marginTop: 2 }}>
        <CharlotteAvatar size="xs" />
      </View>

      <View style={{ maxWidth: '82%' }}>

        {/* Card */}
        <View style={{
          backgroundColor: C.card,
          borderRadius: 20,
          borderBottomLeftRadius: 5,
          padding: 16,
          borderWidth: 1,
          borderColor: C.border,
          ...cardShadow,
        }}>

          {/* ── Unavailable state ── */}
          {unavailable ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: C.ghost,
                alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <MusicNotes size={20} color={C.navyLight} weight="regular" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={{ fontSize: 13, fontWeight: '700', color: C.navyMid }}>
                  Analysis unavailable
                </AppText>
                <AppText style={{ fontSize: 11, color: C.navyLight, marginTop: 2, lineHeight: 16 }}>
                  Could not reach the scoring service. Charlotte will still give you feedback below.
                </AppText>
              </View>
            </View>
          ) : (
            <>
              {/* ── ? button — absolute top-right ── */}
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: C.ghost,
                  borderWidth: 1, borderColor: C.border,
                  alignItems: 'center', justifyContent: 'center',
                  zIndex: 1,
                }}
              >
                <AppText style={{ fontSize: 11, fontWeight: '800', color: C.navyLight }}>?</AppText>
              </TouchableOpacity>

              {/* ── Overall score row ── */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, paddingRight: 28 }}>
                <View style={{
                  width: 58, height: 58, borderRadius: 29,
                  backgroundColor: `${overallColor}14`,
                  borderWidth: 2.5,
                  borderColor: overallColor,
                  alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <AppText style={{ fontSize: 21, fontWeight: '900', color: overallColor, letterSpacing: -1 }}>
                    {overall}
                  </AppText>
                </View>
                <View>
                  <AppText style={{ fontSize: 14, fontWeight: '800', color: C.navy }}>
                    {overallLabel(overall)}
                  </AppText>
                  <AppText style={{ fontSize: 11, color: C.navyLight, marginTop: 2 }}>
                    Pronunciation score
                  </AppText>
                </View>
              </View>

              {/* ── Score bars ── */}
              <ScoreBar label="Accuracy"     score={data.accuracyScore}     />
              <ScoreBar label="Fluency"      score={data.fluencyScore}      />
              <ScoreBar label="Completeness" score={data.completenessScore} />
              {data.prosodyScore !== undefined && data.prosodyScore > 0 && (
                <ScoreBar label="Prosody" score={data.prosodyScore} />
              )}

              {/* ── Problem words ── */}
              {problemWords.length > 0 && (
                <View style={{
                  marginTop: 12, paddingTop: 12,
                  borderTopWidth: 1, borderTopColor: C.ghost,
                }}>
                  <AppText style={{
                    fontSize: 10, fontWeight: '700', color: C.navyLight,
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
                  }}>
                    Needs work
                  </AppText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {problemWords.map((w, i) => (
                      <View key={i} style={{
                        backgroundColor: 'rgba(220,38,38,0.07)',
                        borderRadius: 8,
                        paddingHorizontal: 9, paddingVertical: 4,
                        borderWidth: 1,
                        borderColor: 'rgba(220,38,38,0.18)',
                      }}>
                        <AppText style={{ fontSize: 13, color: '#DC2626', fontWeight: '700' }}>
                          {w.word}
                        </AppText>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* ── Transcription ── */}
              {!!data.text && (
                <View style={{
                  marginTop: 12, paddingTop: 12,
                  borderTopWidth: 1, borderTopColor: C.ghost,
                }}>
                  <AppText style={{
                    fontSize: 10, fontWeight: '700', color: C.navyLight,
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4,
                  }}>
                    Heard
                  </AppText>
                  <AppText style={{ fontSize: 13, color: C.navyMid, fontStyle: 'italic', lineHeight: 19 }}>
                    "{data.text}"
                  </AppText>
                </View>
              )}
            </>
          )}
        </View>

        {/* Timestamp */}
        <AppText style={{
          fontSize: 10, color: 'rgba(22,19,31,0.35)',
          marginTop: 4, paddingHorizontal: 4,
        }}>
          {timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </AppText>

      </View>

      {/* Modal */}
      <MetricsModal visible={modalVisible} onClose={() => setModalVisible(false)} />

    </View>
  );
}
