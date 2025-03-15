import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { handleCreditTransaction, getUserCredits } from '@/lib/supabase';

// GET endpoint to retrieve user's current credit balance
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const credits = await getUserCredits(userId);
    
    return NextResponse.json({ credits });
  } catch (error) {
    console.error('Error getting credits:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST endpoint to use credits for a service
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { amount = 1 } = await request.json();
    
    // Use credits (negative amount)
    const result = await handleCreditTransaction(userId, 'use', amount);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Failed to use credits' }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully used ${amount} credit(s)`,
      transactionId: result.transactionId
    });
  } catch (error) {
    console.error('Error using credits:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 