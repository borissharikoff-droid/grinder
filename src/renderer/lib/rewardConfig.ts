export const STREAK_MULTIPLIERS = {
  day2: 1.08,
  day7: 1.2,
  day14: 1.4,
  day30: 1.75,
} as const

export const CATEGORY_XP_MULTIPLIER_CONFIG: Record<string, number> = {
  coding: 2,
  design: 1.4,
  creative: 1.15,
  learning: 1.2,
  music: 0.6,
  games: 0.5,
  social: 0.6,
  browsing: 0.75,
  other: 0.5,
  idle: 0,
}

export const SKILL_BOOST_SECONDS = 1800

export const ACHIEVEMENT_XP_REWARDS: Record<string, number> = {
  first_session: 15,
  code_warrior: 70,
  marathon: 60,
  ten_sessions: 90,
  fifty_sessions: 220,
  streak_2: 25,
  streak_7: 110,
  streak_14: 170,
  streak_30: 320,
  night_owl: 30,
  early_bird: 30,
  first_friend: 20,
  five_friends: 65,
  social_butterfly: 120,
  skill_developer_10: 35,
  skill_developer_50: 130,
  skill_developer_99: 550,
  skill_designer_10: 35,
  skill_designer_50: 120,
  skill_gamer_25: 70,
  polymath: 120,
  jack_of_all_trades: 260,
}

export const REWARD_RARITY_TABLE: Record<'common' | 'rare' | 'epic' | 'legendary', string[]> = {
  common: ['badge', 'avatar'],
  rare: ['profile_frame', 'skill_boost'],
  epic: ['profile_frame', 'avatar'],
  legendary: ['profile_frame', 'avatar', 'badge'],
}
