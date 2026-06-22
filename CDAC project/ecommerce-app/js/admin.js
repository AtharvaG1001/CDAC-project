/**
 * admin.js — Admin Dashboard Controller
 * Simulates GCP Cloud Functions GET /orders, PATCH /orders/{id}/status
 * & Azure Logic App workflow triggers for order management
 */

const Admin = (() => {
  let _orders = [];
  let _products = [];
  let _currentSection = 'dashboard';

  /* ── Bootstrap ───────────────────────────────────────────── */
  async function init() {
    await CloudFunctions.init();
    const [ordersRes, productsRes] = await Promise.all([
      CloudFunctions.getOrders(),
      CloudFunctions.getProducts(),
    ]);
    _orders   = ordersRes.data;
    _products = productsRes.data;

    _setupNav();
    showSection('dashboard');
  }

  /* ── Sidebar Navigation ──────────────────────────────────── */
  function _setupNav() {
    document.querySelectorAll('.admin-nav-item').forEach(el => {
      el.addEventListener('click', () => showSection(el.dataset.section));
    });
  }

  function showSection(section) {
    _currentSection = section;
    document.querySelectorAll('.admin-nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.section === section);
    });
    const content = document.getElementById('admin-content-area');
    if (section === 'dashboard')  content.innerHTML = _renderDashboard();
    if (section === 'orders')     content.innerHTML = _renderOrders();
    if (section === 'products')   content.innerHTML = _renderProducts();
    if (section === 'analytics')  content.innerHTML = _renderAnalytics();

    _bindActions(section);
  }

  /* ── Dashboard ───────────────────────────────────────────── */
  function _renderDashboard() {
    const totalRevenue = _orders.reduce((s,o) => s + (o.total||0), 0);
    const pending      = _orders.filter(o => o.status === 'pending').length;
    const delivered    = _orders.filter(o => o.status === 'delivered').length;

    return `
      <div class="admin-page-title">Dashboard</div>
      <div class="admin-page-sub">Welcome back! Here's your store overview.</div>
      <div class="stats-grid">
        ${_statCard('💰','Total Revenue', CloudFunctions.formatPrice(totalRevenue), '+12.5% this month')}
        ${_statCard('📦','Total Orders', _orders.length, `${pending} pending`)}
        ${_statCard('🛍️','Products', _products.length, 'In catalogue')}
        ${_statCard('✅','Delivered', delivered, `${_orders.length - delivered} in transit`)}
      </div>
      <div class="admin-table-wrap">
        <div class="admin-table-header">
          <div class="admin-table-title">Recent Orders</div>
          <button class="btn btn-outline btn-sm" onclick="Admin.showSection('orders')">View All</button>
        </div>
        ${_ordersTable(_orders.slice(0, 5))}
      </div>`;
  }

  function _statCard(icon, label, value, change) {
    return `<div class="stat-card">
      <div class="stat-card-icon">${icon}</div>
      <div class="stat-card-label">${label}</div>
      <div class="stat-card-value">${value}</div>
      <div class="stat-card-change">↑ ${change}</div>
    </div>`;
  }

  /* ── Orders Table ────────────────────────────────────────── */
  function _renderOrders() {
    return `
      <div class="admin-page-title">Orders</div>
      <div class="admin-page-sub">Manage and update customer orders.</div>
      <div class="admin-table-wrap">
        <div class="admin-table-header">
          <div class="admin-table-title">All Orders (${_orders.length})</div>
        </div>
        ${_ordersTable(_orders)}
      </div>`;
  }

  function _ordersTable(orders) {
    if (orders.length === 0) return `<div style="padding:40px;text-align:center;color:var(--text-secondary);">📭 No orders yet. Place an order from the storefront!</div>`;
    return `<div style="overflow-x:auto;"><table>
      <thead><tr>
        <th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Action</th>
      </tr></thead>
      <tbody>
        ${orders.map(o => `<tr>
          <td><span style="font-family:monospace;color:var(--accent-light)">${o.id}</span></td>
          <td>${o.customer?.firstName || '—'} ${o.customer?.lastName || ''}</td>
          <td>${o.items?.length || 0} item(s)</td>
          <td style="font-weight:700;color:var(--text-primary)">${CloudFunctions.formatPrice(o.total||0)}</td>
          <td><span class="status-pill status-${o.status}">${o.status}</span></td>
          <td>${new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
          <td>
            <select class="sort-select status-updater" data-order-id="${o.id}" style="font-size:12px;padding:5px 8px;">
              ${['pending','shipped','delivered','cancelled'].map(s =>
                `<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`
              ).join('')}
            </select>
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  }

  /* ── Products ────────────────────────────────────────────── */
  function _renderProducts() {
    return `
      <div class="admin-page-title">Products</div>
      <div class="admin-page-sub">All ${_products.length} products in your catalogue.</div>
      <div class="admin-products-grid">
        ${_products.map(p => `
          <div class="admin-product-card">
            <div class="admin-product-card-icon">${CloudFunctions.getEmoji(p.category)}</div>
            <div class="admin-product-card-name">${p.name}</div>
            <div class="admin-product-card-price">${CloudFunctions.formatPrice(p.price)}</div>
            <div class="admin-product-card-stock">Stock: ${p.stock} | ⭐ ${p.rating}</div>
            <div style="margin-top:8px;">
              <span class="badge ${_categoryBadge(p.category)}">${p.category}</span>
            </div>
          </div>`).join('')}
      </div>`;
  }

  function _categoryBadge(cat) {
    const map = { electronics:'badge-accent', fashion:'badge-pink', home:'badge-emerald', sports:'badge-amber', books:'badge-amber', beauty:'badge-pink' };
    return map[cat] || 'badge-accent';
  }

  /* ── Analytics ───────────────────────────────────────────── */
  function _renderAnalytics() {
    const catRevenue = {};
    _orders.forEach(o => {
      (o.items || []).forEach(item => {
        catRevenue[item.category] = (catRevenue[item.category] || 0) + (item.price * item.qty);
      });
    });
    const topCats = Object.entries(catRevenue).sort((a,b) => b[1]-a[1]);
    const maxRev = topCats[0]?.[1] || 1;

    return `
      <div class="admin-page-title">Analytics</div>
      <div class="admin-page-sub">Revenue insights from your GCP/Azure data store.</div>
      <div class="stats-grid" style="grid-template-columns:repeat(2,1fr)">
        ${_statCard('📈','Avg Order Value', CloudFunctions.formatPrice(_orders.length ? Math.round(_orders.reduce((s,o)=>s+(o.total||0),0)/_orders.length) : 0), 'Per order')}
        ${_statCard('🔄','Conversion Rate','—','Demo metric')}
      </div>
      <div class="admin-table-wrap" style="margin-top:24px;">
        <div class="admin-table-header"><div class="admin-table-title">Revenue by Category</div></div>
        <div style="padding:24px;display:flex;flex-direction:column;gap:14px;">
          ${topCats.length === 0
            ? `<p style="color:var(--text-secondary);">No order data yet. Place an order to see analytics.</p>`
            : topCats.map(([cat, rev]) => `
              <div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                  <span style="font-size:14px;font-weight:600;">${CloudFunctions.getEmoji(cat)} ${cat}</span>
                  <span style="font-size:14px;color:var(--accent-light);font-weight:700;">${CloudFunctions.formatPrice(rev)}</span>
                </div>
                <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;">
                  <div style="height:100%;width:${(rev/maxRev*100).toFixed(1)}%;background:linear-gradient(90deg,var(--accent),var(--pink));border-radius:4px;transition:width 1s ease;"></div>
                </div>
              </div>`).join('')}
        </div>
      </div>`;
  }

  /* ── Bind Actions ────────────────────────────────────────── */
  function _bindActions(section) {
    if (section === 'orders' || section === 'dashboard') {
      document.querySelectorAll('.status-updater').forEach(sel => {
        sel.addEventListener('change', async (e) => {
          const orderId = e.target.dataset.orderId;
          const newStatus = e.target.value;
          const res = await CloudFunctions.updateOrderStatus(orderId, newStatus);
          if (res.success) {
            // Update local copy
            const order = _orders.find(o => o.id === orderId);
            if (order) order.status = newStatus;
            Toast.show(`Order ${orderId} → ${newStatus}`, 'success');
            // Re-render status pill
            const pill = e.target.closest('tr')?.querySelector('.status-pill');
            if (pill) { pill.className = `status-pill status-${newStatus}`; pill.textContent = newStatus; }
          }
        });
      });
    }
  }

  return { init, showSection };
})();
