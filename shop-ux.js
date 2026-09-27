"use strict";
(() => {
  const nav = document.querySelector('header nav > ul');
  nav.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    nav.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  });
  let returnFocus;
  const forms = [...document.querySelectorAll('.login-form,.registartion-form')];
  forms.forEach(form => {
    form.setAttribute('role','dialog');form.setAttribute('aria-modal','true');
    form.setAttribute('aria-label',form.classList.contains('login-form') ? 'შესვლა' : 'რეგისტრაცია');
    new MutationObserver(() => {
      const open = forms.find(item => item.style.display === 'block');
      document.body.classList.toggle('modal-open', Boolean(open));
      if (form.style.display === 'block') {
        if (!forms.some(item => item.contains(document.activeElement))) returnFocus = document.activeElement;
        form.querySelector('input')?.focus();
      } else if (!open) returnFocus?.focus();
    }).observe(form,{attributes:true,attributeFilter:['style']});
  });
  document.querySelector('.overlay').addEventListener('click', closeForm);
  document.addEventListener('keydown',event => {
    const open = forms.find(item => item.style.display === 'block');
    if (!open) return;
    if (event.key === 'Escape') {closeForm();return;}
    if (event.key !== 'Tab') return;
    const controls = [...open.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')].filter(item => item.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {event.preventDefault();last?.focus();}
    else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first?.focus();}
  });
})();
