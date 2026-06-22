/**
 * cart.js — Shopping Cart Manager
 * Simulates Azure Cosmos DB / GCP Firestore session cart
 * Persisted to localStorage (Blob Storage simulation)
 */

const Cart = (() => {
  const STORAGE_KEY = 'shopwave_cart';
  let _items = [];
  let _listeners = [];

  /* ── Init ─────────────────────────────────────────────────── */
  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    _items = saved ? JSON.parse(saved) : [];
    _notify();
  }

  /* ── Persist ──────────────────────────────────────────────── */
  function _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_items));
    _notify();
  }

  /* ── Observers ────────────────────────────────────────────── */
  function subscribe(fn) { _listeners.push(fn); }
  function _notify() { _listeners.forEach(fn => fn([..._items])); }

  /* ── CRUD ─────────────────────────────────────────────────── */
  function addItem(product, qty = 1) {
    const existing = _items.find(i => i.id === product.id);
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, product.stock);
    } else {
      _items.push({ ...product, qty: Math.min(qty, product.stock) });
    }
    _save();
    return getItem(product.id);
  }

  function removeItem(productId) {
    _items = _items.filter(i => i.id !== productId);
    _save();
  }

  function updateQty(productId, qty) {
    const item = _items.find(i => i.id === productId);
    if (!item) return;
    if (qty <= 0) { removeItem(productId); return; }
    item.qty = Math.min(qty, item.stock);
    _save();
  }

  function clear() {
    _items = [];
    _save();
  }

  function getItem(id)   { return _items.find(i => i.id === id); }
  function getItems()    { return [..._items]; }
  function getCount()    { return _items.reduce((s, i) => s + i.qty, 0); }
  function getSubtotal() { return _items.reduce((s, i) => s + i.price * i.qty, 0); }
  function getShipping() { const sub = getSubtotal(); return sub === 0 ? 0 : sub > 999 ? 0 : 99; }
  function getTotal()    { return getSubtotal() + getShipping(); }
  function getTax()      { return Math.round(getSubtotal() * 0.18); }

  return { init, addItem, removeItem, updateQty, clear, getItem, getItems, getCount, getSubtotal, getShipping, getTotal, getTax, subscribe };
})();
