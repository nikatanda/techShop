"use strict";

// Shared by the product page and cart/cart.html.
window.ShopCart = (() => {
  const API = "https://api.everrest.educata.dev";
  const FALLBACK_IMAGE = "https://static.thenounproject.com/png/504708-200.png";
  const STORAGE_KEY = "shop.guest-cart.v1";
  const cache = new Map();
  let items = [];
  let cartID = null;
  let activeToken = null;
  let busy = false;
  let error = "";
  let queue = Promise.resolve();
  const token = () => Cookies.get("user") || "";
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
  const money = (value) => `${Number(value).toFixed(2)} $`;

  function readGuest() {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((item) => item && typeof item.id === "string" &&
      Number.isFinite(item.price) && item.price >= 0 && Number.isInteger(item.count) && item.count > 0) : [];
  }

  async function request(path, session, method = "GET", body) {
    const response = await fetch(`${API}${path}`, {
      method,
      headers: { accept: "application/json", ...(session ? { Authorization: `Bearer ${session}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const failure = new Error(response.status === 401 ? "სესია დასრულდა. გთხოვ, ხელახლა შეხვიდე ანგარიშში." :
        (data.errorKeys || []).includes("errors.user_email_not_verified") ? "კალათის გამოსაყენებლად დაადასტურე ელფოსტა." :
        data.error || "კალათის განახლება ვერ მოხერხდა. სცადე ხელახლა.");
      failure.keys = data.errorKeys || [];
      failure.status = response.status;
      failure.apiMessage = data.error || data.message || "";
      throw failure;
    }
    return data;
  }

  async function loadRemote(session) {
    let cart;
    try {
      cart = await request("/shop/cart", session);
    } catch (failure) {
      // Some API responses omit the documented errorKeys field.
      // Match this specific missing-cart response, never arbitrary GET failures.
      const missingCart = failure.keys?.includes("errors.user_cart_not_exists") ||
        String(failure.apiMessage).trim().replace(/\.$/, "").toLowerCase() === "user has to create cart first";
      if (failure.status === 401 || !missingCart) throw failure;
      cart = { products: [], _id: null };
    }
    const nextItems = await Promise.all(cart.products.map(async (entry) => {
      const id = entry.productId;
      let product = cache.get(id);
      if (!product) {
        try {
          const details = await request(`/shop/products/id/${encodeURIComponent(id)}`, "");
          product = { name: details.title, img: details.thumbnail };
          cache.set(id, product);
        } catch {
          product = { name: "პროდუქტის ინფორმაცია მიუწვდომელია", img: "" };
        }
      }
      return { id, ...product, price: Number(entry.pricePerQuantity), count: entry.quantity };
    }));
    if (session !== token()) return;
    cartID = cart._id || null;
    items = nextItems;
  }

  async function load(session) {
    if (activeToken !== session) {
      items = [];
      cartID = null;
      activeToken = session;
      render();
    }
    if (session) await loadRemote(session);
    else items = readGuest();
  }

  function run(work) {
    const session = token();
    queue = queue.then(async () => {
      if (session !== token()) return;
      busy = true;
      error = "";
      render();
      try {
        await load(session);
        if (session !== token()) return false;
        if (work) await work(session);
        return session === token();
      } catch (failure) {
        if (session === token()) error = failure.message || "კავშირი ვერ დამყარდა. სცადე ხელახლა.";
        return false;
      } finally {
        busy = false;
        if (session === token()) render();
      }
    });
    return queue;
  }

  function change(id, delta, product, remove = false) {
    return run(async (session) => {
      const existing = items.find((item) => item.id === id);
      if (!existing && !product) return;
      const count = remove ? 0 : (existing?.count || 0) + delta;
      if (session) {
        const method = count <= 0 ? "DELETE" : cartID ? "PATCH" : "POST";
        await request("/shop/cart/product", session, method, count <= 0 ? { id } : { id, quantity: count });
        await loadRemote(session);
      } else {
        const next = items.filter((item) => item.id !== id);
        if (count > 0) next.push({ ...(existing || product), count });
        // Save first, so a storage error does not falsely show a successful update.
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        items = next;
      }
    });
  }

  function render() {
    const count = items.reduce((sum, item) => sum + item.count, 0);
    const cents = items.reduce((sum, item) => sum + Math.round(item.price * 100) * item.count, 0);
    document.querySelectorAll(".quantity, .cart-count").forEach((el) => {
      el.textContent = count;
      el.classList.toggle("show", count > 0);
    });
    document.querySelectorAll(".cart-total strong").forEach((el) => el.textContent = money(cents / 100));
    document.querySelectorAll(".cart-mode").forEach((el) => {
      el.textContent = token() ? "შენი ანგარიშის კალათა" : "სტუმრის კალათა · შენახულია ამ ბრაუზერში";
    });
    document.querySelectorAll(".cart-status").forEach((el) => el.textContent = error || (busy ? "კალათა ახლდება…" : ""));
    document.querySelectorAll(".cart-retry").forEach((el) => { el.hidden = !error; el.disabled = busy; });
    document.querySelectorAll(".cart-notice").forEach((el) => { el.textContent = error; el.hidden = !error; });
    document.querySelectorAll(".cart-list").forEach((list) => {
      list.setAttribute("aria-busy", String(busy));
      list.innerHTML = items.map((item) => `<article class="cart-item">
        <div class="cart-image"><img src="${escape(item.img || FALLBACK_IMAGE)}" alt="${escape(item.name)}" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'" /></div>
        <div class="cart-item-info">
          <p class="cart-item-name">${escape(item.name)}</p>
          <p class="cart-item-price">ერთეულის ფასი: ${money(item.price)}</p>
          <div class="cart-controls">
            <button type="button" data-id="${escape(item.id)}" data-action="minus" aria-label="${escape(item.name)} — შემცირება" ${busy ? "disabled" : ""}>−</button>
            <span>${item.count}</span>
            <button type="button" data-id="${escape(item.id)}" data-action="plus" aria-label="${escape(item.name)} — გაზრდა" ${busy ? "disabled" : ""}>+</button>
          </div>
        </div>
        <div class="cart-item-end">
          <strong class="cart-item-subtotal">${money(Math.round(item.price * 100) * item.count / 100)}</strong>
          <button type="button" class="cart-remove" data-id="${escape(item.id)}" data-action="remove" aria-label="${escape(item.name)} — წაშლა" ${busy ? "disabled" : ""}>წაშლა</button>
        </div>
      </article>`).join("") || `<div class="cart-empty"><p>${busy ? "კალათა იტვირთება…" : error ? "კალათა ვერ ჩაიტვირთა" : "შენი კალათა ჯერ ცარიელია"}</p></div>`;
    });
  }

  document.querySelectorAll(".cart-list").forEach((list) => list.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button || busy) return;
    const { id, action } = button.dataset;
    await change(id, action === "plus" ? 1 : -1, null, action === "remove");
    const next = [...list.querySelectorAll("button[data-action]")].find((el) => el.dataset.id === id && el.dataset.action === action);
    next?.focus({ preventScroll: true });
  }));
  document.querySelectorAll(".cart-retry").forEach((button) => button.addEventListener("click", () => run()));
  window.addEventListener("storage", (event) => { if (event.key === STORAGE_KEY && !token()) run(); });
  window.addEventListener("focus", () => { if (activeToken !== token()) run(); });
  const ready = run();
  return {
    ready,
    refresh: () => run(),
    add: (product) => {
      cache.set(product.id, { name: product.name, img: product.img });
      return change(product.id, 1, product);
    },
    change: (id, delta) => change(id, delta),
    remove: (id) => change(id, 0, null, true)
  };
})();
