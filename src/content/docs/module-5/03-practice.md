---
title: "Налаштування середовища (Vite) і перший React-застосунок"
description: "Створюємо проєкт «Міні-магазин» на Vite, розбираємо його структуру і npm-скрипти, готуємо статичні дані товарів, пишемо компоненти Header і ProductCard, виводимо каталог через map з ключами та знайомимося з React Developer Tools."
type: practice
pair: 3
topic: 73
---

## Мета роботи

- Налаштувати середовище для розробки на React: Node.js, VS Code, React Developer Tools.
- Створити проєкт `mini-shop` за допомогою Vite і розібратися в його структурі та npm-скриптах.
- Підготувати статичні дані товарів у форматі API DummyJSON і функцію форматування ціни.
- Написати перші компоненти `Header` і `ProductCard`, вивести каталог товарів через `map` з ключами.
- Зробити базове оформлення: сітку карток на CSS Grid.
- Навчитися переглядати дерево компонентів і пропси в React DevTools.

## Що потрібно

| Програма | Призначення | Де взяти |
|---|---|---|
| **Node.js LTS** (актуальна LTS-версія) | Виконання npm, запуск Vite | [nodejs.org](https://nodejs.org) |
| **VS Code** | Редактор коду | [code.visualstudio.com](https://code.visualstudio.com) |
| **Git** | Контроль версій | [git-scm.com](https://git-scm.com) |
| **React Developer Tools** | Розширення браузера для налагодження React | Chrome Web Store / Firefox Add-ons / Edge Add-ons |
| Сучасний браузер | Chrome, Edge або Firefox | — |

:::tip[Корисні розширення VS Code]
- **ES7+ React/Redux/React-Native snippets** — сніпети: `rfce` створює функціональний компонент з експортом.
- **ESLint** — підсвічування помилок за правилами проєкту (у шаблоні Vite ESLint уже налаштований).
- **Prettier** — автоформатування коду при збереженні.
- **Auto Rename Tag** — синхронне перейменування парних тегів у JSX.
:::

## Короткі теоретичні відомості

**Vite** (франц. «швидко», вимовляється «віт») — сучасний інструмент для створення і збирання фронтенд-проєктів. Він замінив застарілий Create React App і є рекомендованим способом почати SPA на React без фреймворку.

Vite працює у двох режимах:

| Режим | Команда | Що відбувається |
|---|---|---|
| **Розробка** (dev) | `npm run dev` | Запускається dev-сервер. Файли віддаються браузеру як нативні ES-модулі і перетворюються «на льоту» лише тоді, коли браузер їх запитує. Тому сервер стартує за долі секунди незалежно від розміру проєкту. Працює **HMR** (Hot Module Replacement) — заміна зміненого модуля без перезавантаження сторінки зі збереженням стану. |
| **Збирання** (build) | `npm run build` | Код оптимізується для production: JSX транспілюється, модулі об'єднуються в бандли, код мінімізується, файли отримують хеші в назвах для кешування. Результат — папка `dist/`. |

Під час розробки ланцюжок такий:

```text
src/main.jsx ──► Vite dev server ──► перетворення JSX у JS ──► браузер (ES-модулі)
      ▲                                                            │
      └──────────── зберегли файл → HMR оновлює лише цей модуль ◄──┘
```

**npm** (Node Package Manager) керує залежностями проєкту. Перелік залежностей і скриптів зберігається в `package.json`, точні встановлені версії — у `package-lock.json`, а самі пакети — у папці `node_modules/` (її ніколи не комітять у Git).

## Хід роботи

### Крок 1. Перевірка інструментів

Відкрийте термінал (у VS Code: **Terminal → New Terminal**) і перевірте версії:

```bash
node -v
npm -v
git --version
```

Має з'явитися щось на кшталт `v22.x.x` / `10.x.x`. Vite вимагає сучасної версії Node.js; якщо у вас стара версія (нижче 20), встановіть актуальну LTS.

Встановіть у браузер розширення **React Developer Tools**. Після встановлення на сайтах, зроблених на React (наприклад, [react.dev](https://react.dev)), іконка розширення стане кольоровою, а в DevTools з'являться вкладки **Components** і **Profiler**.

### Крок 2. Створення проєкту

Перейдіть у папку, де зберігаєте навчальні проєкти, і виконайте:

```bash
npm create vite@latest mini-shop -- --template react
```

- `npm create vite@latest` — завантажує і запускає утиліту `create-vite` останньої версії;
- `mini-shop` — назва папки проєкту;
- `--` — усе, що далі, передається самій утиліті, а не npm;
- `--template react` — шаблон React з JavaScript (не плутайте з `react-ts` — TypeScript, `react-swc` — інший транспілятор).

Утиліта може поставити додаткові запитання (наприклад, про експериментальні можливості чи про автоматичне встановлення залежностей). Експериментальні опції не вмикайте; на пропозицію встановити залежності й запустити проєкт можна погодитися або зробити це вручну:

```bash
cd mini-shop
npm install
npm run dev
```

У терміналі з'явиться адреса:

```text
  VITE vX.Y.Z  ready in 300 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

Відкрийте `http://localhost:5173` — ви побачите стартову сторінку з логотипами Vite і React і кнопкою-лічильником. Клацніть кілька разів на кнопку.

Відкрийте проєкт у VS Code (`code .` або **File → Open Folder**).

### Крок 3. Структура проєкту

```text
mini-shop/
├── node_modules/        # встановлені пакети (не редагуємо, не комітимо)
├── public/
│   └── vite.svg         # статичні файли, доступні за адресою /vite.svg «як є»
├── src/
│   ├── assets/
│   │   └── react.svg    # ресурси, які імпортуються в код і проходять через збирач
│   ├── App.css
│   ├── App.jsx          # головний компонент
│   ├── index.css        # глобальні стилі
│   └── main.jsx         # точка входу
├── .gitignore
├── eslint.config.js     # налаштування ESLint
├── index.html           # єдиний HTML-документ SPA
├── package.json
├── package-lock.json
├── README.md
└── vite.config.js       # налаштування Vite
```

Розгляньмо ключові файли.

```html title="index.html"
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>mini-shop</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

Зверніть увагу: `index.html` лежить у **корені** проєкту (не в `public/`) — для Vite це точка входу. Порожній `<div id="root">` — місце, куди React виведе весь інтерфейс. Скрипт підключається як ES-модуль.

```jsx title="src/main.jsx"
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- `react` — ядро: компоненти, хуки, JSX-runtime;
- `react-dom/client` — «рендерер» для браузера: перетворює React-елементи на DOM;
- `import './index.css'` — CSS імпортується прямо в JS; Vite сам додасть стилі на сторінку.

```js title="vite.config.js"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
```

Плагін `@vitejs/plugin-react` додає підтримку JSX і Fast Refresh (оновлення компонентів зі збереженням стану).

### Крок 4. npm-скрипти і залежності

Відкрийте `package.json`:

```json title="package.json (фрагмент)"
{
  "name": "mini-shop",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.x.x",
    "react-dom": "^19.x.x"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "...",
    "eslint": "...",
    "eslint-plugin-react-hooks": "...",
    "vite": "..."
  }
}
```

| Скрипт | Команда запуску | Призначення |
|---|---|---|
| `dev` | `npm run dev` | Dev-сервер з HMR на `localhost:5173` |
| `build` | `npm run build` | Production-збірка в папку `dist/` |
| `preview` | `npm run preview` | Локальний перегляд зібраної версії з `dist/` (порт 4173) |
| `lint` | `npm run lint` | Перевірка коду ESLint |

- `dependencies` — пакети, потрібні застосунку під час роботи (потраплять у бандл).
- `devDependencies` — інструменти розробки (збирач, лінтер); у бандл не потрапляють.
- `"type": "module"` — файли `.js` у проєкті трактуються як ES-модулі (`import/export`).
- `^19.x.x` — «сумісні версії»: npm може встановити будь-яку 19.y.z, але не 20.

Спробуйте збірку, щоб побачити, що генерує Vite (dev-сервер можна зупинити `Ctrl+C` або відкрити другий термінал):

```bash
npm run build
```

```text
dist/index.html                   0.46 kB
dist/assets/index-BxXz3k1q.css    1.39 kB
dist/assets/index-D8f2kLmN.js   194.05 kB │ gzip: 61.02 kB
✓ built in 900ms
```

Весь застосунок — один HTML, один CSS і один JS-файл. Назад до розробки: `npm run dev`.

### Крок 5. Очищення шаблону і глобальні стилі

Видаліть файли, які не знадобляться: `src/assets/react.svg` і `public/vite.svg`. Змініть `index.html` — мову документа, назву вкладки та іконку (емодзі через SVG data URI):

```html title="index.html" {2,5,7}
<!doctype html>
<html lang="uk">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛍️</text></svg>" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Міні-магазин</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

Повністю замініть вміст `src/index.css` — це глобальні стилі та CSS-змінні (custom properties), які використовуватимуть усі компоненти:

```css title="src/index.css"
:root {
  --color-bg: #f5f6fa;
  --color-surface: #ffffff;
  --color-text: #1f2430;
  --color-muted: #6b7280;
  --color-border: #e5e7eb;
  --color-primary: #4f46e5;
  --color-primary-dark: #4338ca;
  --color-accent: #e11d48;
  --color-success: #16a34a;
  --radius: 12px;
  --shadow: 0 1px 3px rgb(0 0 0 / 0.08), 0 4px 12px rgb(0 0 0 / 0.04);

  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.5;
  color: var(--color-text);
  background-color: var(--color-bg);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
}

h1,
h2,
h3,
p {
  margin: 0;
}

img {
  display: block;
  max-width: 100%;
}

button {
  font: inherit;
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Обгортка для вирівнювання вмісту по центру */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

/* Загальні кнопки — знадобляться в наступних практичних */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-weight: 600;
  transition: background-color 0.15s, border-color 0.15s;
}

.btn--primary {
  background-color: var(--color-primary);
  color: #fff;
}

.btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.btn--secondary {
  background-color: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text);
}

.btn--secondary:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
```

Класи `.btn`, `.btn--primary` і `.btn--secondary` — загальні стилі кнопок для всього застосунку (кнопки форм, модальних вікон тощо). Картка товару поки що має власний стиль кнопки, а загальні класи ми використовуватимемо з практичної 9.

Вміст `src/App.css` поки що повністю видаліть (файл залиште порожнім) — заповнимо на кроці 9.

### Крок 6. Статичні дані товарів

До практичної 11 ми працюватимемо зі статичними даними, а потім замінимо їх на запити до [DummyJSON](https://dummyjson.com/docs/products) — безкоштовного тестового API. Щоб перехід був безболісним, дані зберігаємо **в тому самому форматі**, що повертає API (`https://dummyjson.com/products`).

Створіть папку `src/data/` і файл:

```js title="src/data/products.js"
// Статичні дані у форматі DummyJSON (https://dummyjson.com/products).
// На практичній 11 замінимо їх на запити до API.
export const products = [
  {
    id: 1,
    title: 'Essence Mascara Lash Princess',
    description: 'Popular mascara known for its volumizing and lengthening effects.',
    price: 9.99,
    discountPercentage: 10.48,
    rating: 2.56,
    stock: 99,
    brand: 'Essence',
    category: 'beauty',
    thumbnail: 'https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/thumbnail.webp',
  },
  {
    id: 4,
    title: 'Red Lipstick',
    description: 'A classic and bold choice for adding a pop of color to your lips.',
    price: 12.99,
    discountPercentage: 12.16,
    rating: 4.36,
    stock: 91,
    brand: 'Chic Cosmetics',
    category: 'beauty',
    thumbnail: 'https://cdn.dummyjson.com/product-images/beauty/red-lipstick/thumbnail.webp',
  },
  {
    id: 6,
    title: 'Calvin Klein CK One',
    description: 'A classic unisex fragrance, known for its fresh and clean scent.',
    price: 49.99,
    discountPercentage: 1.89,
    rating: 4.37,
    stock: 29,
    brand: 'Calvin Klein',
    category: 'fragrances',
    thumbnail: 'https://cdn.dummyjson.com/product-images/fragrances/calvin-klein-ck-one/thumbnail.webp',
  },
  {
    id: 7,
    title: 'Chanel Coco Noir Eau De',
    description: 'An elegant and mysterious fragrance with notes of grapefruit, rose and sandalwood.',
    price: 129.99,
    discountPercentage: 16.51,
    rating: 4.26,
    stock: 58,
    brand: 'Chanel',
    category: 'fragrances',
    thumbnail: 'https://cdn.dummyjson.com/product-images/fragrances/chanel-coco-noir-eau-de/thumbnail.webp',
  },
  {
    id: 13,
    title: 'Bedside Table African Cherry',
    description: 'A stylish and functional bedside table with convenient storage space.',
    price: 299.99,
    discountPercentage: 19.09,
    rating: 2.87,
    stock: 64,
    brand: 'Furniture Co.',
    category: 'furniture',
    thumbnail: 'https://cdn.dummyjson.com/product-images/furniture/bedside-table-african-cherry/thumbnail.webp',
  },
  {
    id: 14,
    title: 'Knoll Saarinen Executive Conference Chair',
    description: 'A modern and ergonomic chair, perfect for your office or conference room.',
    price: 499.99,
    discountPercentage: 2.01,
    rating: 4.88,
    stock: 26,
    brand: 'Knoll',
    category: 'furniture',
    thumbnail: 'https://cdn.dummyjson.com/product-images/furniture/knoll-saarinen-executive-conference-chair/thumbnail.webp',
  },
  {
    id: 16,
    title: 'Apple',
    description: 'Fresh and crisp apples, perfect for snacking or incorporating into recipes.',
    price: 1.99,
    discountPercentage: 12.62,
    rating: 4.19,
    stock: 8,
    category: 'groceries',
    thumbnail: 'https://cdn.dummyjson.com/product-images/groceries/apple/thumbnail.webp',
  },
  {
    id: 27,
    title: 'Honey Jar',
    description: 'Pure and natural honey, perfect for sweetening beverages or drizzling over food.',
    price: 6.99,
    discountPercentage: 14.4,
    rating: 3.97,
    stock: 34,
    category: 'groceries',
    thumbnail: 'https://cdn.dummyjson.com/product-images/groceries/honey-jar/thumbnail.webp',
  },
];
```

Зверніть увагу:

- `id` у товарів не підряд — так само, як в API; ми ніколи не покладаємося на порядок, лише на `id`;
- у бакалії (`groceries`) немає поля `brand` — як і в справжньому API. Компонент має це врахувати;
- ціни — у доларах США.

:::note
Якщо в аудиторії немає доступу до `cdn.dummyjson.com`, замініть `thumbnail` на плейсхолдер, наприклад `https://placehold.co/300x300?text=Apple`. Структура даних від цього не зміниться.
:::

### Крок 7. Функція форматування ціни

Форматування чисел і валют — задача не компонента, а окремої допоміжної функції. Створіть `src/utils/format.js`:

```js title="src/utils/format.js"
// Форматувальник створюємо один раз — це дешевше, ніж при кожному виклику
const priceFormatter = new Intl.NumberFormat('uk-UA', {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'narrowSymbol', // «$» замість «USD»
});

/**
 * Форматує ціну в доларах за українськими правилами.
 * formatPrice(2499.99) → «2 499,99 $»
 */
export function formatPrice(value) {
  return priceFormatter.format(value);
}
```

[`Intl.NumberFormat`](https://developer.mozilla.org/uk/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) враховує правила локалі `uk-UA`: кома як десятковий роздільник, пробіл між розрядами, символ валюти після числа. Без опції `currencyDisplay: 'narrowSymbol'` українська локаль показала б «9,99 USD».

Перевірте функцію в консолі браузера (DevTools → Console):

```js
new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol' }).format(1899.5)
// '1 899,50 $'
```

### Крок 8. Компонент Header

Створіть папку `src/components/`. Домовленість курсу: **кожен компонент — файл `.jsx` і поруч однойменний `.css`**. Класи називаємо за методологією BEM (`блок__елемент--модифікатор`), щоб стилі різних компонентів не конфліктували.

```jsx title="src/components/Header.jsx"
import './Header.css';

export default function Header() {
  return (
    <header className="header">
      <div className="container header__inner">
        <a href="/" className="header__logo">
          🛍️ Міні-магазин
        </a>

        {/* Поки що кошик статичний — «оживимо» його на практичній 5 */}
        <div className="header__cart">
          🛒 Кошик <span className="header__badge">0</span>
        </div>
      </div>
    </header>
  );
}
```

```css title="src/components/Header.css"
.header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
}

.header__logo {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  text-decoration: none;
}

.header__cart {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.header__badge {
  min-width: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background-color: var(--color-primary);
  color: #fff;
  font-size: 0.85rem;
  line-height: 24px;
  text-align: center;
}
```

### Крок 9. Компонент ProductCard

Картка отримує один проп — об'єкт `product` — і деструктуризує потрібні поля:

```jsx title="src/components/ProductCard.jsx"
import { formatPrice } from '../utils/format.js';
import './ProductCard.css';

export default function ProductCard({ product }) {
  const { title, description, price, discountPercentage, rating, stock, brand, thumbnail } =
    product;

  return (
    <article className="product-card">
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

        {/* Кнопка поки нічого не робить — обробник додамо на практичній 5 */}
        <button type="button" className="product-card__btn" disabled={stock === 0}>
          У кошик
        </button>
      </div>
    </article>
  );
}
```

Що тут застосовано з лекції про JSX:

- `className` замість `class`; атрибути `width`, `height`, `loading` — як у HTML;
- `alt={title}` — значення з даних у фігурних дужках;
- **умовний рендеринг** через `&&` (`brand`, знижка) і тернарний оператор (наявність);
- `disabled={stock === 0}` — логічне значення, а не рядок;
- `rating.toFixed(1)` — будь-який вираз JavaScript.

`width` і `height` у `<img>` допомагають браузеру зарезервувати місце під зображення ще до завантаження, щоб сторінка не «стрибала» (менший CLS — Cumulative Layout Shift).

```css title="src/components/ProductCard.css"
.product-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  transition: transform 0.15s, box-shadow 0.15s;
}

.product-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.08);
}

.product-card__image {
  width: 100%;
  height: auto;
  aspect-ratio: 1 / 1;
  object-fit: contain;
  background-color: #f9fafb;
}

.product-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
}

.product-card__brand {
  color: var(--color-muted);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.product-card__title {
  font-size: 1rem;
  line-height: 1.3;
}

.product-card__desc {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  color: var(--color-muted);
  font-size: 0.875rem;
}

.product-card__rating {
  color: #d97706;
  font-size: 0.875rem;
}

.product-card__price-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto; /* притискає ціну і кнопку до низу картки */
}

.product-card__price {
  font-size: 1.25rem;
  font-weight: 700;
}

.product-card__discount {
  padding: 2px 6px;
  border-radius: 6px;
  background-color: #fee2e2;
  color: var(--color-accent);
  font-size: 0.8rem;
  font-weight: 600;
}

.product-card__stock {
  color: var(--color-success);
  font-size: 0.8rem;
}

.product-card__btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background-color: var(--color-primary);
  color: #fff;
  font-weight: 600;
  transition: background-color 0.15s;
}

.product-card__btn:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}
```

### Крок 10. Каталог у App: map і key

Повністю замініть вміст `src/App.jsx`:

```jsx title="src/App.jsx"
import Header from './components/Header.jsx';
import ProductCard from './components/ProductCard.jsx';
import { products } from './data/products.js';
import './App.css';

export default function App() {
  return (
    <>
      <Header />

      <main className="container">
        <section className="catalog">
          <div className="catalog__head">
            <h1 className="catalog__title">Каталог товарів</h1>
            <p className="catalog__count">Знайдено: {products.length}</p>
          </div>

          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
```

- Фрагмент `<>...</>` — бо `App` повертає два сусідні елементи (`Header` і `main`).
- `key={product.id}` стоїть **на компоненті** `ProductCard`, тобто на зовнішньому елементі всередині `map`.
- `product={product}` — передаємо весь об'єкт товару одним пропсом.

Заповніть `src/App.css` — стилі сторінки каталогу і сітки:

```css title="src/App.css"
.catalog {
  padding: 24px 0 48px;
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

Збережіть усі файли. У браузері має з'явитися шапка з логотипом і кошиком, заголовок «Каталог товарів», «Знайдено: 8» і сітка з восьми карток. Змініть ширину вікна — кількість колонок змінюватиметься автоматично.

:::caution[Якщо щось не працює]
- **Білий екран** — відкрийте консоль браузера (F12). Найчастіше це помилка імпорту: неправильний шлях або регістр літер (`./components/header.jsx` замість `Header.jsx` на Linux/macOS не знайдеться).
- **Помилка в оверлеї Vite** — Vite показує синтаксичні помилки прямо поверх сторінки з номером рядка.
- **Попередження `Each child in a list should have a unique "key" prop`** — ви забули `key` або поставили його не на той елемент.
- **Картинки не завантажуються** — перевірте доступ до `cdn.dummyjson.com` або використайте плейсхолдери (див. крок 6).
:::

### Крок 11. Перевірка HMR

Не перезавантажуючи сторінку, змініть у `Header.jsx` текст логотипу на «🛍️ Міні-магазин | ваше прізвище» і збережіть. Сторінка оновиться миттєво. Змініть колір `--color-primary` в `index.css` на `#0d9488` — кнопки й бейдж перефарбуються без перезавантаження. Поверніть колір назад.

Ще один експеримент: тимчасово приберіть `key` у `App.jsx` і подивіться в консоль — з'явиться попередження. Поверніть `key`.

### Крок 12. React Developer Tools

1. Відкрийте DevTools (F12) і перейдіть на вкладку **⚛ Components**.
2. Ви побачите дерево компонентів: `App` → `Header`, `ProductCard` × 8. HTML-теги тут не показуються — лише ваші компоненти.
3. Клацніть на будь-який `ProductCard`. Праворуч з'явиться панель **props** з об'єктом `product` — розгорніть його й переконайтеся, що бачите всі поля товару.
4. Двічі клацніть на значення `price` у панелі і змініть його на `1` — картка одразу покаже нову ціну. Це зміна лише в пам'яті, у файл вона не потрапить.
5. Натисніть іконку «око» (**Inspect the matching DOM element**) — DevTools перейде на вкладку Elements до відповідного `<article>`.
6. Іконка прицілу зліва вгорі панелі Components дозволяє клацнути на елемент сторінки і знайти компонент, який його відрендерив.
7. У налаштуваннях (шестерня) → **General** увімкніть **Highlight updates when components render** — знадобиться на наступних заняттях, коли з'явиться стан.

### Крок 13. Коміт результату

Шаблон Vite уже містить `.gitignore` з `node_modules` і `dist`. Ініціалізуйте репозиторій:

```bash
git init
git add .
git commit -m "P3: Vite project, Header, ProductCard, catalog grid"
```

За бажанням створіть репозиторій `mini-shop` на GitHub і виконайте `git remote add origin ...` та `git push -u origin main`.

**Результат роботи:** проєкт `mini-shop` запускається командою `npm run dev` і показує каталог із 8 товарів у вигляді адаптивної сітки карток. Структура `src/`:

```text
src/
├── components/
│   ├── Header.css
│   ├── Header.jsx
│   ├── ProductCard.css
│   └── ProductCard.jsx
├── data/
│   └── products.js
├── utils/
│   └── format.js
├── App.css
├── App.jsx
├── index.css
└── main.jsx
```

## Завдання для самостійного виконання

1. ★ Додайте в `data/products.js` ще два товари з API (відкрийте в браузері `https://dummyjson.com/products/1`, `.../products/121` тощо і скопіюйте потрібні поля). Переконайтеся, що лічильник «Знайдено» оновився сам.
2. ★ Додайте в картку назву категорії (`category`) у вигляді невеликої мітки над заголовком.
3. ★★ Покажіть стару ціну, перекреслену, поруч з поточною. Обчисліть її з `price` і `discountPercentage` (стара ціна = `price / (1 - discountPercentage / 100)`) і відформатуйте через `formatPrice`. Стиль — тег `<s>` або `text-decoration: line-through`.
4. ★★ Якщо `stock` менше 10, замість «В наявності: N шт.» показуйте червоним «Закінчується! Залишилось N шт.». Перевірте на товарі «Apple». Використайте змінну перед `return`, а не вкладені тернарні оператори.
5. ★★★ Створіть компонент `Footer` (окремі `.jsx` і `.css`) з поточним роком (`new Date().getFullYear()`) і посиланням на DummyJSON. Зробіть так, щоб футер завжди був унизу сторінки навіть при малій кількості товарів (підказка: flex-колонка на `#root` з `min-height: 100vh` і `flex: 1` для `main`).

## Контрольні питання

1. Чим Vite відрізняється в режимі розробки від режиму збирання? Що таке HMR?
2. Яку роль виконують файли `index.html` і `src/main.jsx`? Чому `index.html` лежить у корені проєкту?
3. Для чого потрібні скрипти `dev`, `build`, `preview`, `lint`?
4. Чим `dependencies` відрізняються від `devDependencies`? Чому `node_modules` не комітять?
5. Чим відрізняється розміщення файлу в `public/` від `src/assets/`?
6. Чому дані товарів зберігаються у форматі DummyJSON, хоча API ми ще не використовуємо?
7. Навіщо створювати `Intl.NumberFormat` один раз поза функцією?
8. На який елемент потрібно ставити `key` при рендері списку компонентів?
9. Які можливості дає вкладка Components у React DevTools?

## Домашнє завдання

1. Якщо не встигли на парі — завершіть кроки 1–13 і переконайтеся, що `npm run build` проходить без помилок, а `npm run lint` не показує попереджень.
2. Виконайте самостійні завдання ★ (обидва) і щонайменше одне ★★.
3. Подумайте і запишіть (3–5 речень): які частини картки товару можна було б винести в окремі дрібніші компоненти (наприклад, `Rating`, `Price`)? Які пропси вони отримували б? Ми повернемося до цього на лекції про пропси і композицію.

## Що здати

- Посилання на GitHub-репозиторій `mini-shop` (або архів без `node_modules`) з комітом цієї роботи.
- Скриншот застосунку в браузері з сіткою карток.
- Скриншот вкладки **Components** у React DevTools з виділеним `ProductCard` і розгорнутими пропсами.
- Відповіді на контрольні питання.
