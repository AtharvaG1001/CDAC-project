/**
 * checkout.js — Checkout Flow Controller
 * Simulates GCP Cloud Function POST /orders or Azure Logic App HTTP trigger
 */

const Checkout = (() => {
  let _currentStep = 1;
  let _overlay, _modal;

  const STEPS = ['Shipping', 'Payment', 'Review', 'Done'];

  /* ── Open Checkout Modal ─────────────────────────────────── */
  function open() {
    if (Cart.getCount() === 0) {
      Toast.show('Your cart is empty!', 'error');
      return;
    }
    _currentStep = 1;
    _overlay = document.getElementById('checkout-overlay');
    _modal = document.getElementById('checkout-modal');
    _renderSteps();
    _renderPane(1);
    _overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    _overlay = document.getElementById('checkout-overlay');
    _overlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  /* ── Step Renderer ───────────────────────────────────────── */
  function _renderSteps() {
    const container = document.getElementById('checkout-steps');
    container.innerHTML = STEPS.map((label, i) => {
      const num = i + 1;
      const cls = num < _currentStep ? 'completed' : num === _currentStep ? 'active' : '';
      return `<div class="checkout-step ${cls}">
        <div class="step-circle">${num < _currentStep ? '✓' : num}</div>
        <div class="step-label">${label}</div>
      </div>`;
    }).join('');
  }

  /* ── Pane Renderer ───────────────────────────────────────── */
  function _renderPane(step) {
    const container = document.getElementById('checkout-panes');
    if (step === 1) container.innerHTML = _paneShipping();
    else if (step === 2) container.innerHTML = _panePayment();
    else if (step === 3) container.innerHTML = _paneReview();
    else if (step === 4) container.innerHTML = _paneDone();

    // Animate
    const pane = container.querySelector('.checkout-pane');
    requestAnimationFrame(() => pane && pane.classList.add('active'));

    // Bind step navigation buttons
    document.getElementById('btn-next-step')?.addEventListener('click', nextStep);
    document.getElementById('btn-prev-step')?.addEventListener('click', prevStep);
    document.getElementById('btn-place-order')?.addEventListener('click', placeOrder);
    document.getElementById('btn-continue-shopping')?.addEventListener('click', () => { close(); });
  }

  /* ── Step 1: Shipping ─────────────────────────────────────── */
  function _paneShipping() {
    return `<div class="checkout-pane">
      <h3 style="margin-bottom:20px;font-size:17px;">Shipping Information</h3>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="input-row">
          <div class="input-group">
            <label>First Name *</label>
            <input class="input" id="ship-fname" placeholder="Rahul" required>
          </div>
          <div class="input-group">
            <label>Last Name *</label>
            <input class="input" id="ship-lname" placeholder="Sharma" required>
          </div>
        </div>
        <div class="input-group">
          <label>Email Address *</label>
          <input class="input" id="ship-email" type="email" placeholder="rahul@example.com" required>
        </div>
        <div class="input-group">
          <label>Phone Number *</label>
          <input class="input" id="ship-phone" placeholder="+91 98765 43210" required>
        </div>
        <div class="input-group">
          <label>Street Address *</label>
          <input class="input" id="ship-address" placeholder="123 MG Road, Apartment 4B" required>
        </div>
        <div class="input-row">
          <div class="input-group">
            <label>City *</label>
            <input class="input" id="ship-city" placeholder="Pune" required>
          </div>
          <div class="input-group">
            <label>PIN Code *</label>
            <input class="input" id="ship-pin" placeholder="411001" required>
          </div>
        </div>
        <div class="input-group">
          <label>State *</label>
          <select class="input" id="ship-state">
            <option value="">Select State</option>
            <option>Maharashtra</option><option>Karnataka</option><option>Delhi</option>
            <option>Tamil Nadu</option><option>Gujarat</option><option>Rajasthan</option>
            <option>Uttar Pradesh</option><option>West Bengal</option><option>Telangana</option>
            <option>Kerala</option>
          </select>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;margin-top:24px;">
        <button class="btn btn-primary" id="btn-next-step">Continue to Payment →</button>
      </div>
    </div>`;
  }

  /* ── Step 2: Payment ──────────────────────────────────────── */
  function _panePayment() {
    return `<div class="checkout-pane">
      <h3 style="margin-bottom:20px;font-size:17px;">Payment Details</h3>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:4px;">
          ${['💳 Credit/Debit Card','🏦 Net Banking','📱 UPI'].map((m,i) =>
            `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:10px 16px;background:var(--bg-glass);border:1.5px solid var(--border);border-radius:10px;flex:1;min-width:120px;">
              <input type="radio" name="pay-method" value="${i}" ${i===0?'checked':''} style="accent-color:var(--accent);">
              <span style="font-size:14px;font-weight:500;">${m}</span>
            </label>`).join('')}
        </div>
        <div class="input-group">
          <label>Card Number</label>
          <input class="input" id="pay-card" placeholder="4242 4242 4242 4242" maxlength="19">
        </div>
        <div class="input-row">
          <div class="input-group">
            <label>Expiry Date</label>
            <input class="input" id="pay-expiry" placeholder="MM/YY" maxlength="5">
          </div>
          <div class="input-group">
            <label>CVV</label>
            <input class="input" id="pay-cvv" placeholder="•••" maxlength="3" type="password">
          </div>
        </div>
        <div class="input-group">
          <label>Name on Card</label>
          <input class="input" id="pay-name" placeholder="RAHUL SHARMA">
        </div>
        <div style="background:var(--bg-glass);border:1px solid var(--border);border-radius:10px;padding:12px 16px;font-size:13px;color:var(--text-secondary);display:flex;align-items:center;gap:8px;">
          🔒 Your payment info is encrypted. This is a demo — no real charges apply.
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:24px;">
        <button class="btn btn-ghost" id="btn-prev-step">← Back</button>
        <button class="btn btn-primary" id="btn-next-step">Review Order →</button>
      </div>
    </div>`;
  }

  /* ── Step 3: Review ───────────────────────────────────────── */
  function _paneReview() {
    const items = Cart.getItems();
    const itemsHTML = items.map(item => `
      <div class="order-summary-item">
        <div class="order-item-icon">${CloudFunctions.getEmoji(item.category)}</div>
        <div class="order-item-name">${item.name}</div>
        <div class="order-item-qty">×${item.qty}</div>
        <div class="order-item-price">${CloudFunctions.formatPrice(item.price * item.qty)}</div>
      </div>`).join('');

    return `<div class="checkout-pane">
      <h3 style="margin-bottom:8px;font-size:17px;">Review Your Order</h3>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">Please confirm your items before placing the order.</p>
      <div class="order-summary-items">${itemsHTML}</div>
      <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:8px;">
        <div class="cart-summary-row"><span>Subtotal</span><span>${CloudFunctions.formatPrice(Cart.getSubtotal())}</span></div>
        <div class="cart-summary-row"><span>Shipping</span><span>${Cart.getShipping() === 0 ? '<span style="color:var(--emerald)">FREE</span>' : CloudFunctions.formatPrice(Cart.getShipping())}</span></div>
        <div class="cart-summary-row"><span>GST (18%)</span><span>${CloudFunctions.formatPrice(Cart.getTax())}</span></div>
        <div class="cart-total-row"><span>Total</span><span>${CloudFunctions.formatPrice(Cart.getTotal() + Cart.getTax())}</span></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:24px;">
        <button class="btn btn-ghost" id="btn-prev-step">← Back</button>
        <button class="btn btn-primary btn-lg" id="btn-place-order">🛍️ Place Order</button>
      </div>
    </div>`;
  }

  /* ── Step 4: Success ──────────────────────────────────────── */
  function _paneDone(orderId = '') {
    return `<div class="checkout-pane">
      <div class="success-anim">
        <div class="success-icon">🎉</div>
        <h2 style="font-size:24px;margin-bottom:8px;">Order Confirmed!</h2>
        <p style="color:var(--text-secondary);font-size:15px;">Thank you for shopping with ShopWave. Your order has been placed successfully.</p>
        <p class="success-order-id">Order ID: <strong style="color:var(--accent-light);">${orderId}</strong></p>
        <p style="font-size:13px;color:var(--text-muted);margin-top:8px;">Estimated delivery: 3-5 business days</p>
        <div style="margin-top:28px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-primary" id="btn-continue-shopping">Continue Shopping</button>
          <a href="admin.html" class="btn btn-outline">View My Orders</a>
        </div>
      </div>
    </div>`;
  }

  /* ── Navigation ───────────────────────────────────────────── */
  function nextStep() {
    if (_currentStep === 1 && !_validateShipping()) return;
    if (_currentStep < STEPS.length) {
      _currentStep++;
      _renderSteps();
      _renderPane(_currentStep);
    }
  }

  function prevStep() {
    if (_currentStep > 1) {
      _currentStep--;
      _renderSteps();
      _renderPane(_currentStep);
    }
  }

  /* ── Validate Shipping ────────────────────────────────────── */
  function _validateShipping() {
    const fields = ['ship-fname','ship-lname','ship-email','ship-phone','ship-address','ship-city','ship-pin','ship-state'];
    for (const id of fields) {
      const el = document.getElementById(id);
      if (!el || !el.value.trim()) {
        el && el.focus();
        Toast.show('Please fill in all required fields.', 'error');
        el && (el.style.borderColor = '#f87171');
        setTimeout(() => el && (el.style.borderColor = ''), 2000);
        return false;
      }
    }
    return true;
  }

  /* ── Place Order (calls Cloud Function: POST /orders) ─────── */
  async function placeOrder() {
    const btn = document.getElementById('btn-place-order');
    if (btn) { btn.disabled = true; btn.textContent = 'Placing Order…'; }

    const orderData = {
      customer: {
        firstName: document.getElementById('ship-fname')?.value || 'Guest',
        lastName:  document.getElementById('ship-lname')?.value || '',
        email:     document.getElementById('ship-email')?.value || '',
        phone:     document.getElementById('ship-phone')?.value || '',
        address:   document.getElementById('ship-address')?.value || '',
        city:      document.getElementById('ship-city')?.value || '',
        pin:       document.getElementById('ship-pin')?.value || '',
        state:     document.getElementById('ship-state')?.value || '',
      },
      items: Cart.getItems().map(i => ({
        id: i.id, name: i.name, qty: i.qty, price: i.price, category: i.category
      })),
      subtotal: Cart.getSubtotal(),
      shipping: Cart.getShipping(),
      tax:      Cart.getTax(),
      total:    Cart.getTotal() + Cart.getTax(),
    };

    const res = await CloudFunctions.submitOrder(orderData);

    if (res.success) {
      Cart.clear();
      _currentStep = 4;
      _renderSteps();
      _renderPane(4, res.data.id);
      // Patch the pane with the real order id
      const pane = document.getElementById('checkout-panes');
      pane.innerHTML = _paneDone(res.data.id);
      const p = pane.querySelector('.checkout-pane');
      requestAnimationFrame(() => p && p.classList.add('active'));
      document.getElementById('btn-continue-shopping')?.addEventListener('click', () => close());
      Toast.show('Order placed successfully! 🎉', 'success');
    } else {
      Toast.show('Failed to place order. Please try again.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = '🛍️ Place Order'; }
    }
  }

  return { open, close };
})();
