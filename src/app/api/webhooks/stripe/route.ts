import { NextRequest, NextResponse } from 'next/server';
import { handleCreditTransaction } from '@/lib/supabase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;
    
    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }
    
    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Extract metadata
      const userId = session.metadata?.userId;
      const credits = parseInt(session.metadata?.credits || '0', 10);
      
      if (!userId || !credits) {
        console.error('Missing metadata in Stripe session:', session.metadata);
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }
      
      // Add credits to the user's account
      const result = await handleCreditTransaction(
        userId,
        'purchase',
        credits,
        session.payment_intent as string
      );
      
      if (!result.success) {
        console.error('Failed to add credits:', result.error);
        return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 });
      }
      
      console.log(`Added ${credits} credits to user ${userId}`);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Disable body parsing for this route
export const config = {
  api: {
    bodyParser: false,
  },
}; 