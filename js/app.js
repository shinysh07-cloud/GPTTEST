// ============================================
// KHARA 케이하라 - Premium Korean Culture Store
// ============================================

(function() {
  'use strict';

  // === DOM References ===
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const header = $('#header');
  const mobileMenuBtn = $('#mobileMenuBtn');
  const mainNav = $('#mainNav');
  const searchBtn = $('#searchBtn');
  const searchOverlay = $('#searchOverlay');
  const searchInput = $('#searchInput');
  const searchClose = $('#searchClose');
  const cartBtn = $('#cartBtn');
  const cartSidebar = $('#cartSidebar');
  const cartOverlay = $('#cartOverlay');
  const cartClose = $('#cartClose');
  const cartItemsEl = $('#cartItems');
  const cartFooter = $('#cartFooter');
  const cartSubtotal = $('#cartSubtotal');
  const cartCountBadge = $('.cart-count');
  const wishlistCountBadge = $('.wishlist-count');
  const productsGrid = $('#productsGrid');
  const arrivalsScroll = $('#arrivalsScroll');
  const loadMoreBtn = $('#loadMoreBtn');
  const toast = $('#toast');
  const toastMessage = $('#toastMessage');

  let productsShown = 8;
  let currentFilter = 'all';

  // === Initialize ===
  function init() {
    renderProducts();
    renderNewArrivals();
    setupEventListeners();
    updateCartUI();
    updateWishlistUI();
    startHeroSlider();
  }

  // === Render Products ===
  function getFilteredProducts() {
    if (currentFilter === 'all') return PRODUCTS;
    return PRODUCTS.filter(p => p.category === currentFilter);
  }

  function renderProducts() {
    const filtered = getFilteredProducts();
    const visible = filtered.slice(0, productsShown);

    productsGrid.innerHTML = visible.map(product => createProductCard(product)).join('');

    if (productsShown >= filtered.length) {
      loadMoreBtn.style.display = 'none';
    } else {
      loadMoreBtn.style.display = 'inline-flex';
    }

    // Bind product card events
    productsGrid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.dataset.productId;
        const product = PRODUCTS.find(p => p.id === id);
        if (product) {
          cart.addItem(product);
          showToast(`${product.name} added to cart!`);
        }
      });
    });

    productsGrid.querySelectorAll('.product-wishlist').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.dataset.productId;
        const added = wishlist.toggle(id);
        btn.classList.toggle('active', added);
        updateWishlistUI();
        const product = PRODUCTS.find(p => p.id === id);
        showToast(added ? `${product.name} added to wishlist` : `Removed from wishlist`);
      });
    });
  }

  function createProductCard(product) {
    const badgesHtml = product.badges.map(b =>
      `<span class="product-badge ${b}">${b}</span>`
    ).join('');

    const priceHtml = product.originalPrice
      ? `<span class="price-current">$${product.price.toFixed(2)}</span>
         <span class="price-original">$${product.originalPrice.toFixed(2)}</span>
         <span class="price-discount">-${product.discount}%</span>`
      : `<span class="price-current">$${product.price.toFixed(2)}</span>`;

    const starsHtml = '★'.repeat(Math.floor(product.rating)) +
      (product.rating % 1 >= 0.5 ? '½' : '');

    const isWished = wishlist.has(product.id);

    return `
      <div class="product-card" data-category="${product.category}">
        <div class="product-image" style="background: ${product.bgColor}">
          <div class="product-image-inner">${product.emoji}</div>
          <div class="product-badges">${badgesHtml}</div>
          <button class="product-wishlist ${isWished ? 'active' : ''}" data-product-id="${product.id}" aria-label="Wishlist">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${isWished ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
        <div class="product-info">
          <div class="product-category-tag">${product.category.replace('-', ' ')}</div>
          <h3 class="product-name">${product.name}</h3>
          <p class="product-name-kr">${product.nameKr}</p>
          <div class="product-rating">
            <span class="stars">${starsHtml}</span>
            <span class="rating-count">(${product.reviews.toLocaleString()})</span>
          </div>
          <div class="product-price">${priceHtml}</div>
          <div class="product-actions">
            <button class="add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button>
            <button class="quick-view-btn" aria-label="Quick view">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>
      </div>`;
  }

  // === New Arrivals ===
  function renderNewArrivals() {
    arrivalsScroll.innerHTML = NEW_KPOP_ARRIVALS.map(item => `
      <div class="arrival-card">
        <div class="arrival-image" style="background: ${item.bgColor}">
          <div class="arrival-image-inner">${item.emoji}</div>
        </div>
        <div class="arrival-info">
          <div class="arrival-artist">${item.artist}</div>
          <h4 class="arrival-title">${item.title}</h4>
          <p class="arrival-type">${item.type}</p>
          <span class="arrival-price">$${item.price.toFixed(2)}</span>
          ${item.preorder
            ? `<span class="arrival-preorder" data-arrival-id="${item.id}">Pre-Order Now</span>`
            : `<span class="arrival-preorder" data-arrival-id="${item.id}">Add to Cart</span>`
          }
        </div>
      </div>
    `).join('');

    arrivalsScroll.querySelectorAll('.arrival-preorder').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.arrivalId;
        const item = NEW_KPOP_ARRIVALS.find(a => a.id === id);
        if (item) {
          cart.addItem({
            id: item.id,
            name: `${item.artist} - ${item.title}`,
            nameKr: '',
            price: item.price,
            emoji: item.emoji,
            bgColor: item.bgColor
          });
          showToast(`${item.artist} - ${item.title} added to cart!`);
        }
      });
    });
  }

  // === Cart UI ===
  function updateCartUI() {
    const count = cart.getCount();
    cartCountBadge.textContent = count;
    cartCountBadge.style.display = count > 0 ? 'flex' : 'none';
    renderCartItems();
  }

  function renderCartItems() {
    if (cart.items.length === 0) {
      cartItemsEl.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          </div>
          <p>장바구니가 비어있습니다</p>
          <span>Your cart is empty — add some Korean goodies!</span>
        </div>`;
      cartFooter.style.display = 'none';
      return;
    }

    cartFooter.style.display = 'block';
    cartSubtotal.textContent = `$${cart.getTotal().toFixed(2)}`;

    cartItemsEl.innerHTML = cart.items.map(item => `
      <div class="cart-item">
        <div class="cart-item-image" style="background: ${item.bgColor}">
          ${item.emoji}
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">$${item.price.toFixed(2)}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" data-action="decrease" data-item-id="${item.id}">−</button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn" data-action="increase" data-item-id="${item.id}">+</button>
          </div>
        </div>
        <button class="cart-item-remove" data-item-id="${item.id}">✕</button>
      </div>
    `).join('');

    // Bind cart item events
    cartItemsEl.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.itemId;
        const action = btn.dataset.action;
        const item = cart.items.find(i => i.id === id);
        if (item) {
          if (action === 'increase') {
            cart.updateQty(id, item.qty + 1);
          } else if (action === 'decrease') {
            if (item.qty <= 1) {
              cart.removeItem(id);
            } else {
              cart.updateQty(id, item.qty - 1);
            }
          }
        }
      });
    });

    cartItemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        cart.removeItem(btn.dataset.itemId);
      });
    });
  }

  function updateWishlistUI() {
    const count = wishlist.getCount();
    wishlistCountBadge.textContent = count;
    wishlistCountBadge.style.display = count > 0 ? 'flex' : 'none';
  }

  // === Event Listeners ===
  function setupEventListeners() {
    // Scroll header
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 10);
    });

    // Mobile menu
    mobileMenuBtn.addEventListener('click', () => {
      mainNav.classList.toggle('active');
    });

    // Search
    searchBtn.addEventListener('click', () => {
      searchOverlay.classList.add('active');
      setTimeout(() => searchInput.focus(), 300);
    });

    searchClose.addEventListener('click', () => {
      searchOverlay.classList.remove('active');
    });

    searchOverlay.addEventListener('click', (e) => {
      if (e.target === searchOverlay) {
        searchOverlay.classList.remove('active');
      }
    });

    // Search suggestions
    $$('.suggestion-tags .tag').forEach(tag => {
      tag.addEventListener('click', () => {
        searchInput.value = tag.textContent;
        searchInput.dispatchEvent(new Event('input'));
      });
    });

    // Search filtering
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (query.length < 2) return;

      const results = PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.nameKr.includes(query) ||
        p.category.includes(query) ||
        p.description.toLowerCase().includes(query)
      );

      if (results.length > 0) {
        searchOverlay.classList.remove('active');
        currentFilter = 'all';
        productsShown = 24;

        productsGrid.innerHTML = results.map(p => createProductCard(p)).join('');
        loadMoreBtn.style.display = 'none';

        // Re-bind events
        bindProductEvents();

        document.getElementById('products').scrollIntoView({ behavior: 'smooth' });

        // Update filter UI
        $$('.filter-btn').forEach(b => b.classList.remove('active'));
        $$('.filter-btn[data-filter="all"]').forEach(b => b.classList.add('active'));
      }
    });

    // Cart toggle
    cartBtn.addEventListener('click', () => {
      cartSidebar.classList.add('active');
      cartOverlay.classList.add('active');
    });

    const closeCart = () => {
      cartSidebar.classList.remove('active');
      cartOverlay.classList.remove('active');
    };

    cartClose.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', closeCart);

    // Cart changes
    cart.onChange(() => updateCartUI());
    wishlist.onChange(() => updateWishlistUI());

    // Filter buttons
    $$('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        productsShown = 8;
        renderProducts();
      });
    });

    // Category links
    $$('[data-category]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const cat = link.dataset.category;
        if (cat === 'all') {
          currentFilter = 'all';
        } else {
          currentFilter = cat;
        }
        productsShown = 12;

        // Update filter bar
        $$('.filter-btn').forEach(b => b.classList.remove('active'));
        const matchBtn = $(`.filter-btn[data-filter="${currentFilter}"]`);
        if (matchBtn) matchBtn.classList.add('active');

        renderProducts();

        // Close mobile nav
        mainNav.classList.remove('active');

        // Scroll to products
        document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
      });
    });

    // Load more
    loadMoreBtn.addEventListener('click', () => {
      productsShown += 8;
      renderProducts();
    });

    // Promo add to cart
    const promoBtn = $('[data-product-id="beauty-box-01"]');
    if (promoBtn) {
      promoBtn.addEventListener('click', () => {
        cart.addItem({
          id: 'beauty-box-01',
          name: 'K-Beauty Box (10-Piece Set)',
          nameKr: 'K-뷰티 박스 10종 세트',
          price: 53.99,
          emoji: '🎁',
          bgColor: '#f3e5f5'
        });
        showToast('K-Beauty Box added to cart!');
      });
    }

    // Checkout button
    $('#checkoutBtn').addEventListener('click', () => {
      showToast('결제 기능 준비 중입니다. Coming soon! 감사합니다.');
      closeCart();
    });

    // Newsletter
    $('#newsletterForm').addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('KHARA 가족이 되신 것을 환영합니다! Welcome to KHARA!');
      e.target.reset();
    });

    // Language toggle
    $('#langBtn').addEventListener('click', () => {
      const langText = $('#langBtn .lang-text');
      langText.textContent = langText.textContent === 'EN' ? 'KR' : 'EN';
      showToast(langText.textContent === 'KR' ? '한국어로 전환되었습니다' : 'Switched to English');
    });

    // Keyboard support
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchOverlay.classList.remove('active');
        closeCart();
        mainNav.classList.remove('active');
      }
    });
  }

  function bindProductEvents() {
    productsGrid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.dataset.productId;
        const product = PRODUCTS.find(p => p.id === id);
        if (product) {
          cart.addItem(product);
          showToast(`${product.name} added to cart!`);
        }
      });
    });

    productsGrid.querySelectorAll('.product-wishlist').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.dataset.productId;
        const added = wishlist.toggle(id);
        btn.classList.toggle('active', added);
        updateWishlistUI();
        const product = PRODUCTS.find(p => p.id === id);
        showToast(added ? `${product.name} added to wishlist` : 'Removed from wishlist');
      });
    });
  }

  // === Hero Slider ===
  function startHeroSlider() {
    let current = 0;
    const slides = $$('.hero-slide');
    const dots = $$('.hero-nav .hero-dot');
    const progressBars = $$('.hero-progress-bar');

    function goTo(index) {
      slides.forEach(s => s.classList.remove('active'));
      dots.forEach(d => d.classList.remove('active'));
      progressBars.forEach(bar => { bar.style.transition = 'none'; bar.style.width = '0%'; });

      slides[index].classList.add('active');
      dots[index].classList.add('active');
      current = index;

      // Animate progress bar after current dot
      if (progressBars[index]) {
        setTimeout(() => {
          progressBars[index].style.transition = 'width 5s linear';
          progressBars[index].style.width = '100%';
        }, 50);
      }
    }

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        goTo(parseInt(dot.dataset.slide));
      });
    });

    goTo(0);

    setInterval(() => {
      goTo((current + 1) % slides.length);
    }, 5000);
  }

  // === Toast ===
  function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  // === Boot ===
  document.addEventListener('DOMContentLoaded', init);
})();
