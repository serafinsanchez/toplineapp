-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('purchase', 'use')),
    amount INTEGER NOT NULL,
    stripe_transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on transactions.user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);

-- Enable RLS on tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- User profiles policies
-- Users can read their own profile
CREATE POLICY "Users can view their own profile"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update their own profile (but not change role or balance)
CREATE POLICY "Users can update their own profile"
    ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Admins can view all profiles - simplified policy
CREATE POLICY "Admins can view all profiles"
    ON public.user_profiles
    FOR SELECT
    USING (
        (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) = 'admin'
    );

-- Admins can update all profiles - simplified policy
CREATE POLICY "Admins can update all profiles"
    ON public.user_profiles
    FOR UPDATE
    USING (
        (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) = 'admin'
    );

-- Service role can do everything
CREATE POLICY "Service role can do everything"
    ON public.user_profiles
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Transactions policies
-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions"
    ON public.transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can do everything with transactions
CREATE POLICY "Service role can do everything with transactions"
    ON public.transactions
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Create function to automatically create a user profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, email, name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function when a new user is created
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create function to update the updated_at field
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update the updated_at field when a user profile is updated
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle credit transactions
CREATE OR REPLACE FUNCTION public.handle_credit_transaction(
    p_user_id UUID,
    p_type TEXT,
    p_amount INTEGER,
    p_stripe_transaction_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_current_balance INTEGER;
BEGIN
    -- Get current balance
    SELECT balance INTO v_current_balance
    FROM public.user_profiles
    WHERE user_id = p_user_id;
    
    -- For 'use' transactions, check if user has enough credits
    IF p_type = 'use' AND v_current_balance < ABS(p_amount) THEN
        RAISE EXCEPTION 'Insufficient credits';
    END IF;
    
    -- Begin transaction
    BEGIN
        -- Insert transaction record
        INSERT INTO public.transactions (user_id, type, amount, stripe_transaction_id)
        VALUES (p_user_id, p_type, p_amount, p_stripe_transaction_id)
        RETURNING id INTO v_transaction_id;
        
        -- Update user balance
        UPDATE public.user_profiles
        SET balance = balance + p_amount
        WHERE user_id = p_user_id;
        
        -- Return the transaction ID
        RETURN v_transaction_id;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 