import Stripe from 'stripe';
import { Request, Response } from 'express';
import { query, queryOne } from './lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Received Stripe webhook:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const meta = session.metadata || {};
  const { plan_id, email, first_name, last_name, password_hash, company, phone, website } = meta;

  // ── UPGRADE FLOW (existing user) ──────────────────────────────────────────
  if (meta.user_id && !email) {
    const userId = meta.user_id;
    console.log('Upgrade checkout completed for existing user:', userId);

    await query(
      'UPDATE public.profiles SET subscription_status = $1, plan_id = $2 WHERE id = $3',
      ['active', plan_id || 'pro', userId]
    );

    // Upsert subscription
    if (session.subscription) {
      const sub = await stripe.subscriptions.retrieve(session.subscription as string);
      await query(
        `INSERT INTO public.subscriptions (user_id, plan_id, stripe_subscription_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (stripe_subscription_id)
         DO UPDATE SET status = $4, current_period_start = $5, current_period_end = $6, updated_at = NOW()`,
        [userId, plan_id, sub.id, 'active',
          new Date(sub.current_period_start * 1000),
          new Date(sub.current_period_end * 1000)]
      );
    }
    return;
  }

  // ── NEW ACCOUNT FLOW ──────────────────────────────────────────────────────
  if (!email || !password_hash) {
    console.error('Webhook: missing email or password_hash in session metadata:', session.id);
    return;
  }

  console.log('Creating new account from Stripe webhook for:', email);

  // Idempotency: skip if user already exists
  const existing = await queryOne<{ id: string; }>(
    'SELECT id FROM public.users WHERE email = $1',
    [email]
  );

  if (existing) {
    console.log('User already exists, activating subscription:', existing.id);
    await query(
      'UPDATE public.profiles SET subscription_status = $1 WHERE id = $2',
      ['active', existing.id]
    );
    return;
  }

  // Get default user role
  const defaultRole = await queryOne<{ id: string }>(
    'SELECT id FROM public.roles WHERE name = $1',
    ['user']
  );

  const fullName = `${first_name || ''} ${last_name || ''}`.trim();
  const stripeCustomerId = typeof session.customer === 'string' ? session.customer : null;

  // Create user
  const newUser = await queryOne<{ id: string }>(
    `INSERT INTO public.users (email, name, provider, password_hash, email_verified, role_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [email, fullName || null, 'email', password_hash, false, defaultRole?.id || null]
  );

  if (!newUser) {
    throw new Error(`Failed to create user for ${email}`);
  }

  // Create profile with active subscription
  await query(
    `INSERT INTO public.profiles
     (id, first_name, last_name, plan_id, subscription_status, company, phone, website, stripe_customer_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      newUser.id, first_name || '', last_name || '',
      plan_id || 'pro', 'active',
      company || null, phone || null, website || null,
      stripeCustomerId,
    ]
  );

  // Create subscription record
  if (session.subscription) {
    const sub = await stripe.subscriptions.retrieve(session.subscription as string);
    await query(
      `INSERT INTO public.subscriptions
       (user_id, plan_id, stripe_subscription_id, status, current_period_start, current_period_end)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        newUser.id, plan_id || 'pro', sub.id, 'active',
        new Date(sub.current_period_start * 1000),
        new Date(sub.current_period_end * 1000),
      ]
    );
  }

  // Create payment record
  await query(
    `INSERT INTO public.payments (user_id, stripe_payment_intent_id, amount, currency, status, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      newUser.id,
      session.payment_intent as string || null,
      session.amount_total || 0,
      session.currency || 'eur',
      'succeeded',
      JSON.stringify({ session_id: session.id, plan_id }),
    ]
  );

  // Notify N8N — triggers receipt email with all account info
  try {
    const n8nUrl = process.env.N8N_WEBHOOK_URL || process.env.N8N_PAYMENT_WEBHOOK_URL;
    if (n8nUrl) {
      await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_account_payment_completed',
          user_id: newUser.id,
          email,
          first_name,
          last_name,
          plan_id,
          amount: session.amount_total,
          currency: session.currency,
          session_id: session.id,
          timestamp: new Date().toISOString(),
        }),
      });
    }
  } catch (err) {
    console.error('N8N notification error:', err);
  }

  console.log(`✓ New account created via Stripe webhook: ${email} (user_id: ${newUser.id})`);
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const { user_id, plan_id } = subscription.metadata || {};
  
  if (!user_id) {
    console.error('Missing user_id in subscription metadata:', subscription.id);
    return;
  }

  const status = mapStripeStatusToLocal(subscription.status);

  // Update subscription in database
  await query(
    `INSERT INTO public.subscriptions (user_id, plan_id, stripe_subscription_id, status, current_period_start, current_period_end, cancel_at_period_end)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (stripe_subscription_id)
     DO UPDATE SET status = $4, current_period_start = $5, current_period_end = $6, cancel_at_period_end = $7, updated_at = NOW()`,
    [
      user_id,
      plan_id || 'pro',
      subscription.id,
      status,
      new Date(subscription.current_period_start * 1000),
      new Date(subscription.current_period_end * 1000),
      subscription.cancel_at_period_end
    ]
  );

  console.log('Updated subscription for user:', user_id, 'status:', status);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { user_id } = subscription.metadata || {};
  
  if (!user_id) {
    console.error('Missing user_id in subscription metadata:', subscription.id);
    return;
  }

  // Update subscription status and downgrade to starter plan
  await query(
    `INSERT INTO public.subscriptions (user_id, plan_id, stripe_subscription_id, status)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (stripe_subscription_id)
     DO UPDATE SET plan_id = $2, status = $4, updated_at = NOW()`,
    [user_id, 'starter', subscription.id, 'cancelled']
  );

  console.log('Cancelled subscription for user:', user_id);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscription = invoice.subscription as string;
  const customerId = invoice.customer as string;

  if (subscription) {
    // Get subscription details
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription);
    const { user_id } = stripeSubscription.metadata || {};

    if (user_id) {
      // Record successful payment
      await query(
        `INSERT INTO public.payments (user_id, stripe_payment_intent_id, amount, currency, status, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user_id,
          invoice.payment_intent as string,
          invoice.amount_paid,
          invoice.currency,
          'succeeded',
          JSON.stringify({ invoice_id: invoice.id })
        ]
      );

      console.log('Recorded successful payment for user:', user_id);
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscription = invoice.subscription as string;

  if (subscription) {
    // Get subscription details
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription);
    const { user_id } = stripeSubscription.metadata || {};

    if (user_id) {
      // Record failed payment
      await query(
        `INSERT INTO public.payments (user_id, amount, currency, status, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user_id,
          invoice.amount_due,
          invoice.currency,
          'failed',
          JSON.stringify({
            invoice_id: invoice.id,
            failure_reason: 'Payment failed'
          })
        ]
      );

      // Notify user via N8N workflow
      try {
        const n8nWebhookUrl = process.env.N8N_PAYMENT_FAILED_WEBHOOK_URL;
        
        if (n8nWebhookUrl) {
          await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'payment_failed',
              user_id,
              subscription_id: subscription,
              amount: invoice.amount_due,
              currency: invoice.currency,
              timestamp: new Date().toISOString(),
            }),
          });
        }
      } catch (error) {
        console.error('Failed to notify N8N about payment failure:', error);
      }

      console.log('Recorded failed payment for user:', user_id);
    }
  }
}

function mapStripeStatusToLocal(status: Stripe.Subscription.Status): string {
  switch (status) {
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'cancelled':
      return 'cancelled';
    case 'incomplete':
    case 'incomplete_expired':
    case 'unpaid':
      return 'inactive';
    case 'trialing':
      return 'trialing';
    default:
      return 'inactive';
  }
}