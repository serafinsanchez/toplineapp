import { createServiceRoleClient } from './supabase';
import { cookies } from 'next/headers';

// Cookie name for tracking free trial usage
const FREE_TRIAL_COOKIE = 'topline_free_trial_used';

// Check if a user has used their free trial
export async function hasUsedFreeTrial(clientIp: string): Promise<boolean> {
  try {
    // Check if the free trial cookie exists
    const cookieStore = await cookies();
    const freeTrialCookie = cookieStore.get(FREE_TRIAL_COOKIE);
    
    if (freeTrialCookie) {
      return true;
    }
    
    // Create a Supabase client with service role key
    const supabaseAdmin = createServiceRoleClient();
    
    // Check if the IP address has been used for a free trial
    const { data, error } = await supabaseAdmin
      .from('free_trial_usage')
      .select('id')
      .eq('client_ip', clientIp)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error checking free trial usage:', error);
    }
    
    return !!data;
  } catch (error) {
    console.error('Error checking free trial usage:', error);
    return false;
  }
}

// Record a free trial usage
export async function recordFreeTrial(clientIp: string, userAgent?: string): Promise<boolean> {
  try {
    // Set the free trial cookie
    const cookieStore = await cookies();
    cookieStore.set(FREE_TRIAL_COOKIE, 'true', {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    
    // Create a Supabase client with service role key
    const supabaseAdmin = createServiceRoleClient();
    
    // Record the free trial usage in the database
    const { error } = await supabaseAdmin
      .from('free_trial_usage')
      .insert({
        client_ip: clientIp,
        user_agent: userAgent,
      });
    
    if (error) {
      console.error('Error recording free trial usage:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error recording free trial usage:', error);
    return false;
  }
}

// Delete a free trial usage record
export async function deleteFreeTrial(clientIp: string): Promise<boolean> {
  try {
    // Create a Supabase client with service role key
    const supabaseAdmin = createServiceRoleClient();
    
    // Delete the free trial usage record
    const { error } = await supabaseAdmin
      .from('free_trial_usage')
      .delete()
      .eq('client_ip', clientIp);
    
    if (error) {
      console.error('Error deleting free trial usage:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting free trial usage:', error);
    return false;
  }
} 