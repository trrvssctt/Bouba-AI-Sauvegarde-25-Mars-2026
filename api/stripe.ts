import Stripe from 'stripe';
import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { query, queryOne } from './lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

/**
 * NEW FLOW: No account created before payment.
 * User info (including hashed password) is stored in Stripe session metadata.
 * The webhook handler creates the account after payment confirmation.
 */
export async function createCheckoutSession(req: Request, res: Response) {
  try {
    const { planId, userInfo } = req.body as {
      planId: string;
      userInfo: {
        email: string;
        password: string;
        firstName?: string;
        lastName?: string;
        company?: string;
        phone?: string;
        website?: string;
      };
    };

    if (!planId || !userInfo?.email || !userInfo?.password) {
      return res.status(400).json({ error: 'Missing required fields (planId, userInfo.email, userInfo.password)' });
    }

    // Get plan details from DB
    const plan = await queryOne<{ id: string; name: string; price: number; stripe_price_id?: string }>(
      'SELECT id, name, price, stripe_price_id FROM public.plans WHERE id = $1',
      [planId]
    );

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Resolve Stripe Price ID: DB value → env var fallback
    let stripePriceId = plan.stripe_price_id;
    if (!stripePriceId) {
      const nameLC = (plan.name || '').toLowerCase();
      if (nameLC.includes('enterprise') || nameLC.includes('business')) {
        stripePriceId = process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY;
      } else if (nameLC.includes('pro')) {
        stripePriceId = process.env.STRIPE_PRICE_PRO_MONTHLY;
      }
    }

    if (!stripePriceId) {
      console.error(`[Stripe] No price ID for plan "${plan.name}" (${planId}). Set STRIPE_PRICE_PRO_MONTHLY / STRIPE_PRICE_ENTERPRISE_MONTHLY in .env`);
      return res.status(400).json({
        error: 'Plan not available for purchase. Please contact support.',
      });
    }

    // Hash password server-side (never trust client)
    const passwordHash = await bcrypt.hash(userInfo.password, 12);

    // Create Stripe customer (pre-payment, no user in DB yet)
    const customer = await stripe.customers.create({
      email: userInfo.email,
      name: `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || undefined,
    });

    const base = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Store all user info in session metadata — webhook will create the account
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{ price: stripePriceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${base}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/payment/cancel`,
      metadata: {
        plan_id: planId,
        // User info for account creation on webhook
        email: userInfo.email,
        first_name: (userInfo.firstName || '').substring(0, 100),
        last_name: (userInfo.lastName || '').substring(0, 100),
        password_hash: passwordHash, // bcrypt hash, ~60 chars
        company: (userInfo.company || '').substring(0, 200),
        phone: (userInfo.phone || '').substring(0, 50),
        website: (userInfo.website || '').substring(0, 200),
      },
      subscription_data: {
        metadata: { plan_id: planId, email: userInfo.email },
      },
    });

    res.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * UPGRADE FLOW (existing user): Create checkout session with userId
 */
export async function createUpgradeCheckoutSession(req: Request, res: Response) {
  try {
    const { planId, userId, userEmail, successPath, cancelPath } = req.body;

    if (!planId || !userId || !userEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const plan = await queryOne<{ id: string; name: string; stripe_price_id?: string }>(
      'SELECT id, name, stripe_price_id FROM public.plans WHERE id = $1',
      [planId]
    );

    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    let stripePriceId = plan.stripe_price_id;
    if (!stripePriceId) {
      const nameLC = (plan.name || '').toLowerCase();
      if (nameLC.includes('enterprise') || nameLC.includes('business')) {
        stripePriceId = process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY;
      } else if (nameLC.includes('pro')) {
        stripePriceId = process.env.STRIPE_PRICE_PRO_MONTHLY;
      }
    }

    if (!stripePriceId) {
      return res.status(400).json({ error: 'Plan not available for purchase.' });
    }

    const profile = await queryOne<{ stripe_customer_id?: string; first_name?: string; last_name?: string }>(
      'SELECT stripe_customer_id, first_name, last_name FROM public.profiles WHERE id = $1',
      [userId]
    );

    let customer: Stripe.Customer | Stripe.DeletedCustomer;
    if (profile?.stripe_customer_id) {
      customer = await stripe.customers.retrieve(profile.stripe_customer_id);
    } else {
      customer = await stripe.customers.create({
        email: userEmail,
        name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || undefined,
        metadata: { user_id: userId },
      });
      await query('UPDATE public.profiles SET stripe_customer_id = $1 WHERE id = $2', [customer.id, userId]);
    }

    const base = process.env.FRONTEND_URL || 'http://localhost:5173';
    const successUrl = successPath
      ? `${base}${successPath}${successPath.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`
      : `${base}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = cancelPath ? `${base}${cancelPath}` : `${base}/payment/cancel`;

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{ price: stripePriceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { user_id: userId, plan_id: planId },
      subscription_data: { metadata: { user_id: userId, plan_id: planId } },
    });

    res.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('Stripe upgrade checkout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function verifyPaymentSession(req: Request, res: Response) {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (!session || session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    const { user_id, plan_id } = session.metadata || {};
    
    if (!user_id || !plan_id) {
      return res.status(400).json({ error: 'Invalid session metadata' });
    }

    // Update subscription in database
    const subscription = session.subscription as Stripe.Subscription;
    
    await query(
      `INSERT INTO public.subscriptions (user_id, plan_id, stripe_subscription_id, status, current_period_start, current_period_end)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (stripe_subscription_id) 
       DO UPDATE SET status = $4, current_period_start = $5, current_period_end = $6, updated_at = NOW()`,
      [
        user_id,
        plan_id,
        subscription.id,
        'active',
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000)
      ]
    );

    // Create payment record
    await query(
      `INSERT INTO public.payments (user_id, stripe_payment_intent_id, amount, currency, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user_id,
        session.payment_intent as string,
        subscription.items.data[0].price.unit_amount || 0,
        subscription.currency,
        'succeeded',
        JSON.stringify({
          session_id: sessionId,
          plan_id,
        })
      ]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function cancelSubscription(req: Request, res: Response) {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID required' });
    }

    // Cancel subscription at period end
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    // Update in database
    await query(
      'UPDATE public.subscriptions SET cancel_at_period_end = true, updated_at = NOW() WHERE stripe_subscription_id = $1',
      [subscriptionId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function reactivateSubscription(req: Request, res: Response) {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID required' });
    }

    // Reactivate subscription
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    // Update in database
    await query(
      'UPDATE public.subscriptions SET cancel_at_period_end = false, status = $1, updated_at = NOW() WHERE stripe_subscription_id = $2',
      ['active', subscriptionId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Subscription reactivation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createBillingPortalSession(req: Request, res: Response) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const profile = await queryOne<{ stripe_customer_id?: string }>(
      'SELECT stripe_customer_id FROM public.profiles WHERE id = $1',
      [userId]
    );

    if (!profile?.stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer found. Subscribe to a paid plan first.' });
    }

    const base = process.env.FRONTEND_URL || 'http://localhost:5173';
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${base}/settings/profile`,
    });

    res.json({ portalUrl: session.url });
  } catch (error) {
    console.error('Billing portal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/stripe/check-session?sessionId=xxx
 * Vérifie si le compte a été créé suite au webhook checkout.session.completed
 */
export async function checkSessionStatus(req: Request, res: Response) {
  try {
    const { sessionId } = req.query as { sessionId?: string };

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const email = session.metadata?.email || session.customer_details?.email || null;

    if (!email) {
      return res.json({ status: session.payment_status, accountReady: false, email: null });
    }

    const user = await queryOne<{ id: string }>(
      'SELECT id FROM public.users WHERE email = $1',
      [email]
    );

    res.json({
      status: session.payment_status,
      accountReady: !!user,
      email,
    });
  } catch (error) {
    console.error('Check session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}