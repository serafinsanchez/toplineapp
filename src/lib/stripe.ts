import Stripe from 'stripe';

// Credit package options
export const CREDIT_PACKAGES = [
  { id: 'standard', name: 'Credits Package', credits: 10, price: 999 }, // $9.99
];

// Server-side Stripe client
// This should only be used in server components or API routes
let stripeInstance: Stripe | null = null;

export const getStripe = () => {
  if (!stripeInstance && typeof process !== 'undefined' && process.env.STRIPE_SECRET_KEY) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16', // Use the latest API version
    });
  }
  return stripeInstance;
};

// Client-side Stripe checkout
// This can be safely used in client components
export const getStripeJs = async () => {
  if (typeof window !== 'undefined') {
    const { loadStripe } = await import('@stripe/stripe-js');
    return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return null;
};

// Create a Stripe checkout session for credit purchase
export async function createCheckoutSession(
  userId: string,
  packageId: string,
  successUrl: string,
  cancelUrl: string
) {
  // Find the selected credit package
  const creditPackage = CREDIT_PACKAGES.find((pkg) => pkg.id === packageId);
  
  if (!creditPackage) {
    throw new Error('Invalid credit package');
  }

  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Failed to initialize Stripe');
  }

  // Create a checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: creditPackage.name,
            description: `${creditPackage.credits} credits for Topline`,
          },
          unit_amount: creditPackage.price,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      packageId,
      credits: creditPackage.credits.toString(),
    },
  });

  return session;
}

// Verify and process a successful payment
export async function handleSuccessfulPayment(sessionId: string) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      throw new Error('Failed to initialize Stripe');
    }
    
    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    // Verify payment status
    if (session.payment_status !== 'paid') {
      throw new Error('Payment not completed');
    }

    // Return session metadata for credit processing
    return {
      userId: session.metadata?.userId,
      packageId: session.metadata?.packageId,
      credits: parseInt(session.metadata?.credits || '0', 10),
      amount: session.amount_total,
    };
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
} 