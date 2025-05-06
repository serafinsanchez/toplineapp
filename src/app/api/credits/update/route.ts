import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateUserCreditsDirectly } from '@/lib/supabase';

// POST endpoint to update a user's credit balance
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only allow the user to update their own credits
    const { userId, credits } = await request.json();
    
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Update the user's credits
    const success = await updateUserCreditsDirectly(userId, credits);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to update credits' }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully updated credits to ${credits}`
    });
  } catch (error) {
    console.error('Error updating credits:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 