"use strict";
const API = 'https://api.everrest.educata.dev';
const dialog = document.querySelector('#account-dialog');
const accountForm = document.querySelector('#account-form');
const passwordForm = document.querySelector('#password-form');
const editButton = document.querySelector('.edit-btn');
const pageStatus = document.querySelector('#profile-status');
let currentUser;
let saving = false;
async function request(path, body) {
  const token = Cookies.get('user');
  if (!token) throw { status: 401 };
  const response = await fetch(API + path, {
    method: body ? 'PATCH' : 'GET',
    headers: { accept: 'application/json', Authorization: `Bearer ${token}`, ...(body ? {'Content-Type':'application/json'} : {}) },
    ...(body ? {body:JSON.stringify(body)} : {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw {...data, status:response.status};
  return data;
}
function renderProfile(user) {
  document.querySelector('.profile-avatar').src = user.avatar || '';
  document.querySelector('.full-name').textContent = `${user.firstName || ''} ${user.lastName || ''}`;
  for (const name of ['role','email','phone','address','age','gender','zipcode']) document.querySelector('.'+name).textContent = user[name] ?? '—';
  document.querySelector('.verified-badge').style.display = user.verified ? 'flex' : 'none';
  document.querySelector('.account-status').innerHTML = user.verified ? '<span class="status-dot"></span><span>Verified Account</span>' : '<span class="status-dot unverified"></span><span>Unverified Account</span>';
}
async function loadProfile() {
  pageStatus.textContent = 'პროფილი იტვირთება…';
  document.querySelector('#retry-profile').hidden = true;
  try {
    currentUser = await request('/auth');
    renderProfile(currentUser);
    editButton.disabled = false;
    pageStatus.textContent = '';
  } catch (error) {
    pageStatus.textContent = error.status === 401 ? 'სესია დასრულდა. დაბრუნდით მაღაზიაში და ხელახლა შედით ანგარიშში.' : 'პროფილი ვერ ჩაიტვირთა. სცადეთ ხელახლა.';
    document.querySelector('#retry-profile').hidden = false;
  }
}
const rules = {
  firstName: [/^[A-Z][a-z]{1,14}$/, 'სახელი: 2–15 ლათინური ასო, პირველი დიდი, დანარჩენი პატარა.'],
  lastName: [/^[A-Z][a-z]{1,19}$/, 'გვარი: 2–20 ლათინური ასო, პირველი დიდი, დანარჩენი პატარა.'],
  phone: [/^\+995 ?5[0-9]{8}$/, '+995-ის შემდეგ საჭიროა 9 ციფრი, პირველი — 5.'],
  newPassword: [/^(?=.*[A-Z])(?=.*[0-9]).{8,}$/s, 'მინიმუმ 8 სიმბოლო, ერთი დიდი ლათინური ასო და ერთი ციფრი.']
};
function fieldError(input, message = '') {
  input.setAttribute('aria-invalid', String(Boolean(message)));
  const output = document.getElementById('error-'+input.name);
  output.textContent = message; output.hidden = !message;
}
function validate(input) {
  let message = '';
  const rule = rules[input.name];
  if (rule && !rule[0].test(input.value)) message = rule[1];
  else if (input.name === 'oldPassword' && !input.value) message = 'შეიყვანეთ მიმდინარე პაროლი.';
  else if (input.name === 'age' && (!input.value || !Number.isInteger(Number(input.value)) || Number(input.value) < 1)) message = 'მიუთითეთ სწორი ასაკი.';
  else if (input.name === 'gender' && !['MALE','FEMALE','OTHER'].includes(input.value)) message = 'აირჩიეთ სქესი.';
  else if (input.name === 'avatar' && input.value) {
    try { if (!['http:','https:'].includes(new URL(input.value).protocol)) throw new Error(); } catch { message = 'მიუთითეთ სურათის სწორი URL.'; }
  }
  fieldError(input, message); return !message;
}
function status(form, message, success = false) {
  const output = form.querySelector('.form-status');
  output.textContent = message; output.classList.toggle('success', success);
}
function showFailure(form, error) {
  const aliases = {firstname:'firstName',lastname:'lastName',oldpassword:'oldPassword',newpassword:'newPassword',password:'newPassword',phone:'phone',age:'age',address:'address',zipcode:'zipcode',avatar:'avatar',gender:'gender'};
  let first;
  for (const key of Array.isArray(error.errorKeys) ? error.errorKeys : []) {
    const normalized = String(key).toLowerCase().replace(/[^a-z]/g,'');
    const alias = Object.keys(aliases).find(name => normalized.includes(name));
    const input = form.elements.namedItem(aliases[alias]);
    if (!input) continue;
    fieldError(input, input.name === 'oldPassword' ? 'მიმდინარე პაროლი არასწორია.' : 'მონაცემი არასწორია. შეასწორეთ ეს ველი.');
    first ||= input;
  }
  status(form, error.status === 401 ? 'სესია დასრულდა. ხელახლა შედით ანგარიშში.' : error.status === 429 ? 'ძალიან ბევრი მცდელობაა. სცადეთ მოგვიანებით.' : first ? 'შეასწორეთ მონიშნული ველები.' : error.status ? 'ცვლილება ვერ შესრულდა. შეამოწმეთ მონაცემები და სცადეთ ხელახლა.' : 'კავშირი ვერ დამყარდა. სცადეთ ხელახლა.');
  first?.focus();
}
for (const form of [accountForm,passwordForm]) {
  form.querySelectorAll('input,select').forEach(input => input.addEventListener('input', () => {status(form,'');validate(input);}));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving) return;
    const controls = [...form.querySelectorAll('input,select')];
    if (!controls.map(validate).every(Boolean)) { controls.find(input => input.getAttribute('aria-invalid') === 'true')?.focus(); return; }
    const payload = Object.fromEntries(new FormData(form));
    const isAccount = form === accountForm;
    if (isAccount) { payload.age = Number(payload.age); payload.phone = payload.phone.replace(' ',''); }
    saving = true;
    dialog.querySelectorAll('fieldset,button').forEach(el => el.disabled = true);
    status(form,'ინახება…');
    try {
      await request(isAccount ? '/auth/update' : '/auth/change_password', payload);
      if (isAccount) {
        currentUser = {...currentUser,...payload}; renderProfile(currentUser);
        status(form,'პროფილი წარმატებით განახლდა.',true);
      } else {
        form.reset(); hidePasswords();
        status(form,'პაროლი წარმატებით შეიცვალა.',true);
      }
    } catch (error) { showFailure(form,error); }
    finally { saving = false; dialog.querySelectorAll('fieldset,button').forEach(el => el.disabled = false); }
  });
}
function hidePasswords() {
  passwordForm.querySelectorAll('input').forEach(input => input.type = 'password');
  passwordForm.querySelectorAll('.password-toggle').forEach(button => {button.textContent='ჩვენება';button.setAttribute('aria-pressed','false');});
}
passwordForm.querySelectorAll('.password-toggle').forEach(button => button.addEventListener('click', () => {
  const input = document.getElementById(button.getAttribute('aria-controls'));
  const show = input.type === 'password'; input.type = show ? 'text' : 'password';
  button.textContent = show ? 'დამალვა' : 'ჩვენება'; button.setAttribute('aria-pressed',String(show));
}));
editButton.addEventListener('click', () => {
  if (!currentUser) return;
  accountForm.querySelectorAll('input,select').forEach(input => {input.value = currentUser[input.name] ?? '';fieldError(input);});
  passwordForm.reset();hidePasswords();
  passwordForm.querySelectorAll('input').forEach(input => fieldError(input));
  status(accountForm,'');status(passwordForm,'');dialog.showModal();
});
document.querySelector('#close-account').addEventListener('click', () => dialog.close());
dialog.addEventListener('cancel', event => {if(saving) event.preventDefault();});
dialog.addEventListener('close', () => {passwordForm.reset();hidePasswords();});
document.querySelector('#retry-profile').addEventListener('click',loadProfile);
loadProfile();
