/* =========================================================
   Let's Scoop — script.js
========================================================= */

const WHATSAPP_NUMBER = "919072558825";

/* ---------- Category display config ---------- */
const CATEGORY_META = {
  "Snacks & Appetizers":    { icon: "ph-cookie",    tag: "Starter",  blurb: "Crisped up to order — the perfect thing to nibble on while you decide what's next." },
  "Momos & Chicken Snacks": { icon: "ph-bowl-food", tag: "Snack",    blurb: "Steamed, fried or tossed in-house — a Let's Scoop favourite for a quick, spicy bite." },
  "Burgers":                { icon: "ph-hamburger", tag: "Burger",   blurb: "Stacked fresh and grilled to order, served warm with all the fixings." },
  "Wraps & Sandwiches":     { icon: "ph-bowl-food", tag: "Wrap",     blurb: "Packed tight and grilled golden — easy to eat, hard to put down." },
  "Salads":                 { icon: "ph-carrot",    tag: "Salad",    blurb: "Crisp, fresh and light — a good way to balance out the sweeter side of the menu." },
  "Combo Meals":            { icon: "ph-hamburger", tag: "Combo",    blurb: "Our best-selling pairings, bundled up for a full meal at a better price." },
  "Premium Shakes & Juices":{ icon: "ph-coffee",    tag: "Premium",  blurb: "Our signature avocado, nut and honey blends — rich, thick and made fresh per glass." },
  "Ice Scoops / Shakes":    { icon: "ph-ice-cream", tag: "Classic",  blurb: "Cold, creamy and scooped fresh — the simple classics done right." },
  "Milky's Shakes":         { icon: "ph-coffee",    tag: "Shake",    blurb: "Thick milkshakes blended with real chocolate, nuts and candy for that extra treat." },
  "Fresh Juices":           { icon: "ph-drop",      tag: "Fresh",    blurb: "Cold-pressed and squeezed fresh daily — nothing bottled, nothing pre-mixed." }
};

/* ---------- Full menu data ---------- */
const menuData = [
  { category: "Snacks & Appetizers", items: [
    { name: "Veg Fingers", options: [{label:"4 Pcs", price:80},{label:"8 Pcs", price:140}] },
    { name: "Nuggets", options: [{label:"4 Pcs", price:80},{label:"8 Pcs", price:150}] },
    { name: "Potato Wedges", options: [{label:"Regular", price:70}] },
    { name: "French Fries", options: [{label:"Regular", price:70}] },
    { name: "Masala Fries", options: [{label:"Regular", price:90}] },
    { name: "Crinkle Fries", options: [{label:"Regular", price:110}] },
    { name: "Loaded Fries", options: [{label:"Regular", price:140}] }
  ]},
  { category: "Momos & Chicken Snacks", items: [
    { name: "Chicken Momos", options: [{label:"4 Pcs", price:70},{label:"8 Pcs", price:130}] },
    { name: "Chicken Nuggets", options: [{label:"4 Pcs", price:80},{label:"8 Pcs", price:150}] },
    { name: "Chicken Popcorn", options: [{label:"Regular", price:110}] },
    { name: "Chicken Strips", options: [{label:"3 Pcs", price:90},{label:"5 Pcs", price:150}] },
    { name: "Fried Chicken Momos", options: [{label:"4 Pcs", price:80},{label:"8 Pcs", price:150}] },
    { name: "Chicken Wing Momos", options: [{label:"4 Pcs", price:90},{label:"8 Pcs", price:170}] },
    { name: "Chicken Pizza Momos", options: [{label:"4 Pcs", price:100},{label:"8 Pcs", price:190}] },
    { name: "Grand Wings", options: [{label:"3 Pcs", price:110}] },
    { name: "Big Wing", options: [{label:"3 Pcs", price:120}] }
  ]},
  { category: "Burgers", items: [
    { name: "Veg Burger", options: [{label:"Regular", price:120}] },
    { name: "Supreme Burger", options: [{label:"Regular", price:130}] },
    { name: "Chicken Popcorn Burger", options: [{label:"Regular", price:110}] },
    { name: "Chicken Cheese Burger", options: [{label:"Regular", price:120}] },
    { name: "Chicken Burger", options: [{label:"Regular", price:110}] },
    { name: "Let's Scoop Special Burger", options: [{label:"Regular", price:160}] },
    { name: "Chicken Pizza Burger", options: [{label:"Regular", price:180}] },
    { name: "Premium Burger", options: [{label:"Regular", price:190}] }
  ]},
  { category: "Wraps & Sandwiches", items: [
    { name: "Veg Wrap", options: [{label:"Regular", price:130}] },
    { name: "Chicken Wrap", options: [{label:"Regular", price:150}] },
    { name: "Let's Scoop Wrap", options: [{label:"Regular", price:195}] },
    { name: "Veg Cheese Grilled Sandwich", options: [{label:"Regular", price:100}] },
    { name: "Grilled Chicken Sandwich", options: [{label:"Regular", price:110}] },
    { name: "Spicy Crispy Chicken Sandwich", options: [{label:"Regular", price:140}] },
    { name: "Crispy Fish Combo Sandwich", options: [{label:"Regular", price:130}] },
    { name: "Veg Egg Grilled Sandwich", options: [{label:"Regular", price:110}] }
  ]},
  { category: "Salads", items: [
    { name: "Green Salad", options: [{label:"Regular", price:100}] },
    { name: "Olive Green Salad", options: [{label:"Regular", price:120}] },
    { name: "Let's Scoop Chicken Salad", options: [{label:"Regular", price:150}] },
    { name: "Corn Salad", options: [{label:"Regular", price:110}], dynamic:true }
  ]},
  { category: "Combo Meals", items: [
    { name: "Combo 1", desc:"Veggie Burger + French Fries", options: [{label:"Regular", price:129}] },
    { name: "Combo 2", desc:"Chicken Burger + Chicken Nuggets (4 Pcs) + French Fries + Pepup Drink", options: [{label:"Regular", price:229}] },
    { name: "Combo 3", desc:"Cheese Burger + French Fries", options: [{label:"Regular", price:159}] },
    { name: "Combo 4", desc:"Chicken Cheese Burger + Chicken Nuggets (4 Pcs) + Pepup Drink", options: [{label:"Regular", price:219}] },
    { name: "Combo 5", desc:"Chicken Cheese Burger + Chicken Wings (3 Pcs) + Pepup Drink", options: [{label:"Regular", price:249}] },
    { name: "Combo 6", desc:"Chicken Popcorn Burger + Chicken Strips (3 Pcs) + Pepup Drink", options: [{label:"Regular", price:229}] },
    { name: "Combo 7", desc:"Veg Wrap + French Fries + Pepup Drink", options: [{label:"Regular", price:169}] },
    { name: "Combo 8", desc:"Chicken Wrap + French Fries + Pepup Drink", options: [{label:"Regular", price:189}] },
    { name: "Combo 9", desc:"Let's Scoop Special Sandwich + French Fries + Pepup Drink", options: [{label:"Regular", price:219}] }
  ]},
  { category: "Premium Shakes & Juices", items: [
    { name: "Avocado Boom", options: [{label:"Regular", price:300}] },
    { name: "Avocado Shake/Juice", options: [{label:"Regular", price:220}] },
    { name: "Jughead Special", desc:"Scoop special", options: [{label:"Regular", price:220}] },
    { name: "Fig N Dates", options: [{label:"Regular", price:200}] },
    { name: "Honey Fish", desc:"Nutty Honey", options: [{label:"Regular", price:200}] },
    { name: "Dark Yonder", desc:"Avocado Chocolate", options: [{label:"Regular", price:200}] },
    { name: "Sky Yonder", desc:"Avocado Blueberry / Raspberry", options: [{label:"Regular", price:250}] },
    { name: "Tender Moist", desc:"Avocado Cranberry Dates", options: [{label:"Regular", price:250}] },
    { name: "Romantic Replay", options: [{label:"Regular", price:180}] },
    { name: "Cashew Dedict", options: [{label:"Regular", price:180}] },
    { name: "Pistachio", desc:"Cashew Saffron Honey", options: [{label:"Regular", price:200}] }
  ]},
  { category: "Ice Scoops / Shakes", items: [
    { name: "Cold Coffee", options: [{label:"Regular", price:100}], dynamic:true },
    { name: "Cold Boost", options: [{label:"Regular", price:100}], dynamic:true },
    { name: "Cold Horlicks", options: [{label:"Regular", price:100}], dynamic:true },
    { name: "Cold Vanilla", options: [{label:"Regular", price:100}], dynamic:true },
    { name: "Cold Chocolate", options: [{label:"Regular", price:110}], dynamic:true }
  ]},
  { category: "Milky's Shakes", items: [
    { name: "Malt Chocolate", options: [{label:"Regular", price:140}], dynamic:true },
    { name: "Scouts Special Shake", options: [{label:"Regular", price:150}], dynamic:true },
    { name: "Snickers Milk Shake", options: [{label:"Regular", price:160}], dynamic:true },
    { name: "Nutella Milk Shake", options: [{label:"Regular", price:160}], dynamic:true },
    { name: "Strawberry Trim Shake", options: [{label:"Regular", price:140}], dynamic:true },
    { name: "Vanilla Shake", options: [{label:"Regular", price:130}], dynamic:true },
    { name: "Blueberry Shake", options: [{label:"Regular", price:140}], dynamic:true },
    { name: "Choco Shake", options: [{label:"Regular", price:130}], dynamic:true },
    { name: "Oreo Shake", options: [{label:"Regular", price:140}], dynamic:true },
    { name: "Kinder Shake", options: [{label:"Regular", price:160}], dynamic:true },
    { name: "Stranger Mix Shake", options: [{label:"Regular", price:130}], dynamic:true }
  ]},
  { category: "Fresh Juices", items: [
    { name: "Dates Shake", options: [{label:"Regular", price:130}], dynamic:true },
    { name: "Papaya Shake", options: [{label:"Regular", price:90}], dynamic:true },
    { name: "Pineapple Juice", options: [{label:"Regular", price:90}], dynamic:true },
    { name: "Grape Juice", options: [{label:"Regular", price:90}], dynamic:true },
    { name: "Watermelon Juice", options: [{label:"Regular", price:80}], dynamic:true },
    { name: "Shamman Shake", options: [{label:"Regular", price:110}], dynamic:true },
    { name: "Orange Juice", options: [{label:"Regular", price:100}], dynamic:true },
    { name: "Carrot Juice", options: [{label:"Regular", price:90}], dynamic:true },
    { name: "Cucumber Juice", options: [{label:"Regular", price:80}], dynamic:true },
    { name: "Lime with Mint", options: [{label:"Regular", price:60}], dynamic:true },
    { name: "Fresh Lime Juice", options: [{label:"Regular", price:50}], dynamic:true }
  ]}
];

/* Flattened list with stable ids */
const menuItems = [];
menuData.forEach((cat) => {
  cat.items.forEach((item) => {
    menuItems.push({
      id: `${cat.category}__${item.name}`.replace(/\s+/g, "-"),
      category: cat.category,
      name: item.name,
      desc: item.desc || null,
      dynamic: !!item.dynamic,
      options: item.options
    });
  });
});

/* ---------- State ---------- */
let activeCategory = "All";
let searchTerm = "";
let cart = []; // { id, name, category, variant, price, qty }

/* ---------- DOM refs ---------- */
const menuTabsEl = document.getElementById("menuTabs");
const menuGridEl = document.getElementById("menuGrid");
const menuEmptyEl = document.getElementById("menuEmpty");
const menuSearchEl = document.getElementById("menuSearch");

const navbar = document.getElementById("navbar");
const navLinks = document.getElementById("navLinks");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const navCartBtn = document.getElementById("navCartBtn");
const navCartCount = document.getElementById("navCartCount");

const cartItemsEl = document.getElementById("cartItems");
const cartEmptyState = document.getElementById("cartEmptyState");
const cartSummaryEl = document.getElementById("cartSummary");
const cartSubtotalEl = document.getElementById("cartSubtotal");
const cartClearBtn = document.getElementById("cartClearBtn");

const mobileCartBar = document.getElementById("mobileCartBar");
const mobileCartCount = document.getElementById("mobileCartCount");
const mobileCartTotal = document.getElementById("mobileCartTotal");

const checkoutForm = document.getElementById("checkoutForm");
const custNameEl = document.getElementById("custName");
const custPhoneEl = document.getElementById("custPhone");
const custAddressEl = document.getElementById("custAddress");
const custNotesEl = document.getElementById("custNotes");

const backToTopBtn = document.getElementById("backToTop");

/* Modal refs */
const itemModal = document.getElementById("itemModal");
const modalClose = document.getElementById("modalClose");
const modalIcon = document.getElementById("modalIcon");
const modalCat = document.getElementById("modalCat");
const modalTitle = document.getElementById("modalTitle");
const modalPrice = document.getElementById("modalPrice");
const modalDesc = document.getElementById("modalDesc");
const modalOptionsWrap = document.getElementById("modalOptionsWrap");
const modalOptions = document.getElementById("modalOptions");
const modalQtyVal = document.getElementById("modalQtyVal");
const modalQtyMinus = document.getElementById("modalQtyMinus");
const modalQtyPlus = document.getElementById("modalQtyPlus");
const modalAddBtn = document.getElementById("modalAddBtn");

let modalState = { item: null, optionIdx: 0, qty: 1 };

/* =========================================================
   INIT
========================================================= */
function init() {
  document.getElementById("year").textContent = new Date().getFullYear();
  renderTabs();
  renderMenu();
  updateCartUI();
  bindEvents();
  initScrollReveal();
}

/* ---------- Menu tabs ---------- */
function renderTabs() {
  const cats = ["All", ...menuData.map(c => c.category)];
  menuTabsEl.innerHTML = cats.map(cat =>
    `<button class="tab-btn ${cat === activeCategory ? "active" : ""}" data-cat="${escapeAttr(cat)}">${cat}</button>`
  ).join("");

  menuTabsEl.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      renderTabs();
      renderMenu();
    });
  });
}

/* ---------- Menu grid ---------- */
function renderMenu() {
  const term = searchTerm.trim().toLowerCase();
  let list = menuItems.filter(item => {
    const matchesCat = activeCategory === "All" || item.category === activeCategory;
    const matchesSearch = !term ||
      item.name.toLowerCase().includes(term) ||
      (item.desc && item.desc.toLowerCase().includes(term)) ||
      item.category.toLowerCase().includes(term);
    return matchesCat && matchesSearch;
  });

  menuGridEl.innerHTML = "";
  menuEmptyEl.hidden = list.length !== 0;

  list.forEach((item) => {
    const meta = CATEGORY_META[item.category] || { icon: "ph-bowl-food", tag: "Menu" };
    const minPrice = Math.min(...item.options.map(o => o.price));
    const priceLabel = item.options.length > 1 ? `From ₹${minPrice}` : `₹${minPrice}`;

    const card = document.createElement("div");
    card.className = "menu-item";
    card.innerHTML = `
      <span class="item-cat">${meta.tag}${item.dynamic ? " · Varies" : ""}</span>
      <span class="item-name">${item.name}${item.desc ? `<small>${item.desc}</small>` : ""}</span>
      <span class="item-price">${priceLabel}</span>
      <i class="ph ${meta.icon} item-watermark"></i>
    `;
    card.addEventListener("click", () => openModal(item));
    menuGridEl.appendChild(card);
  });
}

/* =========================================================
   MODAL
========================================================= */
function openModal(item) {
  modalState = { item, optionIdx: 0, qty: 1 };
  const meta = CATEGORY_META[item.category] || { icon: "ph-bowl-food", tag: "Menu", blurb: "Made fresh at Let's Scoop." };

  modalIcon.className = `ph ${meta.icon}`;
  modalCat.textContent = item.category;
  modalTitle.textContent = item.name;
  modalDesc.textContent = item.desc ? `${item.desc}. ${meta.blurb}` : meta.blurb;

  if (item.options.length > 1) {
    modalOptionsWrap.style.display = "block";
    modalOptions.innerHTML = item.options.map((opt, i) => `
      <label>
        <input type="radio" name="modalOpt" value="${i}" ${i === 0 ? "checked" : ""}>
        <span>${opt.label} · ₹${opt.price}</span>
      </label>
    `).join("");
    modalOptions.querySelectorAll("input").forEach(input => {
      input.addEventListener("change", (e) => {
        modalState.optionIdx = parseInt(e.target.value);
        refreshModalPrice();
      });
    });
  } else {
    modalOptionsWrap.style.display = "none";
    modalOptions.innerHTML = "";
  }

  modalQtyVal.textContent = "1";
  refreshModalPrice();

  itemModal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function refreshModalPrice() {
  const opt = modalState.item.options[modalState.optionIdx];
  modalPrice.textContent = `₹${opt.price * modalState.qty}`;
}

function closeModal() {
  itemModal.classList.remove("open");
  document.body.style.overflow = "";
}

/* =========================================================
   CART
========================================================= */
function addToCart(item, optionIdx, qty) {
  const opt = item.options[optionIdx];
  const variant = opt.label === "Regular" ? "" : opt.label;
  const existing = cart.find(c => c.name === item.name && c.variant === variant);

  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: `${item.id}__${optionIdx}`, name: item.name, category: item.category, variant, price: opt.price, qty });
  }
  updateCartUI();
}

function updateCartQty(id, delta) {
  const line = cart.find(c => c.id === id);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) cart = cart.filter(c => c.id !== id);
  updateCartUI();
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  updateCartUI();
}

function cartTotal() { return cart.reduce((sum, c) => sum + c.price * c.qty, 0); }
function cartCount() { return cart.reduce((sum, c) => sum + c.qty, 0); }

function updateCartUI() {
  const count = cartCount();
  const total = cartTotal();
  navCartCount.textContent = count;

  if (cart.length === 0) {
    cartEmptyState.style.display = "block";
    cartSummaryEl.hidden = true;
    cartItemsEl.querySelectorAll(".cart-item").forEach(el => el.remove());
    mobileCartBar.hidden = true;
  } else {
    cartEmptyState.style.display = "none";
    cartSummaryEl.hidden = false;
    cartSubtotalEl.textContent = `₹${total}`;

    cartItemsEl.querySelectorAll(".cart-item").forEach(el => el.remove());
    cart.forEach(line => {
      const el = document.createElement("div");
      el.className = "cart-item";
      el.innerHTML = `
        <div class="cart-item-info">
          <h4>${line.name}${line.variant ? ` <span style="color:var(--ink-faint);font-weight:500;">(${line.variant})</span>` : ""}</h4>
          <span>₹${line.price} each</span>
        </div>
        <div class="cart-item-controls">
          <div class="cart-qty">
            <button class="qty-minus" aria-label="Decrease"><i class="ph ph-minus"></i></button>
            <span>${line.qty}</span>
            <button class="qty-plus" aria-label="Increase"><i class="ph ph-plus"></i></button>
          </div>
          <span class="cart-item-price">₹${line.price * line.qty}</span>
          <button class="cart-item-remove" aria-label="Remove"><i class="ph ph-trash"></i></button>
        </div>
      `;
      el.querySelector(".qty-minus").addEventListener("click", () => updateCartQty(line.id, -1));
      el.querySelector(".qty-plus").addEventListener("click", () => updateCartQty(line.id, 1));
      el.querySelector(".cart-item-remove").addEventListener("click", () => removeFromCart(line.id));
      cartItemsEl.appendChild(el);
    });

    if (window.innerWidth <= 700) {
      mobileCartBar.hidden = false;
      mobileCartCount.textContent = `${count} item${count > 1 ? "s" : ""}`;
      mobileCartTotal.textContent = `₹${total}`;
    }
  }
}

/* =========================================================
   CHECKOUT -> WHATSAPP
========================================================= */
function buildWhatsAppMessage() {
  const name = custNameEl.value.trim();
  const phone = custPhoneEl.value.trim();
  const address = custAddressEl.value.trim();
  const notes = custNotesEl.value.trim();

  let lines = [];
  lines.push("Hi Let's Scoop! I'd like to place an order:");
  lines.push("");
  lines.push("*Order Items:*");
  cart.forEach((line, i) => {
    const variantText = line.variant ? ` (${line.variant})` : "";
    lines.push(`${i + 1}. ${line.name}${variantText} x${line.qty} — ₹${line.price * line.qty}`);
  });
  lines.push("");
  lines.push(`*Total: ₹${cartTotal()}*`);
  lines.push("");
  lines.push("*Customer Details:*");
  lines.push(`Name: ${name || "—"}`);
  lines.push(`Phone: ${phone || "—"}`);
  lines.push(`Address: ${address || "Dine-in / Takeaway"}`);
  if (notes) lines.push(`Notes: ${notes}`);
  lines.push("");
  lines.push("Thank you!");

  return encodeURIComponent(lines.join("\n"));
}

function handleCheckout(e) {
  e.preventDefault();
  if (cart.length === 0) {
    alert("Your table is empty — add something delicious from the menu first!");
    document.getElementById("menu").scrollIntoView({ behavior: "smooth" });
    return;
  }
  const message = buildWhatsAppMessage();
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
  window.open(url, "_blank");
}

/* =========================================================
   UI CHROME
========================================================= */
function initScrollReveal() {
  const reveals = document.querySelectorAll(".reveal");
  const check = () => {
    const vh = window.innerHeight;
    reveals.forEach(el => { if (el.getBoundingClientRect().top < vh - 80) el.classList.add("active"); });
  };
  window.addEventListener("scroll", check, { passive: true });
  check();
}

function handleNavbarScroll() {
  if (window.scrollY > 40) navbar.classList.add("scrolled"); else navbar.classList.remove("scrolled");
  if (window.scrollY > 500) backToTopBtn.classList.add("visible"); else backToTopBtn.classList.remove("visible");
}

function toggleMobileMenu() {
  navLinks.classList.toggle("open");
  mobileMenuBtn.classList.toggle("open");
}
function closeMobileMenu() {
  navLinks.classList.remove("open");
  mobileMenuBtn.classList.remove("open");
}

function escapeAttr(str) { return String(str).replace(/"/g, "&quot;"); }

/* =========================================================
   EVENT BINDINGS
========================================================= */
function bindEvents() {
  window.addEventListener("scroll", handleNavbarScroll, { passive: true });
  mobileMenuBtn.addEventListener("click", toggleMobileMenu);
  navLinks.querySelectorAll("a").forEach(a => a.addEventListener("click", closeMobileMenu));
  navCartBtn.addEventListener("click", () => document.getElementById("order").scrollIntoView({ behavior: "smooth" }));

  menuSearchEl.addEventListener("input", (e) => { searchTerm = e.target.value; renderMenu(); });

  cartClearBtn.addEventListener("click", () => {
    if (cart.length === 0) return;
    if (confirm("Clear your entire order?")) { cart = []; updateCartUI(); }
  });

  modalClose.addEventListener("click", closeModal);
  itemModal.addEventListener("click", (e) => { if (e.target === itemModal) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  modalQtyMinus.addEventListener("click", () => {
    if (modalState.qty > 1) modalState.qty--;
    modalQtyVal.textContent = modalState.qty;
    refreshModalPrice();
  });
  modalQtyPlus.addEventListener("click", () => {
    modalState.qty++;
    modalQtyVal.textContent = modalState.qty;
    refreshModalPrice();
  });

  modalAddBtn.addEventListener("click", () => {
    addToCart(modalState.item, modalState.optionIdx, modalState.qty);
    closeModal();
    document.getElementById("order").scrollIntoView({ behavior: "smooth" });
  });

  checkoutForm.addEventListener("submit", handleCheckout);
  backToTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  window.addEventListener("resize", updateCartUI);
}

document.addEventListener("DOMContentLoaded", init);
