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
    // Use the service role client to bypass RLS
    const supabaseAdmin = createServiceRoleClient();
    
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }

    return { success: true, transactions: data };
  } catch (error) {
    console.error('Error getting user transactions:', error);
    return { success: false, error };
  }
};

// Helper function to get user by ID
export async function getUserById(id: string) {
  const supabaseAdmin = createServiceRoleClient();
  
  try {
    // Use auth.admin API instead of direct table access
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);

    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }

    return data.user;
  } catch (e) {
    console.error('Exception fetching user:', e);
    return null;
  }
}

// Helper function to get user credits (from user_profiles table)
export async function getUserCredits(userId: string): Promise<number> {
  const supabaseAdmin = createServiceRoleClient();
  
  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user credits:', error);
      return 0;
    }

    // If balance is null or undefined, return 0
    if (data?.balance === null || data?.balance === undefined) {
      return 0;
    }
    
    return data.balance;
  } catch (e) {
    console.error('Exception fetching user credits:', e);
    return 0;
  }
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

// Helper function to get user credits using a direct SQL query
export async function getUserCreditsDirectSQL(userId: string): Promise<number | null> {
  console.log('Fetching credits with direct SQL for user:', userId);
  
  const supabaseAdmin = createServiceRoleClient();
  
  try {
    // Skip the RPC call since it's not defined in the Database type
    // Try with a direct query instead
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user credits with direct query:', error);
      return null;
    }

    console.log('User credits from direct query:', data);
    return data?.balance !== undefined ? data.balance : null;
  } catch (e) {
    console.error('Exception fetching user credits with direct SQL:', e);
    return null;
  }
}

// Helper function to update user credits directly in the database
export async function updateUserCreditsDirectly(userId: string, newBalance: number): Promise<boolean> {
  const supabaseAdmin = createServiceRoleClient();
  
  try {
    // First check if the user profile exists
    const { data: checkData, error: checkError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (checkError) {
      // If profile doesn't exist, create it
      const { error: insertError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          user_id: userId,
          balance: newBalance,
          role: 'user'
        });
      
      if (insertError) {
        console.error('Error creating user profile:', insertError);
        return false;
      }
      
      return true;
    }
    
    // If profile exists, update it
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ balance: newBalance })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating user credits:', updateError);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Exception updating user credits:', e);
    return false;
  }
}

// Helper function to ensure user profile has a valid balance
export async function ensureUserBalance(userId: string): Promise<number> {
  console.log('ensureUserBalance called for user:', userId);
  const supabaseAdmin = createServiceRoleClient();
  
  try {
    // First check if user has a profile with a valid balance
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    console.log('User profile data:', data, 'Error:', error);
    
    // If there's an error or balance is null/undefined, set a default balance
    if (error || data?.balance === null || data?.balance === undefined) {
      console.log('User has no valid balance, setting default');
      
      // Update or insert the user profile with a default balance
      const { data: upsertData, error: upsertError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
          user_id: userId,
          balance: 10, // Default balance for new or updated users
          role: 'user', // Ensure role is set
        }, {
          onConflict: 'user_id'
        });
      
      console.log('Upsert result:', upsertData, 'Error:', upsertError);
      
      if (upsertError) {
        console.error('Error upserting user balance:', upsertError);
        return 0;
      }
      
      // Verify the update worked by fetching again
      const { data: verifyData, error: verifyError } = await supabaseAdmin
        .from('user_profiles')
        .select('balance')
        .eq('user_id', userId)
        .single();
        
      console.log('Verification after upsert:', verifyData, 'Error:', verifyError);
      
      if (!verifyError && verifyData?.balance !== undefined) {
        return verifyData.balance;
      }
      
      return 10; // Return the default balance
    }
    
    // If we have data but balance is 0, check if we should update it
    if (data.balance === 0) {
      console.log('User has zero balance, checking if we should update');
      
      // For testing purposes, update balance to 10 if it's currently 0
      const { data: updateData, error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({ balance: 10 })
        .eq('user_id', userId)
        .select('balance')
        .single();
      
      console.log('Update result:', updateData, 'Error:', updateError);
      
      if (!updateError && updateData?.balance !== undefined) {
        return updateData.balance;
      }
    }
    
    console.log('Returning existing balance:', data.balance);
    return data.balance;
  } catch (e) {
    console.error('Exception ensuring user balance:', e);
    return 0;
  }
}

// Helper function to check the database schema
export async function checkDatabaseSchema(): Promise<any> {
  console.log('Checking database schema');
  
  const supabaseAdmin = createServiceRoleClient();
  
  try {
    // Skip the RPC call and direct information_schema query since they're not defined in the Database type
    // Instead, just query the user_profiles table structure
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error checking schema:', error);
      return null;
    }
    
    return data ? Object.keys(data[0] || {}) : null;
  } catch (e) {
    console.error('Exception checking schema:', e);
    return null;
  }
}

// Helper function to directly update user balance using SQL
export async function updateUserBalanceSQL(userId: string, newBalance: number): Promise<boolean> {
  console.log(`Updating user balance with SQL for user ${userId} to ${newBalance}`);
  
  const supabaseAdmin = createServiceRoleClient();
  
  try {
    // Skip the RPC call since it's not defined in the Database type
    // Use a direct update instead
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({ balance: newBalance })
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error updating user balance with SQL:', error);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Exception updating user balance with SQL:', e);
    return false;
  }
}

// Helper function to execute raw SQL to update user balance
export async function executeRawSQLUpdate(userId: string, newBalance: number): Promise<boolean> {
  console.log(`Executing update for user ${userId} balance to ${newBalance}`);
  
  const supabaseAdmin = createServiceRoleClient();
  
  try {
    // Skip the RPC call since it's not defined in the Database type
    // Use a direct update instead
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({ balance: newBalance })
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error executing update:', error);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Exception executing update:', e);
    return false;
  }
} 