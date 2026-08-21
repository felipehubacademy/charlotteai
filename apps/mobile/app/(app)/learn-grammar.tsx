import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput,
   Platform, Animated,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft, ArrowRight, CheckCircle, XCircle,
  LightbulbFilament,
} from 'phosphor-react-native';
import AnimatedXPBadge from '@/components/ui/AnimatedXPBadge';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/useAuth';
import { useTotalXP } from '@/hooks/useTotalXP';
import { AppText } from '@/components/ui/Text';
import CharlotteAvatar from '@/components/ui/CharlotteAvatar';

// ── Palette ────────────────────────────────────────────────────
const C = {
  bg:        '#F4F3FA',
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  ghost:     'rgba(22,21,58,0.06)',
  border:    'rgba(22,21,58,0.10)',
  gold:      '#D97706',
  goldBg:    '#FFFBEB',
  greenDark: '#3D8800',
  greenBg:   '#F0FFD9',
  red:       '#DC2626',
  redBg:     'rgba(220,38,38,0.07)',
};

const shadow = Platform.select({
  ios:     { shadowColor: 'rgba(22,21,58,0.10)', shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 3 },
});

// ── Types ──────────────────────────────────────────────────────

type ExerciseType = 'multiple_choice' | 'word_bank' | 'fill_gap' | 'fix_error' | 'read_answer';

interface Exercise {
  type:       ExerciseType;
  sentence?:  string;
  passage?:   string;
  question?:  string;
  answer:     string;
  options?:   string[];   // multiple_choice: [correct, wrong1, wrong2]
  choices?:   string[];   // word_bank: [correct, distractor1, distractor2, distractor3]
  hint?:      string;
  explanation: string;
}

const TYPE_LABELS: Record<ExerciseType, string> = {
  multiple_choice: 'Choose the Answer',
  word_bank:       'Word Bank',
  fill_gap:        'Fill the Gap',
  fix_error:       'Fix the Error',
  read_answer:     'Read & Answer',
};

const TYPE_INSTRUCTIONS: Record<ExerciseType, string> = {
  multiple_choice: 'Choose the correct option to complete the sentence.',
  word_bank:       'Tap the correct word to fill the blank.',
  fill_gap:        'Fill in the blank with the correct word or phrase.',
  fix_error:       'Find the mistake and rewrite the sentence correctly.',
  read_answer:     'Read the passage and answer the question.',
};

// ── Exercise bank ──────────────────────────────────────────────

const EXERCISES: Record<string, Record<ExerciseType, Exercise[]>> = {
  Novice: {
    multiple_choice: [
      { type: 'multiple_choice', sentence: 'She _____ (go) to school every day.',                  answer: 'goes',           options: ['goes', 'go', 'going'],              explanation: '"Goes" is the third person singular form of "go" in the present simple.' },
      { type: 'multiple_choice', sentence: 'I _____ a student at this university.',                 answer: 'am',             options: ['am', 'is', 'are'],                  explanation: '"Am" is the first person singular form of the verb "to be".' },
      { type: 'multiple_choice', sentence: 'They _____ very happy at the party yesterday.',         answer: 'were',           options: ['were', 'was', 'are'],               explanation: '"Were" is the past tense of "to be" for "they".' },
      { type: 'multiple_choice', sentence: 'He _____ (not speak) French very well.',                answer: "doesn't speak",  options: ["doesn't speak", "don't speak", "not speak"], explanation: '"Doesn\'t speak" is correct for third person singular negative.' },
      { type: 'multiple_choice', sentence: 'We always _____ (have) dinner at 7 pm.',                answer: 'have',           options: ['have', 'has', 'having'],            explanation: '"Have" stays the same for "we" in the present simple.' },
      { type: 'multiple_choice', sentence: 'There _____ a cat on the roof.',                        answer: 'is',             options: ['is', 'are', 'were'],               explanation: '"Is" is used with singular nouns after "there".' },
      { type: 'multiple_choice', sentence: 'I _____ (not eat) meat. I am vegetarian.',             answer: "don't eat",      options: ["don't eat", "doesn't eat", "not eating"], explanation: '"Don\'t eat" is the negative form for "I" in the present simple.' },
      { type: 'multiple_choice', sentence: 'She _____ (study) English for two hours every day.',    answer: 'studies',        options: ['studies', 'study', 'is study'],     explanation: 'Verbs ending in consonant + y change to -ies for third person singular.' },
      { type: 'multiple_choice', sentence: 'The children _____ (play) in the park right now.',     answer: 'are playing',    options: ['are playing', 'is playing', 'plays'], explanation: '"Are playing" is the present continuous for an action happening now.' },
      { type: 'multiple_choice', sentence: 'I _____ born in 1995.',                                answer: 'was',            options: ['was', 'were', 'am'],               explanation: '"Was" is the past tense of "to be" for "I".' },
      { type: 'multiple_choice', sentence: 'Can you _____ (help) me with this exercise?',          answer: 'help',           options: ['help', 'helping', 'helped'],        explanation: 'After modal verbs like "can", the main verb is in the base form.' },
      { type: 'multiple_choice', sentence: 'She has _____ (work) here since 2020.',                answer: 'worked',         options: ['worked', 'working', 'works'],       explanation: '"Worked" is the past participle used in present perfect.' },
    ],
    word_bank: [
      { type: 'word_bank', sentence: 'She _____ to school every day.',          answer: 'goes',  choices: ['goes', 'go', 'went', 'going'],          explanation: '"Goes" is the third person singular of "go" in present simple.' },
      { type: 'word_bank', sentence: 'I _____ a student at this university.',   answer: 'am',    choices: ['am', 'is', 'are', 'be'],                explanation: '"Am" is the first person singular of "to be".' },
      { type: 'word_bank', sentence: 'There _____ a cat on the roof.',          answer: 'is',    choices: ['is', 'are', 'was', 'were'],             explanation: '"Is" is used with singular nouns after "there".' },
      { type: 'word_bank', sentence: 'They _____ very happy at the party.',     answer: 'were',  choices: ['were', 'was', 'are', 'be'],             explanation: '"Were" is the past tense of "to be" for "they".' },
      { type: 'word_bank', sentence: 'We always _____ dinner at 7 pm.',         answer: 'have',  choices: ['have', 'has', 'had', 'having'],         explanation: '"Have" stays the same for "we" in the present simple.' },
      { type: 'word_bank', sentence: 'I _____ born in 1995.',                   answer: 'was',   choices: ['was', 'were', 'am', 'been'],            explanation: '"Was" is the past tense of "to be" for "I".' },
    ],
    fill_gap: [
      { type: 'fill_gap', sentence: 'She _____ (go) to school every day.',                   answer: 'goes',      hint: 'Third person singular adds -s',           explanation: '"Goes" is the third person singular form of "go" in the present simple.' },
      { type: 'fill_gap', sentence: 'I _____ a student at this university.',                  answer: 'am',        hint: 'To be: I am, you are, he is',              explanation: '"Am" is the first person singular form of the verb "to be".' },
      { type: 'fill_gap', sentence: 'They _____ very happy at the party yesterday.',          answer: 'were',      hint: 'Past tense of "to be" for they',           explanation: '"Were" is the past tense of "to be" for "they".' },
      { type: 'fill_gap', sentence: 'He _____ (not speak) French very well.',                 answer: "doesn't speak", hint: 'Negative present simple: does not',     explanation: '"Doesn\'t speak" is correct for third person singular negative.' },
      { type: 'fill_gap', sentence: 'We always _____ (have) dinner at 7 pm.',                 answer: 'have',      hint: 'Simple present with "we"',                 explanation: '"Have" stays the same for "we" in the present simple.' },
      { type: 'fill_gap', sentence: 'There _____ a cat on the roof.',                         answer: 'is',        hint: 'There is / there are',                    explanation: '"Is" is used with singular nouns after "there".' },
      { type: 'fill_gap', sentence: 'I _____ (not eat) meat. I am vegetarian.',              answer: "don't eat", hint: 'Negative present simple: do not',          explanation: '"Don\'t eat" is the negative form for "I" in the present simple.' },
      { type: 'fill_gap', sentence: 'She _____ (study) English for two hours every day.',     answer: 'studies',   hint: 'Verb + -ies for he/she/it ending in y',   explanation: 'Verbs ending in consonant + y change to -ies for third person singular.' },
      { type: 'fill_gap', sentence: 'The children _____ (play) in the park right now.',      answer: 'are playing', hint: 'Present continuous: to be + -ing',        explanation: '"Are playing" is the present continuous for an action happening now.' },
      { type: 'fill_gap', sentence: 'I _____ born in 1995.',                                 answer: 'was',       hint: 'Past tense of "to be" for I',              explanation: '"Was" is the past tense of "to be" for "I".' },
      { type: 'fill_gap', sentence: 'Can you _____ (help) me with this exercise?',           answer: 'help',      hint: 'Modal verbs are followed by infinitive',  explanation: 'After modal verbs like "can", the main verb is in the base form.' },
      { type: 'fill_gap', sentence: 'She has _____ (work) here since 2020.',                 answer: 'worked',    hint: 'Present perfect: have/has + past participle', explanation: '"Worked" is the past participle used in present perfect.' },
    ],
    fix_error: [
      { type: 'fix_error', sentence: 'Yesterday I go to the supermarket.',             answer: 'Yesterday I went to the supermarket.',         hint: 'Wrong verb tense',          explanation: '"Went" is the past tense of "go" — use past simple for finished actions.' },
      { type: 'fix_error', sentence: 'She have a beautiful house.',                    answer: 'She has a beautiful house.',                   hint: 'Subject-verb agreement',    explanation: '"Has" is the correct form of "have" for third person singular (she).' },
      { type: 'fix_error', sentence: 'I am agree with you.',                           answer: 'I agree with you.',                            hint: '"Agree" is not used with "be"', explanation: '"Agree" is a regular verb — do not use "am/is/are" before it.' },
      { type: 'fix_error', sentence: 'He don\'t like coffee.',                         answer: "He doesn't like coffee.",                      hint: 'Third person negative',     explanation: 'For "he/she/it", use "doesn\'t" (not "don\'t") in negatives.' },
      { type: 'fix_error', sentence: 'They was at the party last night.',              answer: 'They were at the party last night.',            hint: 'Past tense of "to be"',     explanation: '"Were" is the past tense of "to be" for "they".' },
      { type: 'fix_error', sentence: 'I have 25 years old.',                           answer: 'I am 25 years old.',                           hint: 'Age uses "to be" in English', explanation: 'In English, age is expressed with "to be", not "to have".' },
      { type: 'fix_error', sentence: 'She is more tall than her brother.',             answer: 'She is taller than her brother.',               hint: 'Comparative adjectives',    explanation: 'Short adjectives use -er for comparison, not "more".' },
      { type: 'fix_error', sentence: 'I didn\'t went to school today.',                answer: "I didn't go to school today.",                  hint: 'After "did", use base form', explanation: 'After "did/didn\'t", always use the base form of the verb.' },
      { type: 'fix_error', sentence: 'There is many people in the room.',             answer: 'There are many people in the room.',            hint: 'People is plural',          explanation: '"People" is plural, so use "there are", not "there is".' },
      { type: 'fix_error', sentence: 'He works very hardly.',                          answer: 'He works very hard.',                          hint: 'Adverb form',               explanation: '"Hard" is both an adjective and adverb — "hardly" has a different meaning (almost not).' },
      { type: 'fix_error', sentence: 'I like very much chocolate.',                    answer: 'I like chocolate very much.',                   hint: 'Word order with "very much"', explanation: '"Very much" comes at the end, after the object.' },
      { type: 'fix_error', sentence: 'She can to speak three languages.',              answer: 'She can speak three languages.',                hint: 'Modal verbs + base form',   explanation: 'After modal verbs (can, will, must…), use the base form without "to".' },
    ],
    read_answer: [
      { type: 'read_answer', passage: 'Maria lives in São Paulo. She works at a hospital as a nurse. Every morning she wakes up at 5 am.', question: 'What time does Maria wake up?',        answer: '5 am',         explanation: 'The passage says "every morning she wakes up at 5 am".' },
      { type: 'read_answer', passage: 'Tom has two dogs and a cat. He takes them to the park every Sunday. His favourite dog is called Max.', question: "What is Tom's favourite dog called?", answer: 'Max',          explanation: 'The passage says "his favourite dog is called Max".' },
      { type: 'read_answer', passage: 'Anna is learning English. She studies for one hour every evening after dinner. She also watches English films.', question: 'When does Anna study English?', answer: 'every evening', explanation: 'The passage says she studies "every evening after dinner".' },
      { type: 'read_answer', passage: 'Pedro works in a café. He starts at 8 am and finishes at 4 pm. He makes coffee and sandwiches for customers.', question: 'What does Pedro make at work?',  answer: 'coffee and sandwiches', explanation: 'The passage says "he makes coffee and sandwiches for customers".' },
      { type: 'read_answer', passage: 'Lucy loves reading books. Her favourite genre is mystery. She usually reads before going to sleep.', question: 'When does Lucy usually read?',        answer: 'before sleeping', explanation: 'The passage says she reads "before going to sleep".' },
      { type: 'read_answer', passage: 'Carlos is from Brazil but lives in London. He moved there three years ago to study engineering. He misses Brazilian food.', question: 'Why did Carlos move to London?', answer: 'to study engineering', explanation: 'The passage says he "moved there to study engineering".' },
    ],
  },

  Inter: {
    multiple_choice: [
      { type: 'multiple_choice', sentence: 'If I _____ (know) her number, I would call her.',         answer: 'knew',              options: ['knew', 'know', 'known'],                  explanation: 'In the second conditional, use past simple in the "if" clause.' },
      { type: 'multiple_choice', sentence: 'She suggested _____ (go) to a different restaurant.',      answer: 'going',             options: ['going', 'to go', 'go'],                   explanation: '"Suggest" takes a gerund (-ing form), not an infinitive.' },
      { type: 'multiple_choice', sentence: 'By the time we arrived, the film _____ (already start).',  answer: 'had already started', options: ['had already started', 'already started', 'has already started'], explanation: 'Past perfect shows an action completed before another past action.' },
      { type: 'multiple_choice', sentence: "I'd rather you _____ (not tell) anyone about this.",       answer: "didn't tell",       options: ["didn't tell", "don't tell", "not tell"],   explanation: 'After "I\'d rather you…", use the past simple.' },
      { type: 'multiple_choice', sentence: "She's used to _____ (work) night shifts.",                answer: 'working',           options: ['working', 'work', 'to work'],              explanation: '"Be used to" expresses familiarity and is followed by a gerund.' },
      { type: 'multiple_choice', sentence: "It's the best film I _____ (ever see).",                  answer: 'have ever seen',    options: ['have ever seen', 'ever saw', 'ever seen'], explanation: 'After superlatives, use the present perfect.' },
      { type: 'multiple_choice', sentence: 'He admitted _____ (steal) the money.',                    answer: 'stealing',          options: ['stealing', 'to steal', 'steal'],           explanation: '"Admit" is always followed by a gerund (-ing form).' },
      { type: 'multiple_choice', sentence: 'She had her car _____ (repair) last week.',               answer: 'repaired',          options: ['repaired', 'repair', 'repairing'],         explanation: '"Have something done" uses a past participle.' },
      { type: 'multiple_choice', sentence: 'Despite _____ (study) hard, he failed the exam.',         answer: 'studying',          options: ['studying', 'study', 'to study'],           explanation: '"Despite" and "in spite of" are followed by a noun or gerund.' },
      { type: 'multiple_choice', sentence: 'I wish I _____ (can) travel more often.',                 answer: 'could',             options: ['could', 'can', 'would'],                  explanation: '"Wish" for present regrets uses the past tense.' },
      { type: 'multiple_choice', sentence: "You'd better _____ (leave) now or you'll miss the bus.",  answer: 'leave',             options: ['leave', 'to leave', 'leaving'],            explanation: '"Had better" is followed by the base form of the verb.' },
      { type: 'multiple_choice', sentence: 'Not only _____ she late, but she also forgot her keys.',  answer: 'was',               options: ['was', 'were', 'is'],                      explanation: 'After "not only" at the start, invert subject and auxiliary verb.' },
    ],
    word_bank: [
      { type: 'word_bank', sentence: 'If I _____ her number, I would call her.',          answer: 'knew',     choices: ['knew', 'know', 'known', 'knows'],             explanation: 'In the second conditional, use past simple in the "if" clause.' },
      { type: 'word_bank', sentence: 'She suggested _____ to a different restaurant.',    answer: 'going',    choices: ['going', 'to go', 'go', 'gone'],               explanation: '"Suggest" takes a gerund (-ing form).' },
      { type: 'word_bank', sentence: "She's used to _____ night shifts.",                 answer: 'working',  choices: ['working', 'work', 'to work', 'worked'],       explanation: '"Be used to" is followed by a gerund.' },
      { type: 'word_bank', sentence: 'Despite _____ hard, he failed the exam.',           answer: 'studying', choices: ['studying', 'study', 'to study', 'studied'],   explanation: '"Despite" is followed by a gerund.' },
      { type: 'word_bank', sentence: "I'd rather you _____ anyone about this.",           answer: "didn't tell", choices: ["didn't tell", "don't tell", "not tell", "haven't told"], explanation: 'After "I\'d rather you…", use the past simple.' },
      { type: 'word_bank', sentence: 'He admitted _____ the money.',                      answer: 'stealing', choices: ['stealing', 'to steal', 'steal', 'stolen'],    explanation: '"Admit" is always followed by a gerund.' },
    ],
    fill_gap: [
      { type: 'fill_gap', sentence: 'If I _____ (know) her number, I would call her.',       answer: 'knew',           hint: 'Second conditional: if + past simple',     explanation: 'In the second conditional, use past simple in the "if" clause.' },
      { type: 'fill_gap', sentence: 'She suggested _____ (go) to a different restaurant.',   answer: 'going',          hint: '"Suggest" is followed by -ing',            explanation: '"Suggest" takes a gerund (-ing form), not an infinitive.' },
      { type: 'fill_gap', sentence: 'By the time we arrived, the film _____ (already start).', answer: 'had already started', hint: 'Past perfect for a prior event',     explanation: 'Past perfect shows an action completed before another past action.' },
      { type: 'fill_gap', sentence: 'I\'d rather you _____ (not tell) anyone about this.',   answer: "didn't tell",    hint: '"Would rather" + past tense',             explanation: 'After "I\'d rather you…", use the past simple.' },
      { type: 'fill_gap', sentence: 'She\'s used to _____ (work) night shifts.',             answer: 'working',        hint: '"Used to" + -ing (habit)',                 explanation: '"Be used to" expresses familiarity and is followed by a gerund.' },
      { type: 'fill_gap', sentence: 'It\'s the best film I _____ (ever see).',               answer: 'have ever seen', hint: 'Superlative + present perfect',            explanation: 'After superlatives, use the present perfect to describe life experience.' },
      { type: 'fill_gap', sentence: 'He admitted _____ (steal) the money.',                  answer: 'stealing',       hint: '"Admit" takes gerund',                    explanation: '"Admit" is always followed by a gerund (-ing form).' },
      { type: 'fill_gap', sentence: 'She had her car _____ (repair) last week.',             answer: 'repaired',       hint: 'Causative "have something done"',          explanation: '"Have something done" uses a past participle to show someone else did it.' },
      { type: 'fill_gap', sentence: 'Despite _____ (study) hard, he failed the exam.',       answer: 'studying',       hint: '"Despite" + gerund',                      explanation: '"Despite" and "in spite of" are followed by a noun or gerund.' },
      { type: 'fill_gap', sentence: 'I wish I _____ (can) travel more often.',               answer: 'could',          hint: '"Wish" + past modal',                     explanation: '"Wish" for present regrets uses the past tense (could = past of can).' },
      { type: 'fill_gap', sentence: 'You\'d better _____ (leave) now or you\'ll miss the bus.', answer: 'leave',       hint: '"Had better" + base form',                explanation: '"Had better" is followed by the base form of the verb (no "to").' },
      { type: 'fill_gap', sentence: 'Not only _____ she late, but she also forgot her keys.', answer: 'was',            hint: 'Inversion after "Not only"',              explanation: 'After "not only" at the start, invert subject and auxiliary verb.' },
    ],
    fix_error: [
      { type: 'fix_error', sentence: 'I am used to wake up early.',                      answer: 'I am used to waking up early.',               hint: '"Be used to" + gerund',     explanation: '"Be used to" expresses habit and must be followed by -ing, not infinitive.' },
      { type: 'fix_error', sentence: 'She told me that she will call me later.',         answer: 'She told me that she would call me later.',    hint: 'Reported speech tense shift', explanation: 'In reported speech, "will" shifts to "would".' },
      { type: 'fix_error', sentence: 'The news are very worrying today.',               answer: 'The news is very worrying today.',             hint: '"News" is uncountable',      explanation: '"News" is an uncountable noun and always takes a singular verb.' },
      { type: 'fix_error', sentence: 'He denied to take the money.',                     answer: 'He denied taking the money.',                  hint: '"Deny" + gerund',            explanation: '"Deny" must be followed by a gerund, not an infinitive.' },
      { type: 'fix_error', sentence: 'I look forward to hear from you soon.',            answer: 'I look forward to hearing from you soon.',     hint: '"Look forward to" + gerund', explanation: '"Look forward to" is a phrasal verb — "to" is a preposition, so use -ing.' },
      { type: 'fix_error', sentence: 'If I would have more time, I\'d learn piano.',     answer: "If I had more time, I'd learn piano.",         hint: 'Second conditional',        explanation: 'In the second conditional, use past simple (not "would") in the "if" clause.' },
      { type: 'fix_error', sentence: 'She has been living here since three years.',      answer: 'She has been living here for three years.',    hint: 'Since vs for',               explanation: '"Since" marks a point in time; "for" marks a duration.' },
      { type: 'fix_error', sentence: 'He made me to apologise.',                         answer: 'He made me apologise.',                        hint: 'Causative "make" + base form', explanation: 'After "make someone do something", use the base form (no "to").' },
      { type: 'fix_error', sentence: 'I\'ve been to Paris last summer.',                 answer: 'I went to Paris last summer.',                 hint: 'Finished past vs present perfect', explanation: 'With specific past time markers (last summer), use simple past.' },
      { type: 'fix_error', sentence: 'Can you give me an advice?',                       answer: 'Can you give me some advice?',                 hint: '"Advice" is uncountable',   explanation: '"Advice" is uncountable — use "some advice", never "an advice".' },
      { type: 'fix_error', sentence: 'She is very talented, isn\'t it?',                 answer: "She is very talented, isn't she?",             hint: 'Question tag must match subject', explanation: 'Question tags must match the subject of the main clause.' },
      { type: 'fix_error', sentence: 'I\'ve bought a new car two days ago.',             answer: 'I bought a new car two days ago.',             hint: 'Past time + tense choice',  explanation: '"Two days ago" is a specific past time marker — use simple past.' },
    ],
    read_answer: [
      { type: 'read_answer', passage: 'Remote work has changed how many companies operate. While some employees enjoy the flexibility, others struggle with isolation and blurred work-life boundaries. Many firms now offer hybrid models as a compromise.', question: 'What do some firms offer as a compromise?', answer: 'hybrid models', explanation: 'The passage says "many firms now offer hybrid models as a compromise".' },
      { type: 'read_answer', passage: 'James applied for a promotion last month but was turned down. His manager said his presentation skills needed improvement. James has since enrolled in a public speaking course.', question: 'Why was James turned down for the promotion?', answer: 'presentation skills', explanation: 'His manager said "his presentation skills needed improvement".' },
      { type: 'read_answer', passage: 'The conference was originally scheduled for March, but due to unforeseen circumstances it was postponed. Attendees were notified by email and offered full refunds if they could not attend the new date.', question: 'How were attendees informed of the change?', answer: 'by email', explanation: 'The passage says "attendees were notified by email".' },
      { type: 'read_answer', passage: 'Despite initial resistance, the new software has been widely adopted across departments. Training sessions were provided, and most staff found the interface intuitive after just one week.', question: 'How long did it take most staff to find the interface intuitive?', answer: 'one week', explanation: 'The passage says "most staff found the interface intuitive after just one week".' },
      { type: 'read_answer', passage: 'Sarah has been working in marketing for eight years. Last year she decided to launch her own consultancy. Her first client was a tech startup that needed help with brand identity.', question: 'What did Sarah\'s first client need help with?', answer: 'brand identity', explanation: 'The passage says her first client "needed help with brand identity".' },
      { type: 'read_answer', passage: 'Urban cycling has grown dramatically in the past decade. City councils have responded by expanding cycle lanes and introducing bike-sharing programmes. Air quality has improved in several cities as a result.', question: 'What has improved as a result of more cycling?', answer: 'air quality', explanation: 'The passage says "air quality has improved in several cities as a result".' },
    ],
  },

  Advanced: {
    multiple_choice: [
      { type: 'multiple_choice', sentence: 'Had she _____ (arrive) earlier, she would have met him.',    answer: 'arrived',        options: ['arrived', 'arrive', 'arriving'],             explanation: 'Inverted third conditional: "Had + subject + past participle".' },
      { type: 'multiple_choice', sentence: 'The proposal was met with _____ (resist) from the board.',   answer: 'resistance',     options: ['resistance', 'resist', 'resistant'],         explanation: '"Resistance" is the noun form — "from" requires a noun.' },
      { type: 'multiple_choice', sentence: 'It is essential that the report _____ (submit) by Friday.',   answer: 'be submitted',   options: ['be submitted', 'is submitted', 'was submitted'], explanation: 'After "it is essential that", use the present subjunctive.' },
      { type: 'multiple_choice', sentence: 'The findings, _____ preliminary, suggest a significant shift.', answer: 'albeit',       options: ['albeit', 'although', 'despite'],             explanation: '"Albeit" means "even though" and is used mid-sentence in formal register.' },
      { type: 'multiple_choice', sentence: 'Rarely _____ such dedication from a junior member of staff.', answer: 'have I seen',   options: ['have I seen', 'I have seen', 'have seen I'], explanation: 'When "rarely" opens a sentence, invert the subject and auxiliary.' },
      { type: 'multiple_choice', sentence: 'She spoke with _____ conviction that no one questioned her.',  answer: 'such',          options: ['such', 'so', 'very'],                       explanation: '"Such" before a noun phrase introduces a result clause with "that".' },
      { type: 'multiple_choice', sentence: 'The policy has far-reaching _____ for the entire industry.',   answer: 'implications',  options: ['implications', 'implication', 'implying'],   explanation: '"Far-reaching implications" is a common formal collocation.' },
      { type: 'multiple_choice', sentence: 'We need to _____ a distinction between correlation and causation.', answer: 'draw',    options: ['draw', 'make', 'do'],                       explanation: '"Draw a distinction" is the correct collocation.' },
      { type: 'multiple_choice', sentence: 'She _____ have known better than to sign the contract.',       answer: 'should',        options: ['should', 'would', 'could'],                 explanation: '"Should have + past participle" criticises a past decision.' },
      { type: 'multiple_choice', sentence: 'The extent _____ the damage has been underestimated is alarming.', answer: 'to which', options: ['to which', 'at which', 'in which'],        explanation: '"To which" is used in formal relative clauses.' },
      { type: 'multiple_choice', sentence: 'No sooner _____ she left than it started to rain.',             answer: 'had',           options: ['had', 'has', 'have'],                       explanation: '"No sooner had + subject + past participle" is the inverted structure.' },
      { type: 'multiple_choice', sentence: 'The merger, if it _____ to proceed, would reshape the market.', answer: 'were',          options: ['were', 'was', 'would be'],                  explanation: '"Were to" expresses a hypothetical condition in formal English.' },
    ],
    word_bank: [
      { type: 'word_bank', sentence: 'Had she _____ earlier, she would have met him.',        answer: 'arrived',        choices: ['arrived', 'arrive', 'arriving', 'been arriving'],   explanation: 'Inverted third conditional uses past participle.' },
      { type: 'word_bank', sentence: 'It is essential that the report _____ by Friday.',      answer: 'be submitted',   choices: ['be submitted', 'is submitted', 'was submitted', 'submit'], explanation: 'The present subjunctive follows "it is essential that".' },
      { type: 'word_bank', sentence: 'Rarely _____ such dedication from a junior member.',    answer: 'have I seen',    choices: ['have I seen', 'I have seen', 'I had seen', 'have seen I'], explanation: 'Inversion after negative adverb "rarely".' },
      { type: 'word_bank', sentence: 'The policy has far-reaching _____ for the industry.',   answer: 'implications',   choices: ['implications', 'implication', 'implying', 'implied'],   explanation: '"Far-reaching implications" is the correct formal collocation.' },
      { type: 'word_bank', sentence: 'We need to _____ a distinction between the two.',       answer: 'draw',           choices: ['draw', 'make', 'do', 'create'],                          explanation: '"Draw a distinction" is the idiomatic collocation.' },
      { type: 'word_bank', sentence: 'No sooner _____ she left than it started to rain.',     answer: 'had',            choices: ['had', 'has', 'have', 'having'],                          explanation: '"No sooner had + subject" is the correct inverted structure.' },
    ],
    fill_gap: [
      { type: 'fill_gap', sentence: 'Had she _____ (arrive) earlier, she would have met him.',  answer: 'arrived',         hint: 'Third conditional inversion',             explanation: 'Inverted third conditional: "Had + subject + past participle" replaces "If + past perfect".' },
      { type: 'fill_gap', sentence: 'The proposal was met with _____ (resist) from the board.', answer: 'resistance',      hint: 'Noun form of the verb "resist"',           explanation: '"Resistance" is the noun form — "from" requires a noun, not a verb.' },
      { type: 'fill_gap', sentence: 'It is essential that the report _____ (submit) by Friday.', answer: 'be submitted',    hint: 'Subjunctive in formal recommendation',    explanation: 'After "it is essential that", use the present subjunctive ("be submitted").' },
      { type: 'fill_gap', sentence: 'The findings, _____ preliminary, suggest a significant shift.', answer: 'albeit',      hint: 'Formal concessive conjunction',           explanation: '"Albeit" means "even though" and is used mid-sentence in formal register.' },
      { type: 'fill_gap', sentence: 'Rarely _____ such dedication from a junior member of staff.', answer: 'have I seen',   hint: 'Inversion after negative adverb',         explanation: 'When "rarely" opens a sentence, invert the subject and auxiliary.' },
      { type: 'fill_gap', sentence: 'She spoke with _____ conviction that no one questioned her.', answer: 'such',          hint: '"Such + noun" for result clauses',        explanation: '"Such" before a noun phrase introduces a result clause with "that".' },
      { type: 'fill_gap', sentence: 'The policy has far-reaching _____ for the entire industry.',   answer: 'implications', hint: 'Noun collocating with "far-reaching"',     explanation: '"Far-reaching implications" is a common formal collocation.' },
      { type: 'fill_gap', sentence: 'We need to _____ a distinction between correlation and causation.', answer: 'draw',   hint: 'Collocation: draw a distinction',         explanation: '"Draw a distinction" is the correct collocation, not "make" or "do".' },
      { type: 'fill_gap', sentence: 'She _____ have known better than to sign the contract.',        answer: 'should',       hint: 'Criticism of a past action',              explanation: '"Should have + past participle" criticises a past decision.' },
      { type: 'fill_gap', sentence: 'The extent _____ the damage has been underestimated is alarming.', answer: 'to which', hint: 'Formal relative clause',                  explanation: '"To which" is used in formal relative clauses replacing "how much".' },
      { type: 'fill_gap', sentence: 'No sooner _____ she left than it started to rain.',             answer: 'had',          hint: 'Inversion after "No sooner"',             explanation: '"No sooner had + subject + past participle" is the inverted structure.' },
      { type: 'fill_gap', sentence: 'The merger, if it _____ to proceed, would reshape the market.',  answer: 'were',         hint: 'Formal subjunctive in conditional',       explanation: '"Were to" expresses a hypothetical condition in formal English.' },
    ],
    fix_error: [
      { type: 'fix_error', sentence: 'The data clearly shows that the hypothesis is correct.',    answer: 'The data clearly show that the hypothesis is correct.',   hint: '"Data" is plural',            explanation: '"Data" is the plural of "datum" — it takes a plural verb in formal usage.' },
      { type: 'fix_error', sentence: 'She is one of the few managers who takes this seriously.',  answer: 'She is one of the few managers who take this seriously.', hint: 'Relative clause agreement',   explanation: '"Who" refers to "managers" (plural), so the verb must be plural ("take").' },
      { type: 'fix_error', sentence: 'The board comprises of five members.',                      answer: 'The board comprises five members.',                       hint: '"Comprise" does not need "of"', explanation: '"Comprise" already means "consist of" — adding "of" is redundant.' },
      { type: 'fix_error', sentence: 'Due to the delay, we were forced to cancel our plans.',     answer: 'Owing to the delay, we were forced to cancel our plans.', hint: '"Due to" vs "owing to"',       explanation: '"Due to" modifies nouns; "owing to" modifies verbs/clauses.' },
      { type: 'fix_error', sentence: 'Each of the candidates have submitted their proposal.',     answer: 'Each of the candidates has submitted their proposal.',    hint: '"Each" is singular',          explanation: '"Each" is always singular and requires a singular verb.' },
      { type: 'fix_error', sentence: 'The reason why he resigned was because of the restructuring.', answer: 'The reason why he resigned was the restructuring.',   hint: 'Redundant "because"',         explanation: '"The reason… was because" is redundant. Use "the reason was [noun]".' },
      { type: 'fix_error', sentence: 'She refuted the allegations, but didn\'t provide evidence.', answer: 'She denied the allegations, but did not provide evidence.', hint: '"Refute" has a specific meaning', explanation: '"Refute" means to disprove with evidence. Without evidence, "denied" is correct.' },
      { type: 'fix_error', sentence: 'Irregardless of the outcome, we must continue.',            answer: 'Regardless of the outcome, we must continue.',           hint: '"Irregardless" is non-standard', explanation: '"Irregardless" is not standard English. The correct form is "regardless".' },
      { type: 'fix_error', sentence: 'The committee discussed about the new proposal.',           answer: 'The committee discussed the new proposal.',               hint: '"Discuss" is transitive',     explanation: '"Discuss" is a transitive verb — it takes a direct object without "about".' },
      { type: 'fix_error', sentence: 'It\'s a phenomena that scientists can\'t explain.',         answer: "It's a phenomenon that scientists can't explain.",        hint: 'Singular vs plural form',     explanation: '"Phenomenon" is singular; "phenomena" is plural. Use singular with "a".' },
      { type: 'fix_error', sentence: 'Her performance was unique and very unique.',               answer: 'Her performance was truly unique.',                       hint: '"Unique" cannot be modified with "very"', explanation: '"Unique" is an absolute adjective — it means one of a kind. Use "truly" instead of "very".' },
      { type: 'fix_error', sentence: 'The impact of the decision will effect all departments.',   answer: 'The impact of the decision will affect all departments.',  hint: 'Affect vs effect',           explanation: '"Affect" is a verb (to influence); "effect" is usually a noun (a result).' },
    ],
    read_answer: [
      { type: 'read_answer', passage: 'The Jevons paradox states that technological improvements in resource efficiency often lead to increased overall consumption rather than conservation. As efficiency rises, the cost of using a resource falls, which tends to stimulate demand.', question: 'What happens to demand when efficiency improves?', answer: 'demand increases', explanation: 'The paradox explains that lower cost "tends to stimulate demand".' },
      { type: 'read_answer', passage: 'Organisational psychologists distinguish between "surface acting" and "deep acting" in emotional labour. Surface acting involves suppressing genuine feelings, while deep acting requires actually reshaping one\'s inner emotional state. The latter tends to cause less burnout over time.', question: 'Which form of emotional labour tends to cause less burnout?', answer: 'deep acting', explanation: 'The passage states "deep acting tends to cause less burnout over time".' },
      { type: 'read_answer', passage: 'Critics of shareholder primacy argue that companies which prioritise short-term profits over stakeholder wellbeing undermine long-term value. Proponents counter that market mechanisms naturally correct for such behaviour.', question: 'What do proponents believe corrects poor corporate behaviour?', answer: 'market mechanisms', explanation: 'Proponents argue "market mechanisms naturally correct for such behaviour".' },
      { type: 'read_answer', passage: 'The concept of cognitive dissonance, introduced by Leon Festinger in 1957, describes the mental discomfort experienced when holding two contradictory beliefs simultaneously. People are motivated to resolve this tension by changing a belief or acquiring new information.', question: 'Who introduced the concept of cognitive dissonance?', answer: 'Leon Festinger', explanation: 'The passage clearly states it was "introduced by Leon Festinger in 1957".' },
      { type: 'read_answer', passage: 'Sycophantic behaviour in the workplace — the tendency to tell superiors what they want to hear — is widely recognised as damaging to decision-making quality. Organisations rarely create structures that incentivise candid upward feedback, often because leaders implicitly reward agreement.', question: 'Why do organisations rarely incentivise candid feedback?', answer: 'leaders reward agreement', explanation: 'The passage says "leaders implicitly reward agreement".' },
      { type: 'read_answer', passage: 'Most contemporary researchers favour a weaker version of the Sapir-Whorf hypothesis: that language influences, but does not fully determine, how we perceive reality. The strong form — that language determines cognitive categories — is largely rejected.', question: 'What do most researchers today believe about language and thought?', answer: 'language influences thought', explanation: 'Most favour the view that language "influences, but does not fully determine, how we perceive reality".' },
    ],
  },
};

// ── Answer checking ────────────────────────────────────────────

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[.,!?'"]/g, '').replace(/\s+/g, ' ');
}

function checkAnswer(ex: Exercise, userAnswer: string): boolean {
  const u = normalize(userAnswer);
  const c = normalize(ex.answer);
  if (u === c) return true;
  if (ex.type === 'multiple_choice' || ex.type === 'word_bank') return false;
  if (ex.type === 'read_answer') {
    const words = c.split(' ').filter(w => w.length > 2);
    return words.length > 0 && words.filter(w => u.includes(w)).length >= Math.ceil(words.length * 0.7);
  }
  if (ex.type === 'fix_error' && c.length > 10) {
    return u === c || u.includes(c) || c.includes(u);
  }
  return false;
}

// ── Sequence ────────────────────────────────────────────────────
// Scaffolded progression per block: recognition → guided production → free production
// multiple_choice → multiple_choice → word_bank → fill_gap → fix_error → read_answer

const GRAMMAR_SEQUENCE: Array<{ type: ExerciseType; idx: number }> = [
  // Block 1
  { type: 'multiple_choice', idx: 0 }, { type: 'multiple_choice', idx: 1 },
  { type: 'word_bank',       idx: 0 },
  { type: 'fill_gap',        idx: 6 },
  { type: 'fix_error',       idx: 0 },
  { type: 'read_answer',     idx: 0 },
  // Block 2
  { type: 'multiple_choice', idx: 2 }, { type: 'multiple_choice', idx: 3 },
  { type: 'word_bank',       idx: 1 },
  { type: 'fill_gap',        idx: 7 },
  { type: 'fix_error',       idx: 1 },
  { type: 'read_answer',     idx: 1 },
  // Block 3
  { type: 'multiple_choice', idx: 4 }, { type: 'multiple_choice', idx: 5 },
  { type: 'word_bank',       idx: 2 },
  { type: 'fill_gap',        idx: 8 },
  { type: 'fix_error',       idx: 2 },
  { type: 'read_answer',     idx: 2 },
  // Block 4
  { type: 'multiple_choice', idx: 6 }, { type: 'multiple_choice', idx: 7 },
  { type: 'word_bank',       idx: 3 },
  { type: 'fill_gap',        idx: 9 },
  { type: 'fix_error',       idx: 3 },
  { type: 'read_answer',     idx: 3 },
  // Block 5
  { type: 'multiple_choice', idx: 8 }, { type: 'multiple_choice', idx: 9 },
  { type: 'word_bank',       idx: 4 },
  { type: 'fill_gap',        idx: 10 },
  { type: 'fix_error',       idx: 4 },
  { type: 'read_answer',     idx: 4 },
  // Block 6
  { type: 'multiple_choice', idx: 10 }, { type: 'multiple_choice', idx: 11 },
  { type: 'word_bank',       idx: 5 },
  { type: 'fill_gap',        idx: 11 },
  { type: 'fix_error',       idx: 5 },
  { type: 'read_answer',     idx: 5 },
];

const GRAMMAR_TOTAL = GRAMMAR_SEQUENCE.length; // 36

// ── Main Screen ────────────────────────────────────────────────

export default function LearnGrammarScreen() {
  const { profile } = useAuth();
  const userId    = profile?.id;
  const userLevel = (profile?.charlotte_level ?? 'Novice') as string;
  const baseTotalXP = useTotalXP(userId);

  const [stepIndex, setStepIndex]           = useState(0);
  const [isComplete, setIsComplete]         = useState(false);
  const [exercise, setExercise]             = useState<Exercise | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([]);
  const [status, setStatus]                 = useState<'answering' | 'submitted'>('answering');
  const [userAnswer, setUserAnswer]         = useState('');
  const [isCorrect, setIsCorrect]           = useState<boolean | null>(null);
  const [showHint, setShowHint]             = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal]     = useState(0);
  const [sessionXP, setSessionXP]           = useState(0);
  const feedbackAnim = useRef(new Animated.Value(0)).current;

  const loadStep = useCallback((idx: number) => {
    if (idx >= GRAMMAR_TOTAL) { setIsComplete(true); return; }
    const { type, idx: exIdx } = GRAMMAR_SEQUENCE[idx];
    const pool = (EXERCISES[userLevel] ?? EXERCISES.Inter)[type];
    const ex = pool[exIdx];
    setStepIndex(idx);
    setExercise(ex);
    setUserAnswer('');
    setIsCorrect(null);
    setShowHint(false);
    setStatus('answering');
    feedbackAnim.setValue(0);
    if (ex.options) setShuffledOptions([...ex.options].sort(() => Math.random() - 0.5));
    if (ex.choices) setShuffledChoices([...ex.choices].sort(() => Math.random() - 0.5));
  }, [userLevel, feedbackAnim]);

  useEffect(() => { loadStep(0); }, []);

  const handleSubmit = () => {
    if (!exercise || !userAnswer.trim()) return;
    const correct = checkAnswer(exercise, userAnswer);
    setIsCorrect(correct);
    setStatus('submitted');
    setSessionTotal(t => t + 1);
    if (correct) {
      setSessionCorrect(c => c + 1);
      setSessionXP(xp => xp + 10);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setSessionXP(xp => xp + 2);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    Animated.spring(feedbackAnim, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }).start();
  };

  const handleNext = () => { loadStep(stepIndex + 1); };

  const accuracy = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : null;
  const progress  = (stepIndex + 1) / GRAMMAR_TOTAL;

  // ── Completion ──────────────────────────────────────────────
  if (isComplete) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'left', 'right', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: C.goldBg, borderWidth: 2, borderColor: C.gold,
            alignItems: 'center', justifyContent: 'center', marginBottom: 24,
          }}>
            <CheckCircle size={40} color={C.gold} weight="fill" />
          </View>
          <AppText style={{ fontSize: 24, fontWeight: '900', color: C.navy, marginBottom: 8, letterSpacing: -0.5 }}>
            Session complete!
          </AppText>
          <AppText style={{ fontSize: 15, color: C.navyMid, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
            {sessionCorrect} of {sessionTotal} correct{accuracy !== null ? ` · ${accuracy}%` : ''} · {sessionXP} XP earned
          </AppText>
          <TouchableOpacity
            onPress={() => {
              setSessionCorrect(0); setSessionTotal(0); setSessionXP(0);
              setIsComplete(false); loadStep(0);
            }}
            style={{ backgroundColor: C.navy, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 40, marginBottom: 16 }}
          >
            <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFF' }}>Start again</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <AppText style={{ fontSize: 14, color: C.navyLight, fontWeight: '600' }}>Back to home</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'left', 'right', 'bottom']}>

      {/* ── Header ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, height: 52,
        borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ArrowLeft size={22} color={C.navy} weight="bold" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <AppText style={{ fontSize: 9, fontWeight: '700', color: C.navyLight, textTransform: 'uppercase', letterSpacing: 1 }}>
            Learn with Charlotte
          </AppText>
          <AppText style={{ fontSize: 15, fontWeight: '800', color: C.navy, letterSpacing: -0.3 }}>Grammar</AppText>
        </View>
        <TouchableOpacity onPress={() => router.push({ pathname: '/(app)/stats', params: { sessionXP: String(sessionXP), totalXP: String(baseTotalXP + sessionXP), userId: userId ?? '', userLevel: userLevel ?? 'Inter', userName: '' } })} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <AnimatedXPBadge xp={baseTotalXP + sessionXP} iconSize={13} fontSize={13} padH={10} padV={5} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={{ flex: 1, backgroundColor: C.bg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 24, flexGrow: 1 }}
        >

          {/* ── Progress ── */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
                backgroundColor: C.goldBg, borderWidth: 1, borderColor: 'rgba(217,119,6,0.2)',
              }}>
                <AppText style={{ fontSize: 11, fontWeight: '700', color: C.gold }}>
                  {exercise ? TYPE_LABELS[exercise.type] : ''}
                </AppText>
              </View>
              <AppText style={{ fontSize: 12, color: C.navyLight, fontWeight: '600' }}>
                {stepIndex + 1} / {GRAMMAR_TOTAL}
              </AppText>
            </View>
            <View style={{ height: 5, backgroundColor: C.ghost, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: 5, width: `${progress * 100}%` as `${number}%`, backgroundColor: C.gold, borderRadius: 3 }} />
            </View>
          </View>

          {/* ── Exercise card ── */}
          {exercise && (
            <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.border, ...shadow }}>

              {/* Charlotte instruction */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 24 }}>
                <CharlotteAvatar size="xs" />
                <View style={{
                  flex: 1, backgroundColor: C.goldBg,
                  borderRadius: 14, borderBottomLeftRadius: 4,
                  paddingHorizontal: 14, paddingVertical: 14,
                }}>
                  <AppText style={{ fontSize: 14, color: C.gold, fontWeight: '700' }}>
                    {TYPE_INSTRUCTIONS[exercise.type]}
                  </AppText>
                </View>
              </View>

              {/* Passage (read_answer) */}
              {exercise.type === 'read_answer' && exercise.passage && (
                <View style={{
                  backgroundColor: C.ghost, borderRadius: 14, padding: 18, marginBottom: 20,
                  borderLeftWidth: 3, borderLeftColor: C.gold,
                }}>
                  <AppText style={{ fontSize: 15, color: C.navy, lineHeight: 24 }}>{exercise.passage}</AppText>
                </View>
              )}

              {/* Main sentence / question */}
              <AppText style={{
                fontSize: exercise.type === 'read_answer' ? 16 : 22,
                fontWeight: exercise.type === 'read_answer' ? '700' : '500',
                color: C.navy,
                lineHeight: exercise.type === 'read_answer' ? 26 : 34,
                marginBottom: (exercise.type === 'multiple_choice' || exercise.type === 'word_bank') ? 28 : (status === 'answering' ? 0 : 20),
              }}>
                {exercise.type === 'read_answer' ? exercise.question : exercise.sentence}
              </AppText>

              {/* ── multiple_choice: option buttons ── */}
              {exercise.type === 'multiple_choice' && status === 'answering' && (
                <View style={{ gap: 10 }}>
                  {shuffledOptions.map((opt, i) => {
                    const selected = userAnswer === opt;
                    return (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setUserAnswer(selected ? '' : opt)}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 14,
                          borderRadius: 14, borderWidth: 2,
                          borderColor: selected ? C.gold : C.border,
                          backgroundColor: selected ? C.goldBg : C.card,
                          paddingHorizontal: 16, paddingVertical: 16,
                        }}
                      >
                        <View style={{
                          width: 30, height: 30, borderRadius: 15,
                          backgroundColor: selected ? C.gold : C.ghost,
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <AppText style={{ fontSize: 13, fontWeight: '800', color: selected ? '#FFF' : C.navyMid }}>
                            {['A', 'B', 'C'][i]}
                          </AppText>
                        </View>
                        <AppText style={{ fontSize: 15, fontWeight: '600', color: C.navy, flex: 1 }}>
                          {opt}
                        </AppText>
                        {selected && <CheckCircle size={18} color={C.gold} weight="fill" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* ── word_bank: blank + token chips ── */}
              {exercise.type === 'word_bank' && status === 'answering' && (
                <View>
                  {/* Blank display — tap to remove placed word */}
                  <TouchableOpacity
                    onPress={() => userAnswer && setUserAnswer('')}
                    activeOpacity={userAnswer ? 0.7 : 1}
                    style={{
                      borderRadius: 12, borderWidth: 2,
                      borderColor: userAnswer ? C.gold : C.border,
                      borderStyle: 'solid',
                      backgroundColor: userAnswer ? C.goldBg : 'transparent',
                      paddingVertical: 14, paddingHorizontal: 18,
                      minHeight: 52, alignItems: 'center', justifyContent: 'center',
                      marginBottom: 24,
                    }}
                  >
                    {userAnswer ? (
                      <AppText style={{ fontSize: 17, fontWeight: '700', color: C.gold }}>{userAnswer}</AppText>
                    ) : (
                      <AppText style={{ fontSize: 14, color: C.navyLight }}>tap a word below</AppText>
                    )}
                  </TouchableOpacity>
                  {/* Token chips */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                    {shuffledChoices.map((chip, i) => {
                      const used = chip === userAnswer;
                      return (
                        <TouchableOpacity
                          key={i}
                          onPress={() => setUserAnswer(used ? '' : chip)}
                          style={{
                            paddingHorizontal: 20, paddingVertical: 13,
                            borderRadius: 12, borderWidth: 1.5,
                            borderColor: used ? C.border : C.navy,
                            backgroundColor: used ? C.ghost : C.card,
                            opacity: used ? 0.45 : 1,
                          }}
                        >
                          <AppText style={{ fontSize: 16, fontWeight: '700', color: used ? C.navyLight : C.navy }}>
                            {chip}
                          </AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* ── fill_gap / fix_error / read_answer: spacer + text input ── */}
              {(exercise.type === 'fill_gap' || exercise.type === 'fix_error' || exercise.type === 'read_answer') && status === 'answering' && (
                <>
                  <View style={{ flex: 1 }} />
                  <TextInput
                    value={userAnswer}
                    onChangeText={setUserAnswer}
                    placeholder={
                      exercise.type === 'fill_gap'  ? 'Type the missing word…'     :
                      exercise.type === 'fix_error' ? 'Rewrite the full sentence…' :
                                                      'Your answer…'
                    }
                    placeholderTextColor={C.navyLight}
                    style={{
                      borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
                      paddingHorizontal: 16, paddingVertical: 14,
                      fontSize: 16, color: C.navy, backgroundColor: '#FAFAF9',
                      minHeight: exercise.type === 'fill_gap' ? 56 : 110,
                      textAlignVertical: 'top',
                    }}
                    multiline={exercise.type !== 'fill_gap'}
                    returnKeyType={exercise.type === 'fill_gap' ? 'done' : 'default'}
                    onSubmitEditing={exercise.type === 'fill_gap' ? handleSubmit : undefined}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  {exercise.hint && (
                    <>
                      <TouchableOpacity
                        onPress={() => setShowHint(v => !v)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, alignSelf: 'flex-start' }}
                      >
                        <LightbulbFilament size={14} color={C.gold} weight="fill" />
                        <AppText style={{ fontSize: 13, color: C.gold, fontWeight: '600' }}>
                          {showHint ? 'Hide hint' : 'Show hint'}
                        </AppText>
                      </TouchableOpacity>
                      {showHint && (
                        <View style={{ marginTop: 10, padding: 14, backgroundColor: C.goldBg, borderRadius: 12 }}>
                          <AppText style={{ fontSize: 14, color: C.gold }}>{exercise.hint}</AppText>
                        </View>
                      )}
                    </>
                  )}
                </>
              )}

              {/* ── Feedback ── */}
              {status === 'submitted' && isCorrect !== null && (
                <Animated.View style={{
                  opacity: feedbackAnim,
                  transform: [{ translateY: feedbackAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
                  marginTop: 8,
                }}>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    padding: 14, borderRadius: 14, marginBottom: 12,
                    backgroundColor: isCorrect ? C.greenBg : C.redBg,
                    borderWidth: 1,
                    borderColor: isCorrect ? 'rgba(61,136,0,0.2)' : 'rgba(220,38,38,0.18)',
                  }}>
                    {isCorrect
                      ? <CheckCircle size={20} color={C.greenDark} weight="fill" />
                      : <XCircle    size={20} color={C.red}       weight="fill" />
                    }
                    <AppText style={{ fontSize: 15, fontWeight: '700', color: isCorrect ? C.greenDark : C.red, flex: 1 }}>
                      {isCorrect ? 'Correct!' : 'Not quite…'}
                    </AppText>
                    <View style={{
                      backgroundColor: isCorrect ? 'rgba(61,136,0,0.12)' : 'rgba(220,38,38,0.10)',
                      borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
                    }}>
                      <AppText style={{ fontSize: 11, fontWeight: '800', color: isCorrect ? C.greenDark : C.red }}>
                        +{isCorrect ? 10 : 2} XP
                      </AppText>
                    </View>
                  </View>

                  {!isCorrect && (
                    <View style={{ padding: 14, backgroundColor: C.ghost, borderRadius: 12, marginBottom: 10 }}>
                      <AppText style={{ fontSize: 11, fontWeight: '700', color: C.navyLight, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 }}>
                        Correct answer
                      </AppText>
                      <AppText style={{ fontSize: 15, color: C.navy, fontWeight: '600' }}>{exercise.answer}</AppText>
                    </View>
                  )}

                  <View style={{ padding: 14, backgroundColor: C.ghost, borderRadius: 12 }}>
                    <AppText style={{ fontSize: 11, fontWeight: '700', color: C.navyLight, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 }}>
                      Why
                    </AppText>
                    <AppText style={{ fontSize: 14, color: C.navyMid, lineHeight: 21 }}>{exercise.explanation}</AppText>
                  </View>
                </Animated.View>
              )}
            </View>
          )}

        </ScrollView>

        {/* ── Bottom CTA ── */}
        <View style={{
          paddingHorizontal: 20, paddingTop: 12,
          paddingBottom: Platform.OS === 'ios' ? 28 : 20,
          backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border,
        }}>
          {status === 'answering' ? (
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!userAnswer.trim()}
              style={{
                backgroundColor: userAnswer.trim() ? C.navy : C.ghost,
                borderRadius: 16, paddingVertical: 15, alignItems: 'center',
              }}
            >
              <AppText style={{ fontSize: 15, fontWeight: '800', color: userAnswer.trim() ? '#FFF' : C.navyLight }}>
                Check answer
              </AppText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleNext}
              style={{
                backgroundColor: C.navy, borderRadius: 16, paddingVertical: 15,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFF' }}>
                {stepIndex + 1 >= GRAMMAR_TOTAL ? 'Finish' : 'Next'}
              </AppText>
              {stepIndex + 1 < GRAMMAR_TOTAL && <ArrowRight size={18} color="#FFF" weight="bold" />}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}
