---
title: "Стан. Хук useState"
description: "Знайомимося зі станом компонента і хуком useState: знімок стану, групування оновлень, функціональне оновлення, незмінність масивів і об'єктів, підйом стану. У «Міні-магазині» з'являються обране, кошик з лічильником у шапці та підсумок кошика з кнопками +/−/видалити."
type: practice
pair: 5
topic: 75
---

## Мета роботи

- Зрозуміти, що таке стан (state) компонента і чим він відрізняється від звичайних змінних і пропсів.
- Навчитися використовувати хук `useState`, розуміти поняття «знімок стану» (snapshot) і групування оновлень (batching).
- Застосовувати функціональне оновлення `setX(prev => ...)`.
- Оновлювати масиви й об'єкти в стані **незмінно** (immutably) — через `map`, `filter`, spread.
- Опанувати підйом стану (lifting state up) до спільного батьківського компонента.
- Додати в «Міні-магазин»: «обране» (♥) у картці, кошик у стані `App`, лічильник у шапці, компонент `CartSummary` з сумою і кнопками +/−/видалити.

## Що потрібно

- Проєкт `mini-shop` у стані після практичної 3 (компоненти `Header`, `ProductCard`, дані `data/products.js`, функція `utils/format.js`).
- Node.js LTS, VS Code, браузер з React Developer Tools.
- Матеріал лекцій 2 і 4 (JSX, пропси, функції-колбеки).

## Короткі теоретичні відомості

### Чому звичайна змінна не працює

Спробуймо зробити лічильник «звичайним» способом:

```jsx
function Counter() {
  let count = 0;

  function handleClick() {
    count = count + 1;
    console.log(count); // 1, 2, 3...
  }

  return <button onClick={handleClick}>Натиснуто: {count}</button>;
}
```

У консолі число зростає, а на екрані завжди «0». Дві причини:

1. **Зміна локальної змінної не запускає рендер.** React не знає, що щось змінилося.
2. **Локальні змінні не зберігаються між рендерами.** Навіть якби рендер відбувся, функція `Counter` виконалася б заново, і `count` знову став би `0`.

### Хук useState

**Стан** (state) — це «пам'ять» компонента: дані, які зберігаються між рендерами і зміна яких змушує React перемалювати компонент. Стан створюється хуком `useState`:

```jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  //     │       │                  └─ початкове значення (лише для першого рендеру)
  //     │       └─ функція-сеттер: змінює стан і запускає повторний рендер
  //     └─ поточне значення стану

  return <button onClick={() => setCount(count + 1)}>Натиснуто: {count}</button>;
}
```

`useState` повертає масив з двох елементів, який ми деструктуризуємо. Назви довільні, але домовленість — `[щось, setЩось]`: `[isOpen, setIsOpen]`, `[items, setItems]`.

Що відбувається при кліку:

```text
1. setCount(1)  → React запам'ятовує нове значення і планує рендер
2. React знову викликає Counter()
3. useState(0) тепер повертає [1, setCount] — початкове значення ігнорується
4. Новий JSX: «Натиснуто: 1» → React оновлює текст у DOM
```

**Хуки** (hooks) — це функції, назва яких починається з `use`. Вони «підключають» компонент до можливостей React. Два правила хуків:

1. Викликайте хуки **лише на верхньому рівні** компонента — не всередині `if`, циклів, вкладених функцій. React розрізняє хуки за **порядком виклику**, тому порядок має бути однаковим при кожному рендері.
2. Викликайте хуки **лише з компонентів** (або з власних хуків).

### Стан — це знімок

Найважливіша і найменш очевидна властивість: **значення стану всередині рендеру не змінюється**. Кожен рендер «бачить» свій знімок (snapshot) стану. Виклик сеттера не змінює змінну `count` у поточному виконанні функції — він лише просить React зробити **новий** рендер з новим значенням.

```jsx
function handleClick() {
  setCount(count + 1);
  console.log(count); // ← старе значення! Наприклад, 0, а не 1
}
```

Ще яскравіше:

```jsx
function handleTriple() {
  setCount(count + 1); // count = 0 → «встанови 1»
  setCount(count + 1); // count досі 0 → «встанови 1»
  setCount(count + 1); // count досі 0 → «встанови 1»
}
// Результат: 1, а не 3
```

### Групування оновлень (batching)

React не робить рендер після кожного виклику сеттера. Він збирає всі оновлення з одного обробника події і виконує **один** рендер наприкінці. Це називається групуванням (batching). Тому три виклики вище дають один рендер — і всі вони спиралися на той самий знімок.

### Функціональне оновлення

Щоб обчислити новий стан **на основі попереднього**, передайте в сеттер не значення, а **функцію-оновлювач** (updater function):

```jsx
function handleTriple() {
  setCount(prev => prev + 1); // 0 → 1
  setCount(prev => prev + 1); // 1 → 2
  setCount(prev => prev + 1); // 2 → 3
}
// Результат: 3
```

React ставить оновлювачі в чергу і виконує їх по черзі, передаючи кожному результат попереднього.

| Запис | Коли використовувати |
|---|---|
| `setX(newValue)` | Нове значення не залежить від старого: `setQuery('')`, `setIsOpen(true)` |
| `setX(prev => ...)` | Нове значення обчислюється зі старого: лічильники, додавання до масиву, перемикання `prev => !prev` |

Функціональне оновлення — безпечніший вибір щоразу, коли новий стан залежить від попереднього. Ми використовуватимемо його для всіх операцій з кошиком.

### Незмінність: не мутуйте стан

React визначає, чи змінився стан, порівнюючи **посилання** (`Object.is(old, new)`). Якщо змінити масив «на місці» і передати той самий масив у сеттер, React вирішить, що нічого не змінилося, і **не перемалює** компонент:

```jsx
// ❌ Мутація: той самий масив, React не бачить змін
cart.push(item);
setCart(cart);

// ✅ Новий масив
setCart([...cart, item]);
```

Шпаргалка незмінних операцій:

| Операція | ❌ Мутує | ✅ Повертає нове |
|---|---|---|
| Додати в кінець | `arr.push(x)` | `[...arr, x]` |
| Додати на початок | `arr.unshift(x)` | `[x, ...arr]` |
| Видалити | `arr.splice(i, 1)` | `arr.filter(item => item.id !== id)` |
| Замінити/змінити елемент | `arr[i] = x`, `arr[i].qty++` | `arr.map(item => item.id === id ? { ...item, qty: item.qty + 1 } : item)` |
| Сортувати | `arr.sort()` | `arr.toSorted()` або `[...arr].sort()` |
| Розвернути | `arr.reverse()` | `arr.toReversed()` |
| Змінити поле об'єкта | `obj.name = 'x'` | `{ ...obj, name: 'x' }` |

:::caution[Spread — поверхнева копія]
`[...cart]` створює новий масив, але **об'єкти всередині — ті самі**. Тому `const copy = [...cart]; copy[0].qty++` все одно мутує стан. Змінюючи вкладений об'єкт, копіюйте і його: `{ ...item, qty: item.qty + 1 }`.
:::

### Підйом стану (lifting state up)

Стан належить компоненту, у якому він оголошений, і його бачать лише цей компонент і ті, кому він передасть його пропсами. Якщо **кілька компонентів** мають працювати з тими самими даними, стан піднімають до їхнього **найближчого спільного предка** і передають униз:

```text
              App  ← стан cart живе тут
     ┌─────────┼──────────────┐
  Header   ProductCard ×8   CartSummary
  cartCount  onAddToCart    items, onIncrement, onDecrement, onRemove
```

- `Header` має показувати кількість товарів;
- `ProductCard` має додавати товар у кошик;
- `CartSummary` має показувати позиції і змінювати кількість.

Їхній спільний предок — `App`. Він володіє станом, а діти отримують дані й функції-колбеки через пропси (саме так, як ми розбирали на лекції 4). Протилежний випадок — «обране» (♥) у картці: воно потрібне лише самій картці, тому стан залишається локальним у `ProductCard`.

### Похідні значення не зберігаємо в стані

Якщо значення можна **обчислити** з наявного стану чи пропсів, не створюйте для нього окремий `useState`:

```jsx
// ❌ Зайвий стан, який треба синхронізувати вручну
const [cart, setCart] = useState([]);
const [cartCount, setCartCount] = useState(0);

// ✅ Обчислюємо під час рендеру
const [cart, setCart] = useState([]);
const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
```

## Хід роботи

### Крок 1. Підготовка

Відкрийте проєкт `mini-shop`, запустіть dev-сервер і переконайтеся, що каталог з практичної 3 працює:

```bash
cd mini-shop
npm run dev
```

Якщо ви виконували самостійні завдання практичної 3 (категорія, стара ціна тощо) — їх можна залишити, але далі в лістингах наводиться базовий варіант.

План змін на цю пару:

| Файл | Що змінюємо |
|---|---|
| `components/ProductCard.jsx`, `.css` | Кнопка ♥ з локальним станом; проп `onAddToCart` |
| `App.jsx` | Стан `cart` і функції роботи з кошиком |
| `components/Header.jsx` | Проп `cartCount` |
| `components/CartSummary.jsx`, `.css` | **Новий** компонент підсумку кошика |
| `App.css` | Дві колонки: каталог і кошик |

### Крок 2. Перший стан: «обране» у картці

Позначка «обране» стосується лише конкретної картки, тому стан живе в самому `ProductCard`. Додайте імпорт `useState`, стан `isFavorite` і кнопку-сердечко:

```jsx title="src/components/ProductCard.jsx" {1,6,12-21}
import { useState } from 'react';
import { formatPrice } from '../utils/format.js';
import './ProductCard.css';

export default function ProductCard({ product }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const { title, description, price, discountPercentage, rating, stock, brand, thumbnail } =
    product;

  return (
    <article className="product-card">
      <button
        type="button"
        className={`product-card__fav${isFavorite ? ' product-card__fav--active' : ''}`}
        onClick={() => setIsFavorite((prev) => !prev)}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? 'Прибрати з обраного' : 'Додати в обране'}
        title={isFavorite ? 'Прибрати з обраного' : 'Додати в обране'}
      >
        {isFavorite ? '♥' : '♡'}
      </button>

      {/* ...далі зображення і тіло картки без змін... */}
```

- `setIsFavorite(prev => !prev)` — перемикач через функціональне оновлення;
- `aria-pressed` повідомляє програмам зчитування з екрана, що це кнопка-перемикач і в якому вона стані;
- клас-модифікатор `product-card__fav--active` додається умовно.

Додайте стилі в кінець `ProductCard.css`:

```css title="src/components/ProductCard.css (додати в кінець)"
.product-card__fav {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background-color: rgb(255 255 255 / 0.9);
  color: var(--color-muted);
  font-size: 1.2rem;
  line-height: 1;
  transition: transform 0.15s, color 0.15s;
}

.product-card__fav:hover {
  transform: scale(1.1);
}

.product-card__fav--active {
  border-color: #fecdd3;
  color: var(--color-accent);
}
```

Перевірте: клацання на ♡ у різних картках перемикає їх **незалежно** — у кожного екземпляра компонента власний стан. Відкрийте React DevTools → Components, виділіть `ProductCard`: у розділі **hooks** з'явиться `State: false`, після кліку — `true`.

:::note
Стан «обраного» зникає після перезавантаження сторінки — він живе лише в пам'яті. Збереження в `localStorage` додамо на практичній 13 за допомогою власного хука.
:::

### Крок 3. Де житиме кошик

Перш ніж писати код, визначимо мінімальний стан кошика. Позиція кошика — об'єкт:

```js
{ id: 6, title: 'Calvin Klein CK One', price: 49.99, thumbnail: 'https://...', qty: 2 }
```

Кошик — масив таких позицій. Ми **не зберігаємо** в стані:

- загальну кількість товарів (обчислюється через `reduce` по `qty`);
- загальну суму (обчислюється через `reduce` по `price * qty`);
- повний об'єкт товару (опис, рейтинг тощо кошику не потрібні).

Як визначили в теоретичній частині, стан піднімаємо в `App`, бо з кошиком працюють три компоненти.

### Крок 4. Стан кошика і додавання товару

Оновіть `App.jsx`: імпортуйте `useState`, створіть стан і функцію `handleAddToCart`:

```jsx title="src/App.jsx (фрагмент)"
import { useState } from 'react';
// ...інші імпорти

export default function App() {
  const [cart, setCart] = useState([]);

  // Додати товар: якщо вже є — збільшити qty, інакше — додати нову позицію
  function handleAddToCart(product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);

      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }

      const { id, title, price, thumbnail } = product;
      return [...prev, { id, title, price, thumbnail, qty: 1 }];
    });
  }

  // ...
}
```

Розберемо незмінне оновлення:

- `prev.find(...)` лише **читає** масив — це безпечно;
- `prev.map(...)` створює **новий** масив; для потрібної позиції — **новий** об'єкт `{ ...item, qty: item.qty + 1 }`, решта позицій повертаються як є (ті самі посилання);
- `[...prev, newItem]` — новий масив з доданою позицією.

Передайте функцію в картки:

```jsx title="src/App.jsx (фрагмент)"
{products.map((product) => (
  <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
))}
```

У `ProductCard` прийміть проп і повісьте його на кнопку:

```jsx title="src/components/ProductCard.jsx (фрагменти)"
export default function ProductCard({ product, onAddToCart }) {
  // ...
        <button
          type="button"
          className="product-card__btn"
          onClick={() => onAddToCart(product)}
          disabled={stock === 0}
        >
          У кошик
        </button>
```

Картка нічого не знає про кошик — вона лише повідомляє батька: «користувач хоче додати цей товар». Рішення, що робити (додати нову позицію чи збільшити кількість), приймає власник стану — `App`.

Перевірте в DevTools: виділіть `App`, клацайте «У кошик» на різних товарах і спостерігайте, як змінюється `State` у розділі hooks.

### Крок 5. Лічильник у шапці

Кількість товарів — похідне значення. Обчисліть її в `App` перед `return` і передайте в `Header`:

```jsx title="src/App.jsx (фрагмент)"
const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

return (
  <>
    <Header cartCount={cartCount} />
    {/* ... */}
  </>
);
```

```jsx title="src/components/Header.jsx"
import './Header.css';

export default function Header({ cartCount }) {
  return (
    <header className="header">
      <div className="container header__inner">
        <a href="/" className="header__logo">
          🛍️ Міні-магазин
        </a>

        <div className="header__cart" aria-label={`Товарів у кошику: ${cartCount}`}>
          🛒 Кошик <span className="header__badge">{cartCount}</span>
        </div>
      </div>
    </header>
  );
}
```

Тепер кожне натискання «У кошик» збільшує число в шапці. `Header` не має власного стану — він просто відображає проп. Коли `App` перерендерюється з новим `cart`, `Header` отримує новий `cartCount`.

:::tip[Подивіться на рендери]
У налаштуваннях React DevTools увімкніть **Highlight updates when components render**. Натисніть «У кошик» — підсвітяться `App` і **всі** його діти. Це нормально: коли рендериться батько, за замовчуванням рендеряться і діти. React усе одно змінить у DOM лише число в бейджі. Оптимізації (`memo`, React Compiler) потрібні лише при реальних проблемах з продуктивністю.
:::

### Крок 6. Компонент CartSummary

Створіть компонент, що показує позиції кошика, кількість, суму і кнопки керування. Він **презентаційний**: отримує дані й колбеки, власного стану не має.

```jsx title="src/components/CartSummary.jsx"
import { formatPrice } from '../utils/format.js';
import './CartSummary.css';

export default function CartSummary({ items, onIncrement, onDecrement, onRemove }) {
  // Похідні значення — обчислюємо під час рендеру
  const totalCount = items.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  if (items.length === 0) {
    return (
      <aside className="cart">
        <h2 className="cart__title">Кошик</h2>
        <p className="cart__empty">Кошик порожній. Додайте товари з каталогу.</p>
      </aside>
    );
  }

  return (
    <aside className="cart">
      <h2 className="cart__title">Кошик</h2>

      <ul className="cart__list">
        {items.map((item) => (
          <li key={item.id} className="cart__item">
            <img className="cart__thumb" src={item.thumbnail} alt="" width="56" height="56" />

            <div className="cart__info">
              <p className="cart__name">{item.title}</p>
              <p className="cart__line-price">
                {formatPrice(item.price)} × {item.qty} = {formatPrice(item.price * item.qty)}
              </p>
            </div>

            <div className="cart__controls">
              <button
                type="button"
                className="cart__btn"
                onClick={() => onDecrement(item.id)}
                aria-label={`Зменшити кількість: ${item.title}`}
              >
                −
              </button>
              <span className="cart__qty">{item.qty}</span>
              <button
                type="button"
                className="cart__btn"
                onClick={() => onIncrement(item.id)}
                aria-label={`Збільшити кількість: ${item.title}`}
              >
                +
              </button>
              <button
                type="button"
                className="cart__btn cart__btn--remove"
                onClick={() => onRemove(item.id)}
                aria-label={`Видалити з кошика: ${item.title}`}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="cart__total">
        <span>Разом ({totalCount} шт.):</span>
        <strong>{formatPrice(totalPrice)}</strong>
      </div>
    </aside>
  );
}
```

Зверніть увагу:

- ранній `return` для порожнього кошика — умовний рендеринг з лекції 2;
- `alt=""` у мініатюрі — зображення декоративне, назва товару вже є текстом поруч;
- `aria-label` на кнопках-символах: програма зчитування з екрана прочитає «Збільшити кількість: Red Lipstick», а не «плюс»;
- колбеки викликаються з `item.id` — `CartSummary` не змінює масив сам, лише повідомляє `App`.

```css title="src/components/CartSummary.css"
.cart {
  position: sticky;
  top: 88px; /* висота шапки + відступ */
  padding: 20px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.cart__title {
  margin-bottom: 12px;
  font-size: 1.25rem;
}

.cart__empty {
  color: var(--color-muted);
}

.cart__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.cart__item {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 8px 12px;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.cart__thumb {
  width: 56px;
  height: 56px;
  object-fit: contain;
  border-radius: 8px;
  background-color: #f9fafb;
}

.cart__name {
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.3;
}

.cart__line-price {
  color: var(--color-muted);
  font-size: 0.8rem;
}

.cart__controls {
  display: flex;
  grid-column: 2;
  align-items: center;
  gap: 6px;
}

.cart__btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background-color: var(--color-surface);
  line-height: 1;
}

.cart__btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.cart__btn--remove {
  margin-left: auto;
  color: var(--color-muted);
}

.cart__btn--remove:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.cart__qty {
  min-width: 24px;
  font-weight: 600;
  text-align: center;
}

.cart__total {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  font-size: 1.05rem;
}
```

### Крок 7. Збільшення, зменшення і видалення

Додайте в `App` ще три функції. Усі вони використовують функціональне оновлення і незмінні операції:

```jsx title="src/App.jsx (фрагмент)"
// +1 до кількості
function handleIncrement(id) {
  setCart((prev) =>
    prev.map((item) => (item.id === id ? { ...item, qty: item.qty + 1 } : item))
  );
}

// −1 до кількості; позиція з qty = 0 видаляється з кошика
function handleDecrement(id) {
  setCart((prev) =>
    prev
      .map((item) => (item.id === id ? { ...item, qty: item.qty - 1 } : item))
      .filter((item) => item.qty > 0)
  );
}

// Видалити позицію повністю
function handleRemove(id) {
  setCart((prev) => prev.filter((item) => item.id !== id));
}
```

Логіка `handleDecrement`: спершу `map` зменшує кількість потрібної позиції, потім `filter` прибирає позиції з нульовою кількістю. Обидва методи повертають нові масиви — стан не мутується.

### Крок 8. Розмітка сторінки з кошиком

Додайте `CartSummary` в `App` поруч із каталогом і змініть клас `main`:

```jsx title="src/App.jsx (фрагмент)"
<main className="container layout">
  <section className="catalog">
    {/* ...заголовок і сітка карток без змін... */}
  </section>

  <CartSummary
    items={cart}
    onIncrement={handleIncrement}
    onDecrement={handleDecrement}
    onRemove={handleRemove}
  />
</main>
```

Додайте в `App.css` двоколонкову розмітку (решта стилів з практичної 3 залишається):

```css title="src/App.css (додати на початок)"
/* Каталог зліва, кошик справа; на вузьких екранах — одна колонка */
.layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
  align-items: start;
  padding-top: 24px;
  padding-bottom: 48px;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
```

Оскільки відступи тепер задає `.layout`, змініть правило `.catalog`:

```css title="src/App.css (змінити)"
.catalog {
  min-width: 0; /* дозволяє сітці карток стискатися всередині grid-колонки */
}
```

Перевірте весь сценарій:

1. Кошик порожній — показується «Кошик порожній...», бейдж у шапці — 0.
2. Додайте «Red Lipstick» двічі і «Apple» один раз — у кошику дві позиції, бейдж — 3, сума — 27,97 $.
3. Натисніть «−» біля «Apple» — позиція зникне.
4. «+» біля помади — кількість 3; «✕» — кошик знову порожній.
5. Позначте кілька товарів ♥ і додайте щось у кошик — «обране» не скидається: локальний стан карток зберігається, бо картки не перестворюються (ті самі `key` на тих самих місцях).

### Крок 9. Експеримент: що буде, якщо мутувати стан

Щоб на власні очі побачити, чому стан не можна мутувати, **тимчасово** замініть `handleIncrement`:

```jsx
// ❌ ТІЛЬКИ ДЛЯ ЕКСПЕРИМЕНТУ
function handleIncrement(id) {
  const item = cart.find((item) => item.id === id);
  item.qty += 1;     // мутуємо об'єкт у стані
  setCart(cart);     // передаємо ТОЙ САМИЙ масив
}
```

Натисніть «+» — нічого не зміниться: `Object.is(cart, cart) === true`, React пропускає рендер. Тепер натисніть «У кошик» на іншому товарі — і кількість «стрибне» на кілька одиниць одразу: мутація відбулася, просто не була показана. Саме такі «привидні» помилки виникають через мутацію стану.

Ще один експеримент — знімок стану. Тимчасово додайте в `handleAddToCart` після `setCart(...)` рядок `console.log(cart.length)` — у консолі завжди буде **попередня** довжина.

**Поверніть правильні версії функцій** перед продовженням.

### Крок 10. Повні лістинги

Нижче — повний код файлів, які змінювалися на цій практичній. Звірте з ними свій проєкт: саме з цього стану починаються наступні практичні роботи. Файли `src/data/products.js`, `src/utils/format.js`, `src/main.jsx`, `src/index.css` і `src/components/Header.css` не змінювалися з практичної 3.

```jsx title="src/App.jsx"
import { useState } from 'react';
import Header from './components/Header.jsx';
import ProductCard from './components/ProductCard.jsx';
import CartSummary from './components/CartSummary.jsx';
import { products } from './data/products.js';
import './App.css';

export default function App() {
  // Кошик: масив позицій { id, title, price, thumbnail, qty }
  const [cart, setCart] = useState([]);

  // Додати товар: якщо вже є — збільшити qty, інакше — додати нову позицію
  function handleAddToCart(product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);

      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }

      const { id, title, price, thumbnail } = product;
      return [...prev, { id, title, price, thumbnail, qty: 1 }];
    });
  }

  // +1 до кількості
  function handleIncrement(id) {
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, qty: item.qty + 1 } : item))
    );
  }

  // −1 до кількості; позиція з qty = 0 видаляється з кошика
  function handleDecrement(id) {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, qty: item.qty - 1 } : item))
        .filter((item) => item.qty > 0)
    );
  }

  // Видалити позицію повністю
  function handleRemove(id) {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }

  // Похідне значення — не зберігаємо в стані
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

```css title="src/App.css"
/* Каталог зліва, кошик справа; на вузьких екранах — одна колонка */
.layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
  align-items: start;
  padding-top: 24px;
  padding-bottom: 48px;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }
}

.catalog {
  min-width: 0; /* дозволяє сітці карток стискатися всередині grid-колонки */
}

.catalog__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 20px;
}

.catalog__title {
  font-size: 1.75rem;
}

.catalog__count {
  color: var(--color-muted);
}

/* Адаптивна сітка: стільки колонок по 220px+, скільки влізе */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}
```

```jsx title="src/components/Header.jsx"
import './Header.css';

export default function Header({ cartCount }) {
  return (
    <header className="header">
      <div className="container header__inner">
        <a href="/" className="header__logo">
          🛍️ Міні-магазин
        </a>

        <div className="header__cart" aria-label={`Товарів у кошику: ${cartCount}`}>
          🛒 Кошик <span className="header__badge">{cartCount}</span>
        </div>
      </div>
    </header>
  );
}
```

```jsx title="src/components/ProductCard.jsx"
import { useState } from 'react';
import { formatPrice } from '../utils/format.js';
import './ProductCard.css';

export default function ProductCard({ product, onAddToCart }) {
  // Локальний стан: «обране» потрібне лише самій картці
  const [isFavorite, setIsFavorite] = useState(false);
  const { title, description, price, discountPercentage, rating, stock, brand, thumbnail } =
    product;

  return (
    <article className="product-card">
      <button
        type="button"
        className={`product-card__fav${isFavorite ? ' product-card__fav--active' : ''}`}
        onClick={() => setIsFavorite((prev) => !prev)}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? 'Прибрати з обраного' : 'Додати в обране'}
        title={isFavorite ? 'Прибрати з обраного' : 'Додати в обране'}
      >
        {isFavorite ? '♥' : '♡'}
      </button>

      <img
        className="product-card__image"
        src={thumbnail}
        alt={title}
        width="300"
        height="300"
        loading="lazy"
      />

      <div className="product-card__body">
        {/* brand є не в усіх товарів — показуємо лише якщо він є */}
        {brand && <p className="product-card__brand">{brand}</p>}
        <h3 className="product-card__title">{title}</h3>
        <p className="product-card__desc">{description}</p>
        <p className="product-card__rating">★ {rating.toFixed(1)}</p>

        <div className="product-card__price-row">
          <span className="product-card__price">{formatPrice(price)}</span>
          {discountPercentage > 0 && (
            <span className="product-card__discount">−{Math.round(discountPercentage)}%</span>
          )}
        </div>

        <p className="product-card__stock">
          {stock > 0 ? `В наявності: ${stock} шт.` : 'Немає в наявності'}
        </p>

        <button
          type="button"
          className="product-card__btn"
          onClick={() => onAddToCart(product)}
          disabled={stock === 0}
        >
          У кошик
        </button>
      </div>
    </article>
  );
}
```

```jsx title="src/components/CartSummary.jsx"
import { formatPrice } from '../utils/format.js';
import './CartSummary.css';

export default function CartSummary({ items, onIncrement, onDecrement, onRemove }) {
  // Похідні значення — обчислюємо під час рендеру
  const totalCount = items.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  if (items.length === 0) {
    return (
      <aside className="cart">
        <h2 className="cart__title">Кошик</h2>
        <p className="cart__empty">Кошик порожній. Додайте товари з каталогу.</p>
      </aside>
    );
  }

  return (
    <aside className="cart">
      <h2 className="cart__title">Кошик</h2>

      <ul className="cart__list">
        {items.map((item) => (
          <li key={item.id} className="cart__item">
            <img className="cart__thumb" src={item.thumbnail} alt="" width="56" height="56" />

            <div className="cart__info">
              <p className="cart__name">{item.title}</p>
              <p className="cart__line-price">
                {formatPrice(item.price)} × {item.qty} = {formatPrice(item.price * item.qty)}
              </p>
            </div>

            <div className="cart__controls">
              <button
                type="button"
                className="cart__btn"
                onClick={() => onDecrement(item.id)}
                aria-label={`Зменшити кількість: ${item.title}`}
              >
                −
              </button>
              <span className="cart__qty">{item.qty}</span>
              <button
                type="button"
                className="cart__btn"
                onClick={() => onIncrement(item.id)}
                aria-label={`Збільшити кількість: ${item.title}`}
              >
                +
              </button>
              <button
                type="button"
                className="cart__btn cart__btn--remove"
                onClick={() => onRemove(item.id)}
                aria-label={`Видалити з кошика: ${item.title}`}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="cart__total">
        <span>Разом ({totalCount} шт.):</span>
        <strong>{formatPrice(totalPrice)}</strong>
      </div>
    </aside>
  );
}
```

`src/components/ProductCard.css` — стилі з практичної 3 плюс блок `.product-card__fav` з кроку 2. `src/components/CartSummary.css` — повністю наведено в кроці 6.

Структура проєкту на кінець практичної:

```text
src/
├── components/
│   ├── CartSummary.css     ← новий
│   ├── CartSummary.jsx     ← новий
│   ├── Header.css
│   ├── Header.jsx          ← проп cartCount
│   ├── ProductCard.css     ← стилі ♥
│   └── ProductCard.jsx     ← стан isFavorite, проп onAddToCart
├── data/
│   └── products.js
├── utils/
│   └── format.js
├── App.css                 ← двоколонкова розмітка
├── App.jsx                 ← стан cart і обробники
├── index.css
└── main.jsx
```

### Крок 11. Коміт

```bash
git add .
git commit -m "P5: useState — favorites, cart state, CartSummary"
```

**Результат роботи:** у «Міні-магазині» можна позначати товари як обрані, додавати їх у кошик, змінювати кількість і видаляти позиції; лічильник у шапці і сума в кошику оновлюються автоматично.

## Завдання для самостійного виконання

1. ★ Додайте в `CartSummary` кнопку «Очистити кошик», яка викликає новий колбек `onClear` з `App` (`setCart([])`). Показуйте кнопку лише коли кошик не порожній.
2. ★ Якщо товар уже є в кошику, змініть текст кнопки в картці на «У кошику (N)». Підказка: обчисліть у `App` кількість для кожного товару і передайте в картку проп `inCartQty`.
3. ★★ Обмежте кількість залишком на складі: не дозволяйте додати в кошик більше, ніж `stock`. Для цього збережіть `stock` у позиції кошика або передайте його в обробник; кнопку «+» у `CartSummary` блокуйте, коли `qty === stock`.
4. ★★ Покажіть у `CartSummary` економію від знижок: «Ви заощаджуєте: X $». Для цього збережіть у позиції `discountPercentage` (позиція залишається сумісною — додаткове поле не заважає). Обчислюйте економію під час рендеру.
5. ★★★ Перенесіть «обране» з локального стану карток у `App` (масив `favoriteIds`), підніміть стан і покажіть у шапці лічильник обраних (♥ N). Поясніть у звіті, чому тепер стан має жити вище. (Виконуйте в окремій гілці Git: в основній гілці «обране» залишається локальним, на практичній 14 ми повернемося до цього завдання.)

## Контрольні питання

1. Чому звичайна змінна `let` не підходить для зберігання даних, що змінюються в компоненті?
2. Що повертає `useState`? Коли використовується початкове значення?
3. Назвіть два правила хуків. Чому хуки не можна викликати всередині `if`?
4. Що означає «стан — це знімок»? Що виведе `console.log(count)` одразу після `setCount(count + 1)`?
5. Чому три виклики `setCount(count + 1)` поспіль збільшують лічильник лише на 1? Як це виправити?
6. Чому стан не можна мутувати? Як React визначає, що стан змінився?
7. Як незмінно змінити поле `qty` в одному об'єкті масиву?
8. Що таке підйом стану? Чому кошик живе в `App`, а «обране» — у `ProductCard`?
9. Чому загальну кількість і суму кошика не варто зберігати в окремому стані?

## Домашнє завдання

1. Завершіть кроки 1–11, якщо не встигли на парі, і виконайте самостійне завдання 1 (★).
2. Виконайте щонайменше одне завдання ★★.
3. Поза проєктом (у пісочниці або новому Vite-проєкті) напишіть компонент `Stepwise` з лічильником і трьома кнопками: «+3 (неправильно)» — три виклики `setCount(count + 1)`, «+3 (правильно)» — три функціональні оновлення, «+1 через 2 с» — `setTimeout(() => setCount(count + 1), 2000)`. Натисніть останню кнопку тричі швидко і поясніть письмово (3–5 речень), чому результат саме такий і як його виправити.

## Що здати

- Посилання на репозиторій `mini-shop` з комітом цієї практичної (і виконаними самостійними завданнями).
- Скриншот застосунку з непорожнім кошиком і позначеними ♥ товарами.
- Скриншот React DevTools з виділеним `App` і розгорнутим станом кошика (розділ hooks).
- Відповіді на контрольні питання і пояснення до домашнього завдання 3.
