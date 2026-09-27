"use strict";
const details = document.querySelector('#product-details');
const productId = new URLSearchParams(location.search).get('id');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function imageUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
async function loadProduct() {
  details.setAttribute('aria-busy', 'true');
  try {
    if (!productId) throw new Error('Missing product');
    const response = await fetch(`https://api.everrest.educata.dev/shop/products/id/${encodeURIComponent(productId)}`);
    if (!response.ok) throw new Error('Unavailable');
    const p = await response.json();
    document.title = `${p.title} · SHOP`;
    const available = Number(p.stock) > 0;
    const images = [...new Set([p.thumbnail, ...(p.images || [])].map(imageUrl).filter(Boolean))];
    const money = value => escapeHtml(`${Number(value).toFixed(2)} ${p.price.currency || 'USD'}`);
    const discount = p.price.beforeDiscount > p.price.current ? Math.round((1 - p.price.current / p.price.beforeDiscount) * 100) : 0;
    const date = new Date(p.issueDate);
    const release = p.issueDate && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('ka-GE', {timeZone:'UTC'}) : '—';
    details.innerHTML = `<article class="product-layout">
      <div class="gallery"><div class="hero-image">
        ${!available ? '<span class="stock-ribbon">Out of stock</span>' : discount ? `<span class="discount-badge">−${discount}%</span>` : ''}
        ${images.length ? `<img id="main-image" referrerpolicy="no-referrer" src="${escapeHtml(images[0])}" alt="${escapeHtml(p.title)}">` : '<p>ფოტო მიუწვდომელია</p>'}
        ${images.length > 1 ? '<button type="button" class="gallery-arrow gallery-prev" aria-label="წინა ფოტო">&#8249;</button><button type="button" class="gallery-arrow gallery-next" aria-label="შემდეგი ფოტო">&#8250;</button>' : ''}
        <span class="image-counter">${images.length ? `1 / ${images.length}` : ''}</span></div>
        <div class="thumbnails" aria-label="პროდუქტის ფოტოები">${images.map((src,i) => `<button type="button" class="thumbnail" data-index="${i}" aria-label="ფოტო ${i+1}" aria-pressed="${i===0}"><img referrerpolicy="no-referrer" src="${escapeHtml(src)}" alt=""></button>`).join('')}</div>
      </div>
      <div class="product-info"><p class="eyebrow">${escapeHtml(p.brand)} <span>/</span> ${escapeHtml(p.category?.name)}</p>
        <h1>${escapeHtml(p.title)}</h1>
        <div class="product-meta"><span class="rating"><span aria-hidden="true">★</span> ${Number.isFinite(p.rating) ? p.rating.toFixed(2)+' / 5' : 'შეფასება არ არის'}</span><span class="stock ${available ? 'available' : 'unavailable'}">${available ? `მარაგშია · ${escapeHtml(p.stock)} ცალი` : 'არ არის მარაგში'}</span></div>
        <div class="price-panel"><div class="price-row"><strong>${money(p.price.current)}</strong>${discount ? `<del>${money(p.price.beforeDiscount)}</del>` : ''}</div>${discount ? `<p>დაზოგე ${money(p.price.beforeDiscount-p.price.current)} <span>−${discount}%</span></p>` : ''}</div>
        <p class="intro">${escapeHtml(p.description)}</p>
        <div class="purchase-actions"><button id="add-to-cart" type="button" ${available ? '' : 'disabled'}>კალათაში დამატება <span>+</span></button><button id="buy-now" type="button" ${available ? '' : 'disabled'}>ყიდვა <span>↗</span></button></div>
        <p class="purchase-hint">${available ? '„ყიდვა“ პროდუქტს კალათაში დაამატებს და კალათას გახსნის.' : 'პროდუქტის შეძენა მარაგის შევსების შემდეგ იქნება შესაძლებელი.'}</p>
        <div class="highlights"><div><span>გარანტია</span><strong>${p.warranty != null ? escapeHtml(p.warranty)+' წელი' : '—'}</strong></div><div><span>ბრენდი</span><strong>${escapeHtml(p.brand)}</strong></div></div>
      </div></article>
      <section class="specifications"><div><p class="eyebrow">ყველა დეტალი</p><h2>პროდუქტის მახასიათებლები</h2></div><dl>
        <div><dt>კატეგორია</dt><dd>${escapeHtml(p.category?.name || '—')}</dd></div>
        <div><dt>გამოშვების თარიღი</dt><dd>${escapeHtml(release)}</dd></div>
        <div><dt>გარანტია</dt><dd>${p.warranty != null ? escapeHtml(p.warranty)+' წელი' : '—'}</dd></div>
        <div><dt>პროდუქტის კოდი</dt><dd>${escapeHtml(p._id)}</dd></div>
      </dl></section>`;
    let activeImage = 0;
    function showImage(index) {
      if (!images.length) return;
      activeImage = (index + images.length) % images.length;
      document.querySelector('#main-image').src = images[activeImage];
      document.querySelector('.image-counter').textContent = `${activeImage + 1} / ${images.length}`;
      details.querySelectorAll('.thumbnail').forEach(item => {
        item.setAttribute('aria-pressed', String(Number(item.dataset.index) === activeImage));
      });
    }
    details.querySelectorAll('.thumbnail').forEach(button => button.addEventListener('click', () => {
      showImage(Number(button.dataset.index));
    }));
    details.querySelector('.gallery-prev')?.addEventListener('click', () => showImage(activeImage - 1));
    details.querySelector('.gallery-next')?.addEventListener('click', () => showImage(activeImage + 1));
    const add = document.querySelector('#add-to-cart'), buy = document.querySelector('#buy-now');
    async function purchase(redirect) {
      if (!available || add.disabled) return;
      add.disabled = buy.disabled = true;
      const status = document.querySelector('#purchase-status');
      status.textContent = 'პროდუქტი ემატება კალათაში…';
      try {
        const success = await ShopCart.add({id:p._id, name:p.title, img:p.thumbnail, price:Number(p.price.current)});
        if (!success) { status.textContent = 'დამატება ვერ მოხერხდა. სცადეთ ხელახლა.'; return; }
        status.textContent = 'პროდუქტი დაემატა კალათაში ✓';
        if (redirect) location.href = 'cart/cart.html';
      } catch { status.textContent = 'დამატება ვერ მოხერხდა. სცადეთ ხელახლა.'; }
      finally { add.disabled = buy.disabled = false; }
    }
    add.addEventListener('click', () => purchase(false));
    buy.addEventListener('click', () => purchase(true));
  } catch {
    details.innerHTML = '<p role="alert">პროდუქტის ჩატვირთვა ვერ მოხერხდა.</p><button id="retry-product" type="button">ხელახლა ცდა</button>';
    document.querySelector('#retry-product').addEventListener('click', loadProduct);
  } finally { details.setAttribute('aria-busy', 'false'); }
}
loadProduct();
