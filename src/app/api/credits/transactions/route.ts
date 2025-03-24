import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserTransactions } from '@/lib/supabase';

// GET endpoint to retrieve user's transaction history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    const result = await getUserTransactions(userId);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }
    
    return NextResponse.json({ transactions: result.transactions });
  } catch (error) {
    console.error('Error getting transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 