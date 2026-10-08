// Full achievements catalog — mirrors DB trigger in 031_fix_award_achievements.sql
// Used by stats.tsx (preview), achievements.tsx (full screen), and DB triggers.

export interface CatalogEntry {
  code:        string;
  title:       string;   // português (device em PT)
  titleEN?:    string;   // inglês (device em outro idioma) — cai no title se ausente
  category:    string;
  rarity:      'common' | 'rare' | 'epic' | 'legendary';
  xpReward:    number;
  howToEarnPT: string;
  howToEarnEN: string;
  level?:      'Novice' | 'Inter' | 'Advanced'; // undefined = general (all levels)
}

// ── General badges (all levels) ───────────────────────────────────────────────
export const GENERAL_ACHIEVEMENTS: CatalogEntry[] = [
  // Estudar junto: padrinho (amigos trazidos) e rallies vencidos.
  {
    code: 'sponsor_1', title: 'Trouxe um Amigo', titleEN: 'Bring a Friend', category: 'social', rarity: 'common', xpReward: 30,
    howToEarnPT: 'Um amigo entra no Queizy pelo seu convite.',
    howToEarnEN: 'A friend joins Queizy with your invite.',
  },
  {
    code: 'sponsor_5', title: 'Turma Formada', titleEN: 'Study Crew', category: 'social', rarity: 'epic', xpReward: 120,
    howToEarnPT: 'Cinco amigos entram pelo seu convite.',
    howToEarnEN: 'Five friends join with your invite.',
  },
  {
    code: 'sponsor_20', title: 'Lenda dos Convites', titleEN: 'Invite Legend', category: 'social', rarity: 'legendary', xpReward: 400,
    howToEarnPT: 'Vinte amigos entram pelo seu convite.',
    howToEarnEN: 'Twenty friends join with your invite.',
  },
  {
    code: 'rally_win_1', title: 'Primeira Vitória', titleEN: 'First Challenge Win', category: 'rally', rarity: 'rare', xpReward: 40,
    howToEarnPT: 'Vença sua primeira competição em Estudar junto.',
    howToEarnEN: 'Win your first challenge in Study together.',
  },
  {
    code: 'rally_win_5', title: 'Fera das Competições', titleEN: 'Challenge Ace', category: 'rally', rarity: 'epic', xpReward: 150,
    howToEarnPT: 'Vença cinco competições.',
    howToEarnEN: 'Win five challenges.',
  },
  {
    code: 'first_practice', title: 'Olá, Mundo!', titleEN: 'Hello, World!', category: 'general', rarity: 'common', xpReward: 10,
    howToEarnPT: 'Faça sua primeira prática no app.',
    howToEarnEN: 'Complete your first practice in the app.',
  },
  {
    code: 'first_text', title: 'Primeira Conversa', titleEN: 'First Conversation', category: 'text', rarity: 'common', xpReward: 5,
    howToEarnPT: 'Envie sua primeira mensagem de texto para a Charlotte.',
    howToEarnEN: 'Send your first text message to Charlotte.',
  },
  {
    code: 'first_audio', title: 'Primeira Voz', titleEN: 'First Voice', category: 'audio', rarity: 'common', xpReward: 10,
    howToEarnPT: 'Envie sua primeira mensagem de voz para a Charlotte.',
    howToEarnEN: 'Send your first voice message to Charlotte.',
  },
  {
    code: 'first_grammar', title: 'Gramático Iniciante', titleEN: 'Grammar Starter', category: 'grammar', rarity: 'common', xpReward: 5,
    howToEarnPT: 'Complete seu primeiro exercício de gramática.',
    howToEarnEN: 'Complete your first grammar exercise.',
  },
  {
    code: 'first_learn', title: 'Na Trilha', titleEN: 'On the Trail', category: 'learn', rarity: 'common', xpReward: 10,
    howToEarnPT: 'Complete seu primeiro tópico na trilha de aprendizado.',
    howToEarnEN: 'Complete your first topic on the learning trail.',
  },
  {
    code: 'practices_10', title: 'Aquecendo', titleEN: 'Warming Up', category: 'general', rarity: 'common', xpReward: 15,
    howToEarnPT: 'Faça 10 práticas no total.',
    howToEarnEN: 'Complete 10 total practices.',
  },
  {
    code: 'practices_50', title: 'No Ritmo', titleEN: 'In the Zone', category: 'general', rarity: 'rare', xpReward: 50,
    howToEarnPT: 'Faça 50 práticas no total.',
    howToEarnEN: 'Complete 50 total practices.',
  },
  {
    code: 'practices_100', title: 'Comprometido', titleEN: 'Committed', category: 'general', rarity: 'epic', xpReward: 100,
    howToEarnPT: 'Faça 100 práticas no total.',
    howToEarnEN: 'Complete 100 total practices.',
  },
  {
    code: 'practices_500', title: 'Lenda da Prática', titleEN: 'Practice Legend', category: 'general', rarity: 'legendary', xpReward: 300,
    howToEarnPT: 'Faça 500 práticas no total.',
    howToEarnEN: 'Complete 500 total practices.',
  },
  {
    code: 'streak_3', title: 'Consistente', titleEN: 'Consistent', category: 'streak', rarity: 'common', xpReward: 25,
    howToEarnPT: 'Pratique 3 dias seguidos.',
    howToEarnEN: 'Practice 3 days in a row.',
  },
  {
    code: 'streak_7', title: 'Semana Completa', titleEN: 'Full Week', category: 'streak', rarity: 'rare', xpReward: 60,
    howToEarnPT: 'Pratique 7 dias seguidos.',
    howToEarnEN: 'Practice 7 days in a row.',
  },
  {
    code: 'streak_14', title: 'Duas Semanas', titleEN: 'Two Weeks', category: 'streak', rarity: 'epic', xpReward: 100,
    howToEarnPT: 'Pratique 14 dias seguidos.',
    howToEarnEN: 'Practice 14 days in a row.',
  },
  {
    code: 'streak_30', title: 'Mês de Ouro', titleEN: 'Golden Month', category: 'streak', rarity: 'legendary', xpReward: 200,
    howToEarnPT: 'Pratique 30 dias seguidos.',
    howToEarnEN: 'Practice 30 days in a row.',
  },
  {
    code: 'text_25', title: 'Comunicativo', titleEN: 'Talkative', category: 'text', rarity: 'rare', xpReward: 20,
    howToEarnPT: 'Envie 25 mensagens de texto para a Charlotte.',
    howToEarnEN: 'Send 25 text messages to Charlotte.',
  },
  {
    code: 'text_100', title: 'Fluente no Chat', titleEN: 'Chat Fluent', category: 'text', rarity: 'epic', xpReward: 75,
    howToEarnPT: 'Envie 100 mensagens de texto para a Charlotte.',
    howToEarnEN: 'Send 100 text messages to Charlotte.',
  },
  {
    code: 'audio_10', title: 'Falante', titleEN: 'Speaker', category: 'audio', rarity: 'rare', xpReward: 20,
    howToEarnPT: 'Envie 10 mensagens de voz para a Charlotte.',
    howToEarnEN: 'Send 10 voice messages to Charlotte.',
  },
  {
    code: 'audio_50', title: 'Voz de Ouro', titleEN: 'Golden Voice', category: 'audio', rarity: 'epic', xpReward: 100,
    howToEarnPT: 'Envie 50 mensagens de voz para a Charlotte.',
    howToEarnEN: 'Send 50 voice messages to Charlotte.',
  },
  {
    code: 'audio_200', title: 'Locutor Profissional', titleEN: 'Pro Speaker', category: 'audio', rarity: 'legendary', xpReward: 250,
    howToEarnPT: 'Envie 200 mensagens de voz para a Charlotte.',
    howToEarnEN: 'Send 200 voice messages to Charlotte.',
  },
  {
    code: 'grammar_20', title: 'Gramático Avançado', titleEN: 'Advanced Grammar', category: 'grammar', rarity: 'rare', xpReward: 30,
    howToEarnPT: 'Complete 20 exercícios de gramática.',
    howToEarnEN: 'Complete 20 grammar exercises.',
  },
  {
    code: 'grammar_50', title: 'Mestre da Gramática', titleEN: 'Grammar Master', category: 'grammar', rarity: 'epic', xpReward: 75,
    howToEarnPT: 'Complete 50 exercícios de gramática.',
    howToEarnEN: 'Complete 50 grammar exercises.',
  },
  {
    code: 'learn_25', title: 'Trilheiro', titleEN: 'Trail Runner', category: 'learn', rarity: 'rare', xpReward: 40,
    howToEarnPT: 'Complete 25 tópicos na trilha de aprendizado.',
    howToEarnEN: 'Complete 25 topics on the learning trail.',
  },
  {
    code: 'learn_100', title: 'Mestre da Trilha', titleEN: 'Trail Master', category: 'learn', rarity: 'epic', xpReward: 150,
    howToEarnPT: 'Complete 100 tópicos na trilha de aprendizado.',
    howToEarnEN: 'Complete 100 topics on the learning trail.',
  },
  {
    code: 'daily_100', title: 'Super Dia', titleEN: 'Super Day', category: 'habit', rarity: 'rare', xpReward: 15,
    howToEarnPT: 'Ganhe 100 XP em um único dia.',
    howToEarnEN: 'Earn 100 XP in a single day.',
  },
  {
    code: 'daily_200', title: 'Dia Lendário', titleEN: 'Legendary Day', category: 'habit', rarity: 'epic', xpReward: 25,
    howToEarnPT: 'Ganhe 200 XP em um único dia.',
    howToEarnEN: 'Earn 200 XP in a single day.',
  },
  {
    code: 'early_bird', title: 'Madrugador', titleEN: 'Early Bird', category: 'habit', rarity: 'rare', xpReward: 10,
    howToEarnPT: 'Pratique antes das 8h da manhã.',
    howToEarnEN: 'Practice before 8am.',
  },
  {
    code: 'night_owl', title: 'Coruja Noturna', titleEN: 'Night Owl', category: 'habit', rarity: 'rare', xpReward: 10,
    howToEarnPT: 'Pratique depois das 22h.',
    howToEarnEN: 'Practice after 10pm.',
  },
];

// ── Level-specific badges ─────────────────────────────────────────────────────
export const LEVEL_ACHIEVEMENTS: CatalogEntry[] = [
  // Novice (PT titles)
  {
    code: 'novice_first_topic', title: 'A Jornada Começa', titleEN: 'The Journey Begins', category: 'learn', rarity: 'common', xpReward: 15,
    level: 'Novice',
    howToEarnPT: 'Complete o primeiro tópico da trilha Novice.',
    howToEarnEN: 'Complete the first topic on the Novice trail.',
  },
  {
    code: 'novice_halfway', title: 'No Embalo', titleEN: 'On a Roll', category: 'learn', rarity: 'rare', xpReward: 60,
    level: 'Novice',
    howToEarnPT: 'Complete 25 dos 50 tópicos da trilha Novice.',
    howToEarnEN: 'Complete 25 of 50 Novice trail topics.',
  },
  {
    code: 'novice_master', title: 'Mestre do Básico', titleEN: 'Basics Master', category: 'learn', rarity: 'epic', xpReward: 150,
    level: 'Novice',
    howToEarnPT: 'Complete todos os 50 tópicos da trilha Novice.',
    howToEarnEN: 'Complete all 50 Novice trail topics.',
  },
  {
    code: 'novice_promoted', title: 'Passou de Fase!', titleEN: 'Level Up!', category: 'general', rarity: 'legendary', xpReward: 200,
    level: 'Novice',
    howToEarnPT: 'Complete a trilha Novice e atinja 4.000 XP para ser promovido ao nível Inter.',
    howToEarnEN: 'Complete the Novice trail and reach 4,000 XP to be promoted to Inter.',
  },
  // Inter (EN titles)
  {
    code: 'inter_first_topic', title: 'Subindo', titleEN: 'Rising Up', category: 'learn', rarity: 'common', xpReward: 15,
    level: 'Inter',
    howToEarnPT: 'Complete o primeiro tópico da trilha Inter.',
    howToEarnEN: 'Complete the first topic on the Inter trail.',
  },
  {
    code: 'inter_halfway', title: 'Metade do Caminho', titleEN: 'Halfway There', category: 'learn', rarity: 'rare', xpReward: 80,
    level: 'Inter',
    howToEarnPT: 'Complete 35 dos 70 tópicos da trilha Inter.',
    howToEarnEN: 'Complete 35 of 70 Inter trail topics.',
  },
  {
    code: 'inter_champion', title: 'Campeão Inter', titleEN: 'Inter Champion', category: 'learn', rarity: 'epic', xpReward: 200,
    level: 'Inter',
    howToEarnPT: 'Complete todos os 70 tópicos da trilha Inter.',
    howToEarnEN: 'Complete all 70 Inter trail topics.',
  },
  {
    code: 'inter_promoted', title: 'Rumo ao Advanced', titleEN: 'Going Advanced', category: 'general', rarity: 'legendary', xpReward: 300,
    level: 'Inter',
    howToEarnPT: 'Complete a trilha Inter e atinja 9.800 XP para ser promovido ao nível Advanced.',
    howToEarnEN: 'Complete the Inter trail and reach 9,800 XP to be promoted to Advanced.',
  },
  // Advanced (EN titles)
  {
    code: 'advanced_first_topic', title: 'Aluno de Elite', titleEN: 'Elite Learner', category: 'learn', rarity: 'common', xpReward: 15,
    level: 'Advanced',
    howToEarnPT: 'Complete o primeiro tópico da trilha Advanced.',
    howToEarnEN: 'Complete the first topic on the Advanced trail.',
  },
  {
    code: 'advanced_halfway', title: 'Mergulho Fundo', titleEN: 'Deep End', category: 'learn', rarity: 'rare', xpReward: 100,
    level: 'Advanced',
    howToEarnPT: 'Complete 20 dos 40 tópicos da trilha Advanced.',
    howToEarnEN: 'Complete 20 of 40 Advanced trail topics.',
  },
  {
    code: 'advanced_master', title: 'Mestre Advanced', titleEN: 'Advanced Master', category: 'learn', rarity: 'epic', xpReward: 250,
    level: 'Advanced',
    howToEarnPT: 'Complete todos os 40 tópicos da trilha Advanced.',
    howToEarnEN: 'Complete all 40 Advanced trail topics.',
  },
  {
    code: 'advanced_fluent', title: 'Fluente', titleEN: 'Fluent', category: 'general', rarity: 'legendary', xpReward: 500,
    level: 'Advanced',
    howToEarnPT: 'Acumule 20.000 XP no total.',
    howToEarnEN: 'Accumulate 20,000 total XP.',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** All general badges — used in stats.tsx preview fallback pool */
export const ALL_ACHIEVEMENTS = GENERAL_ACHIEVEMENTS;

/** Returns the 30 badges visible to a given user level (26 general + 4 level-specific) */
export function getBadgesForLevel(level: string): CatalogEntry[] {
  return [
    ...GENERAL_ACHIEVEMENTS,
    ...LEVEL_ACHIEVEMENTS.filter(a => a.level === level),
  ];
}
