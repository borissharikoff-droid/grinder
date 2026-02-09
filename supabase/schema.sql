-- Grinder Supabase schema for auth and friends/social features
-- Run this in your Supabase project SQL editor after creating a project at https://supabase.com

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  email text,
  avatar_url text,
  level integer default 1,
  xp integer default 0,
  current_activity text,
  is_online boolean default false,
  streak_count integer default 0,
  updated_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Friendships
create table if not exists public.friendships (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  friend_id uuid references public.profiles(id) on delete cascade,
  status text check (status in ('pending', 'accepted')) default 'pending',
  created_at timestamptz default now(),
  unique(user_id, friend_id)
);

create index if not exists idx_friendships_user on public.friendships(user_id);
create index if not exists idx_friendships_friend on public.friendships(friend_id);

alter table public.friendships enable row level security;

create policy "Users can see their friendships"
  on public.friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can create friendship requests"
  on public.friendships for insert
  with check (auth.uid() = user_id);

create policy "Users can update (accept) friendships"
  on public.friendships for update
  using (auth.uid() = friend_id or auth.uid() = user_id);

-- Session summaries (synced from app for leaderboards; no sensitive details)
create table if not exists public.session_summaries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  duration_seconds integer not null,
  created_at timestamptz default now()
);

create index if not exists idx_session_summaries_user on public.session_summaries(user_id);

alter table public.session_summaries enable row level security;

create policy "Users can insert own session summaries"
  on public.session_summaries for insert
  with check (auth.uid() = user_id);

create policy "Users can view own and friends' session summaries (for leaderboard)"
  on public.session_summaries for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships f
      where (f.user_id = auth.uid() and f.friend_id = session_summaries.user_id and f.status = 'accepted')
         or (f.friend_id = auth.uid() and f.user_id = session_summaries.user_id and f.status = 'accepted')
    )
  );

-- Achievements unlocked (for display on profile)
create table if not exists public.user_achievements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz default now(),
  unique(user_id, achievement_id)
);

create index if not exists idx_user_achievements_user on public.user_achievements(user_id);

alter table public.user_achievements enable row level security;

create policy "Users can view own and friends' achievements"
  on public.user_achievements for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships f
      where (f.user_id = auth.uid() and f.friend_id = user_achievements.user_id and f.status = 'accepted')
         or (f.friend_id = auth.uid() and f.user_id = user_achievements.user_id and f.status = 'accepted')
    )
  );

create policy "Users can insert own achievements"
  on public.user_achievements for insert
  with check (auth.uid() = user_id);

-- DMs between friends. Enable Realtime in Supabase: Database → Replication → public.messages.
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  body text not null,
  created_at timestamptz default now(),
  read_at timestamptz
);

create index if not exists idx_messages_receiver on public.messages(receiver_id);
create index if not exists idx_messages_sender on public.messages(sender_id);
create index if not exists idx_messages_created on public.messages(created_at desc);

alter table public.messages enable row level security;

-- Only participants can read messages (and must be friends — check in app or add FK to friendships)
create policy "Users can read own DMs"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send messages as sender"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Receiver can mark as read"
  on public.messages for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
