import Stripe from 'stripe';

// Initialize Stripe with the secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16', // Use the latest API version
});

// Credit package options
export const CREDIT_PACKAGES = [
  { id: 'credits_5', name: '5 Credits', credits: 5, price: 500 }, // $5.00
  { id: 'credits_10', name: '10 Credits', credits: 10, price: 900 }, // $9.00
  { id: 'credits_25', name: '25 Credits', credits: 25, price: 2000 }, // $20.00
  { id: 'credits_50', name: '50 Credits', credits: 50, price: 3500 }, // $35.00
];

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