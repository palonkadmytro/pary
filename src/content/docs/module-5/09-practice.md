---
title: "Компоненти, пропси, стан"
description: "Рефакторинг «Міні-магазину» на чіткі компоненти: ProductList, CategoryFilter і сортування, похідний стан замість зайвого useState, композиція через children (компонент Modal для кошика), умовний рендеринг і порожні стани."
type: practice
pair: 9
topic: 79
---

## Мета роботи

- Розбити застосунок «Міні-магазин» на компоненти з чіткою відповідальністю та продуманим набором пропсів.
- Додати фільтрацію за категорією і сортування товарів, обчислюючи список для показу **під час рендеру** (похідний стан, derived state).
- Навчитися відрізняти справжній стан від даних, які можна обчислити, і уникати зайвих `useState`.
- Створити універсальний компонент `Modal`, що приймає вміст через `children` (композиція), і показати в ньому кошик.
- Відпрацювати умовний рендеринг (conditional rendering) і порожні стани (empty states).

## Що потрібно

| Що | Навіщо |
|---|---|
| Проєкт `mini-shop` після практичної 5 | Стартовий стан (див. нижче) |
| Node.js LTS, VS Code | Розробка |
| React Developer Tools | Перегляд дерева компонентів, пропсів і стану |
| Документація | [react.dev: Thinking in React](https://react.dev/learn/thinking-in-react), [Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure), [Passing JSX as children](https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children) |

### Стартовий стан проєкту (після практичної 5)

```text
mini-shop/src/
├── main.jsx
├── App.jsx            ← стан кошика (масив позицій) і обробники
├── App.css, index.css
├── components/
│   ├── Header.jsx     ← показує лічильник товарів у кошику (проп cartCount)
│   ├── ProductCard.jsx← картка: ♥ (локальний стан), кнопка «У кошик» (onAddToCart)
│   └── CartSummary.jsx← позиції кошика, +/−/видалити, сума
├── data/products.js   ← 6–8 товарів у форматі DummyJSON
└── utils/format.js    ← formatPrice()
```

Позиція кошика має формат `{ id, title, price, thumbnail, qty }`. Каталог і кошик стоять у дві колонки (класи `.layout`, `.catalog`, `.product-grid` в `App.css`), `CartSummary` — бічна панель `<aside className="cart">`. Вміст `App.jsx` на цей момент (скорочено, без коментарів):

```jsx title="src/App.jsx (стан після П5)"
import { useState } from 'react';
import Header from './components/Header';
import ProductCard from './components/ProductCard';
import CartSummary from './components/CartSummary';
import { products } from './data/products';
import './App.css';

export default function App() {
  const [cart, setCart] = useState([]);

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

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <>
      <Header cartCount={cartCount} />

      <main className="container layout">
        <section className="catalog">
          <div className="catalog__head">
            <h1 className="catalog__title">Каталог товарів</h1>
            <p className="catalog__count">Знайдено: {products.length}</p>
          </div>

          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
            ))}
          </div>
        </section>

        <CartSummary
          items={cart}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onRemove={handleRemove}
        />
      </main>
    </>
  );
}
```

:::note
Якщо назви у вашому проєкті дещо відрізняються (наприклад, `addToCart` замість `handleAddToCart`), спочатку приведіть код до наведеного вигляду — далі всі кроки спираються саме на ці імена. Глобальні класи `.container`, `.btn`, `.btn--primary` і CSS-змінні `--color-primary`, `--color-border`, `--color-muted` визначені в `index.css` на практичній 3 — ми ними користуватимемося.
:::

## Короткі теоретичні відомості

### Як ділити інтерфейс на компоненти

Підхід «Thinking in React» з офіційної документації:

1. **Намалюйте макет і обведіть рамками** кожну частину, що має власну відповідальність (принцип єдиної відповідальності, single responsibility).
2. **Побудуйте статичну версію** — компоненти, що лише отримують дані через пропси.
3. **Знайдіть мінімальний набір стану.** Усе, що можна обчислити з інших даних, станом не є.
4. **Визначте, де має жити стан** — у найближчому спільному батькові всіх компонентів, яким він потрібен.
5. **Додайте зворотний потік даних** — передайте функції-обробники вниз, щоб дочірні компоненти могли повідомляти батька про події.

### Що є станом, а що — ні

Для кожного значення поставте три питання:

| Питання | Якщо «так» — це НЕ стан |
|---|---|
| Воно не змінюється з часом? | Константа або пропс (`products` зі статичного файлу) |
| Воно приходить від батька через пропси? | Пропс |
| Його можна обчислити з наявного стану чи пропсів? | **Похідне значення** (кількість у кошику, сума, відфільтрований список) |

```jsx
// ❌ Погано: дубльований стан, який треба синхронізувати вручну
const [cart, setCart] = useState([]);
const [cartCount, setCartCount] = useState(0);   // легко «розсинхронізувати»
useEffect(() => {
  setCartCount(cart.reduce((s, i) => s + i.qty, 0)); // зайвий рендер
}, [cart]);

// ✅ Добре: обчислюємо під час рендеру
const [cart, setCart] = useState([]);
const cartCount = cart.reduce((s, i) => s + i.qty, 0);
```

Обчислення під час рендеру для списку з десятків чи сотень елементів займає мікросекунди. Якщо обчислення справді дороге (тисячі елементів, складні перетворення), його можна закешувати хуком `useMemo` — але починати слід без нього.

### Композиція через children

Будь-який JSX, вкладений між відкривальним і закривальним тегами компонента, потрапляє в проп `children`:

```jsx
<Card title="Профіль">
  <Avatar />
  <p>Текст</p>
</Card>

function Card({ title, children }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
```

Так будують компоненти-«обгортки»: модальні вікна, картки, панелі, макети. Компонент відповідає за **рамку і поведінку** (відкриття, закриття, стилі), а **вміст** визначає той, хто його використовує.

### Умовний рендеринг

| Прийом | Приклад | Коли |
|---|---|---|
| `if` з раннім `return` | `if (!items.length) return <Empty />;` | Альтернативний вигляд усього компонента |
| Тернарний оператор | `{isOpen ? <Close /> : <Open />}` | Один із двох варіантів у JSX |
| `&&` | `{error && <p>{error}</p>}` | Показати або нічого |
| `null` | `return null;` | Компонент нічого не малює |

:::caution[Пастка з &&]
`{items.length && <List />}` при порожньому масиві виведе на сторінку **`0`**, бо `0` — валідний вузол React. Пишіть явну умову: `{items.length > 0 && <List />}`.
:::

## Хід роботи

### Крок 1. Плануємо компоненти

Ось як виглядатиме дерево компонентів після цієї пари:

```text
App                         стан: cart, category, sort, isCartOpen
├── Header                  пропси: cartCount, onCartClick
├── Toolbar (розмітка в App)
│   ├── CategoryFilter      пропси: categories, value, onChange
│   └── SortSelect          пропси: value, onChange
├── ProductList             пропси: products, onAddToCart
│   └── ProductCard × N     пропси: product, onAddToCart; стан: isFavorite
└── Modal                   пропси: isOpen, title, onClose, children
    └── CartSummary         пропси: items, onIncrement, onDecrement, onRemove
```

Зверніть увагу:

- **Стан** — лише чотири значення: що в кошику, яку категорію обрано, яке сортування, чи відкрите вікно кошика.
- **Похідні дані** — список категорій, відфільтрований і відсортований список товарів, кількість і сума в кошику — обчислюємо.
- `isFavorite` залишається локальним станом картки — він нікому, крім неї, поки не потрібен.

### Крок 2. Допоміжні функції для товарів

Логіку фільтрації та сортування винесемо в окремий модуль — чисті функції (pure functions) легко читати й тестувати, а компоненти стають коротшими.

```js title="src/utils/products.js"
// Варіанти сортування для випадного списку
export const SORT_OPTIONS = [
  { value: 'default', label: 'За замовчуванням' },
  { value: 'price-asc', label: 'Спочатку дешевші' },
  { value: 'price-desc', label: 'Спочатку дорожчі' },
  { value: 'rating', label: 'За рейтингом' },
];

// Унікальні категорії з масиву товарів у форматі { slug, name }
// (такий самий формат повертає DummyJSON — знадобиться на П11)
export function getCategories(products) {
  const slugs = [...new Set(products.map((p) => p.category))];
  return slugs.map((slug) => ({ slug, name: slug }));
}

// Фільтр за категорією; порожній рядок означає «усі»
export function filterByCategory(products, category) {
  if (!category) return products;
  return products.filter((p) => p.category === category);
}

// Повертає НОВИЙ відсортований масив, вихідний не змінюється
export function sortProducts(products, sort) {
  switch (sort) {
    case 'price-asc':
      return products.toSorted((a, b) => a.price - b.price);
    case 'price-desc':
      return products.toSorted((a, b) => b.price - a.price);
    case 'rating':
      return products.toSorted((a, b) => b.rating - a.rating);
    default:
      return products;
  }
}
```

:::danger[Не сортуйте пропси і стан на місці]
Метод `Array.prototype.sort()` **змінює** масив, на якому його викликали. Якщо викликати `products.sort(...)` для масиву зі стану чи пропсів, ви мутуєте дані React — це порушує правило незмінності (immutability) і може призвести до дивних помилок. Метод `toSorted()` (ES2023) повертає новий масив. Альтернатива для старих середовищ — `[...products].sort(...)`.
:::

### Крок 3. Компонент ProductList з порожнім станом

```jsx title="src/components/ProductList.jsx"
import ProductCard from './ProductCard';
import './ProductList.css';

export default function ProductList({ products, onAddToCart }) {
  // Порожній стан: користувач має розуміти, чому нічого не видно
  if (products.length === 0) {
    return (
      <p className="empty-state">
        Товарів не знайдено. Спробуйте змінити категорію або сортування.
      </p>
    );
  }

  return (
    <div className="product-list">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
      ))}
    </div>
  );
}
```

```css title="src/components/ProductList.css"
.product-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.25rem;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: #64748b;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
}
```

`ProductList` нічого не знає про те, **звідки** прийшли товари і **як** їх відфільтрували. Він лише показує переданий масив. Таке розділення дозволить на наступних парах без змін використати його і для результатів пошуку, і для сторінки «Обране».

Сітку тепер задає `.product-list`, тому правило `.product-grid` з `App.css` можна видалити. Заголовок `catalog__head` з лічильником замінить панель інструментів у кроці 5.

### Крок 4. CategoryFilter і SortSelect

Обидва компоненти — **керовані** (controlled): поточне значення приходить через проп `value`, а про зміну вони повідомляють батька через `onChange`. Детально керовані поля розглянемо на наступній парі, зараз важлива сама схема «значення вниз — подія вгору».

```jsx title="src/components/CategoryFilter.jsx"
export default function CategoryFilter({ categories, value, onChange }) {
  return (
    <label className="field">
      <span className="field__label">Категорія</span>
      <select
        className="field__control"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Усі категорії</option>
        {categories.map((category) => (
          <option key={category.slug} value={category.slug}>
            {category.name}
          </option>
        ))}
      </select>
    </label>
  );
}
```

```jsx title="src/components/SortSelect.jsx"
import { SORT_OPTIONS } from '../utils/products';

export default function SortSelect({ value, onChange }) {
  return (
    <label className="field">
      <span className="field__label">Сортування</span>
      <select
        className="field__control"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
```

Зверніть увагу: дочірній компонент викликає `onChange(event.target.value)`, а **не** передає весь об'єкт події. Батькові не потрібно знати, що всередині саме `<select>` — завтра його можна замінити на кнопки, і код `App` не зміниться.

Додайте спільні стилі полів до `index.css` (вони знадобляться й для форм):

```css title="src/index.css (додати в кінець)"
.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field__label {
  font-size: 0.85rem;
  color: #475569;
}

.field__control {
  padding: 0.5rem 0.75rem;
  font: inherit;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
}

.field__control:focus {
  outline: 2px solid #6366f1;
  outline-offset: 1px;
}
```

### Крок 5. Похідний стан у App

Тепер підключимо фільтр і сортування в `App`. Тимчасово залиште `CartSummary` у бічній колонці — у кроці 7 переведемо його в модальне вікно, і двоколонкова розмітка `.layout` стане непотрібною.

```jsx title="src/App.jsx (фрагмент)" {1-6,10-11,15-18}
import ProductList from './components/ProductList';
import CategoryFilter from './components/CategoryFilter';
import SortSelect from './components/SortSelect';
import { getCategories, filterByCategory, sortProducts } from './utils/products';

// ...усередині App, після useState для cart:
const [category, setCategory] = useState('');
const [sort, setSort] = useState('default');

// Похідні дані — обчислюються на кожному рендері
const categories = getCategories(products);
const visibleProducts = sortProducts(filterByCategory(products, category), sort);
const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

// ...у JSX замість products.map(...):
<div className="toolbar">
  <CategoryFilter categories={categories} value={category} onChange={setCategory} />
  <SortSelect value={sort} onChange={setSort} />
</div>
<ProductList products={visibleProducts} onAddToCart={handleAddToCart} />
```

Ми передаємо `setCategory` напряму як `onChange` — це нормально, бо сигнатура збігається: `onChange` викликається з одним рядком.

Стилі панелі:

```css title="src/App.css (додати)"
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 1.5rem;
}

.toolbar__info {
  margin-left: auto;
  color: #64748b;
  font-size: 0.9rem;
}
```

Перевірте в браузері:

1. Оберіть категорію — залишаються лише товари цієї категорії.
2. Змініть сортування — порядок карток змінюється, фільтр зберігається.
3. Відкрийте React DevTools → Components → `App`: у секції **hooks** видно лише `State: []` (кошик), `State: ""` (категорія), `State: "default"` (сортування). Відфільтрованого списку в стані немає — і не повинно бути.

:::tip[Чому не useState для visibleProducts?]
Якби `visibleProducts` був станом, довелося б оновлювати його при **кожній** зміні `category`, `sort` і самих `products` — у трьох місцях або в ефекті. Будь-який пропущений випадок — і на екрані неактуальні дані. Похідне значення завжди правильне за побудовою.
:::

Додайте до панелі лічильник знайдених товарів — ще одне похідне значення:

```jsx title="src/App.jsx (фрагмент toolbar)"
<p className="toolbar__info">Знайдено: {visibleProducts.length}</p>
```

### Крок 6. Універсальний компонент Modal

Кошик, що постійно займає місце під каталогом, незручний. Покажемо його у модальному вікні. Але робити `CartModal` — погана ідея: завтра знадобиться вікно для відгуку чи збільшеного фото. Зробимо **загальний** `Modal`, який нічого не знає про кошик і показує будь-який `children`.

```jsx title="src/components/Modal.jsx"
import { useEffect } from 'react';
import './Modal.css';

export default function Modal({ isOpen, title, onClose, children }) {
  // Закриття клавішею Escape. Хуки викликаємо ДО будь-якого раннього return
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    // Блокуємо прокрутку сторінки під вікном
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    // Клік по затемненому фону закриває вікно
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        // Клік усередині вікна не повинен «спливати» до фону
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <h2 id="modal-title" className="modal__title">{title}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Закрити">
            ×
          </button>
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
```

```css title="src/components/Modal.css"
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 4rem 1rem 1rem;
  background: rgb(15 23 42 / 0.55);
}

.modal {
  width: min(560px, 100%);
  max-height: calc(100vh - 6rem);
  overflow-y: auto;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 20px 50px rgb(0 0 0 / 0.25);
}

.modal__header {
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
}

.modal__title {
  margin: 0;
  font-size: 1.25rem;
}

.modal__close {
  font-size: 1.75rem;
  line-height: 1;
  background: none;
  border: none;
  cursor: pointer;
  color: #64748b;
}

.modal__body {
  padding: 1.25rem;
}
```

Розберемо важливі рішення:

| Рішення | Чому |
|---|---|
| `if (!isOpen) return null` **після** `useEffect` | Правило хуків: хуки викликаються в тому самому порядку на кожному рендері, тож їх не можна ставити після умовного `return` |
| `if (!isOpen) return;` усередині ефекту | Слухач клавіатури потрібен лише для відкритого вікна |
| Очищення в `return () => …` | Без нього після закриття вікна слухач `keydown` залишиться, а сторінка не прокручуватиметься |
| `event.stopPropagation()` | Без нього клік по кнопці «+» у кошику «спливе» до фону і закриє вікно |
| `role="dialog"`, `aria-modal`, `aria-labelledby` | Екранний читач оголосить діалог і його заголовок |

:::note[А як же `<dialog>`?]
У сучасному HTML є елемент [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) з методом `showModal()`, який сам керує фокусом, Escape і затемненням (`::backdrop`). Для нього потрібен `useRef` і ефект, що викликає `showModal()`/`close()`. Ми реалізували вікно вручну, щоб краще зрозуміти композицію та ефекти; спробувати `<dialog>` можна у завданні ★★★.
:::

### Крок 7. Відкриваємо кошик у Modal

Додамо до `Header` кнопку відкриття кошика:

```jsx title="src/components/Header.jsx"
import './Header.css';

export default function Header({ cartCount, onCartClick }) {
  return (
    <header className="header">
      <div className="container header__inner">
        <span className="header__logo">🛍️ Міні-магазин</span>
        <button type="button" className="header__cart" onClick={onCartClick}>
          🛒 Кошик
          {/* Бейдж показуємо лише для непорожнього кошика */}
          {cartCount > 0 && <span className="header__badge">{cartCount}</span>}
        </button>
      </div>
    </header>
  );
}
```

```css title="src/components/Header.css (додати або оновити)"
.header__cart {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
  font: inherit;
  color: #fff;
  background: #4f46e5;
  border: none;
  border-radius: 999px;
  cursor: pointer;
}

.header__badge {
  min-width: 1.4rem;
  padding: 0 0.35rem;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.4rem;
  text-align: center;
  color: #4f46e5;
  background: #fff;
  border-radius: 999px;
}
```

Перепишемо `CartSummary` під модальне вікно. Обгортка `<aside className="cart">` і заголовок «Кошик» більше не потрібні — заголовок показує `Modal`. Порожній стан і обчислення суми залишаються, а стилі `CartSummary.css` замініть повністю:

```jsx title="src/components/CartSummary.jsx"
import { formatPrice } from '../utils/format';
import './CartSummary.css';

export default function CartSummary({ items, onIncrement, onDecrement, onRemove }) {
  if (items.length === 0) {
    return <p className="empty-state">Кошик порожній. Додайте щось із каталогу 🙂</p>;
  }

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <div className="cart-summary">
      <ul className="cart-summary__list">
        {items.map((item) => (
          <li key={item.id} className="cart-item">
            <img src={item.thumbnail} alt="" className="cart-item__img" />
            <div className="cart-item__info">
              <span className="cart-item__title">{item.title}</span>
              <span className="cart-item__price">{formatPrice(item.price)}</span>
            </div>
            <div className="cart-item__qty">
              <button type="button" onClick={() => onDecrement(item.id)} aria-label={`Зменшити кількість: ${item.title}`}>
                −
              </button>
              <span>{item.qty}</span>
              <button type="button" onClick={() => onIncrement(item.id)} aria-label={`Збільшити кількість: ${item.title}`}>
                +
              </button>
            </div>
            <span className="cart-item__sum">{formatPrice(item.price * item.qty)}</span>
            <button
              type="button"
              className="cart-item__remove"
              onClick={() => onRemove(item.id)}
              aria-label={`Видалити ${item.title}`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <p className="cart-summary__total">
        Разом: <strong>{formatPrice(total)}</strong>
      </p>
    </div>
  );
}
```

```css title="src/components/CartSummary.css"
.cart-summary__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.cart-item {
  display: grid;
  grid-template-columns: 56px 1fr auto auto auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e2e8f0;
}

.cart-item__img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 8px;
  background: #f1f5f9;
}

.cart-item__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.cart-item__title {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cart-item__price {
  font-size: 0.85rem;
  color: #64748b;
}

.cart-item__qty {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.cart-item__qty button,
.cart-item__remove {
  width: 2rem;
  height: 2rem;
  font: inherit;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
}

.cart-item__sum {
  min-width: 5.5rem;
  font-weight: 600;
  text-align: right;
}

.cart-summary__total {
  margin-top: 1rem;
  font-size: 1.1rem;
  text-align: right;
}
```

### Крок 8. Фінальний App.jsx

```jsx title="src/App.jsx"
import { useState } from 'react';
import Header from './components/Header';
import ProductList from './components/ProductList';
import CategoryFilter from './components/CategoryFilter';
import SortSelect from './components/SortSelect';
import CartSummary from './components/CartSummary';
import Modal from './components/Modal';
import { products } from './data/products';
import { getCategories, filterByCategory, sortProducts } from './utils/products';
import './App.css';

export default function App() {
  // --- Стан: лише те, що не можна обчислити ---
  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('default');
  const [isCartOpen, setIsCartOpen] = useState(false);

  // --- Обробники кошика (без змін з П5) ---
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

  // --- Похідні дані ---
  const categories = getCategories(products);
  const visibleProducts = sortProducts(filterByCategory(products, category), sort);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <>
      <Header cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />

      <main className="container">
        <div className="toolbar">
          <CategoryFilter categories={categories} value={category} onChange={setCategory} />
          <SortSelect value={sort} onChange={setSort} />
          <p className="toolbar__info">Знайдено: {visibleProducts.length}</p>
        </div>

        <ProductList products={visibleProducts} onAddToCart={handleAddToCart} />
      </main>

      <Modal isOpen={isCartOpen} title="Ваш кошик" onClose={() => setIsCartOpen(false)}>
        <CartSummary
          items={cart}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onRemove={handleRemove}
        />
      </Modal>
    </>
  );
}
```

:::note[onClose і масив залежностей]
`onClose={() => setIsCartOpen(false)}` створює **нову** функцію на кожному рендері `App`, тому ефект у `Modal` перезапускатиметься (зняв слухача — поставив нового). Для нашого застосунку це непомітно. Якщо колись знадобиться стабільна функція — для цього є `useCallback`; детальніше — на практичній 13.
:::

Перевірте:

1. Кнопка «🛒 Кошик» відкриває вікно, `×`, клік по фону і `Escape` — закривають.
2. Кнопки `+`/`−`/`✕` усередині вікна працюють і **не закривають** його.
3. При порожньому кошику у вікні — повідомлення, бейдж у шапці зник.
4. Фільтр, сортування і кошик працюють незалежно один від одного.

### Крок 9. Перевірка в React DevTools і коміт

1. Відкрийте вкладку **Components**, виділіть `ProductList` — у правій панелі видно проп `products` з поточним відфільтрованим масивом.
2. Виділіть будь-який `ProductCard`, увімкніть ♥ — змінився лише стан цієї картки (`State: true`).
3. У налаштуваннях DevTools (⚙) увімкніть **Highlight updates when components render** і змініть сортування. Подивіться, які компоненти перемальовуються.

```bash
git add .
git commit -m "P9: ProductList, filters, sorting, Modal with cart"
```

**Результат роботи:** каталог з фільтром за категорією, сортуванням і лічильником знайдених товарів; кошик відкривається в модальному вікні, побудованому через композицію; усі похідні значення обчислюються під час рендеру.

## Завдання для самостійного виконання

1. ★ Додайте до `SORT_OPTIONS` варіант «За назвою (А–Я)» з використанням `a.title.localeCompare(b.title)`.
2. ★ Додайте в панель кнопку «Скинути фільтри», яка показується **лише** тоді, коли обрано категорію або нестандартне сортування, і повертає обидва значення до початкових.
3. ★★ Створіть компонент `Card` з пропсами `title` і `children` та використайте його для обгортання панелі фільтрів. Порівняйте, як змінився код `App`.
4. ★★ Додайте фільтр «Лише зі знижкою понад 10 %» (checkbox). Чи потрібен для нього новий стан? Чи потрібен стан для кількості товарів зі знижкою?
5. ★★★ Перепишіть `Modal` на нативний елемент `<dialog>`: використайте `useRef`, у ефекті викликайте `dialogRef.current.showModal()` або `close()` залежно від `isOpen`, обробіть подію `close` елемента. Порівняйте поведінку фокусу з власною реалізацією.

## Контрольні питання

1. Які кроки пропонує підхід «Thinking in React»? Як визначити, де має жити стан?
2. За якими ознаками значення **не** повинно бути станом? Наведіть три приклади похідних даних з «Міні-магазину».
3. Чому синхронізація двох станів через `useEffect` (наприклад, `cart` → `cartCount`) вважається поганою практикою?
4. Чим `toSorted()` відрізняється від `sort()`? Чому це важливо в React?
5. Що таке проп `children`? Наведіть два приклади компонентів-обгорток.
6. Чому в `Modal` хук `useEffect` стоїть перед `if (!isOpen) return null`?
7. Навіщо в модальному вікні `event.stopPropagation()`? Що станеться без нього?
8. Чому вираз `{items.length && <List />}` може вивести на сторінку `0`?
9. Чому `CategoryFilter` передає батькові рядок, а не об'єкт події?

## Домашнє завдання

1. Додайте до `ProductList` проп `emptyText` зі значенням за замовчуванням і передайте з `App` текст, що залежить від обраної категорії (наприклад, «У категорії smartphones немає товарів»).
2. Виконайте завдання ★2 («Скинути фільтри»), якщо не встигли на парі.
3. Намалюйте (на папері або в будь-якому редакторі) дерево компонентів вашого застосунку з позначенням стану і пропсів кожного компонента.

## Що здати

- Посилання на репозиторій з комітом `P9: ...`.
- Скриншоти: каталог з обраною категорією і сортуванням; відкрите модальне вікно кошика; порожній кошик.
- Скриншот React DevTools з хуками стану `App`.
- Відповіді на контрольні питання.
