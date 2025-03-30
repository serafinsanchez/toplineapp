import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { userId, userName, userEmail } = body;
    
    if (!userId || !userName || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, userName, or userEmail' },
        { status: 400 }
      );
    }
    
    // Use the service role client to bypass RLS (this runs on the server)
    const supabaseAdmin = createServiceRoleClient();
    
    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (existingProfile) {
      // Update existing profile
      await supabaseAdmin
        .from('user_profiles')
        .update({
          name: userName,
          email: userEmail,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    } else {
      // Create new profile
      await supabaseAdmin
        .from('user_profiles')
        .insert({
          user_id: userId,
          name: userName,
          email: userEmail,
          role: 'user',
          balance: 0
        });
    }
    
    console.log("User profile created/updated successfully");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating/updating user profile:", error);
    return NextResponse.json(
      { error: 'Failed to create user profile' },
      { status: 500 }
    );
  }
} 