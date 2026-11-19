---
title: "Контекст і кастомні хуки на практиці"
description: "Позбавляємося prop drilling у «Міні-магазині»: CartContext з редюсером, хуком useCart і похідними totalCount/totalPrice; власні хуки useLocalStorage (кошик переживає перезавантаження), useFetch і useDebounce. Правила хуків і принципи проєктування власних хуків."
type: practice
pair: 13
topic: 83
---

## Мета роботи

- Зрозуміти, як працює Context API: `createContext`, провайдер, `useContext`, і коли контекст доречний.
- Винести стан кошика в `CartContext` з функцією-редюсером (reducer) і хуком `useCart()`, прибрати prop drilling.
- Опанувати правила хуків (Rules of Hooks) і навчитися створювати власні (кастомні) хуки.
- Написати хуки `useLocalStorage`, `useFetch`, `useDebounce` і застосувати їх у `CartContext`, `HomePage` і `ProductPage`.
- Зберігати кошик між перезавантаженнями сторінки.

## Що потрібно

- Проєкт `mini-shop` після практичної 12: React Router, сторінки `HomePage`, `ProductPage`, `CartPage`, `NotFoundPage`, кошик у стані `App`, що передається через пропси.
- Схема prop drilling, складена на практичній 12.
- Документація: [react.dev: Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context), [Extracting State Logic into a Reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer), [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks), [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks).

## Короткі теоретичні відомості

### Context API

**Контекст** (context) дозволяє компоненту-батькові зробити дані доступними **будь-якому** нащадку в дереві без передавання через пропси на кожному рівні.

Три кроки:

```jsx
import { createContext, useContext } from 'react';

// 1. Створити контекст (значення за замовчуванням — якщо провайдера немає вище)
const ThemeContext = createContext('light');

// 2. Надати значення нащадкам (React 19: сам контекст є провайдером)
function App() {
  const [theme, setTheme] = useState('dark');
  return (
    <ThemeContext value={theme}>
      <Page />
    </ThemeContext>
  );
}

// 3. Прочитати значення в будь-якому нащадку
function Button() {
  const theme = useContext(ThemeContext);
  return <button className={`btn btn--${theme}`}>OK</button>;
}
```

:::note[React 19 і Context.Provider]
До React 19 провайдер записувався як `<ThemeContext.Provider value={theme}>`. У React 19 можна писати просто `<ThemeContext value={theme}>`; старий запис поки що працює, але вважається застарілим. У статтях і чужому коді ви зустрінете обидва варіанти. Також у React 19 з'явилася функція `use(ThemeContext)` — на відміну від `useContext`, її можна викликати всередині умов.
:::

Як працює оновлення: коли `value` провайдера змінюється (порівнюється через `Object.is`), **усі** компоненти, що читають цей контекст, перерендерюються. Тому:

- значення-об'єкт варто мемоізувати (`useMemo`), щоб він не створювався заново на кожен рендер провайдера без потреби;
- не варто складати в один контекст дані, що змінюються з різною частотою.

### Коли використовувати контекст

| Підходить | Не підходить |
|---|---|
| Дані, потрібні багатьом компонентам на різних рівнях: кошик, поточний користувач, тема, мова | Передати пропс на 1–2 рівні — звичайні пропси простіші й зрозуміліші |
| «Глобальні» налаштування застосунку | Часто змінювані дані (позиція миші, текст поля), які читають багато компонентів |
| | Як заміна будь-якого стану «про всяк випадок» |

Перш ніж тягнутися до контексту, спробуйте **композицію**: часто проміжний компонент може приймати `children` замість пропсів, які він лише передає далі.

### Редюсер

Коли логіка оновлення стану розростається (у кошику — п'ять різних операцій), її зручно зібрати в одну **чисту функцію-редюсер**: `(стан, дія) => новий стан`.

```js
function counterReducer(state, action) {
  switch (action.type) {
    case 'increment': return state + 1;
    case 'add':       return state + action.amount;
    default: throw new Error(`Невідома дія: ${action.type}`);
  }
}

// Хук useReducer: замість setState — dispatch(дія)
const [count, dispatch] = useReducer(counterReducer, 0);
dispatch({ type: 'add', amount: 5 });
```

Переваги: уся логіка змін в одному місці; компоненти описують, **що сталося** (`{ type: 'add', product }`), а не **як** змінити масив; редюсер легко тестувати без React.

### Правила хуків

1. **Викликайте хуки лише на верхньому рівні** компонента або іншого хука — не в умовах, циклах, вкладених функціях, після раннього `return`. React розрізняє хуки за **порядком виклику**, тому порядок має бути однаковим на кожному рендері.
2. **Викликайте хуки лише з React-функцій**: функціональних компонентів і власних хуків, але не зі звичайних JS-функцій чи класів.

```jsx
// ❌ Хук в умові: на різних рендерах різна кількість хуків
if (isOpen) {
  const [value, setValue] = useState('');
}

// ❌ Хук після раннього return
if (!product) return null;
const [qty, setQty] = useState(1);

// ✅ Усі хуки — зверху, умови — всередині
const [value, setValue] = useState('');
const [qty, setQty] = useState(1);
if (!product) return null;
```

Плагін `eslint-plugin-react-hooks` (уже підключений у шаблоні Vite) перевіряє ці правила і стежить за масивами залежностей.

### Власні хуки

**Власний (кастомний) хук** — це функція, назва якої починається з `use` і яка викликає інші хуки. Він дозволяє винести **логіку зі станом** з компонента і повторно використовувати її.

Важливо розуміти: хук ділиться **логікою**, а не **станом**. Кожен компонент, що викликав `useFetch(url)`, отримує власні, незалежні `data`, `loading`, `error`. Щоб кілька компонентів бачили **той самий** стан, потрібен контекст (або підняття стану).

| | Звичайна функція (`utils/`) | Власний хук (`hooks/`) |
|---|---|---|
| Назва | будь-яка | `useЩось` |
| Може викликати `useState`, `useEffect` | ✗ | ✓ |
| Приклади | `formatPrice`, `sortProducts`, `buildProductsUrl` | `useFetch`, `useLocalStorage`, `useDebounce` |
| Де викликати | будь-де | лише на верхньому рівні компонента чи хука |

Якщо функція не викликає жодного хука — це не хук, і назву з `use` їй давати не треба.

## Хід роботи

### Крок 1. Редюсер кошика

Створіть папку `src/context/` і файл `CartContext.jsx`. Почнемо з чистої функції — вона збирає всю логіку змін кошика, яку раніше містили п'ять обробників в `App`:

```jsx title="src/context/CartContext.jsx (частина 1)"
import { createContext, useContext, useMemo, useReducer } from 'react';

// Редюсер: (поточні позиції, дія) → нові позиції. Ніколи не мутує вхідний масив
export function cartReducer(items, action) {
  switch (action.type) {
    case 'add': {
      const { product } = action;
      const existing = items.find((item) => item.id === product.id);
      if (existing) {
        return items.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      const { id, title, price, thumbnail } = product;
      return [...items, { id, title, price, thumbnail, qty: 1 }];
    }
    case 'increment':
      return items.map((item) => (item.id === action.id ? { ...item, qty: item.qty + 1 } : item));
    case 'decrement':
      return items
        .map((item) => (item.id === action.id ? { ...item, qty: item.qty - 1 } : item))
        .filter((item) => item.qty > 0);
    case 'remove':
      return items.filter((item) => item.id !== action.id);
    case 'clear':
      return [];
    default:
      throw new Error(`Невідома дія кошика: ${action.type}`);
  }
}
```

`default` з винятком допомагає одразу помітити опечатку в назві дії (`'incremnet'`), замість того щоб кошик «мовчки» не змінювався.

### Крок 2. Контекст, провайдер і хук useCart

Продовжуємо той самий файл:

```jsx title="src/context/CartContext.jsx (частина 2)"
// null за замовчуванням: так ми розпізнаємо використання поза провайдером
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, []);

  // Значення контексту створюємо заново лише тоді, коли змінився кошик
  const value = useMemo(() => {
    const totalCount = items.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.price * item.qty, 0);

    return {
      items,
      totalCount,
      totalPrice,
      addItem: (product) => dispatch({ type: 'add', product }),
      increment: (id) => dispatch({ type: 'increment', id }),
      decrement: (id) => dispatch({ type: 'decrement', id }),
      removeItem: (id) => dispatch({ type: 'remove', id }),
      clear: () => dispatch({ type: 'clear' }),
    };
  }, [items]);

  return <CartContext value={value}>{children}</CartContext>;
}

// Власний хук для доступу до кошика
export function useCart() {
  const context = useContext(CartContext);
  if (context === null) {
    throw new Error('useCart() потрібно викликати всередині <CartProvider>');
  }
  return context;
}
```

Розберемо рішення:

| Рішення | Навіщо |
|---|---|
| `createContext(null)` + перевірка в `useCart` | Якщо забути обгорнути застосунок у `CartProvider`, отримаємо зрозуміле повідомлення замість `Cannot read properties of null` у випадковому місці |
| Сам `CartContext` не експортується | Компоненти працюють лише через `useCart()` — один вхід, легко змінити реалізацію |
| `totalCount`, `totalPrice` у значенні контексту | Похідні дані обчислюються в одному місці, а не в кожному компоненті |
| Функції `addItem`, `increment`… замість `dispatch` | Компонентам не треба знати формат дій; API кошика читається як звичайні методи |
| `useMemo(…, [items])` | Без нього кожен рендер `CartProvider` створював би новий об'єкт і змушував перерендерюватися всіх споживачів |

:::caution[Попередження Fast Refresh]
ESLint може показати попередження `react-refresh/only-export-components`: файл експортує і компонент (`CartProvider`), і не-компоненти (`useCart`, `cartReducer`). Наслідок — при редагуванні цього файлу Fast Refresh перезавантажить модуль повністю (стан кошика скинеться). На роботу застосунку це не впливає. Якщо попередження заважає, хук і редюсер можна винести в окремі файли (`useCart.js`, `cartReducer.js`). Ми залишаємо все в одному файлі, щоб логіку кошика було видно цілком.
:::

### Крок 3. Підключаємо провайдер

Провайдер має охоплювати всі компоненти, що працюють з кошиком, тобто весь застосунок:

```jsx title="src/main.jsx" {4,11,13}
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { CartProvider } from './context/CartContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <CartProvider>
        <App />
      </CartProvider>
    </BrowserRouter>
  </StrictMode>,
);
```

### Крок 4. Прибираємо prop drilling

Тепер кожен компонент бере з кошика рівно те, що йому потрібно. Пройдіться по файлах:

**App** — лише маршрути, жодного стану:

```jsx title="src/App.jsx"
import { Routes, Route } from 'react-router';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import NotFoundPage from './pages/NotFoundPage';
import './App.css';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="product/:id" element={<ProductPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
```

**Layout** — проп `cartCount` більше не потрібен:

```jsx title="src/components/Layout.jsx (зміни)"
export default function Layout() {
  return (
    <>
      <Header />
      {/* ...решта без змін */}
    </>
  );
}
```

**Header** — читає кількість з контексту:

```jsx title="src/components/Header.jsx (зміни)" {2,6}
import { Link, NavLink } from 'react-router';
import { useCart } from '../context/CartContext';
// ...

export default function Header() {
  const { totalCount } = useCart();
  // ...у JSX замість cartCount — totalCount:
  // {totalCount > 0 && <span className="header__badge">{totalCount}</span>}
}
```

**ProductList** — проп `onAddToCart` прибираємо:

```jsx title="src/components/ProductList.jsx (зміни)"
export default function ProductList({ products }) {
  // ...
  {products.map((product) => (
    <ProductCard key={product.id} product={product} />
  ))}
}
```

**ProductCard** — бере `addItem` з контексту:

```jsx title="src/components/ProductCard.jsx (зміни)" {3,6,8}
import { useState } from 'react';
import { Link } from 'react-router';
import { useCart } from '../context/CartContext';
// ...

export default function ProductCard({ product }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const { addItem } = useCart();
  // ...кнопка: onClick={() => addItem(product)}
}
```

**CartSummary** — усе з контексту, пропсів немає:

```jsx title="src/components/CartSummary.jsx (зміни)" {1,5}
import { useCart } from '../context/CartContext';
// ...

export default function CartSummary() {
  const { items, increment, decrement, removeItem, totalPrice } = useCart();

  if (items.length === 0) {
    return <p className="empty-state">Кошик порожній. Додайте щось із каталогу 🙂</p>;
  }
  // ...у JSX: onIncrement → increment, onDecrement → decrement, onRemove → removeItem,
  // total → totalPrice (локальне обчислення суми видаліть)
}
```

**CartPage**:

```jsx title="src/pages/CartPage.jsx"
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import CartSummary from '../components/CartSummary';
import CheckoutForm from '../components/CheckoutForm';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/format';

export default function CartPage() {
  const navigate = useNavigate();
  const { items, totalPrice, clear } = useCart();
  const [order, setOrder] = useState(null);

  function handleOrderSubmit(values) {
    console.log('Нове замовлення:', { ...values, items, total: totalPrice });
    setOrder({ id: Date.now(), name: values.name, total: totalPrice });
    clear();
  }

  if (order) {
    return (
      <section className="order-success">
        <p className="order-success__icon">✅</p>
        <h1 className="page-title">Дякуємо, {order.name}!</h1>
        <p>
          Замовлення №{order.id} на суму <strong>{formatPrice(order.total)}</strong> прийнято.
        </p>
        <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>
          Продовжити покупки
        </button>
      </section>
    );
  }

  return (
    <section className="cart-page">
      <h1 className="page-title">Кошик</h1>
      <CartSummary />
      {items.length > 0 ? (
        <CheckoutForm total={totalPrice} onSubmit={handleOrderSubmit} />
      ) : (
        <p>
          <Link to="/">← Перейти до каталогу</Link>
        </p>
      )}
    </section>
  );
}
```

`CheckoutForm` залишаємо без змін: він отримує `total` і `onSubmit` через пропси. Це **презентаційний** компонент форми — йому не обов'язково знати про кошик, і його можна використати, наприклад, для оформлення подарункового сертифіката.

У `HomePage` і `ProductPage` теж приберіть проп `onAddToCart` (у `ProductPage` замініть його на `const { addItem } = useCart();`) — ці сторінки ми все одно перепишемо в кроках 7–8.

Перевірте: додавання в кошик з каталогу і зі сторінки товару, лічильник у шапці, `+`/`−`/`✕` і оформлення працюють як раніше. Відкрийте React DevTools → Components: над `App` з'явився `CartProvider`, а в ньому — `Context` зі значенням (`items`, `totalCount`…).

:::tip[Порівняйте зі схемою з практичної 12]
Скільки тепер компонентів отримують дані кошика, які самі не використовують? Нуль. `Layout`, `HomePage`, `ProductList` більше нічого не знають про кошик.
:::

### Крок 5. Хук useLocalStorage

Кошик досі зникає після F5. Напишемо універсальний хук, який працює як `useState`, але зберігає значення в `localStorage`:

```js title="src/hooks/useLocalStorage.js"
import { useEffect, useState } from 'react';

export function useLocalStorage(key, initialValue) {
  // Лінива ініціалізація: localStorage читаємо лише один раз, при першому рендері
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initialValue;
    } catch {
      // Пошкоджений JSON або заборонений доступ до сховища
      return initialValue;
    }
  });

  // Синхронізація зі сховищем — побічний ефект після кожної зміни
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`Не вдалося зберегти «${key}» у localStorage:`, err);
    }
  }, [key, value]);

  return [value, setValue];
}
```

Чому так:

- `useState(() => …)` — **лінива ініціалізація** (lazy initialization): функція виконується лише при першому рендері. Якби ми написали `useState(JSON.parse(localStorage.getItem(key)))`, читання і розбір JSON виконувалися б на **кожному** рендері, а результат ігнорувався б.
- `try/catch` — `localStorage` може бути недоступним (приватний режим деяких браузерів, переповнене сховище), а JSON — пошкодженим (хтось вручну змінив значення в DevTools).
- Хук повертає ту саму пару `[value, setValue]`, що й `useState`, тому його можна використовувати як заміну, включно з функціональним оновленням `setValue(prev => …)`.

### Крок 6. Кошик зберігається між перезавантаженнями

Як поєднати редюсер і `useLocalStorage`? Редюсер — звичайна чиста функція, тож її можна застосувати до попереднього стану у функціональному оновленні:

```jsx title="src/context/CartContext.jsx (зміни в CartProvider)" {1-2,5-9}
import { createContext, useCallback, useContext, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

export function CartProvider({ children }) {
  const [items, setItems] = useLocalStorage('mini-shop:cart', []);

  // Власний dispatch: застосовуємо редюсер до попереднього стану
  const dispatch = useCallback((action) => setItems((prev) => cartReducer(prev, action)), [setItems]);

  const value = useMemo(() => {
    // ...без змін
  }, [items, dispatch]);

  return <CartContext value={value}>{children}</CartContext>;
}
```

`useReducer` більше не потрібен — приберіть його з імпорту. Редюсер `cartReducer` не змінився взагалі: це перевага винесення логіки в чисту функцію.

`useCallback` повертає ту саму функцію `dispatch` між рендерами (поки не зміниться `setItems`, а він стабільний), тому `useMemo` не перераховуватиме значення без потреби.

Перевірте:

1. Додайте кілька товарів і натисніть F5 — кошик на місці.
2. DevTools → **Application** → Local Storage → `http://localhost:5173` — ключ `mini-shop:cart` з масивом позицій.
3. Вручну зіпсуйте значення (наприклад, `[{"id":`) і оновіть сторінку — застосунок не впав, кошик порожній (спрацював `catch`).
4. Оформіть замовлення — кошик очищено, у сховищі `[]`.

### Крок 7. Хук useFetch

У `HomePage` (двічі) і `ProductPage` повторюється той самий код: три стани, `AbortController`, `try/catch/finally`, `reloadKey`. Винесемо його в хук:

```js title="src/hooks/useFetch.js"
import { useCallback, useEffect, useState } from 'react';
import { fetchJson } from '../utils/api';

export function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!url) return; // null/порожній url — нічого не завантажуємо

    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const json = await fetchJson(url, { signal: controller.signal });
        setData(json);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [url, reloadKey]);

  // Стабільна функція повторного запиту
  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  return { data, loading, error, refetch };
}
```

Хук приймає **рядок URL**: коли він змінюється (новий `id`, новий пошуковий запит), ефект автоматично скасовує старий запит і починає новий. Компонентові достатньо обчислити потрібну адресу.

:::note[Попередження react-hooks/set-state-in-effect]
Нові версії `eslint-plugin-react-hooks` можуть попереджати про виклик `setState` в ефекті. Для завантаження даних в ефекті це свідомий компроміс: ми синхронізуємо компонент із зовнішньою системою (сервером). У реальних проєктах завантаження даних зазвичай доручають бібліотекам ([TanStack Query](https://tanstack.com/query), SWR) або `loader` у data mode React Router — вони також кешують відповіді, і повернення в каталог не викликатиме повторного запиту.
:::

### Крок 8. Хук useDebounce і новий HomePage

```js title="src/hooks/useDebounce.js"
import { useEffect, useState } from 'react';

// Повертає value, але оновлює його лише після delay мс «тиші»
export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timerId = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timerId);
  }, [value, delay]);

  return debounced;
}
```

Тепер перепишемо `HomePage` — порівняйте з версією з практичної 12:

```jsx title="src/pages/HomePage.jsx"
import { useSearchParams } from 'react-router';
import SearchBar from '../components/SearchBar';
import CategoryFilter from '../components/CategoryFilter';
import SortSelect from '../components/SortSelect';
import ProductList from '../components/ProductList';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { useFetch } from '../hooks/useFetch';
import { useDebounce } from '../hooks/useDebounce';
import { API_URL, buildProductsUrl } from '../utils/api';
import { filterByCategory, sortProducts } from '../utils/products';

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const sort = searchParams.get('sort') ?? 'default';

  function updateParams(updates, options) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      return next;
    }, options);
  }

  // Три рядки замість ~50
  const debouncedQuery = useDebounce(query.trim(), 400);
  const { data, loading, error, refetch } = useFetch(
    buildProductsUrl({ query: debouncedQuery, category }),
  );
  const { data: categories } = useFetch(`${API_URL}/products/categories`);

  // Похідні дані
  const products = data?.products ?? [];
  const visibleProducts = sortProducts(filterByCategory(products, category), sort);

  let content;
  if (error) {
    content = <ErrorMessage message={error.message} onRetry={refetch} />;
  } else if (loading) {
    content = <Loader text="Завантажуємо товари…" />;
  } else {
    content = <ProductList products={visibleProducts} />;
  }

  return (
    <section>
      <h1 className="page-title">Каталог</h1>

      <div className="toolbar">
        <SearchBar value={query} onChange={(value) => updateParams({ q: value }, { replace: true })} />
        <CategoryFilter
          categories={categories ?? []}
          value={category}
          onChange={(value) => updateParams({ category: value })}
        />
        <SortSelect
          value={sort}
          onChange={(value) => updateParams({ sort: value === 'default' ? '' : value })}
        />
        {!loading && !error && <p className="toolbar__info">Знайдено: {visibleProducts.length}</p>}
      </div>

      {content}
    </section>
  );
}
```

Зверніть увагу:

- Два виклики `useFetch` у одному компоненті мають **незалежний** стан — хук ділиться логікою, а не даними.
- `data?.products ?? []` — поки дані не завантажені, `data === null`.
- `useDebounce` ініціалізується значенням з URL, тож перший запит іде одразу.
- Компонент тепер описує **що** потрібно (дані за такою адресою, затриманий запит), а не **як** це зробити.

### Крок 9. ProductPage з useFetch і скиданням стану через key

На практичній 12 ми скидали `activeImage` і `added` вручну в ефекті. Тепер ефекту в сторінці немає, тож скористаємося `key`: зовнішній компонент читає `id`, а внутрішній отримує `key={id}` і створюється заново для кожного товару.

```jsx title="src/pages/ProductPage.jsx"
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { useFetch } from '../hooks/useFetch';
import { useCart } from '../context/CartContext';
import { API_URL } from '../utils/api';
import { formatPrice } from '../utils/format';
import './ProductPage.css';

export default function ProductPage() {
  const { id } = useParams();
  // Новий id → новий key → новий екземпляр ProductDetails з початковим станом
  return <ProductDetails key={id} id={id} />;
}

function ProductDetails({ id }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem } = useCart();
  const { data: product, loading, error, refetch } = useFetch(`${API_URL}/products/${id}`);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);

  function handleBack() {
    if (location.key === 'default') navigate('/');
    else navigate(-1);
  }

  function handleAdd() {
    addItem(product);
    setAdded(true);
  }

  if (loading) return <Loader text="Завантажуємо товар…" />;

  if (error) {
    if (error.status === 404) {
      return (
        <div className="empty-state">
          <p>Товар №{id} не знайдено.</p>
          <Link to="/">Перейти до каталогу</Link>
        </div>
      );
    }
    return <ErrorMessage message={error.message} onRetry={refetch} />;
  }

  if (!product) return null;

  const images = product.images?.length ? product.images : [product.thumbnail];

  return (
    <article className="product-page">
      {/* ...розмітка без змін з практичної 12 */}
    </article>
  );
}
```

Розмітку `<article>` перенесіть з попередньої версії без змін. `ProductDetails` не експортується — це внутрішня деталь файлу.

### Крок 10. Перевірка і коміт

1. Каталог, пошук (debounce — один запит у Network), категорії, сортування — працюють.
2. Сторінка товару: перейдіть з одного товару на інший через адресний рядок (`/product/1` → `/product/2`) — галерея починається з першого фото, кнопка знову «У кошик».
3. Кошик переживає F5 і закриття вкладки.
4. React DevTools → Components: виділіть `HomePage` — у секції hooks видно `Debounce`, `Fetch`, `Fetch` (DevTools показує власні хуки за назвою без `use`) з їхнім внутрішнім станом.
5. Пошукайте по проєкту `onAddToCart` і `cartCount` — збігів не має бути.

```bash
git add .
git commit -m "P13: CartContext, useLocalStorage, useFetch, useDebounce"
```

**Результат роботи:** кошик живе в контексті й зберігається в `localStorage`; компоненти отримують з нього лише потрібне через `useCart()`; завантаження даних і debounce винесені у власні хуки, сторінки стали значно коротшими.

## Завдання для самостійного виконання

1. ★ Додайте в `CartContext` функцію `getQty(id)`, що повертає кількість товару в кошику, і покажіть у `ProductCard` під кнопкою «У кошику: N шт.», якщо товар уже доданий.
2. ★ Напишіть хук `useDocumentTitle(title)`, що встановлює `document.title` в ефекті, і використайте його на всіх сторінках.
3. ★★ **ThemeContext.** Створіть `src/context/ThemeContext.jsx` з `ThemeProvider` і хуком `useTheme()`, що повертає `{ theme, toggleTheme }`. Тему (`'light'`/`'dark'`) зберігайте через `useLocalStorage('mini-shop:theme', 'light')`, а в ефекті встановлюйте `document.documentElement.dataset.theme = theme`. Перепишіть основні кольори в `index.css` на CSS-змінні (`--color-bg`, `--color-text`, `--color-card`…) з окремим набором для `[data-theme='dark']`. Додайте в `Header` кнопку-перемикач 🌙/☀️. Бонус: початкова тема — з `window.matchMedia('(prefers-color-scheme: dark)')`.
4. ★★ Напишіть кілька перевірок редюсера `cartReducer` у консолі: додавання нового товару, повторне додавання, `decrement` до нуля, невідома дія. Переконайтеся, що вхідний масив не змінюється (порівняйте посилання).
5. ★★★ Доповніть `useLocalStorage` синхронізацією між вкладками: підпишіться в ефекті на подію `storage` об'єкта `window` і оновлюйте стан, коли `event.key === key`. Відкрийте магазин у двох вкладках і перевірте, що кошик синхронізується.

## Контрольні питання

1. Яку проблему розв'язує Context API? Наведіть приклади даних, для яких контекст доречний і недоречний.
2. Як у React 19 записується провайдер контексту? Чим він відрізняється від старого запису?
3. Навіщо `createContext(null)` і перевірка в `useCart()`?
4. Чому значення контексту загорнуте в `useMemo`? Що станеться без цього?
5. Що таке редюсер? Чому редюсер повинен бути чистою функцією?
6. Сформулюйте правила хуків. Чому хуки не можна викликати в умовах?
7. Що таке власний хук? Чим він відрізняється від звичайної функції з папки `utils`?
8. Якщо два компоненти викликають `useFetch` з однаковим URL, чи спільні в них дані? Чому?
9. Що таке лінива ініціалізація `useState` і навіщо вона в `useLocalStorage`?
10. Як `key` допомагає скинути стан компонента при зміні параметра маршруту?

## Домашнє завдання

1. Виконайте завдання ★1 (`getQty`) і ★2 (`useDocumentTitle`).
2. Подумайте і запишіть (3–5 речень): як би ви зберігали список «обраних» товарів (♥), щоб він був доступний на окремій сторінці `/favorites` і переживав перезавантаження? Які файли довелося б створити?
3. Оберіть варіант підсумкового мініпроєкту (продовження «Міні-магазину» чи власна тема) — на наступній парі буде перелік ідей і вимоги.

## Що здати

- Посилання на репозиторій з комітом `P13: ...`.
- Скриншоти: React DevTools з `CartProvider` і хуками `HomePage`; вкладка Application з ключем `mini-shop:cart`.
- Відповіді на контрольні питання.

## Повні лістинги

Для звірки — підсумкові версії файлів контексту і хуків після цієї пари.

```jsx title="src/context/CartContext.jsx"
import { createContext, useCallback, useContext, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Редюсер: (поточні позиції, дія) → нові позиції. Ніколи не мутує вхідний масив
export function cartReducer(items, action) {
  switch (action.type) {
    case 'add': {
      const { product } = action;
      const existing = items.find((item) => item.id === product.id);
      if (existing) {
        return items.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      const { id, title, price, thumbnail } = product;
      return [...items, { id, title, price, thumbnail, qty: 1 }];
    }
    case 'increment':
      return items.map((item) => (item.id === action.id ? { ...item, qty: item.qty + 1 } : item));
    case 'decrement':
      return items
        .map((item) => (item.id === action.id ? { ...item, qty: item.qty - 1 } : item))
        .filter((item) => item.qty > 0);
    case 'remove':
      return items.filter((item) => item.id !== action.id);
    case 'clear':
      return [];
    default:
      throw new Error(`Невідома дія кошика: ${action.type}`);
  }
}

// null за замовчуванням: так ми розпізнаємо використання поза провайдером
const CartContext = createContext(null);

export function CartProvider({ children }) {
  // Позиції кошика зберігаються в localStorage і переживають перезавантаження
  const [items, setItems] = useLocalStorage('mini-shop:cart', []);

  // Власний dispatch: застосовуємо редюсер до попереднього стану
  const dispatch = useCallback(
    (action) => setItems((prev) => cartReducer(prev, action)),
    [setItems],
  );

  // Значення контексту створюємо заново лише тоді, коли змінився кошик
  const value = useMemo(() => {
    const totalCount = items.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.price * item.qty, 0);

    return {
      items,
      totalCount,
      totalPrice,
      addItem: (product) => dispatch({ type: 'add', product }),
      increment: (id) => dispatch({ type: 'increment', id }),
      decrement: (id) => dispatch({ type: 'decrement', id }),
      removeItem: (id) => dispatch({ type: 'remove', id }),
      clear: () => dispatch({ type: 'clear' }),
    };
  }, [items, dispatch]);

  return <CartContext value={value}>{children}</CartContext>;
}

// Власний хук для доступу до кошика
export function useCart() {
  const context = useContext(CartContext);
  if (context === null) {
    throw new Error('useCart() потрібно викликати всередині <CartProvider>');
  }
  return context;
}
```

```js title="src/hooks/useLocalStorage.js"
import { useEffect, useState } from 'react';

// Як useState, але значення зберігається в localStorage під ключем key
export function useLocalStorage(key, initialValue) {
  // Лінива ініціалізація: localStorage читаємо лише при першому рендері
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initialValue;
    } catch {
      // Пошкоджений JSON або заборонений доступ до сховища
      return initialValue;
    }
  });

  // Синхронізація зі сховищем після кожної зміни
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`Не вдалося зберегти «${key}» у localStorage:`, err);
    }
  }, [key, value]);

  return [value, setValue];
}
```

```js title="src/hooks/useFetch.js"
import { useCallback, useEffect, useState } from 'react';
import { fetchJson } from '../utils/api';

// Завантажує JSON за адресою url; при зміні url старий запит скасовується
export function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!url) return; // null/порожній url — нічого не завантажуємо

    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const json = await fetchJson(url, { signal: controller.signal });
        setData(json);
      } catch (err) {
        if (err.name === 'AbortError') return; // скасування — не помилка
        setError(err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [url, reloadKey]);

  // Стабільна функція повторного запиту
  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  return { data, loading, error, refetch };
}
```

```js title="src/hooks/useDebounce.js"
import { useEffect, useState } from 'react';

// Повертає value, але оновлює його лише після delay мс без змін
export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timerId = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timerId);
  }, [value, delay]);

  return debounced;
}
```
