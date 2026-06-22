/**
 * app.js — Main Application Bootstrap
 * Orchestrates UI rendering, event binding, and Cloud Function calls
 * Architecture: GCP Static Hosting / Azure Static Web Apps → JS SPA
 */

/* ── Toast Notification System ───────────────────────────── */
const Toast = (() => {
  function show(msg, type = 'info', duration = 3200) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><span class="toast-msg">${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
  return { show };
})();

/* ── App State ────────────────────────────────────────────── */
const AppState = {
  category: 'all',
  search:   '',
  sort:     'default',
  view:     'grid',   // 'grid' | 'list'
  loading:  false,
};

/* ── DOM References ───────────────────────────────────────── */
const $ = id => document.getElementById(id);

/* ── Bootstrap ────────────────────────────────────────────── */
async function initApp() {
  await CloudFunctions.init();
  Cart.init();

  renderCategories();
  renderCartUI();
  bindNavSearch();
  bindCartDrawer();
  bindCheckoutModal();
  bindViewToggle();
  bindSortSelect();

  Cart.subscribe(renderCartUI);

  loadProducts();
}

/* ── Load & Render Products ───────────────────────────────── */
async function loadProducts() {
  if (AppState.loading) return;
  AppState.loading = true;

  const grid = $('products-grid');
  grid.innerHTML = `<div class="products-loading" style="grid-column:1/-1">
    <div class="spinner"></div><p>Loading products…</p>
  </div>`;

  const res = await CloudFunctions.getProducts({
    category: AppState.category,
    search:   AppState.search,
    sort:     AppState.sort,
  });

  AppState.loading = false;
  const count = $('products-count');
  if (count) count.textContent = `${res.count} product${res.count!==1?'s':''}`;

  if (!res.data.length) {
    grid.innerHTML = `<div class="products-empty" style="grid-column:1/-1">
      <div class="products-empty-icon">🔍</div>
      <h3>No products found</h3>
      <p class="text-muted">Try a different search or category</p>
      <button class="btn btn-outline" onclick="resetFilters()">Clear Filters</button>
    </div>`;
    return;
  }

  grid.innerHTML = res.data.map(p => renderProductCard(p)).join('');
  grid.className = AppState.view === 'list' ? 'list-view' : '';
  grid.id = 'products-grid';

  // Bind card events
  grid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.btn-add-cart') || e.target.closest('.product-card-wishlist')) return;
      openProductModal(card.dataset.id);
    });
  });
  grid.querySelectorAll('.btn-add-cart').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const product = res.data.find(p => p.id === btn.dataset.id);
      if (product) quickAddToCart(product, btn);
    });
  });
  grid.querySelectorAll('.product-card-wishlist').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      btn.classList.toggle('liked');
      Toast.show(btn.classList.contains('liked') ? '❤️ Added to Wishlist' : 'Removed from Wishlist', 'info');
    });
  });

  // Entrance animation
  grid.querySelectorAll('.product-card').forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
      card.style.opacity = '1';
      card.style.transform = 'none';
    }, i * 55);
  });
}

/* ── Product Card HTML ────────────────────────────────────── */
function renderProductCard(p) {
  const disc = CloudFunctions.getDiscount(p.price, p.originalPrice);
  const emoji = CloudFunctions.getEmoji(p.category);
  const badgeClass = {
    'Best Seller':'badge-amber','Top Rated':'badge-emerald','New':'badge-accent',
    'Trending':'badge-pink','Luxury':'badge-amber','Heavy Discount':'badge-red',
    '#1 Bestseller':'badge-amber','Hot Deal':'badge-red',
  }[p.badge] || 'badge-accent';

  return `<div class="product-card" data-id="${p.id}">
    <div class="product-card-img">
      <div class="product-card-img-bg" style="background:${p.color};"></div>
      <div class="product-card-emoji">${emoji}</div>
      ${p.badge ? `<div class="product-card-badge"><span class="badge ${badgeClass}">${p.badge}</span></div>` : ''}
      <div class="product-card-wishlist" title="Wishlist">♡</div>
    </div>
    <div class="product-card-body">
      <div class="product-card-cat">${p.category}</div>
      <div class="product-card-name">${p.name}</div>
      <div class="product-card-rating">
        <span class="stars">${CloudFunctions.renderStars(p.rating)}</span>
        <span class="review-count">(${p.reviews.toLocaleString()})</span>
      </div>
      <div class="product-card-price">
        <span class="price-current">${CloudFunctions.formatPrice(p.price)}</span>
        ${p.originalPrice ? `<span class="price-original">${CloudFunctions.formatPrice(p.originalPrice)}</span>` : ''}
        ${disc ? `<span class="price-discount">${disc}% off</span>` : ''}
      </div>
      <div class="product-card-actions">
        <button class="btn btn-primary btn-sm btn-add-cart" data-id="${p.id}">🛒 Add to Cart</button>
      </div>
    </div>
  </div>`;
}

/* ── Quick Add to Cart ────────────────────────────────────── */
function quickAddToCart(product, btn) {
  Cart.addItem(product, 1);
  const orig = btn.innerHTML;
  btn.innerHTML = '✓ Added!';
  btn.style.background = 'var(--emerald)';
  btn.disabled = true;
  setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; btn.disabled = false; }, 1400);
  Toast.show(`${product.name} added to cart`, 'success');
}

/* ── Product Detail Modal ─────────────────────────────────── */
async function openProductModal(id) {
  const res = await CloudFunctions.getProduct(id);
  if (!res.success) return;
  const p = res.data;
  const disc = CloudFunctions.getDiscount(p.price, p.originalPrice);
  const emoji = CloudFunctions.getEmoji(p.category);
  let qty = 1;

  const overlay = $('product-overlay');
  const body = $('product-modal-body');

  body.innerHTML = `
    <div class="product-detail-grid">
      <div>
        <div class="product-detail-img" style="background:${p.color}22;">
          <span style="font-size:90px;filter:drop-shadow(0 8px 20px rgba(0,0,0,0.3))">${emoji}</span>
        </div>
      </div>
      <div>
        <div style="margin-bottom:10px;">
          <span class="badge badge-accent">${p.category}</span>
          ${p.badge ? `<span class="badge badge-amber" style="margin-left:6px;">${p.badge}</span>` : ''}
        </div>
        <h2 style="font-size:22px;margin-bottom:10px;">${p.name}</h2>
        <div class="product-card-rating" style="margin-bottom:12px;">
          <span class="stars">${CloudFunctions.renderStars(p.rating)}</span>
          <span class="review-count">${p.rating} · ${p.reviews.toLocaleString()} reviews</span>
        </div>
        <p style="font-size:14px;color:var(--text-secondary);line-height:1.7;margin-bottom:14px;">${p.description}</p>
        <ul class="product-detail-features">
          ${p.features.map(f => `<li>${f}</li>`).join('')}
        </ul>
        <div class="product-card-price" style="margin-bottom:4px;">
          <span class="price-current" style="font-size:28px;">${CloudFunctions.formatPrice(p.price)}</span>
          ${p.originalPrice ? `<span class="price-original">${CloudFunctions.formatPrice(p.originalPrice)}</span>` : ''}
          ${disc ? `<span class="price-discount">${disc}% off</span>` : ''}
        </div>
        <p style="font-size:13px;color:var(--emerald);margin-bottom:16px;">✓ ${p.stock > 10 ? 'In Stock' : `Only ${p.stock} left!`}</p>
        <div class="product-detail-qty">
          <button class="qty-btn" id="modal-qty-minus">−</button>
          <span class="qty-display" id="modal-qty-val">1</span>
          <button class="qty-btn" id="modal-qty-plus">+</button>
          <span style="font-size:13px;color:var(--text-muted);">Max ${p.stock}</span>
        </div>
        <div style="display:flex;gap:10px;margin-top:10px;">
          <button class="btn btn-primary btn-lg" id="modal-add-cart" style="flex:1;">🛒 Add to Cart</button>
          <button class="btn btn-outline" id="modal-buy-now" style="flex:1;">⚡ Buy Now</button>
        </div>
      </div>
    </div>`;

  // Qty controls
  $('modal-qty-minus').onclick = () => { if (qty > 1) { qty--; $('modal-qty-val').textContent = qty; } };
  $('modal-qty-plus').onclick  = () => { if (qty < p.stock) { qty++; $('modal-qty-val').textContent = qty; } };
  $('modal-add-cart').onclick  = () => {
    Cart.addItem(p, qty);
    Toast.show(`${p.name} ×${qty} added to cart`, 'success');
    closeOverlay('product-overlay');
  };
  $('modal-buy-now').onclick = () => {
    Cart.addItem(p, qty);
    closeOverlay('product-overlay');
    openCartSidebar();
  };

  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeOverlay(id) {
  $(id)?.classList.remove('show');
  document.body.style.overflow = '';
}

/* ── Cart Sidebar ─────────────────────────────────────────── */
function openCartSidebar()  { $('cart-sidebar').classList.add('open'); $('cart-overlay').classList.add('show'); document.body.style.overflow='hidden'; }
function closeCartSidebar() { $('cart-sidebar').classList.remove('open'); $('cart-overlay').classList.remove('show'); document.body.style.overflow=''; }

function renderCartUI(items) {
  const cartItems = items || Cart.getItems();
  const count = Cart.getCount();

  // Navbar badge
  const badge = $('cart-count');
  if (badge) badge.textContent = count;

  const body = $('cart-body');
  if (!body) return;

  if (cartItems.length === 0) {
    body.innerHTML = `<div class="cart-empty-msg">
      <div class="cart-empty-icon">🛒</div>
      <h3>Your cart is empty</h3>
      <p>Add some products to get started!</p>
    </div>`;
  } else {
    body.innerHTML = cartItems.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item-icon">${CloudFunctions.getEmoji(item.category)}</div>
        <div>
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${CloudFunctions.formatPrice(item.price)} each</div>
        </div>
        <div class="cart-item-controls">
          <button class="cart-qty-btn" data-action="dec" data-id="${item.id}">−</button>
          <span class="cart-qty-display">${item.qty}</span>
          <button class="cart-qty-btn" data-action="inc" data-id="${item.id}">+</button>
          <button class="cart-qty-btn" data-action="del" data-id="${item.id}" style="color:#f87171;margin-left:4px;">✕</button>
        </div>
      </div>`).join('');

    body.querySelectorAll('.cart-qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = Cart.getItem(id);
        if (!item) return;
        if (btn.dataset.action === 'inc') Cart.updateQty(id, item.qty + 1);
        else if (btn.dataset.action === 'dec') Cart.updateQty(id, item.qty - 1);
        else if (btn.dataset.action === 'del') { Cart.removeItem(id); Toast.show('Item removed', 'info'); }
      });
    });
  }

  // Footer summary
  const footer = $('cart-footer-summary');
  if (footer) {
    const shipping = Cart.getShipping();
    footer.innerHTML = `
      <div class="cart-summary-row"><span>Subtotal</span><span>${CloudFunctions.formatPrice(Cart.getSubtotal())}</span></div>
      <div class="cart-summary-row"><span>Shipping</span><span>${shipping===0?'<span style="color:var(--emerald)">FREE</span>':CloudFunctions.formatPrice(shipping)}</span></div>
      <div class="cart-total-row"><span>Total</span><span>${CloudFunctions.formatPrice(Cart.getTotal())}</span></div>`;
  }
}

/* ── Event Binding ────────────────────────────────────────── */
function bindNavSearch() {
  const input = $('nav-search-input');
  let debounce;
  input?.addEventListener('input', e => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      AppState.search = e.target.value;
      loadProducts();
    }, 380);
  });
}

function bindCartDrawer() {
  $('cart-btn')?.addEventListener('click', openCartSidebar);
  $('cart-close-btn')?.addEventListener('click', closeCartSidebar);
  $('cart-overlay')?.addEventListener('click', closeCartSidebar);
  $('cart-checkout-btn')?.addEventListener('click', () => { closeCartSidebar(); Checkout.open(); });
}

function bindCheckoutModal() {
  $('checkout-overlay')?.addEventListener('click', e => {
    if (e.target === $('checkout-overlay')) Checkout.close();
  });
  $('product-overlay')?.addEventListener('click', e => {
    if (e.target === $('product-overlay')) closeOverlay('product-overlay');
  });
  $('product-modal-close')?.addEventListener('click', () => closeOverlay('product-overlay'));
}

function bindViewToggle() {
  $('view-grid')?.addEventListener('click', () => { AppState.view='grid'; $('view-grid').classList.add('active'); $('view-list').classList.remove('active'); loadProducts(); });
  $('view-list')?.addEventListener('click', () => { AppState.view='list'; $('view-list').classList.add('active'); $('view-grid').classList.remove('active'); loadProducts(); });
}

function bindSortSelect() {
  $('sort-select')?.addEventListener('change', e => { AppState.sort = e.target.value; loadProducts(); });
}

/* ── Categories ───────────────────────────────────────────── */
async function renderCategories() {
  const res = await CloudFunctions.getCategories();
  const container = $('categories-list');
  if (!container) return;
  container.innerHTML = res.data.map(c => `
    <button class="cat-pill ${c.id==='all'?'active':''}" data-cat="${c.id}">
      <span class="cat-pill-icon">${c.icon}</span>${c.name}
    </button>`).join('');

  container.querySelectorAll('.cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      container.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      AppState.category = pill.dataset.cat;
      loadProducts();
    });
  });
}

function resetFilters() {
  AppState.category = 'all';
  AppState.search   = '';
  AppState.sort     = 'default';
  document.querySelectorAll('.cat-pill').forEach(p => p.classList.toggle('active', p.dataset.cat==='all'));
  const inp = $('nav-search-input');
  if (inp) inp.value = '';
  loadProducts();
}

/* ── Hero CTA ─────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  $('hero-shop-btn')?.addEventListener('click', () => {
    $('products-section')?.scrollIntoView({ behavior: 'smooth' });
  });
});
