-- Drop the problematic policies that might be causing infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;

-- Create a simpler policy for viewing user profiles
CREATE POLICY "User profiles access policy"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id OR
         EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND role = 'admin'
         ));

-- Fix the transactions table policy as well
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;

-- Create a simpler policy for viewing transactions
CREATE POLICY "Transactions access policy"
  ON public.transactions
  FOR SELECT
  USING (auth.uid() = user_id OR
         EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid() AND up.role = 'admin'
         ));

-- Create policy for insert/update operations on transactions
CREATE POLICY "Service role can insert transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (true);  -- Allow service role to insert (RLS is bypassed for service role) 