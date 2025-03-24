/**
 * Script to reset a user's free trial
 * 
 * This script finds a user by email and resets their free trial by:
 * 1. Finding the user in the auth.users table
 * 2. Finding any free trial usage records in the database
 * 3. Deleting those records
 * 
 * Usage: 
 * npx ts-node src/scripts/reset-free-trial.ts serafinmusic@gmail.com
 */

import { createServiceRoleClient } from '../lib/supabase';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function resetFreeTrialByEmail(email: string) {
  console.log(`Attempting to reset free trial for user: ${email}`);
  
  const supabaseAdmin = createServiceRoleClient();
  
  try {
    // Step 1: Find the user by email
    console.log('Looking up user by email...');
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error finding user:', userError);
      return false;
    }
    
    const user = userData.users.find(u => u.email === email);
    
    if (!user) {
      console.error(`User with email ${email} not found`);
      return false;
    }
    
    console.log(`Found user: ${user.id} (${user.email})`);
    
    // Step 2: Find free trial usage records using direct SQL query
    console.log('Looking for free trial usage records...');
    const { data: freeTrialData, error: freeTrialError } = await supabaseAdmin
      .from('free_trial_usage')
      .select('*')
      .limit(100);
    
    if (freeTrialError) {
      console.error('Error finding free trial records:', freeTrialError);
      return false;
    }
    
    if (!freeTrialData || freeTrialData.length === 0) {
      console.log('No free trial records found');
      return true; // Return true as there's nothing to delete
    }
    
    console.log(`Found ${freeTrialData.length} free trial records`);
    
    // Step 3: Delete each free trial record
    let deletedCount = 0;
    
    for (const record of freeTrialData as any[]) {
      console.log(`Deleting free trial record ID: ${record.id}, IP: ${record.client_ip}`);
      
      // Delete using direct SQL
      const { error: deleteError } = await supabaseAdmin
        .from('free_trial_usage')
        .delete()
        .eq('id', record.id);
      
      if (deleteError) {
        console.error(`Error deleting record ${record.id}:`, deleteError);
      } else {
        deletedCount++;
      }
    }
    
    console.log(`Successfully deleted ${deletedCount} free trial records`);
    
    // Step 4: Clear the cookie (this can only be done in a browser context)
    console.log('Note: The browser cookie can only be cleared in a browser context.');
    console.log('The user may need to clear their cookies manually or use a different browser.');
    
    return true;
  } catch (error) {
    console.error('Error resetting free trial:', error);
    return false;
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('Please provide an email address');
  process.exit(1);
}

resetFreeTrialByEmail(email)
  .then(success => {
    if (success) {
      console.log('Free trial reset operation completed successfully');
    } else {
      console.error('Free trial reset operation failed');
      process.exit(1);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 