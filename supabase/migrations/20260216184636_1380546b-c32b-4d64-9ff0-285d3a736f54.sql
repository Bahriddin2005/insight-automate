
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add user_id to upload_sessions
ALTER TABLE public.upload_sessions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Anyone can view sessions" ON public.upload_sessions;
DROP POLICY IF EXISTS "Anyone can insert sessions" ON public.upload_sessions;
DROP POLICY IF EXISTS "Anyone can delete sessions" ON public.upload_sessions;

-- New RLS policies for upload_sessions (per-user)
CREATE POLICY "Users can view own sessions" ON public.upload_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.upload_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON public.upload_sessions FOR DELETE USING (auth.uid() = user_id);

-- Dashboard configurations table
CREATE TABLE public.dashboard_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_public BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  file_name TEXT,
  analysis_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own configs" ON public.dashboard_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own configs" ON public.dashboard_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own configs" ON public.dashboard_configs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own configs" ON public.dashboard_configs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Public configs viewable by anyone" ON public.dashboard_configs FOR SELECT USING (is_public = true);
CREATE POLICY "Shared configs viewable by token" ON public.dashboard_configs FOR SELECT USING (share_token IS NOT NULL);

CREATE TRIGGER update_dashboard_configs_updated_at
BEFORE UPDATE ON public.dashboard_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
