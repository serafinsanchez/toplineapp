import { NextRequest, NextResponse } from 'next/server';
import { handleCreditTransaction, createServiceRoleClient } from '@/lib/supabase';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Track processed webhook events to prevent duplicates
const processedEvents = new Set<string>();

// Helper function to get timestamp
function getTimestamp() {
  return new Date().toISOString();
}

// Helper function for consistent log formatting
function logWithIds(message: string, stripeId?: string, internalId?: string) {
  const timestamp = getTimestamp();
  const stripeTag = stripeId ? `[Stripe:${stripeId}]` : '';
  const internalTag = internalId ? `[Internal:${internalId}]` : '';
  console.log(`[${timestamp}]${stripeTag}${internalTag} ${message}`);
}

function logWarning(message: string, stripeId?: string, internalId?: string) {
  const timestamp = getTimestamp();
  const stripeTag = stripeId ? `[Stripe:${stripeId}]` : '';
  const internalTag = internalId ? `[Internal:${internalId}]` : '';
  console.warn(`[${timestamp}]${stripeTag}${internalTag} ${message}`);
}

function logError(message: string, stripeId?: string, internalId?: string) {
  const timestamp = getTimestamp();
  const stripeTag = stripeId ? `[Stripe:${stripeId}]` : '';
  const internalTag = internalId ? `[Internal:${internalId}]` : '';
  console.error(`[${timestamp}]${stripeTag}${internalTag} ${message}`);
}

export async function POST(request: NextRequest) {
  try {
    logWithIds('Received Stripe webhook');
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;
    
    const stripe = getStripe();
    if (!stripe) {
      logError('Failed to initialize Stripe');
      return NextResponse.json({ error: 'Failed to initialize Stripe' }, { status: 500 });
    }
    
    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logWithIds(`Webhook event constructed: ${event.type} event ID: ${event.id}`);
      
      if (processedEvents.has(event.id)) {
        logWithIds(`Event ${event.id} already processed, skipping`);
        return NextResponse.json({ received: true, status: 'already processed' });
      }
      
      processedEvents.add(event.id);
      
      if (processedEvents.size > 100) {
        const eventsArray = Array.from(processedEvents);
        for (let i = 0; i < eventsArray.length - 100; i++) {
          processedEvents.delete(eventsArray[i]);
        }
      }
    } catch (err) {
      logError('Webhook signature verification failed:', undefined, undefined);
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }
    
    if (event.type === 'checkout.session.completed') {
      logWithIds('Processing checkout.session.completed event');
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session.metadata?.userId;
      const credits = parseInt(session.metadata?.credits || '0', 10);
      const packageId = session.metadata?.packageId;
      
      const paymentIntentId = typeof session.payment_intent === 'string' 
        ? session.payment_intent 
        : session.payment_intent?.id;
      
      if (!paymentIntentId) {
        logWarning('No payment intent ID found in session');
        return NextResponse.json({ error: 'Missing payment intent ID' }, { status: 400 });
      }

      logWithIds('Processing credit purchase', paymentIntentId);
      
      if (!userId || !credits) {
        logError(`Missing metadata in Stripe session: ${JSON.stringify(session.metadata)}`, paymentIntentId);
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }
      
      if (session.payment_status !== 'paid') {
        logWarning(`Payment not marked as paid: ${session.payment_status}`, paymentIntentId);
        return NextResponse.json({ message: 'Payment not completed' });
      }
      
      try {
        const supabaseAdmin = createServiceRoleClient();
        const { data: existingTransactions } = await supabaseAdmin
          .from('transactions')
          .select('id')
          .eq('stripe_transaction_id', paymentIntentId)
          .eq('user_id', userId)
          .eq('type', 'purchase');
        
        if (existingTransactions && existingTransactions.length > 0) {
          logWithIds('Payment already processed, skipping to prevent duplicate credits', paymentIntentId);
          return NextResponse.json({ 
            received: true, 
            status: 'already processed', 
            message: 'Payment already processed'
          });
        }
        
        const { data: beforeData } = await supabaseAdmin
          .from('user_profiles')
          .select('balance')
          .eq('user_id', userId)
          .single();
        
        const balanceBefore = beforeData?.balance || 0;
        logWithIds(`User balance BEFORE transaction: ${balanceBefore}`, paymentIntentId);
        
        logWithIds(`Adding ${credits} credits to user ${userId}`, paymentIntentId);
        
        const result = await handleCreditTransaction(
          userId,
          'purchase',
          credits,
          paymentIntentId
        );
        
        if (!result.success) {
          logError(`Failed to add credits: ${JSON.stringify(result.error)}`, paymentIntentId);
          return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 });
        }

        const internalTxId = result.transactionId;
        logWithIds('Credit transaction created', paymentIntentId, internalTxId);

        await new Promise(resolve => setTimeout(resolve, 500));
        
        let balanceAfter = balanceBefore;
        let retries = 0;
        const maxRetries = 3;
        
        while (retries < maxRetries) {
          const { data: afterData } = await supabaseAdmin
            .from('user_profiles')
            .select('balance')
            .eq('user_id', userId)
            .single();
          
          balanceAfter = afterData?.balance || 0;
          
          if (balanceAfter - balanceBefore === credits) {
            break;
          }
          
          logWithIds(`Attempt ${retries + 1}: Balance not yet updated, waiting...`, paymentIntentId, internalTxId);
          await new Promise(resolve => setTimeout(resolve, 200));
          retries++;
        }

        logWithIds(`User balance AFTER transaction: ${balanceAfter}`, paymentIntentId, internalTxId);
        logWithIds(`Credits added: ${balanceAfter - balanceBefore} (expected: ${credits})`, paymentIntentId, internalTxId);
        
        if (balanceAfter - balanceBefore !== credits) {
          logWarning(`Balance verification shows ${balanceAfter - balanceBefore} credits added (expected: ${credits}). This might be due to replication delay.`, paymentIntentId, internalTxId);
        } else {
          logWithIds(`Successfully verified addition of ${credits} credits. New balance: ${balanceAfter}`, paymentIntentId, internalTxId);
        }

        return NextResponse.json({ 
          received: true,
          success: true,
          creditsAdded: credits,
          newBalance: balanceAfter,
          stripePaymentId: paymentIntentId,
          internalTransactionId: internalTxId
        });
      } catch (creditError) {
        logError(`Error processing credit update: ${creditError}`, paymentIntentId);
        return NextResponse.json({ error: 'Failed to process credit update' }, { status: 500 });
      }
    } else if (event.type === 'payment_intent.succeeded') {
      logWithIds('Payment intent succeeded event received - NO CREDITS ADDED HERE');
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      logError(`Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    logError(`Error handling webhook: ${error}`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Disable body parsing for this route
export const config = {
  api: {
    bodyParser: false,
  },
}; 