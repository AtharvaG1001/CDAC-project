/**
 * functions.js — Cloud Functions / Azure Logic Apps Simulation Layer
 *
 * GCP Mapping:
 *   getProducts()   → Cloud Function: GET /products
 *   getProduct(id)  → Cloud Function: GET /products/{id}
 *   submitOrder()   → Cloud Function: POST /orders  (writes to GCP Cloud Storage JSON blob)
 *   getOrders()     → Cloud Function: GET /orders
 *
 * Azure Mapping:
 *   getProducts()   → Logic App HTTP trigger → Blob Storage read
 *   submitOrder()   → Logic App HTTP trigger → Blob Storage write
 *
 * Data Store:
 *   products.json / orders.json / categories.json
 *   (Simulates GCP Cloud Storage bucket objects / Azure Blob Storage containers)
 */

const CloudFunctions = (() => {
  // Simulated network latency (ms) — mirrors real cloud function cold start
  const LATENCY = { min: 80, max: 280 };
  const delay = () => new Promise(r => setTimeout(r, LATENCY.min + Math.random() * (LATENCY.max - LATENCY.min)));

  // In-memory "blob" store (loaded from JSON files via fetch on init)
  let _products = [];
  let _orders = [];
  let _categories = [];

  /* ── Initialise: load all JSON blobs ─────────────────────── */
  async function init() {
    try {
      const [p, o, c] = await Promise.all([
        fetch('data/products.json').then(r => r.json()),
        fetch('data/orders.json').then(r => r.json()).catch(() => []),
        fetch('data/categories.json').then(r => r.json()),
      ]);
      _products   = p;
      _orders     = o;
      _categories = c;
      // Merge localStorage orders (persisted across sessions)
      const saved = localStorage.getItem('shopwave_orders');
      if (saved) _orders = JSON.parse(saved);
      console.log('[CloudFunctions] Data blobs loaded ✓', { products: _products.length, orders: _orders.length });
    } catch (e) {
      console.error('[CloudFunctions] Init error:', e);
    }
  }

  /* ── GET /products (Cloud Function / Logic App trigger) ─── */
  async function getProducts({ category = 'all', search = '', sort = 'default' } = {}) {
    await delay();
    let results = [..._products];

    // Filter by category
    if (category && category !== 'all') {
      results = results.filter(p => p.category === category);
    }

    // Full-text search
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sort) {
      case 'price-asc':  results.sort((a,b) => a.price - b.price); break;
      case 'price-desc': results.sort((a,b) => b.price - a.price); break;
      case 'rating':     results.sort((a,b) => b.rating - a.rating); break;
      case 'name':       results.sort((a,b) => a.name.localeCompare(b.name)); break;
    }

    return { success: true, data: results, count: results.length };
  }

  /* ── GET /products/{id} ─────────────────────────────────── */
  async function getProduct(id) {
    await delay();
    const product = _products.find(p => p.id === id);
    if (!product) return { success: false, error: 'Product not found' };
    return { success: true, data: product };
  }

  /* ── GET /categories ─────────────────────────────────────── */
  async function getCategories() {
    await delay();
    return { success: true, data: _categories };
  }

  /* ── POST /orders (writes to Blob / Cloud Storage JSON) ─── */
  async function submitOrder(orderData) {
    await delay();
    // Validate payload
    if (!orderData.customer || !orderData.items || orderData.items.length === 0) {
      return { success: false, error: 'Invalid order data' };
    }

    const order = {
      id: 'ORD-' + Date.now(),
      ...orderData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    _orders.unshift(order);

    // Persist to localStorage (simulates blob write)
    localStorage.setItem('shopwave_orders', JSON.stringify(_orders));
    console.log('[CloudFunctions] POST /orders → blob written ✓', order.id);

    return { success: true, data: order };
  }

  /* ── GET /orders ─────────────────────────────────────────── */
  async function getOrders() {
    await delay();
    return { success: true, data: _orders, count: _orders.length };
  }

  /* ── PATCH /orders/{id}/status ───────────────────────────── */
  async function updateOrderStatus(orderId, status) {
    await delay();
    const order = _orders.find(o => o.id === orderId);
    if (!order) return { success: false, error: 'Order not found' };
    order.status = status;
    order.updatedAt = new Date().toISOString();
    localStorage.setItem('shopwave_orders', JSON.stringify(_orders));
    return { success: true, data: order };
  }

  /* ── Utility: format price in INR ───────────────────────── */
  function formatPrice(amount) {
    return '₹' + amount.toLocaleString('en-IN');
  }

  function getDiscount(price, original) {
    if (!original || original <= price) return 0;
    return Math.round((1 - price / original) * 100);
  }

  function renderStars(rating) {
    const full  = Math.floor(rating);
    const half  = rating % 1 >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
  }

  /* ── Category emoji map ──────────────────────────────────── */
  const CATEGORY_EMOJI = {
    electronics: '💻', fashion: '👗', home: '🏠',
    sports: '⚽', books: '📚', beauty: '💄',
  };

  function getEmoji(category, fallback = '🎁') {
    return CATEGORY_EMOJI[category] || fallback;
  }

  return { init, getProducts, getProduct, getCategories, submitOrder, getOrders, updateOrderStatus, formatPrice, getDiscount, renderStars, getEmoji };
})();
