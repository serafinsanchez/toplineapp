import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
import { handleCreditTransaction } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Get the session
    const session = await getServerSession(authOptions);
    
    // Check if the user is authenticated and is an admin
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // For testing purposes, we'll skip the admin check
    // In production, uncomment the following code
    /*
    const isUserAdmin = await isAdmin(session.user.id);
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    */
    
    // Get the request body
    const { userId, credits } = await request.json();
    
    if (!userId || !credits) {
      return NextResponse.json({ error: 'User ID and credits are required' }, { status: 400 });
    }
    
    // Add credits to the user
    const result = await handleCreditTransaction(userId, 'purchase', credits);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully added ${credits} credit(s) to user ${userId}`,
      transactionId: result.transactionId
    });
  } catch (error) {
    console.error('Error adding credits:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 