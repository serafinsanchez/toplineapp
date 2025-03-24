import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createCheckoutSession, CREDIT_PACKAGES } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { packageId } = await request.json();
    
    if (!packageId) {
      return NextResponse.json({ error: 'Package ID is required' }, { status: 400 });
    }
    
    // Validate the package ID
    const creditPackage = CREDIT_PACKAGES.find(pkg => pkg.id === packageId);
    if (!creditPackage) {
      return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
    }
    
    // Create a Stripe checkout session
    try {
      const stripeSession = await createCheckoutSession(
        userId,
        packageId,
        `${process.env.NEXTAUTH_URL}/credits`,
        `${process.env.NEXTAUTH_URL}/credits?canceled=true`
      );
      
      return NextResponse.json({ 
        success: true,
        url: stripeSession.url,
        sessionId: stripeSession.id
      });
    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      return NextResponse.json({ 
        error: 'Failed to create Stripe checkout session',
        detail: stripeError instanceof Error ? stripeError.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 