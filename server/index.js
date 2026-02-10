// ============================================
// KHARA 케이하라 - Payment Server
// Stripe + PayPal Integration
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// Stripe webhook needs raw body
app.post('/api/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// === API: Config (send publishable keys to frontend) ===
app.get('/api/config', (req, res) => {
  res.json({
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    paypalClientId: process.env.PAYPAL_CLIENT_ID
  });
});

// === API: Stripe Checkout Session ===
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { items, currency = 'usd', locale = 'en' } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'No items provided' });
    }

    const lineItems = items.map(item => ({
      price_data: {
        currency: currency,
        product_data: {
          name: item.name,
          description: item.nameKr || undefined,
          metadata: {
            product_id: item.id
          }
        },
        unit_amount: Math.round(item.price * 100), // Stripe uses cents
      },
      quantity: item.qty
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.origin}/pages/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/pages/checkout.html?canceled=true`,
      shipping_address_collection: {
        allowed_countries: [
          'US', 'CA', 'GB', 'DE', 'FR', 'JP', 'KR', 'AU',
          'SG', 'MY', 'TH', 'PH', 'ID', 'VN', 'TW', 'HK',
          'NZ', 'IT', 'ES', 'NL', 'SE', 'CH', 'BR', 'MX'
        ]
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 0, currency: currency },
            display_name: 'Free Shipping 무료배송',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 7 },
              maximum: { unit: 'business_day', value: 14 }
            }
          }
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 1500, currency: currency },
            display_name: 'Express Shipping 빠른배송',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 3 },
              maximum: { unit: 'business_day', value: 5 }
            }
          }
        }
      ],
      locale: locale === 'KR' ? 'ko' : 'auto',
      metadata: {
        store: 'KHARA',
        order_source: 'global_mall'
      }
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('Stripe session error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// === API: Stripe Payment Intent (for embedded checkout) ===
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        store: 'KHARA',
        order_source: 'global_mall'
      }
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Payment intent error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// === API: Retrieve Stripe Session ===
app.get('/api/checkout-session/:sessionId', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId, {
      expand: ['line_items', 'payment_intent']
    });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === API: PayPal Create Order ===
app.post('/api/paypal/create-order', async (req, res) => {
  try {
    const { items, currency = 'USD' } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'No items provided' });
    }

    const total = items.reduce((sum, item) => sum + (item.price * item.qty), 0);

    const orderItems = items.map(item => ({
      name: item.name,
      quantity: String(item.qty),
      unit_amount: {
        currency_code: currency,
        value: item.price.toFixed(2)
      }
    }));

    // PayPal API call
    const accessToken = await getPayPalAccessToken();
    const response = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: total.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: currency,
                value: total.toFixed(2)
              }
            }
          },
          items: orderItems,
          description: 'KHARA 케이하라 Order'
        }]
      })
    });

    const order = await response.json();
    res.json(order);
  } catch (err) {
    console.error('PayPal create order error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// === API: PayPal Capture Order ===
app.post('/api/paypal/capture-order/:orderId', async (req, res) => {
  try {
    const accessToken = await getPayPalAccessToken();
    const response = await fetch(
      `https://api-m.sandbox.paypal.com/v2/checkout/orders/${req.params.orderId}/capture`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const capture = await response.json();
    res.json(capture);
  } catch (err) {
    console.error('PayPal capture error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// === PayPal Access Token Helper ===
async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  return data.access_token;
}

// === Stripe Webhook Handler ===
async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log('✅ Payment successful:', session.id);
      console.log('   Customer email:', session.customer_details?.email);
      console.log('   Amount:', session.amount_total / 100, session.currency?.toUpperCase());
      // TODO: Fulfill order, send confirmation email, sync with cafe24
      break;
    }
    case 'payment_intent.succeeded': {
      const intent = event.data.object;
      console.log('✅ PaymentIntent succeeded:', intent.id);
      break;
    }
    case 'payment_intent.payment_failed': {
      const intent = event.data.object;
      console.log('❌ Payment failed:', intent.id, intent.last_payment_error?.message);
      break;
    }
    default:
      console.log('Webhook event:', event.type);
  }

  res.json({ received: true });
}

// === Fallback routes for SPA ===
app.get('/checkout', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'pages', 'checkout.html'));
});

app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'pages', 'success.html'));
});

// === Start Server ===
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔═══════════════════════════════════════╗');
  console.log('  ║                                       ║');
  console.log('  ║   KHARA 케이하라 Payment Server        ║');
  console.log('  ║                                       ║');
  console.log(`  ║   Local:  http://localhost:${PORT}        ║`);
  console.log('  ║                                       ║');
  console.log('  ║   Stripe:  ✓ Ready                    ║');
  console.log('  ║   PayPal:  ✓ Ready                    ║');
  console.log('  ║                                       ║');
  console.log('  ╚═══════════════════════════════════════╝');
  console.log('');
});
