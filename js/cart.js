// ============================================
// KHARA 케이하라 - Shopping Cart Module
// ============================================

class ShoppingCart {
  constructor() {
    this.items = this.loadCart();
    this.listeners = [];
  }

  loadCart() {
    try {
      const saved = localStorage.getItem('hallyu_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  saveCart() {
    localStorage.setItem('hallyu_cart', JSON.stringify(this.items));
    this.notify();
  }

  addItem(product, qty = 1) {
    const existing = this.items.find(item => item.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        nameKr: product.nameKr,
        price: product.price,
        emoji: product.emoji,
        bgColor: product.bgColor,
        qty: qty
      });
    }
    this.saveCart();
  }

  removeItem(productId) {
    this.items = this.items.filter(item => item.id !== productId);
    this.saveCart();
  }

  updateQty(productId, qty) {
    const item = this.items.find(item => item.id === productId);
    if (item) {
      item.qty = Math.max(1, qty);
      this.saveCart();
    }
  }

  getTotal() {
    return this.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  }

  getCount() {
    return this.items.reduce((sum, item) => sum + item.qty, 0);
  }

  clear() {
    this.items = [];
    this.saveCart();
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this));
  }
}

// Wishlist
class Wishlist {
  constructor() {
    this.items = this.load();
    this.listeners = [];
  }

  load() {
    try {
      const saved = localStorage.getItem('hallyu_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  save() {
    localStorage.setItem('hallyu_wishlist', JSON.stringify(this.items));
    this.listeners.forEach(cb => cb(this));
  }

  toggle(productId) {
    const index = this.items.indexOf(productId);
    if (index > -1) {
      this.items.splice(index, 1);
    } else {
      this.items.push(productId);
    }
    this.save();
    return this.has(productId);
  }

  has(productId) {
    return this.items.includes(productId);
  }

  getCount() {
    return this.items.length;
  }

  onChange(callback) {
    this.listeners.push(callback);
  }
}

const cart = new ShoppingCart();
const wishlist = new Wishlist();
