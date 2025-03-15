-- Add email and name columns to user_profiles table
ALTER TABLE IF EXISTS public.user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS name TEXT;

-- Update the handle_new_user function to include email and name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, email, name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing profiles with email and name from auth.users
UPDATE public.user_profiles
SET 
    email = auth.users.email,
    name = auth.users.raw_user_meta_data->>'name'
FROM auth.users
WHERE public.user_profiles.user_id = auth.users.id
AND (public.user_profiles.email IS NULL OR public.user_profiles.name IS NULL); 