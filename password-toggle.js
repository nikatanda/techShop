"use strict";

document.querySelectorAll('input[name="password"]').forEach(input => {
  const wrapper = document.createElement('div');
  wrapper.className = 'password-input';
  input.before(wrapper);
  wrapper.append(input);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'password-toggle';
  toggle.setAttribute('aria-controls', input.id);
  toggle.setAttribute('aria-label', 'პაროლის ჩვენება');
  toggle.setAttribute('aria-pressed', 'false');
  toggle.textContent = 'ჩვენება';
  wrapper.append(toggle);
  function hidePassword() {
    input.type = 'password';
    toggle.textContent = 'ჩვენება';
    toggle.setAttribute('aria-label', 'პაროლის ჩვენება');
    toggle.setAttribute('aria-pressed', 'false');
  }
  toggle.addEventListener('click', () => {
    if (input.type === 'text') hidePassword();
    else {
      input.type = 'text';
      toggle.textContent = 'დამალვა';
      toggle.setAttribute('aria-label', 'პაროლის დამალვა');
      toggle.setAttribute('aria-pressed', 'true');
    }
  });
  input.form.addEventListener('submit', hidePassword);
  input.form.addEventListener('reset', hidePassword);
  // Closing or switching dialogs should conceal a previously shown password.
  new MutationObserver(() => {
    if (input.form.style.display === 'none') hidePassword();
  }).observe(input.form, { attributes: true, attributeFilter: ['style'] });
});
