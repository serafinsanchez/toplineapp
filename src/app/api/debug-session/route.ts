import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserCredits } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const credits = await getUserCredits(userId);
    
    return NextResponse.json({
      session: {
        user: {
          id: userId,
          email: session.user.email,
          name: session.user.name,
        },
      },
      credits,
    });
  } catch (error) {
    console.error('Error getting session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 