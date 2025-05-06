-- Seed file for initial data

-- Note: This is a workaround for local development only
-- In production, users would be created through the auth system

-- First, disable RLS to allow direct inserts into auth.users
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- Create a sample user in auth.users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES 
    ('00000000-0000-0000-0000-000000000000', 'admin@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz012345', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Re-enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create an admin user profile
INSERT INTO public.user_profiles (user_id, email, name, role, balance)
VALUES 
    ('00000000-0000-0000-0000-000000000000', 'admin@example.com', 'Admin User', 'admin', 100)
ON CONFLICT (user_id) 
DO UPDATE SET email = 'admin@example.com', name = 'Admin User', role = 'admin', balance = 100;

-- Add some sample transactions
INSERT INTO public.transactions (user_id, type, amount, stripe_transaction_id)
VALUES 
    ('00000000-0000-0000-0000-000000000000', 'purchase', 100, 'sample_stripe_transaction_1')
ON CONFLICT DO NOTHING; 