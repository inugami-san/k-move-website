-- Supabase Database Setup for K Move
-- Copy and paste this script into the Supabase SQL Editor to set up your tables, security policies, and seed data.

-- 1. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    play_count INTEGER DEFAULT 0 NOT NULL,
    avg_accuracy DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    perfect_count INTEGER DEFAULT 0 NOT NULL,
    good_count INTEGER DEFAULT 0 NOT NULL,
    nice_count INTEGER DEFAULT 0 NOT NULL,
    okay_count INTEGER DEFAULT 0 NOT NULL,
    miss_count INTEGER DEFAULT 0 NOT NULL,
    pp INTEGER DEFAULT 0 NOT NULL,
    country TEXT DEFAULT 'US' NOT NULL,
    grade TEXT DEFAULT 'A' NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Scores Table
CREATE TABLE IF NOT EXISTS public.scores (
    id BIGSERIAL PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    username TEXT NOT NULL,
    accuracy DOUBLE PRECISION NOT NULL,
    max_combo INTEGER NOT NULL,
    score INTEGER NOT NULL,
    pp INTEGER NOT NULL,
    grade TEXT NOT NULL,
    song_title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- 3. Row Level Security Policies for Profiles
-- Allow public read access to profiles (everyone can see rankings)
CREATE POLICY "Allow public read access on profiles" 
    ON public.profiles FOR SELECT 
    USING (true);

-- Allow users to insert their own profile
CREATE POLICY "Allow individual insert on profiles" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Allow individual update on profiles" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- 4. Row Level Security Policies for Scores
-- Allow public read access to scores
CREATE POLICY "Allow public read access on scores" 
    ON public.scores FOR SELECT 
    USING (true);

-- Allow public insert access to scores (so both guests and registered users can log scores)
CREATE POLICY "Allow public insert on scores" 
    ON public.scores FOR INSERT 
    WITH CHECK (true);

-- Allow users to update their own scores (if linked to profile)
CREATE POLICY "Allow individual update on scores" 
    ON public.scores FOR UPDATE 
    USING (auth.uid() = profile_id);

-- 5. Seed Data for Global Leaderboard (Matching original mock metrics)
INSERT INTO public.profiles (id, username, play_count, avg_accuracy, perfect_count, good_count, nice_count, okay_count, miss_count, pp, country, grade)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'PoseKing99', 840, 99.65, 12450, 4850, 2100, 880, 420, 9820, 'JP', 'SS'),
  ('00000000-0000-0000-0000-000000000002', 'rhythm_cat', 650, 98.92, 9450, 3850, 1100, 480, 220, 9140, 'US', 'S'),
  ('00000000-0000-0000-0000-000000000003', 'Antigravity_Fan', 710, 98.45, 10240, 4120, 1850, 680, 310, 8905, 'CA', 'S'),
  ('00000000-0000-0000-0000-000000000004', 'KMove_Pro', 430, 97.80, 5240, 2120, 850, 380, 110, 7990, 'KR', 'S'),
  ('00000000-0000-0000-0000-000000000005', 'NeonDancer', 500, 96.15, 6240, 2850, 1210, 480, 180, 7320, 'DE', 'A'),
  ('00000000-0000-0000-0000-000000000006', 'swift_cather', 290, 95.80, 3240, 1850, 910, 280, 92, 6450, 'PH', 'A'),
  ('00000000-0000-0000-0000-000000000007', 'BodyCalibration', 180, 94.20, 1840, 950, 410, 180, 52, 5800, 'GB', 'A')
ON CONFLICT (username) DO NOTHING;

-- 6. Trigger to automatically create a profile entry when a new user signs up in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, country, grade)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', 'Challenger_' || substr(new.id::text, 1, 5)),
    COALESCE(new.raw_user_meta_data->>'country', 'US'),
    'A'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
