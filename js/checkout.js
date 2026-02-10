// ============================================
// KHARA 케이하라 - Checkout Module
// Stripe + PayPal Payment Integration
// ============================================

(function() {
  'use strict';

  let stripeInstance = null;
  let elements = null;
  let paypalLoaded = false;
  let config = {};

  // === Initialize ===
  async function init() {
    // Check cart
    if (cart.items.length === 0) {
      document.getElementById('checkoutContent').style.display = 'none';
      document.getElementById('emptyCartMsg').style.display = 'block';
      return;
    }

    // Show canceled message if applicable
    const params = new URLSearchParams(window.location.search);
    if (params.get('canceled') === 'true') {
      document.getElementById('canceledBanner').classList.add('show');
    }

    renderOrderSummary();
    setupPaymentTabs();
    await loadPaymentConfig();
    setupStripe();
    setupPayPal();
    setupHostedCheckout();
  }

  // === Load Payment Config ===
  async function loadPaymentConfig() {
    try {
      const res = await fetch('/api/config');
      config = await res.json();
    } catch (err) {
      console.log('Running in demo mode - payment config not available');
      config = { stripePublishableKey: null, paypalClientId: null };
    }
  }

  // === Render Order Summary ===
  function renderOrderSummary() {
    const orderItems = document.getElementById('orderItems');
    const subtotal = cart.getTotal();

    orderItems.innerHTML = cart.items.map(item => `
      <div class="order-item">
        <div class="order-item-emoji" style="background: ${item.bgColor}">
          ${item.emoji}
        </div>
        <div class="order-item-info">
          <div class="order-item-name">${item.name}</div>
          <div class="order-item-name-kr">${item.nameKr || ''}</div>
          <div class="order-item-qty">Qty: ${item.qty}</div>
        </div>
        <div class="order-item-price">$${(item.price * item.qty).toFixed(2)}</div>
      </div>
    `).join('');

    document.getElementById('subtotalAmount').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('totalAmount').textContent = `$${subtotal.toFixed(2)}`;
  }

  // === Payment Tab Switching ===
  function setupPaymentTabs() {
    const tabs = document.querySelectorAll('.payment-tab');
    const panels = document.querySelectorAll('.payment-panel');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const method = tab.dataset.method;

        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(`${method}Panel`).classList.add('active');
      });
    });
  }

  // === Stripe Setup ===
  function setupStripe() {
    const payBtn = document.getElementById('stripePayBtn');

    if (config.stripePublishableKey && config.stripePublishableKey !== 'pk_test_REPLACE_WITH_YOUR_KEY') {
      // Real Stripe integration
      loadStripeSDK().then(() => {
        stripeInstance = Stripe(config.stripePublishableKey);
        initStripeElements();
      });
    } else {
      // Demo mode - show card form
      console.log('Stripe: Running in demo mode');
      formatCardInputs();
    }

    payBtn.addEventListener('click', handleStripePayment);
  }

  async function loadStripeSDK() {
    return new Promise((resolve) => {
      if (window.Stripe) return resolve();
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  async function initStripeElements() {
    try {
      // Create Payment Intent
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: cart.getTotal(),
          currency: 'usd'
        })
      });

      const { clientSecret } = await res.json();

      // Mount Stripe Elements
      elements = stripeInstance.elements({
        clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#e84393',
            colorBackground: '#16161e',
            colorText: '#c8c8dd',
            colorDanger: '#ff6b6b',
            fontFamily: 'Noto Sans KR, Space Grotesk, sans-serif',
            borderRadius: '8px'
          },
          rules: {
            '.Input': {
              border: '1px solid #2a2a3a',
              backgroundColor: '#16161e'
            },
            '.Input:focus': {
              border: '1px solid #e84393',
              boxShadow: '0 0 0 3px rgba(232, 67, 147, 0.1)'
            }
          }
        }
      });

      const paymentElement = elements.create('payment');
      document.getElementById('stripeFallbackForm').style.display = 'none';
      paymentElement.mount('#stripe-payment-element');
    } catch (err) {
      console.error('Stripe Elements init failed:', err);
    }
  }

  async function handleStripePayment() {
    const payBtn = document.getElementById('stripePayBtn');
    const errorEl = document.getElementById('paymentError');

    payBtn.classList.add('loading');
    payBtn.disabled = true;
    errorEl.classList.remove('show');

    if (stripeInstance && elements) {
      // Real Stripe payment
      try {
        const { error } = await stripeInstance.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/pages/success.html`
          }
        });

        if (error) {
          showError(error.message);
        }
      } catch (err) {
        showError(err.message);
      }
    } else {
      // Demo mode - use Stripe Checkout Session
      try {
        const res = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cart.items,
            currency: 'usd'
          })
        });

        const data = await res.json();

        if (data.url) {
          window.location.href = data.url;
          return;
        } else if (data.error) {
          showError(data.error);
        }
      } catch (err) {
        // Server not running - demo mode
        simulateDemoPayment('stripe');
        return;
      }
    }

    payBtn.classList.remove('loading');
    payBtn.disabled = false;
  }

  // === PayPal Setup ===
  function setupPayPal() {
    const fallbackBtn = document.getElementById('paypalFallbackBtn');

    if (config.paypalClientId && config.paypalClientId !== 'REPLACE_WITH_YOUR_PAYPAL_CLIENT_ID') {
      loadPayPalSDK().then(() => {
        renderPayPalButtons();
      });
    } else {
      console.log('PayPal: Running in demo mode');
    }

    fallbackBtn.addEventListener('click', handlePayPalFallback);
  }

  async function loadPayPalSDK() {
    return new Promise((resolve) => {
      if (window.paypal) return resolve();
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${config.paypalClientId}&currency=USD`;
      script.onload = () => {
        paypalLoaded = true;
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  function renderPayPalButtons() {
    if (!window.paypal) return;

    document.getElementById('paypalFallbackBtn').style.display = 'none';

    window.paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'blue',
        shape: 'pill',
        label: 'paypal',
        height: 50
      },

      createOrder: async () => {
        try {
          const res = await fetch('/api/paypal/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: cart.items,
              currency: 'USD'
            })
          });
          const order = await res.json();
          return order.id;
        } catch (err) {
          showError('PayPal order creation failed');
        }
      },

      onApprove: async (data) => {
        try {
          const res = await fetch(`/api/paypal/capture-order/${data.orderID}`, {
            method: 'POST'
          });
          const capture = await res.json();

          if (capture.status === 'COMPLETED') {
            localStorage.removeItem('hallyu_cart');
            window.location.href = `/pages/success.html?order_id=${data.orderID}`;
          } else {
            showError('Payment not completed. Please try again.');
          }
        } catch (err) {
          showError('PayPal capture failed');
        }
      },

      onError: (err) => {
        showError('PayPal error. Please try another payment method.');
        console.error('PayPal error:', err);
      }
    }).render('#paypal-button-container');
  }

  async function handlePayPalFallback() {
    try {
      const res = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.items,
          currency: 'USD'
        })
      });
      const order = await res.json();

      if (order.links) {
        const approveLink = order.links.find(l => l.rel === 'approve');
        if (approveLink) {
          window.location.href = approveLink.href;
          return;
        }
      }

      simulateDemoPayment('paypal');
    } catch (err) {
      simulateDemoPayment('paypal');
    }
  }

  // === Stripe Hosted Checkout ===
  function setupHostedCheckout() {
    const btn = document.getElementById('hostedCheckoutBtn');

    btn.addEventListener('click', async () => {
      btn.classList.add('loading');
      btn.disabled = true;

      try {
        const res = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cart.items,
            currency: 'usd'
          })
        });

        const data = await res.json();

        if (data.url) {
          window.location.href = data.url;
          return;
        }

        showError(data.error || 'Failed to create checkout session');
      } catch (err) {
        simulateDemoPayment('stripe-hosted');
      }

      btn.classList.remove('loading');
      btn.disabled = false;
    });
  }

  // === Demo Mode ===
  function simulateDemoPayment(method) {
    const errorEl = document.getElementById('paymentError');
    errorEl.innerHTML = `
      <strong>Demo Mode 데모 모드</strong><br>
      실제 결제를 진행하려면 .env 파일에 API 키를 설정해주세요.<br>
      To process real payments, configure your API keys in the .env file.<br><br>
      <strong>Setup steps:</strong><br>
      1. Copy .env.example to .env<br>
      2. Add your Stripe keys from <span style="color:var(--k-purple)">dashboard.stripe.com</span><br>
      3. Add PayPal keys from <span style="color:var(--k-purple)">developer.paypal.com</span><br>
      4. Run: <code style="background:var(--khara-surface);padding:2px 6px;border-radius:4px;">npm start</code><br><br>
      <button onclick="demoSuccess()" style="background:var(--k-mint);color:var(--khara-black);padding:8px 20px;border:none;border-radius:20px;font-weight:700;cursor:pointer;font-size:0.8rem;">
        Simulate Success 데모 결제 완료 →
      </button>
    `;
    errorEl.classList.add('show');

    // Reset button states
    document.querySelectorAll('.stripe-btn').forEach(btn => {
      btn.classList.remove('loading');
      btn.disabled = false;
    });
  }

  // Global demo success function
  window.demoSuccess = function() {
    localStorage.removeItem('hallyu_cart');
    window.location.href = '/pages/success.html?order_id=DEMO-' + Date.now().toString(36).toUpperCase();
  };

  // === Helpers ===
  function showError(message) {
    const errorEl = document.getElementById('paymentError');
    errorEl.textContent = message;
    errorEl.classList.add('show');

    document.querySelectorAll('.stripe-btn').forEach(btn => {
      btn.classList.remove('loading');
      btn.disabled = false;
    });
  }

  function formatCardInputs() {
    const cardNumber = document.getElementById('cardNumber');
    const cardExpiry = document.getElementById('cardExpiry');

    if (cardNumber) {
      cardNumber.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        val = val.replace(/(\d{4})(?=\d)/g, '$1 ');
        e.target.value = val.slice(0, 19);
      });
    }

    if (cardExpiry) {
      cardExpiry.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length >= 2) {
          val = val.slice(0, 2) + ' / ' + val.slice(2);
        }
        e.target.value = val.slice(0, 7);
      });
    }
  }

  // === Boot ===
  document.addEventListener('DOMContentLoaded', init);
})();
