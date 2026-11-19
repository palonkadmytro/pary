---
title: "Форми, списки, події"
description: "Керований пошук у каталозі, форма оформлення замовлення з одним об'єктом стану, валідацією, повідомленнями про помилки та блокуванням кнопки; обробники подій з параметрами і ключі в списках."
type: practice
pair: 10
topic: 80
---

## Мета роботи

- Створити керований (controlled) компонент пошуку `SearchBar` і поєднати пошук із фільтром і сортуванням.
- Побудувати форму оформлення замовлення `CheckoutForm` з полями різних типів (text, tel, email, select, textarea, checkbox), що зберігає значення в **одному об'єкті стану**.
- Реалізувати валідацію з повідомленнями під полями, показом помилок після втрати фокусу та блокуванням кнопки відправлення.
- Обробити відправлення форми (`onSubmit`, `preventDefault`), показати повідомлення «Замовлення оформлено» й очистити кошик.
- Закріпити роботу зі списками (`key`) та обробниками подій з параметрами.

## Що потрібно

- Проєкт `mini-shop` після практичної 9: `ProductList`, `CategoryFilter`, `SortSelect`, `Modal` з `CartSummary`, похідний стан у `App`, допоміжні функції в `utils/products.js`.
- Лекція 6 «Форми. Керовані компоненти».
- Документація: [react.dev: Reacting to Input with State](https://react.dev/learn/reacting-to-input-with-state), [`<input>`](https://react.dev/reference/react-dom/components/input), [`<select>`](https://react.dev/reference/react-dom/components/select), [MDN: валідація форм](https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation).

## Короткі теоретичні відомості

### Керовані поля

У керованому полі **джерелом істини є стан React**: значення поля задається пропом `value` (або `checked` для checkbox), а зміна відбувається лише через `onChange`:

| Елемент | Що керує значенням | Що читати в `onChange` |
|---|---|---|
| `<input type="text/email/tel/search">` | `value` | `event.target.value` |
| `<textarea>` | `value` (не вміст між тегами!) | `event.target.value` |
| `<select>` | `value` на `<select>` (не `selected` на `<option>`) | `event.target.value` |
| `<input type="checkbox">` | `checked` | `event.target.checked` |
| `<input type="radio">` | `checked={value === 'x'}` | `event.target.value` |

:::caution
Якщо вказати `value` без `onChange`, поле стане «замороженим» (React покаже попередження). Якщо значення спочатку `undefined`, а потім рядок — поле перейде з некерованого стану в керований, і React теж попередить. Завжди задавайте початкове значення: `''`, `false`.
:::

### Один об'єкт стану для форми

Замість шести `useState` для шести полів зручно зберігати один об'єкт і мати **один** обробник. Атрибут `name` поля збігається з ключем в об'єкті:

```jsx
const [values, setValues] = useState({ name: '', agree: false });

function handleChange(event) {
  const { name, value, type, checked } = event.target;
  setValues((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
}

<input name="name" value={values.name} onChange={handleChange} />
<input name="agree" type="checkbox" checked={values.agree} onChange={handleChange} />
```

`[name]: …` — обчислюване ім'я властивості (computed property name). Spread `...prev` копіює решту полів: стан замінюється **новим** об'єктом, а не мутується.

### Валідація: коли показувати помилки

| Стратегія | Плюси | Мінуси |
|---|---|---|
| Лише при відправленні | Не дратує під час введення | Користувач дізнається про всі помилки наприкінці |
| На кожну літеру | Миттєвий зворотний зв'язок | Помилка «Некоректний email» з'являється вже після першої літери |
| **Після втрати фокусу (blur), далі — наживо** | Баланс: поле перевіряється, коли користувач з ним закінчив | Потрібен додатковий стан `touched` |

Ми використаємо третій варіант. Самі помилки — **похідні дані**: їх обчислюємо функцією `validate(values)` під час рендеру, а зберігаємо лише `touched` — які поля користувач уже «відвідав».

### Обробники з параметрами і ключі

```jsx
// ❌ Викличеться одразу під час рендеру, а не по кліку
<button onClick={onRemove(item.id)}>✕</button>

// ✅ Передаємо функцію, яка викличе onRemove з потрібним аргументом
<button onClick={() => onRemove(item.id)}>✕</button>
```

`key` допомагає React зіставити елементи списку між рендерами. Ключ має бути **стабільним** і **унікальним серед сусідів**: `id` з даних — ідеально; індекс масиву — лише якщо список ніколи не змінює порядок і не фільтрується. У нашому каталозі список постійно фільтрується й сортується, тому ключ — тільки `product.id`.

## Хід роботи

### Крок 1. Пошук товарів: функція фільтрації

Додамо до `utils/products.js` функцію, що перевіряє, чи відповідає товар пошуковому запиту. Шукатимемо за назвою і брендом, без урахування регістру й зайвих пробілів.

```js title="src/utils/products.js (додати)"
// Чи містить назва або бренд товару пошуковий рядок
export function matchesQuery(product, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = `${product.title} ${product.brand ?? ''}`.toLowerCase();
  return haystack.includes(normalized);
}

export function filterByQuery(products, query) {
  return products.filter((product) => matchesQuery(product, query));
}
```

`product.brand ?? ''` — у частини товарів DummyJSON (наприклад, у категорії groceries) поля `brand` немає, і без цієї перевірки в рядку з'явилося б слово `undefined`.

### Крок 2. Компонент SearchBar

```jsx title="src/components/SearchBar.jsx"
import './SearchBar.css';

export default function SearchBar({ value, onChange }) {
  return (
    <div className="search-bar">
      <label htmlFor="search" className="field__label">Пошук</label>
      <div className="search-bar__wrap">
        <input
          id="search"
          type="search"
          className="field__control search-bar__input"
          placeholder="Назва або бренд…"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            className="search-bar__clear"
            onClick={() => onChange('')}
            aria-label="Очистити пошук"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
```

```css title="src/components/SearchBar.css"
.search-bar {
  display: flex;
  flex: 1 1 260px;
  flex-direction: column;
  gap: 0.25rem;
}

.search-bar__wrap {
  position: relative;
}

.search-bar__input {
  width: 100%;
  padding-right: 2.25rem;
}

.search-bar__clear {
  position: absolute;
  top: 50%;
  right: 0.5rem;
  transform: translateY(-50%);
  font-size: 1.25rem;
  color: #94a3b8;
  background: none;
  border: none;
  cursor: pointer;
}
```

`SearchBar` — керований компонент без власного стану: значення зберігає батько. Тому кнопка «×» просто викликає `onChange('')`, і поле очищається, бо змінився стан у `App`.

### Крок 3. Поєднуємо пошук, фільтр і сортування

```jsx title="src/App.jsx (фрагменти)" {3,7,11-14,20}
import SearchBar from './components/SearchBar';
import {
  getCategories, filterByCategory, filterByQuery, sortProducts,
} from './utils/products';

// стан
const [query, setQuery] = useState('');

// похідні дані: спочатку фільтруємо, потім сортуємо
const categories = getCategories(products);
const visibleProducts = sortProducts(
  filterByQuery(filterByCategory(products, category), query),
  sort,
);

// у JSX панелі інструментів — першим елементом
<div className="toolbar">
  <SearchBar value={query} onChange={setQuery} />
  <CategoryFilter categories={categories} value={category} onChange={setCategory} />
  <SortSelect value={sort} onChange={setSort} />
  <p className="toolbar__info">Знайдено: {visibleProducts.length}</p>
</div>
```

Перевірте: введіть частину назви товару, оберіть категорію — фільтри комбінуються; очистіть поле кнопкою «×». Якщо нічого не знайдено — `ProductList` покаже порожній стан.

:::tip[Порядок операцій]
Сортуйте **після** фільтрації: сортувати менший масив дешевше. Для 30 товарів різниці не видно, але звичка корисна.
:::

### Крок 4. Компонент FormField — обгортка поля

У формі буде шість полів, і для кожного потрібні підпис, саме поле і повідомлення про помилку. Щоб не повторювати розмітку, створимо компонент-обгортку з `children`:

```jsx title="src/components/FormField.jsx"
export default function FormField({ id, label, error, hint, children }) {
  return (
    <div className={`form-field ${error ? 'form-field--error' : ''}`}>
      {label && (
        <label htmlFor={id} className="field__label">
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="form-field__hint">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="form-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

Саме поле передаємо як `children` — `FormField` не знає, `input` це, `select` чи `textarea`. Зв'язок підпису з полем — через `htmlFor`/`id`, повідомлення про помилку — через `aria-describedby` (додамо на полях).

### Крок 5. Форма оформлення замовлення: стан і валідація

```jsx title="src/components/CheckoutForm.jsx"
import { useState } from 'react';
import FormField from './FormField';
import { formatPrice } from '../utils/format';
import './CheckoutForm.css';

const DELIVERY_OPTIONS = [
  { value: 'nova-poshta', label: 'Нова пошта' },
  { value: 'ukrposhta', label: 'Укрпошта' },
  { value: 'courier', label: "Кур'єр" },
  { value: 'pickup', label: 'Самовивіз з магазину' },
];

const INITIAL_VALUES = {
  name: '',
  phone: '',
  email: '',
  delivery: 'nova-poshta',
  city: '',
  comment: '',
  agree: false,
};

const COMMENT_MAX = 300;

// Чиста функція: значення форми → об'єкт помилок { поле: текст }
export function validate(values) {
  const errors = {};

  if (values.name.trim().length < 2) {
    errors.name = "Вкажіть ім'я (щонайменше 2 символи)";
  }

  // Прибираємо пробіли, дужки, дефіси і перевіряємо формат +380XXXXXXXXX
  const phone = values.phone.replace(/[\s()-]/g, '');
  if (!/^\+380\d{9}$/.test(phone)) {
    errors.phone = 'Телефон у форматі +380XXXXXXXXX';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Вкажіть коректний email';
  }

  if (values.delivery !== 'pickup' && values.city.trim() === '') {
    errors.city = 'Вкажіть місто доставки';
  }

  if (values.comment.length > COMMENT_MAX) {
    errors.comment = `Не більше ${COMMENT_MAX} символів`;
  }

  if (!values.agree) {
    errors.agree = 'Потрібна згода на обробку даних';
  }

  return errors;
}
```

Функція `validate` винесена за межі компонента й експортована: вона не залежить від React, її легко протестувати окремо (`validate({...})` у консолі чи в тесті).

Чому регулярний вираз для email такий простий? Повна перевірка email за стандартом надзвичайно складна; на клієнті достатньо відсіяти очевидні помилки («ivan», «ivan@»). Справжня перевірка — лист із підтвердженням.

### Крок 6. Форма оформлення замовлення: розмітка й обробники

Продовжуємо той самий файл:

```jsx title="src/components/CheckoutForm.jsx (продовження)"
export default function CheckoutForm({ total, onSubmit }) {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [touched, setTouched] = useState({});

  // Похідні дані — не стан!
  const errors = validate(values);
  const isValid = Object.keys(errors).length === 0;

  // Один обробник для всіх полів
  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setValues((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  // Поле «відвідане» — відтепер показуємо для нього помилки
  function handleBlur(event) {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  }

  function handleSubmit(event) {
    event.preventDefault(); // інакше браузер перезавантажить сторінку

    if (!isValid) {
      // Позначаємо всі поля як відвідані, щоб показати всі помилки
      setTouched(Object.fromEntries(Object.keys(INITIAL_VALUES).map((key) => [key, true])));
      return;
    }

    onSubmit({
      ...values,
      name: values.name.trim(),
      email: values.email.trim(),
      city: values.delivery === 'pickup' ? '' : values.city.trim(),
    });
    setValues(INITIAL_VALUES);
    setTouched({});
  }

  // Помилку поля показуємо лише після того, як користувач з ним попрацював
  const errorFor = (name) => (touched[name] ? errors[name] : undefined);

  // Спільні атрибути доступності для поля
  const a11y = (name) => ({
    'aria-invalid': Boolean(errorFor(name)),
    'aria-describedby': errorFor(name) ? `checkout-${name}-error` : undefined,
  });

  return (
    <form className="checkout-form" onSubmit={handleSubmit} noValidate>
      <h3 className="checkout-form__title">Оформлення замовлення</h3>

      <FormField id="checkout-name" label="Ім'я та прізвище *" error={errorFor('name')}>
        <input
          id="checkout-name"
          name="name"
          className="field__control"
          value={values.name}
          onChange={handleChange}
          onBlur={handleBlur}
          autoComplete="name"
          {...a11y('name')}
        />
      </FormField>

      <div className="checkout-form__row">
        <FormField id="checkout-phone" label="Телефон *" error={errorFor('phone')}>
          <input
            id="checkout-phone"
            name="phone"
            type="tel"
            className="field__control"
            placeholder="+380 67 123 45 67"
            value={values.phone}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="tel"
            {...a11y('phone')}
          />
        </FormField>

        <FormField id="checkout-email" label="Email *" error={errorFor('email')}>
          <input
            id="checkout-email"
            name="email"
            type="email"
            className="field__control"
            value={values.email}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="email"
            {...a11y('email')}
          />
        </FormField>
      </div>

      <div className="checkout-form__row">
        <FormField id="checkout-delivery" label="Спосіб доставки">
          <select
            id="checkout-delivery"
            name="delivery"
            className="field__control"
            value={values.delivery}
            onChange={handleChange}
          >
            {DELIVERY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Поле міста потрібне лише для доставки */}
        {values.delivery !== 'pickup' && (
          <FormField id="checkout-city" label="Місто *" error={errorFor('city')}>
            <input
              id="checkout-city"
              name="city"
              className="field__control"
              value={values.city}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="address-level2"
              {...a11y('city')}
            />
          </FormField>
        )}
      </div>

      <FormField
        id="checkout-comment"
        label="Коментар до замовлення"
        error={errorFor('comment')}
        hint={`${values.comment.length}/${COMMENT_MAX}`}
      >
        <textarea
          id="checkout-comment"
          name="comment"
          rows={3}
          className="field__control"
          value={values.comment}
          onChange={handleChange}
          onBlur={handleBlur}
          {...a11y('comment')}
        />
      </FormField>

      <FormField id="checkout-agree" error={errorFor('agree')}>
        <label className="checkout-form__checkbox">
          <input
            id="checkout-agree"
            name="agree"
            type="checkbox"
            checked={values.agree}
            onChange={handleChange}
            onBlur={handleBlur}
            {...a11y('agree')}
          />
          Погоджуюся на обробку персональних даних
        </label>
      </FormField>

      <div className="checkout-form__footer">
        <span>
          До сплати: <strong>{formatPrice(total)}</strong>
        </span>
        <button type="submit" className="btn btn--primary" disabled={!isValid}>
          Підтвердити замовлення
        </button>
      </div>
    </form>
  );
}
```

```css title="src/components/CheckoutForm.css"
.checkout-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid #e2e8f0;
}

.checkout-form__title {
  margin: 0;
}

.checkout-form__row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.9rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-field--error .field__control {
  border-color: #dc2626;
}

.form-field__error {
  margin: 0;
  font-size: 0.8rem;
  color: #dc2626;
}

.form-field__hint {
  margin: 0;
  font-size: 0.8rem;
  color: #94a3b8;
  text-align: right;
}

.checkout-form__checkbox {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  cursor: pointer;
}

.checkout-form__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

Розберемо ключові моменти:

| Що | Навіщо |
|---|---|
| `noValidate` на `<form>` | Вимикає вбудовані підказки браузера, щоб показувати власні повідомлення в єдиному стилі |
| `errors` обчислюється, `touched` — стан | Помилки завжди відповідають поточним значенням; зберігаємо лише те, що не можна обчислити |
| `disabled={!isValid}` | Кнопка неактивна, доки форма містить помилки |
| Перевірка `isValid` у `handleSubmit` | Захист на випадок, якщо форму відправлено клавішею Enter або кнопку розблоковано через DevTools |
| `{values.delivery !== 'pickup' && …}` | Умовне поле; `validate` теж враховує спосіб доставки |
| `autoComplete="name"`, `"tel"`, `"email"` | Браузер пропонує автозаповнення |
| `aria-invalid`, `aria-describedby`, `role="alert"` | Екранний читач повідомляє про помилку і пов'язує її з полем |

:::caution[Заблокована кнопка і доступність]
Неактивна кнопка не пояснює, **чому** її не можна натиснути, а деякі екранні читачі її пропускають. Тому в нашій формі помилки показуються під полями одразу після втрати фокусу. Інший поширений підхід — кнопку не блокувати, а при натисканні показувати всі помилки (гілка `if (!isValid)` у `handleSubmit` вже це вміє). Спробуйте обидва варіанти і порівняйте.
:::

### Крок 7. Підключаємо форму в кошик

Форма показується у модальному вікні під кошиком, якщо в кошику є товари. Після відправлення `App` очищає кошик і запам'ятовує інформацію про замовлення, щоб показати повідомлення.

```jsx title="src/App.jsx (фрагменти)"
import CheckoutForm from './components/CheckoutForm';
import { formatPrice } from './utils/format';

// стан
const [order, setOrder] = useState(null); // null — замовлення ще не оформлене

// похідні дані
const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

// обробники
function handleOrderSubmit(values) {
  // У реальному застосунку тут був би POST-запит на сервер
  console.log('Нове замовлення:', { ...values, items: cart, total: cartTotal });
  setOrder({ id: Date.now(), name: values.name, total: cartTotal });
  setCart([]);
}

function handleCloseCart() {
  setIsCartOpen(false);
  setOrder(null); // наступного разу вікно відкриється з кошиком
}
```

```jsx title="src/App.jsx (JSX модального вікна)"
<Modal
  isOpen={isCartOpen}
  title={order ? 'Замовлення оформлено' : 'Ваш кошик'}
  onClose={handleCloseCart}
>
  {order ? (
    <div className="order-success">
      <p className="order-success__icon">✅</p>
      <p>
        Дякуємо, <strong>{order.name}</strong>! Замовлення №{order.id} на суму{' '}
        <strong>{formatPrice(order.total)}</strong> прийнято.
      </p>
      <p>Менеджер зв'яжеться з вами найближчим часом.</p>
      <button type="button" className="btn btn--primary" onClick={handleCloseCart}>
        Продовжити покупки
      </button>
    </div>
  ) : (
    <>
      <CartSummary
        items={cart}
        onIncrement={handleIncrement}
        onDecrement={handleDecrement}
        onRemove={handleRemove}
      />
      {cart.length > 0 && <CheckoutForm total={cartTotal} onSubmit={handleOrderSubmit} />}
    </>
  )}
</Modal>
```

```css title="src/App.css (додати)"
.order-success {
  text-align: center;
}

.order-success__icon {
  margin: 0;
  font-size: 3rem;
}
```

Зверніть увагу на кілька речей:

- `Date.now()` викликається **в обробнику події**, а не під час рендеру — рендер має бути чистим (одні й ті самі пропси й стан → той самий результат).
- `order` — це стан, бо його неможливо обчислити: після очищення кошика сума замовлення вже ніде не зберігається.
- Ми **не** зберігаємо в стані `isOrderPlaced: true` окремо від `order` — достатньо перевірки `order !== null`.

### Крок 8. Перевірка форми

Пройдіть сценарій:

1. Додайте 2–3 товари, відкрийте кошик. Під списком — форма, кнопка «Підтвердити замовлення» неактивна.
2. Клацніть у поле «Ім'я» і перейдіть до наступного — з'явилася помилка під полем «Ім'я», решта полів без помилок.
3. Введіть телефон `067 123 45 67` — помилка (немає `+380`). Виправте на `+380 67 123 45 67` — помилка зникла **одразу**, без втрати фокусу, бо поле вже «відвідане».
4. Оберіть «Самовивіз» — поле «Місто» зникло, і помилка для нього теж.
5. Введіть коментар довший за 300 символів — лічильник замінився помилкою.
6. Заповніть усе правильно, поставте згоду — кнопка активна. Відправте: у консолі — об'єкт замовлення, у вікні — повідомлення з іменем, номером і сумою, бейдж кошика зник.
7. «Продовжити покупки» — вікно закрилося; відкрийте кошик знову — «Кошик порожній».

### Крок 9. Обробники з параметрами: перевірка розуміння

Подивіться на `CartSummary` — у ньому вже використовуються обробники з параметрами: `onClick={() => onIncrement(item.id)}`. Проведіть експеримент:

1. Тимчасово замініть у `CartSummary` рядок кнопки «✕» на `onClick={onRemove(item.id)}` (без стрілкової функції).
2. Додайте товар у кошик і відкрийте вікно. Що сталося? (Товар зникає одразу при рендері, а в консолі — попередження про оновлення стану під час рендеру іншого компонента.)
3. Поверніть правильний варіант.

Другий експеримент — з ключами. Тимчасово замініть у `ProductList` `key={product.id}` на `key={index}` (додайте `index` другим параметром у `map`). Позначте ♥ на першій картці і змініть сортування. ♥ «перестрибне» на інший товар, що опинився першим: React зіставив картки за позицією, і локальний стан першої картки дістався іншому товару. Поверніть `key={product.id}`.

```bash
git add .
git commit -m "P10: search, checkout form with validation"
```

**Результат роботи:** каталог із пошуком за назвою і брендом, що поєднується з категорією і сортуванням; кошик з формою оформлення замовлення, валідацією, повідомленням про успіх та очищенням кошика.

## Завдання для самостійного виконання

1. ★ Додайте до форми поле «Спосіб оплати» з radio-кнопками («Карткою онлайн», «Готівкою при отриманні»). Значення — у тому самому об'єкті `values`.
2. ★ Підсвічуйте у картці товару збіг із пошуковим запитом (наприклад, обгорніть знайдений фрагмент назви у `<mark>`).
3. ★★ Створіть компонент `ReviewForm` для залишення відгуку про товар: оцінка 1–5 (radio або кнопки-зірки), ім'я, текст (мінімум 10 символів), валідація та список відгуків під формою (стан — масив об'єктів `{ id, author, rating, text, date }`, ключ — `id`). Покажіть форму в `Modal`, що відкривається кнопкою «Відгук» у картці товару. На практичній 12 цю форму буде перенесено на сторінку товару.
4. ★★ Додайте кнопку «Очистити кошик» з підтвердженням через `window.confirm()`.
5. ★★★ Реалізуйте маску телефону: під час введення автоматично форматуйте значення у вигляд `+380 (67) 123-45-67`. Подумайте, як при цьому має працювати валідація.

## Контрольні питання

1. Що таке керований компонент? Чим `value` відрізняється від `defaultValue`?
2. Які атрибути керують значенням `<select>`, `<textarea>` і checkbox у React?
3. Як працює спільний обробник `handleChange` для кількох полів? Яку роль відіграє атрибут `name`?
4. Чому `errors` у `CheckoutForm` не зберігаються в стані, а `touched` — зберігаються?
5. Навіщо `event.preventDefault()` в обробнику `onSubmit`? Що станеться без нього?
6. Навіщо перевіряти `isValid` у `handleSubmit`, якщо кнопка й так заблокована?
7. Чим відрізняються `onClick={onRemove(id)}` і `onClick={() => onRemove(id)}`?
8. Чому для списку товарів не можна використовувати індекс масиву як `key`? Що ви спостерігали в експерименті?
9. Для чого атрибути `aria-invalid` і `aria-describedby`?

## Домашнє завдання

1. Завершіть завдання ★1 (спосіб оплати) і додайте спосіб оплати до повідомлення про успішне замовлення.
2. Складіть таблицю з 5 наборів значень форми (коректний, без імені, з телефоном без `+380`, самовивіз без міста, без згоди) і очікуваного результату `validate` для кожного. Перевірте прогнози, тимчасово додавши в `CheckoutForm.jsx` виклики `console.log(validate({ ... }))`.
3. Прочитайте розділ [Fetching data](https://react.dev/learn/synchronizing-with-effects#fetching-data) на react.dev — на наступній парі замінимо статичні дані на API.

## Що здати

- Посилання на репозиторій з комітом `P10: ...`.
- Скриншоти: результати пошуку; форма з помилками під полями; повідомлення «Замовлення оформлено».
- Скриншот консолі з об'єктом замовлення.
- Відповіді на контрольні питання.
