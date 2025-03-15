import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Create a single supabase client for interacting with your database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Create a server-side client with the service role key for admin operations
export const createServiceRoleClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Helper function to handle credit transactions
export const handleCreditTransaction = async (
  userId: string,
  type: 'purchase' | 'use',
  amount: number,
  stripeTransactionId?: string
) => {
  try {
    // Use the service role client to bypass RLS
    const supabaseAdmin = createServiceRoleClient();
    
    const { data, error } = await supabaseAdmin.rpc('handle_credit_transaction', {
      p_user_id: userId,
      p_type: type,
      p_amount: type === 'use' ? -Math.abs(amount) : Math.abs(amount),
      p_stripe_transaction_id: stripeTransactionId,
    });

    if (error) throw error;
    return { success: true, transactionId: data };
  } catch (error) {
    console.error('Error handling credit transaction:', error);
    return { success: false, error };
  }
};

// Helper function to get user profile
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return { success: true, profile: data };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { success: false, error };
  }
};

// Helper function to get user transactions
export const getUserTransactions = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, transactions: data };
  } catch (error) {
    console.error('Error getting user transactions:', error);
    return { success: false, error };
  }
};

// Helper function to get user by ID
export async function getUserById(id: string) {
  const supabaseAdmin = createServiceRoleClient();
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data;
}

// Helper function to get user credits (from user_profiles table)
export async function getUserCredits(userId: string) {
  // Use the service role client to bypass RLS
  const supabaseAdmin = createServiceRoleClient();
  
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('balance')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching user credits:', error);
    return 0;
  }

  return data?.balance || 0;
}

// Helper function to update user credits (using handle_credit_transaction function)
export async function updateUserCredits(userId: string, credits: number) {
  return handleCreditTransaction(userId, 'purchase', credits);
}

// Helper function to log a transaction (using transactions table)
export async function logTransaction(
  userId: string,
  amount: number,
  creditsAdded: number,
  description: string
) {
  const supabaseAdmin = createServiceRoleClient();
  const { error } = await supabaseAdmin.from('transactions').insert({
    user_id: userId,
    type: creditsAdded > 0 ? 'purchase' : 'use',
    amount: creditsAdded,
    stripe_transaction_id: description.includes('stripe') ? description : null,
  });

  if (error) {
    console.error('Error logging transaction:', error);
    return false;
  }

  return true;
} 