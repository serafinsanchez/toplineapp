/**
 * Profile API Route
 * 
 * This API endpoint returns the profile information for the authenticated user,
 * including their role (admin or user).
 * 
 * Authentication: Requires an authenticated user
 * Method: GET
 * 
 * @returns User profile information including role
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Check if the user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get the user's profile from the database
    const { data, error } = await supabase
      .from('user_profiles')
      .select('role, balance')
      .eq('user_id', session.user.id)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }
    
    // Return the user's profile information
    return NextResponse.json({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: data?.role || 'user',
      balance: data?.balance || 0,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get the user session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the request body
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Update the user profile
    const { error } = await supabaseClient.auth.updateUser({
      data: { full_name: name },
    });

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
} 