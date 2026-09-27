"use strict";

const categories = document.querySelector("ul");
const container = document.querySelector(".container");
const form = document.querySelector("form");
const overlay = document.querySelector(".overlay");
const signUp = document.querySelector(".sign-up");
const registartionForm = document.querySelector(".registartion-form");
const mainLoginBtn = document.querySelector(".login-btn");
const profile = document.querySelector(".profile");
const signOut = document.querySelector(".sign-out");
const quantity = document.querySelector(".quantity");

let activeController;
let currentPage = 1;
let productUrl;
const pagination = document.querySelector('.pagination');
pagination.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-page]');
  if (!button) return;
  currentPage = Number(button.dataset.page);
  loadProducts(productUrl);
});

fetch("https://api.everrest.educata.dev/shop/products/brands")
  .then((res) => res.json())
  .then(data => data.forEach(item => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = item; button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => filterByName(item));
    li.append(button); categories.append(li);
  }))
  .catch((error) => console.log(error));

function allProduct() {
  currentPage = 1;
  loadProducts(
    "https://api.everrest.educata.dev/shop/products/all?page_index=1&page_size=15",
  );
}

allProduct();

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function card(item) {
  return `<div class="card">
        <img
          src="${escapeHtml(item.thumbnail)}"
          alt="${escapeHtml(item.title)} image"
          onerror="this.onerror=null;this.src='https://static.thenounproject.com/png/504708-200.png'"
        />
        <h2><a class="product-link" href="product.html?id=${encodeURIComponent(item._id)}">${escapeHtml(item.title)}</a></h2>
        <div class="price">
          <p>${item.price.current}$</p>
          <p>${item.price.beforeDiscount}$</p>
        </div>
        
        <div class="shop-btns">
          <button
            data-name="${escapeHtml(item.title)}"
            data-img="${escapeHtml(item.thumbnail)}"
            data-price="${escapeHtml(item.price.current)}"
            data-id="${escapeHtml(item._id)}"
            onclick="addToCart(this.dataset.name, this.dataset.img, this.dataset.price, this.dataset.id)"
            ${item.stock > 0 ? "" : "disabled"}
          ><i class="fa-solid fa-cart-shopping"></i></button>
          <button ${item.stock > 0 ? "" : "disabled"}>Buy Now</button>
        </div>

        <span class = "span"style="display: ${item.stock > 0 ? "none" : "block"}">Out of stock</span>
      </div>`;
}

function filterByName(item) {
  currentPage = 1;
  loadProducts(
    `https://api.everrest.educata.dev/shop/products/brand/${encodeURIComponent(item)}?page_index=1&page_size=15`,
  );
}

function search(inputValue) {
  currentPage = 1;
  if (inputValue.trim() === "") {
    allProduct();
    return;
  }

  loadProducts(
    `https://api.everrest.educata.dev/shop/products/search?page_index=1&page_size=15&keywords=${encodeURIComponent(inputValue)}`,
    "პროდუქტი ვერ მოიძებნა",
  );
}

function loadProducts(url, emptyMessage = "პროდუქტი ვერ მოიძებნა") {
  productUrl = url;
  const requestUrl = new URL(url);
  requestUrl.searchParams.set('page_index', currentPage);
  requestUrl.searchParams.set('page_size', 15);
  pagination.querySelectorAll('button').forEach((button) => {
    if (Number(button.dataset.page) === currentPage) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;

  container.innerHTML = '<p class="catalog-status" role="status">პროდუქტები იტვირთება…</p>';

  fetch(requestUrl.toString(), { signal: controller.signal })
    .then((res) => {
      if (!res.ok) throw new Error('Products could not be loaded');
      return res.json();
    })
    .then((data) => {
      if (controller.signal.aborted) return;

      const products = data.products ?? [];
      container.innerHTML = products.length
        ? products.map(card).join("")
        : `<p>${emptyMessage}</p>`;
    })
    .catch((error) => {
      if (error.name !== "AbortError" && !controller.signal.aborted) {
        container.innerHTML = '<p role="alert">პროდუქტების ჩატვირთვა ვერ მოხერხდა. სცადეთ ხელახლა გვერდის ღილაკით.</p>';
      }
    });
}

function filterByPrice() {
  const minInput = document.querySelector(".min").value;
  const maxInput = document.querySelector(".max").value;

  if (minInput.trim() === "" && maxInput.trim() === "") {
    return allProduct();
  }

  currentPage = 1;
  const params = new URLSearchParams({ price_min: minInput || '0', price_max: maxInput || '1000000' });
  loadProducts('https://api.everrest.educata.dev/shop/products/search?' + params,
    'ამ ფასში პროდუქტი ვერ მოიძებნა');
}

function openForm() {
  form.style.display = "block";
  overlay.style.display = "block";
}

function closeForm() {
  form.style.display = "none";
  overlay.style.display = "none";
  registartionForm.style.display = "none";
}

function openSignInForm() {
  form.style.display = "none";
  overlay.style.display = "block";
  registartionForm.style.display = "block";
}

async function registartion(e) {
  e.preventDefault();
  const button = registartionForm.querySelector('button[type="submit"]');
  if (button.disabled || !registrationValidation.validate()) return;
  const submitted = Object.fromEntries(new FormData(e.target));
  const payload = { ...submitted, phone: submitted.phone.replace(' ', ''), age: submitted.age.trim() === '' ? null : Number(submitted.age) };
  button.disabled = true;
  registartionForm.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('https://api.everrest.educata.dev/auth/sign_up', {
      method: 'POST',
      headers: { accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const info = await response.json().catch(() => ({}));
    if (!response.ok) {
      registrationValidation.serverError(info, submitted);
      return;
    }
    form.style.display = 'block';
    overlay.style.display = 'block';
    registartionForm.style.display = 'none';
  } catch {
    registrationValidation.serverError({}, submitted);
  } finally {
    button.disabled = false;
    registartionForm.setAttribute('aria-busy', 'false');
  }
}

const loginFields = [...form.querySelectorAll('input[name]')];
const loginError = form.querySelector('.login-error');
function setLoginError(input, message = '') {
  input.setAttribute('aria-invalid', String(Boolean(message)));
  const error = document.getElementById(input.id + '-error');
  error.textContent = message;
  error.hidden = !message;
}
function validateLoginField(input) {
  let message = '';
  if (!input.value.trim()) message = input.name === 'email' ? 'შეიყვანეთ ელფოსტა.' : 'შეიყვანეთ პაროლი.';
  else if (input.name === 'email' && input.validity.typeMismatch) message = 'შეიყვანეთ სწორი ელფოსტა.';
  setLoginError(input, message);
  return !message;
}
loginFields.forEach(input => input.addEventListener('input', () => {
  loginError.hidden = true;
  loginFields.forEach(field => setLoginError(field));
  validateLoginField(input);
}));
async function logIn(e) {
  e.preventDefault();
  const button = form.querySelector('.form-login-btn button');
  if (button.disabled) return;
  loginError.hidden = true;
  if (!loginFields.map(validateLoginField).every(Boolean)) {
    loginFields.find(input => input.getAttribute('aria-invalid') === 'true')?.focus();
    return;
  }
  const submitted = Object.fromEntries(new FormData(e.target));
  button.disabled = true;
  loginFields.forEach(input => input.readOnly = true);
  form.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('https://api.everrest.educata.dev/auth/sign_in', {
      method: 'POST', headers: { accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(submitted)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error || !data.access_token) {
      const keys = Array.isArray(data.errorKeys) ? data.errorKeys.join(' ') : '';
      let message = 'ავტორიზაცია ვერ მოხერხდა. სცადეთ ხელახლა.';
      if (response.status === 429) message = 'ძალიან ბევრი მცდელობაა. ცოტა ხანში სცადეთ ხელახლა.';
      else if (/not_verified/.test(keys)) message = 'შესასვლელად დაადასტურეთ ელფოსტა.';
      else if ([400, 401, 403, 404, 422].includes(response.status)) {
        message = 'ელფოსტა ან პაროლი არასწორია.';
        loginFields.forEach(input => {
          setLoginError(input);
          input.setAttribute('aria-invalid', 'true');
        });
        loginFields[0].focus();
      }
      loginError.textContent = message;
      loginError.hidden = false;
      return;
    }
    Cookies.set('user', data.access_token, { path: '/', sameSite: 'Lax' });
    ShopCart.refresh();
    form.style.display = 'none';
    overlay.style.display = 'none';
    registartionForm.style.display = 'none';
    mainLoginBtn.style.display = 'none';
    profile.style.display = 'block';
    signOut.style.display = 'block';
  } catch {
    loginError.textContent = 'სერვერთან დაკავშირება ვერ მოხერხდა. შეამოწმეთ ინტერნეტი და სცადეთ ხელახლა.';
    loginError.hidden = false;
  } finally {
    button.disabled = false;
    loginFields.forEach(input => input.readOnly = false);
    form.setAttribute('aria-busy', 'false');
  }
}

function signOutFuction() {
  Cookies.remove("user", { path: "/" });
  ShopCart.refresh();
  mainLoginBtn.style.display = "block";
  profile.style.display = "none";
  signOut.style.display = "none";
}

function goToProfile() {
  window.location.href = "profile/profile.html";
}

function addToCart(name, img, price, id) {
  ShopCart.add({ id, name, img, price: Number(price) });
}

function updateAuthButtons() {
  const loggedIn = Boolean(Cookies.get("user"));
  mainLoginBtn.style.display = loggedIn ? "none" : "block";
  profile.style.display = loggedIn ? "block" : "none";
  signOut.style.display = loggedIn ? "block" : "none";
}
updateAuthButtons();
