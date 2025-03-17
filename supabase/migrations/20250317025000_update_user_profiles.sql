-- Check if the user_profiles table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
    ) THEN
        -- Create the user_profiles table if it doesn't exist
        CREATE TABLE public.user_profiles (
            user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT,
            name TEXT,
            role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
            balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );

        -- Enable RLS on the table
        ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

        -- Create policies
        CREATE POLICY "Users can view their own profile"
            ON public.user_profiles
            FOR SELECT
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can update their own profile"
            ON public.user_profiles
            FOR UPDATE
            USING (auth.uid() = user_id);
    ELSE
        -- Check if the name column exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_profiles' 
            AND column_name = 'name'
        ) THEN
            -- Add the name column if it doesn't exist
            ALTER TABLE public.user_profiles ADD COLUMN name TEXT;
        END IF;
    END IF;
END
$$;

-- Update existing user profiles with name from user metadata
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT 
            au.id, 
            au.email,
            au.raw_user_meta_data->>'full_name' as full_name,
            au.raw_user_meta_data->>'name' as name
        FROM auth.users au
        LEFT JOIN public.user_profiles up ON au.id = up.user_id
        WHERE up.name IS NULL OR up.name = ''
    LOOP
        -- Update user profile with name from metadata
        UPDATE public.user_profiles
        SET 
            name = COALESCE(user_record.full_name, user_record.name, user_record.email),
            updated_at = now()
        WHERE user_id = user_record.id;
        
        -- If no user profile exists, create one
        IF NOT FOUND THEN
            INSERT INTO public.user_profiles (user_id, email, name, role, balance)
            VALUES (
                user_record.id, 
                user_record.email, 
                COALESCE(user_record.full_name, user_record.name, user_record.email),
                'user',
                0
            );
        END IF;
    END LOOP;
END
$$; 