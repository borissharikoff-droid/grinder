-- Migration: Add email column to profiles for nickname login
-- Run this in your Supabase SQL Editor

-- Add email column if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Backfill existing users' emails from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- Update the trigger to also save email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
