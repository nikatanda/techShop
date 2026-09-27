"use strict";
const registrationRules = {
  phone: {
    regex: /^\+995 ?5[0-9]{8}$/,
    message:
      "+995-ის შემდეგ შეიყვანეთ ზუსტად 9 ციფრი; პირველი ციფრი უნდა იყოს 5. მაგალითად: +995 555123456.",
  },
  firstName: {
    regex: /^[A-Z][a-z]{1,14}$/,
    message:
      "სახელი უნდა შეიცავდეს 2–15 ლათინურ ასოს: პირველი დიდი, დანარჩენი პატარა.",
  },
  lastName: {
    regex: /^[A-Z][a-z]{1,19}$/,
    message:
      "გვარი უნდა შეიცავდეს 2–20 ლათინურ ასოს: პირველი დიდი, დანარჩენი პატარა.",
  },
  email: {
    regex: /^[a-z]+(?:\.[a-z]+)*@[a-z]{1,6}\.[a-z]{1,4}$/,
    message:
      "გამოიყენეთ პატარა ლათინური ასოები; @-მდე წერტილი შეიძლება მხოლოდ ასოებს შორის. დომენი: 1–6 ასო, სუფიქსი: 1–4 ასო.",
  },
  password: {
    regex: /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/s,
    message:
      "პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს, ერთ დიდ ლათინურ ასოს და ერთ ციფრს.",
  },
};
const registrationValidation = (() => {
  const form = document.querySelector(".registartion-form");
  form.noValidate = true;
  const controls = [...form.querySelectorAll("input[name], select[name]")];
  const summary = document.createElement("p");
  summary.className = "registration-error";
  summary.setAttribute("role", "alert");
  summary.hidden = true;
  form.querySelector(".reg-form-div").append(summary);
  const errors = new Map();
  for (const control of controls) {
    control.id = `registration-${control.name}`;
    control.parentElement.querySelector("label").htmlFor = control.id;
    const error = document.createElement("p");
    error.id = `${control.id}-error`;
    error.className = "field-error";
    error.setAttribute("aria-live", "polite");
    error.hidden = true;
    control.setAttribute("aria-describedby", error.id);
    control.parentElement.append(error);
    errors.set(control.name, error);
    const validate = () => {
      summary.hidden = true;
      check(control);
    };
    control.addEventListener("input", validate);
    control.addEventListener("change", validate);
  }
  function show(control, message = "") {
    control.setAttribute("aria-invalid", String(Boolean(message)));
    const error = errors.get(control.name);
    error.textContent = message;
    error.hidden = !message;
  }
  function check(control) {
    const rule = registrationRules[control.name];
    const message = rule && !rule.regex.test(control.value) ? rule.message : "";
    show(control, message);
    return !message;
  }
  function validate() {
    summary.hidden = true;
    const valid = controls.map(check).every(Boolean);
    if (!valid)
      controls
        .find((control) => control.getAttribute("aria-invalid") === "true")
        ?.focus();
    return valid;
  }
  const aliases = {
    firstname: "firstName",
    lastname: "lastName",
    age: "age",
    email: "email",
    password: "password",
    address: "address",
    phone: "phone",
    zipcode: "zipcode",
    avatar: "avatar",
    gender: "gender",
  };
  const messages = {
    firstName:
      "სახელი არასწორია. საჭიროა 2–15 ასო: პირველი დიდი, დანარჩენი პატარა.",
    lastName:
      "გვარი არასწორია. საჭიროა 2–20 ასო: პირველი დიდი, დანარჩენი პატარა.",
    age: "მიუთითეთ სწორი ასაკი.",
    email: "ელფოსტა არასწორია ან უკვე გამოყენებულია.",
    password: "პაროლი არ აკმაყოფილებს მოთხოვნებს.",
    address: "მიუთითეთ სწორი მისამართი.",
    phone: "მიუთითეთ სწორი ტელეფონის ნომერი ქვეყნის კოდით.",
    zipcode: "მიუთითეთ სწორი საფოსტო ინდექსი.",
    avatar: "მიუთითეთ ავატარის სურათის სწორი URL.",
    gender: "აირჩიეთ სქესი ჩამონათვალიდან.",
  };
  function serverError(data, submitted) {
    let first;
    const keys = Array.isArray(data?.errorKeys) ? data.errorKeys : [];
    for (const key of keys) {
      const normalized = String(key)
        .replace(/^errors\./, "")
        .toLowerCase();
      const field = Object.keys(aliases).find((alias) =>
        normalized.split("_").includes(alias),
      );
      const control = controls.find((item) => item.name === aliases[field]);
      
      if (!control || (submitted && control.value !== submitted[control.name]))
        continue;
      show(control, messages[control.name]);
      first ||= control;
    }
    summary.textContent = first
      ? "რეგისტრაცია ვერ შესრულდა. შეასწორეთ მონიშნული ველები."
      : "რეგისტრაცია ვერ შესრულდა. შეამოწმეთ მონაცემები და სცადეთ ხელახლა.";
    summary.hidden = false;
    first?.focus();
  }
  return { validate, serverError };
})();
