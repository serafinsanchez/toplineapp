import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { handleCreditTransaction, updateUserCreditsDirectly, getUserCredits } from '@/lib/supabase';

// This is a test endpoint to manually trigger credit updates for debugging
// It should be removed or secured in production
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { method } = await request.json();
    const userId = session.user.id;
    
    // Get current credits
    const currentCredits = await getUserCredits(userId);
    
    let result;
    if (method === 'direct') {
      // Update directly
      const success = await updateUserCreditsDirectly(userId, currentCredits + 5);
      result = { 
        method: 'direct',
        success,
        previousCredits: currentCredits,
        newCredits: currentCredits + 5
      };
    } else {
      // Use the transaction function
      const transactionResult = await handleCreditTransaction(userId, 'purchase', 5, 'test-transaction');
      result = { 
        method: 'transaction',
        success: transactionResult.success,
        previousCredits: currentCredits,
        transactionId: transactionResult.transactionId,
        error: transactionResult.error
      };
    }
    
    // Get updated credits
    const updatedCredits = await getUserCredits(userId);
    
    return NextResponse.json({ 
      result,
      updatedCredits
    });
  } catch (error) {
    console.error('Error in test-credits:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 