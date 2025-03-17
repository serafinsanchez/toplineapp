import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * API route to handle password reset requests
 * 
 * This endpoint:
 * 1. Receives an email address from the client
 * 2. Sends a password reset email via Supabase Auth
 * 3. Returns a success response regardless of whether the email exists
 *    (for security reasons)
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    // Send password reset email via Supabase Auth
    // This will only send an email if the user exists
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });

    if (error) {
      console.error('Password reset error:', error);
      // Don't expose the error to the client for security reasons
    }

    // Always return success to prevent email enumeration attacks
    return NextResponse.json(
      { message: 'If your email is registered, you will receive a password reset link shortly.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in password reset:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 