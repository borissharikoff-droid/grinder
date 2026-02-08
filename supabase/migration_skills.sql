-- Skills: per-user skill levels and XP (synced from app)
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.user_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  level INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_user_skills_user ON public.user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill ON public.user_skills(skill_id);

ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

-- Users can read own and friends' skills
CREATE POLICY "Users can view own and friends skills"
  ON public.user_skills FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND ((f.user_id = auth.uid() AND f.friend_id = user_skills.user_id)
             OR (f.friend_id = auth.uid() AND f.user_id = user_skills.user_id))
    )
  );

-- Users can insert/update own skills only
CREATE POLICY "Users can insert own skills"
  ON public.user_skills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skills"
  ON public.user_skills FOR UPDATE
  USING (auth.uid() = user_id);
