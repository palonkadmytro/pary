---
title: "Робота з API: fetch, стан завантаження і помилок"
description: "Переводимо «Міні-магазин» зі статичних даних на DummyJSON: завантаження в useEffect, стани loading/error/data, компоненти Loader і ErrorMessage з повторною спробою, скасування запитів через AbortController, пошук на сервері з debounce і категорії з API."
type: practice
pair: 11
topic: 81
---

## Мета роботи

- Замінити статичний масив товарів на дані з REST API [DummyJSON](https://dummyjson.com/docs/products).
- Реалізувати завантаження даних в `useEffect` з трьома станами: завантаження (loading), помилка (error), дані (data).
- Створити компоненти `Loader` і `ErrorMessage` з кнопкою «Спробувати ще».
- Правильно обробляти HTTP-помилки (`!res.ok`), відсутність мережі та скасовувати застарілі запити через `AbortController`.
- Перенести пошук на сервер (`/products/search?q=`) із затримкою запиту (debounce) і завантажувати список категорій з API.

## Що потрібно

- Проєкт `mini-shop` після практичної 10: пошук, фільтр, сортування, `Modal` з кошиком і `CheckoutForm`.
- Лекція 7 «useEffect і побічні ефекти» (залежності, очищення, подвійний виклик у StrictMode, AbortController).
- Браузер з DevTools (вкладка **Network**).
- Документація: [DummyJSON — Products](https://dummyjson.com/docs/products), [MDN: Using the Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch), [MDN: AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).

## Короткі теоретичні відомості

### API DummyJSON

| Запит | Що повертає |
|---|---|
| `GET https://dummyjson.com/products?limit=30` | `{ products: [...], total, skip, limit }` |
| `GET https://dummyjson.com/products/1` | Один товар (об'єкт) |
| `GET https://dummyjson.com/products/search?q=phone` | `{ products: [...], total, skip, limit }` |
| `GET https://dummyjson.com/products/categories` | Масив `[{ slug, name, url }, ...]` |
| `GET https://dummyjson.com/products/category/smartphones` | `{ products: [...], total, skip, limit }` |

Поля товару збігаються з тими, що ми використовували в `data/products.js`: `id`, `title`, `description`, `price`, `discountPercentage`, `rating`, `stock`, `brand`, `category`, `thumbnail`, `images`. Саме тому статичні дані з практичної 3 ми створювали «у форматі DummyJSON» — тепер компоненти не доведеться переписувати.

Відкрийте в браузері `https://dummyjson.com/products?limit=3` і `https://dummyjson.com/products/categories`, щоб побачити реальні відповіді.

### Три стани асинхронних даних

Будь-які дані з мережі в кожен момент перебувають в одному зі станів:

```text
           ┌──────────── успіх ──────────► data (показуємо список)
loading ───┤
           └──────────── помилка ────────► error (повідомлення + «Спробувати ще»)
                                              │
                                              └── retry ──► loading
```

Інтерфейс повинен мати вигляд для **кожного** з них. Найпоширеніша помилка початківців — показувати лише «щасливий» сценарій: поки дані вантажаться, користувач бачить «Товарів не знайдено», а при помилці — порожню сторінку.

### fetch не вважає 404 помилкою

`fetch` відхиляє проміс (reject) лише тоді, коли запит **узагалі не вдалося виконати**: немає мережі, CORS, скасування. Відповіді `404` чи `500` — це «успішно отримана відповідь», тому статус треба перевіряти вручну:

```js
const res = await fetch(url);
if (!res.ok) {               // ok === true для статусів 200–299
  throw new Error(`Помилка сервера: ${res.status}`);
}
const data = await res.json();
```

### Гонка запитів і AbortController

Користувач швидко перемикає категорії: «смартфони» → «ноутбуки». Запити йдуть паралельно, і відповіді можуть прийти **в іншому порядку**. Якщо відповідь про смартфони прийде останньою, на екрані будуть смартфони при обраній категорії «ноутбуки». Це **гонка запитів** (race condition).

Розв'язок — у функції очищення ефекту скасовувати попередній запит:

```js
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal }) /* ... */;
  return () => controller.abort(); // спрацює перед наступним запуском ефекту і при розмонтуванні
}, [url]);
```

Скасований `fetch` відхиляє проміс з помилкою `name === 'AbortError'` — її треба **ігнорувати**, це не помилка для користувача.

### Debounce

Якщо надсилати запит на кожну літеру, слово «laptop» дасть шість запитів. **Debounce** («брязкіт», затримка) — техніка, коли дія виконується лише після того, як користувач **перестав** вводити на певний час (300–500 мс). У React це реалізується ефектом з таймером:

```js
useEffect(() => {
  const timerId = setTimeout(() => setDebouncedQuery(query), 400);
  return () => clearTimeout(timerId); // нова літера — старий таймер скасовано
}, [query]);
```

## Хід роботи

### Крок 1. Модуль для роботи з API

Створимо модуль з базовою адресою, функцією-обгорткою над `fetch` та побудовою адрес. Компоненти не повинні знати подробиць формування URL.

```js title="src/utils/api.js"
export const API_URL = 'https://dummyjson.com';
export const PRODUCTS_LIMIT = 30;

// Обгортка над fetch: перевіряє статус і повертає розібраний JSON
export async function fetchJson(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    // Скасування запиту прокидаємо далі без змін — його обробить компонент
    if (err.name === 'AbortError') throw err;
    // Інші помилки fetch — це проблеми з мережею
    throw new Error("Не вдалося з'єднатися з сервером. Перевірте підключення до інтернету.");
  }

  if (!res.ok) {
    const error = new Error(`Сервер повернув помилку ${res.status}`);
    error.status = res.status; // знадобиться для обробки 404 на сторінці товару
    throw error;
  }

  return res.json();
}

// Адреса списку товарів залежно від пошуку і категорії
export function buildProductsUrl({ query = '', category = '' } = {}) {
  if (query) {
    return `${API_URL}/products/search?q=${encodeURIComponent(query)}&limit=${PRODUCTS_LIMIT}`;
  }
  if (category) {
    return `${API_URL}/products/category/${encodeURIComponent(category)}?limit=${PRODUCTS_LIMIT}`;
  }
  return `${API_URL}/products?limit=${PRODUCTS_LIMIT}`;
}
```

:::tip[encodeURIComponent]
Користувач може ввести в пошук пробіли, `&`, `#`, кирилицю. Без `encodeURIComponent` запит `q=hand & body` зламає рядок запиту: `&` буде сприйнято як початок нового параметра.
:::

### Крок 2. Компоненти Loader і ErrorMessage

```jsx title="src/components/Loader.jsx"
import './Loader.css';

export default function Loader({ text = 'Завантаження…' }) {
  return (
    // role="status" — екранний читач оголосить вміст, не перериваючи користувача
    <div className="loader" role="status">
      <span className="loader__spinner" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
```

```css title="src/components/Loader.css"
.loader {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
  padding: 3rem 1rem;
  color: #64748b;
}

.loader__spinner {
  width: 2.5rem;
  height: 2.5rem;
  border: 4px solid #e2e8f0;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: loader-spin 0.8s linear infinite;
}

@keyframes loader-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Повага до налаштувань користувача: менше анімацій */
@media (prefers-reduced-motion: reduce) {
  .loader__spinner {
    animation-duration: 2.5s;
  }
}
```

```jsx title="src/components/ErrorMessage.jsx"
import './ErrorMessage.css';

export default function ErrorMessage({ message, onRetry }) {
  return (
    // role="alert" — повідомлення буде озвучене одразу
    <div className="error-message" role="alert">
      <p className="error-message__title">😕 Щось пішло не так</p>
      <p className="error-message__text">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          Спробувати ще
        </button>
      )}
    </div>
  );
}
```

```css title="src/components/ErrorMessage.css"
.error-message {
  padding: 2rem 1rem;
  text-align: center;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
}

.error-message__title {
  margin: 0 0 0.5rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: #b91c1c;
}

.error-message__text {
  margin: 0 0 1rem;
  color: #7f1d1d;
}
```

Кнопка «Спробувати ще» показується лише тоді, коли батько передав `onRetry` — компонент можна використати і для помилок, які повторювати немає сенсу.

### Крок 3. Перше завантаження товарів

Почнемо з найпростішого варіанта — завантажимо 30 товарів без пошуку і категорій. У `App.jsx`:

1. Видаліть імпорт `import { products } from './data/products';`.
2. Додайте стани і ефект:

```jsx title="src/App.jsx (фрагменти)"
import { useEffect, useState } from 'react';
import Loader from './components/Loader';
import ErrorMessage from './components/ErrorMessage';
import { fetchJson, buildProductsUrl } from './utils/api';

// ...усередині App
const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const controller = new AbortController();

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson(buildProductsUrl(), { signal: controller.signal });
      setProducts(data.products);
    } catch (err) {
      if (err.name === 'AbortError') return; // запит скасовано — нічого не робимо
      setError(err);
    } finally {
      // Скасований запит не повинен вимикати індикатор нового
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  loadProducts();
  return () => controller.abort();
}, []);
```

Чому функція `loadProducts` оголошена **всередині** ефекту, а не сам ефект зроблено `async`? Функція, передана в `useEffect`, повинна повертати або нічого, або функцію очищення. `async`-функція завжди повертає проміс — React не зможе викликати очищення.

3. Відобразіть три стани. Замініть у JSX рядок з `<ProductList ... />` на змінну `content`:

```jsx title="src/App.jsx (перед return)"
let content;
if (error) {
  content = <ErrorMessage message={error.message} />;
} else if (loading) {
  content = <Loader text="Завантажуємо товари…" />;
} else {
  content = <ProductList products={visibleProducts} onAddToCart={handleAddToCart} />;
}
```

```jsx title="src/App.jsx (у JSX)"
{content}
```

Обчислення `categories` і `visibleProducts` залишаються як були — вони тепер працюють з `products` зі стану. Перевірте: на мить з'являється індикатор, потім — 30 товарів з API з реальними зображеннями.

:::note[Два запити в Network]
Відкрийте DevTools → **Network**, фільтр **Fetch/XHR**, оновіть сторінку. Ви побачите **два** запити `products?limit=30`, перший — зі статусом *(canceled)*. Це `StrictMode` у режимі розробки: React монтує компонент, розмонтовує (викликаючи очищення — `abort()`) і монтує знову, щоб перевірити, що ефект коректно прибирає за собою. У production-збірці запит буде один. Якби очищення не було, обидва запити завершилися б і двічі викликали `setProducts`.
:::

### Крок 4. Повторна спроба

Щоб перезапустити ефект за кнопкою, додамо «лічильник спроб» і включимо його в залежності:

```jsx title="src/App.jsx (фрагменти)" {1,4,9}
const [reloadKey, setReloadKey] = useState(0);

useEffect(() => {
  // ...той самий код
}, [reloadKey]);

// у content:
if (error) {
  content = <ErrorMessage message={error.message} onRetry={() => setReloadKey((k) => k + 1)} />;
}
```

`reloadKey` не несе жодного змісту, крім «треба завантажити ще раз»: зміна значення → ефект виконується знову.

Перевірте помилки:

1. **HTTP-помилка.** Тимчасово змініть у `buildProductsUrl` шлях на `/productz` — побачите «Сервер повернув помилку 404». Поверніть як було.
2. **Немає мережі.** DevTools → Network → випадний список *No throttling* → **Offline**. Натисніть «Спробувати ще» — повідомлення про відсутність з'єднання. Поверніть *No throttling* і натисніть «Спробувати ще» ще раз — товари завантажилися.

### Крок 5. Категорії з API

Список категорій тепер приходить окремим запитом. Він потрібен один раз, при монтуванні:

```jsx title="src/App.jsx (фрагменти)"
import { API_URL, fetchJson, buildProductsUrl } from './utils/api';

const [categories, setCategories] = useState([]);

useEffect(() => {
  const controller = new AbortController();

  fetchJson(`${API_URL}/products/categories`, { signal: controller.signal })
    .then((data) => setCategories(data))
    .catch((err) => {
      if (err.name !== 'AbortError') {
        // Без категорій каталог працює — не блокуємо інтерфейс помилкою
        console.error('Не вдалося завантажити категорії:', err);
      }
    });

  return () => controller.abort();
}, []);
```

Видаліть рядок `const categories = getCategories(products);` та імпорт `getCategories` — тепер `categories` є станом (дані ззовні, які неможливо обчислити). API повертає `{ slug, name, url }` — саме такий формат ми закладали в `CategoryFilter` на практичній 9, тож компонент не змінюється. Тепер у випадному списку понад 20 категорій з людськими назвами («Smartphones», «Home Decoration»).

### Крок 6. Категорія і пошук через сервер

Тепер нехай сервер сам фільтрує товари. Додамо стан `debouncedQuery` і зробимо ефект залежним від пошуку й категорії:

```jsx title="src/App.jsx (фрагменти)"
const [query, setQuery] = useState('');               // текст у полі (оновлюється на кожну літеру)
const [debouncedQuery, setDebouncedQuery] = useState(''); // «заспокоєний» запит для API

// Debounce: оновлюємо debouncedQuery через 400 мс після останньої літери
useEffect(() => {
  const timerId = setTimeout(() => setDebouncedQuery(query.trim()), 400);
  return () => clearTimeout(timerId);
}, [query]);

// Завантаження товарів залежить від запиту, категорії і спроби
useEffect(() => {
  const controller = new AbortController();

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      const url = buildProductsUrl({ query: debouncedQuery, category });
      const data = await fetchJson(url, { signal: controller.signal });
      setProducts(data.products);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  loadProducts();
  return () => controller.abort();
}, [debouncedQuery, category, reloadKey]);
```

Як тепер працюють фільтри:

| Ситуація | Запит до API | Що робимо на клієнті |
|---|---|---|
| Нічого не обрано | `/products?limit=30` | Лише сортування |
| Обрано категорію | `/products/category/{slug}` | Лише сортування |
| Введено пошук | `/products/search?q=…` | Якщо обрано ще й категорію — фільтруємо результати пошуку за нею |

DummyJSON не вміє шукати в межах категорії, тому комбінацію «пошук + категорія» доробляємо на клієнті. Оновіть обчислення списку:

```jsx title="src/App.jsx (похідні дані)"
// filterByCategory — без змін з П9: якщо дані вже з категорії, фільтр нічого не прибере
const visibleProducts = sortProducts(filterByCategory(products, category), sort);
```

Функцію `filterByQuery` і її імпорт видаліть — пошук тепер виконує сервер. Сортування залишається на клієнті.

### Крок 7. Перевірка debounce і скасування запитів

1. Network → Fetch/XHR, очистіть список (🚫).
2. Швидко введіть у пошук `laptop`. Має з'явитися **один** запит `search?q=laptop` (а не шість), бо таймер скидається з кожною літерою.
3. Увімкніть throttling **Slow 4G**. Введіть `phone`, зачекайте пів секунди і допишіть `s`. Перший запит `q=phone` буде *(canceled)* — ефект перезапустився, очищення викликало `abort()`.
4. Швидко перемикайте категорії — усі запити, крім останнього, скасовуються. На екрані завжди товари обраної категорії.
5. Поверніть *No throttling*.

:::caution[Скасування і сервер]
`abort()` скасовує запит **у браузері**: проміс відхиляється, відповідь ігнорується. Сервер, можливо, вже отримав запит і обробив його. Для GET-запитів це не проблема, але для POST (наприклад, створення замовлення) скасування не означає, що замовлення не створено.
:::

### Крок 8. Фінальний App.jsx

```jsx title="src/App.jsx"
import { useEffect, useState } from 'react';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import CategoryFilter from './components/CategoryFilter';
import SortSelect from './components/SortSelect';
import ProductList from './components/ProductList';
import Loader from './components/Loader';
import ErrorMessage from './components/ErrorMessage';
import Modal from './components/Modal';
import CartSummary from './components/CartSummary';
import CheckoutForm from './components/CheckoutForm';
import { API_URL, fetchJson, buildProductsUrl } from './utils/api';
import { filterByCategory, sortProducts } from './utils/products';
import { formatPrice } from './utils/format';
import './App.css';

export default function App() {
  // --- Дані з сервера ---
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // --- Фільтри ---
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('default');

  // --- Кошик і замовлення ---
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [order, setOrder] = useState(null);

  // Debounce пошуку
  useEffect(() => {
    const timerId = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(timerId);
  }, [query]);

  // Товари
  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setLoading(true);
      setError(null);
      try {
        const url = buildProductsUrl({ query: debouncedQuery, category });
        const data = await fetchJson(url, { signal: controller.signal });
        setProducts(data.products);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadProducts();
    return () => controller.abort();
  }, [debouncedQuery, category, reloadKey]);

  // Категорії (один раз)
  useEffect(() => {
    const controller = new AbortController();
    fetchJson(`${API_URL}/products/categories`, { signal: controller.signal })
      .then((data) => setCategories(data))
      .catch((err) => {
        if (err.name !== 'AbortError') console.error('Не вдалося завантажити категорії:', err);
      });
    return () => controller.abort();
  }, []);

  // --- Обробники кошика ---
  function handleAddToCart(product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      const { id, title, price, thumbnail } = product;
      return [...prev, { id, title, price, thumbnail, qty: 1 }];
    });
  }

  function handleIncrement(id) {
    setCart((prev) => prev.map((item) => (item.id === id ? { ...item, qty: item.qty + 1 } : item)));
  }

  function handleDecrement(id) {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, qty: item.qty - 1 } : item))
        .filter((item) => item.qty > 0),
    );
  }

  function handleRemove(id) {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }

  function handleOrderSubmit(values) {
    console.log('Нове замовлення:', { ...values, items: cart, total: cartTotal });
    setOrder({ id: Date.now(), name: values.name, total: cartTotal });
    setCart([]);
  }

  function handleCloseCart() {
    setIsCartOpen(false);
    setOrder(null);
  }

  // --- Похідні дані ---
  const visibleProducts = sortProducts(filterByCategory(products, category), sort);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  let content;
  if (error) {
    content = <ErrorMessage message={error.message} onRetry={() => setReloadKey((k) => k + 1)} />;
  } else if (loading) {
    content = <Loader text="Завантажуємо товари…" />;
  } else {
    content = <ProductList products={visibleProducts} onAddToCart={handleAddToCart} />;
  }

  return (
    <>
      <Header cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />

      <main className="container">
        <div className="toolbar">
          <SearchBar value={query} onChange={setQuery} />
          <CategoryFilter categories={categories} value={category} onChange={setCategory} />
          <SortSelect value={sort} onChange={setSort} />
          {!loading && !error && <p className="toolbar__info">Знайдено: {visibleProducts.length}</p>}
        </div>

        {content}
      </main>

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
    </>
  );
}
```

Файл `src/data/products.js` більше не імпортується — його можна видалити (або залишити як приклад даних для тестів). Функцію `getCategories` в `utils/products.js` можна залишити — вона не заважає.

:::note[App став завеликим]
Майже 200 рядків і 11 станів в одному компоненті — сигнал, що час розділяти. На наступній парі каталог переїде на окрему сторінку `HomePage`, а на практичній 13 логіку завантаження ми винесемо у власний хук `useFetch`, а кошик — у контекст.
:::

### Крок 9. Коміт

```bash
git add .
git commit -m "P11: load products and categories from DummyJSON"
```

**Результат роботи:** каталог завантажує товари й категорії з DummyJSON; під час завантаження показується індикатор, при помилці — повідомлення з кнопкою «Спробувати ще»; пошук виконується на сервері з затримкою 400 мс, застарілі запити скасовуються.

## Завдання для самостійного виконання

1. ★ Покажіть у `Loader` різний текст залежно від ситуації: «Шукаємо „…“» під час пошуку і «Завантажуємо товари…» в інших випадках.
2. ★ Додайте до `ProductCard` позначку «Закінчується», якщо `stock < 10`, і бейдж знижки `-N%` з `discountPercentage` (округлення через `Math.round`).
3. ★★ Замініть індикатор завантаження на «скелетони» (skeleton): компонент `ProductCardSkeleton` — сірі блоки на місці зображення, назви й ціни з анімацією мерехтіння; показуйте 8 штук у тій самій сітці.
4. ★★ Поки користувач вводить запит і debounce ще не спрацював, показуйте біля поля пошуку маленький індикатор «…». Підказка: це похідне значення `query.trim() !== debouncedQuery`.
5. ★★★ Реалізуйте сортування на сервері: DummyJSON підтримує параметри `sortBy` і `order` (`/products?sortBy=price&order=asc`). Додайте їх у `buildProductsUrl` і в залежності ефекту. Які переваги й недоліки серверного сортування порівняно з клієнтським?

## Контрольні питання

1. Які три стани мають асинхронні дані? Що бачить користувач у кожному з них у вашому застосунку?
2. Чому `fetch` не відхиляє проміс при відповіді 404? Як правильно обробити такі відповіді?
3. Чому не можна передати в `useEffect` `async`-функцію напряму?
4. Що таке гонка запитів? Як `AbortController` її усуває?
5. Чому `AbortError` не потрібно показувати користувачеві? Чому в `finally` перевіряється `controller.signal.aborted`?
6. Чому в режимі розробки в Network з'являється два запити, і один із них скасований?
7. Як працює debounce через `setTimeout` і функцію очищення ефекту?
8. Навіщо стан `reloadKey`, якщо його значення ніде не відображається?
9. Чому `categories` на цій парі стали станом, хоча на практичній 9 ми їх обчислювали?
10. Навіщо `encodeURIComponent` при формуванні URL пошуку?

## Домашнє завдання

1. Виконайте завдання ★2 (позначки «Закінчується» і знижка).
2. Перевірте застосунок у трьох ситуаціях — повільна мережа (Slow 4G), відсутність мережі, запит без результатів (наприклад, `qwerty`) — і зробіть скриншоти кожного стану.
3. Повторіть лекцію 8 про React Router: на наступній парі ми розділимо застосунок на сторінки.

## Що здати

- Посилання на репозиторій з комітом `P11: ...`.
- Скриншоти: індикатор завантаження; повідомлення про помилку з кнопкою; результати пошуку; вкладка Network з одним запитом після швидкого введення та скасованими запитами.
- Відповіді на контрольні питання.
