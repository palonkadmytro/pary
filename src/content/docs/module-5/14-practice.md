---
title: "Практична розробка SPA (мініпроєкт)"
description: "Підсумкова практична модуля: доводимо «Міні-магазин» до завершеного SPA (сторінка «Обране», пагінація через limit/skip, адаптивність, доступність), збираємо production-версію, розгортаємо на Netlify або Vercel з SPA-fallback і пишемо README. Альтернатива — власний мініпроєкт з відкритим API. Вимоги і критерії оцінювання."
type: practice
pair: 14
topic: 84
---

## Мета роботи

- Довести «Міні-магазин» до стану завершеного односторінкового застосунку: додати сторінку «Обране» (`/favorites`) і пагінацію каталогу.
- Перевірити й покращити адаптивність і доступність інтерфейсу.
- Зібрати production-версію (`npm run build`), перевірити її локально (`npm run preview`) і розгорнути на Netlify або Vercel з налаштуванням SPA-fallback.
- Оформити репозиторій: README, зрозуміла історія комітів.
- Захистити мініпроєкт: пояснити архітектуру і ключові рішення.

Мініпроєкт можна виконати у двох варіантах:

| Варіант | Що робимо |
|---|---|
| **А. «Міні-магазин»** | Продовжуємо наскрізний проєкт за кроками цієї практичної |
| **Б. Власна тема** | Новий SPA на одному з відкритих API (перелік нижче) з тими самими обов'язковими вимогами |

Обидва варіанти оцінюються за однаковими критеріями (див. розділ «Критерії оцінювання»). На парі виконуємо основну частину; завершення і деплой — удома, захист — на наступному занятті.

## Що потрібно

- Проєкт `mini-shop` після практичної 13: React Router, `CartContext` зі збереженням у `localStorage`, хуки `useFetch`, `useLocalStorage`, `useDebounce`.
- Акаунт на GitHub і на [Netlify](https://www.netlify.com) або [Vercel](https://vercel.com) (можна увійти через GitHub).
- Документація: [Vite — Deploying a Static Site](https://vite.dev/guide/static-deploy), [Netlify — Redirects and rewrites](https://docs.netlify.com/routing/redirects/), [Vercel — Rewrites](https://vercel.com/docs/rewrites), [MDN — Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility).

## Короткі теоретичні відомості

### Від dev-сервера до production

Під час розробки `npm run dev` запускає сервер Vite, який перетворює модулі «на льоту», підтримує Fast Refresh і віддає `index.html` на будь-яку адресу. Для публікації потрібна **production-збірка**:

| Команда | Що робить |
|---|---|
| `npm run build` | Збирає застосунок у папку `dist/`: мініфікований JS і CSS з хешами в назвах файлів, оптимізовані ресурси |
| `npm run preview` | Запускає локальний статичний сервер для `dist/` (за замовчуванням `http://localhost:4173`) — перевірка «як на хостингу» |

Вміст `dist/` — це звичайні статичні файли (`index.html`, `assets/index-a1b2c3.js`, `assets/index-d4e5f6.css`). Їх можна розмістити на будь-якому статичному хостингу. Хеш у назві файлу змінюється при кожній зміні коду, тому браузер ніколи не візьме застарілий файл з кешу.

:::caution[StrictMode і production]
У production-збірці `StrictMode` не виконує подвійних рендерів і ефектів, а повідомлення React стають коротшими. Тому застосунок треба перевіряти **і** в `dev`, **і** в `preview`.
:::

### SPA-fallback

На хостингу запит `GET /product/12` (користувач відкрив посилання або натиснув F5) сервер спробує знайти як файл `dist/product/12` — і поверне 404. Потрібно правило **переписування** (rewrite): для будь-якої адреси, якій не відповідає файл, віддавати `index.html` зі статусом 200. Далі сторінку визначить React Router.

| Хостинг | Файл | Вміст |
|---|---|---|
| Netlify | `public/_redirects` | `/*    /index.html    200` |
| Vercel | `vercel.json` (корінь проєкту) | `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` |

Файли з папки `public/` Vite копіює в `dist/` без змін — саме тому `_redirects` кладемо туди.

### Мінімальний чекліст доступності (a11y)

| Перевірка | Як перевірити |
|---|---|
| Усі дії доступні з клавіатури, фокус видно | Пройдіть сторінку клавішею Tab, натискайте Enter/Space |
| Кнопки — це `<button>`, посилання — `<a>`/`Link` | Без `div onClick` |
| Зображення мають `alt` (порожній для декоративних) | DevTools → Elements |
| Поля форм мають `<label>`, помилки пов'язані з полями | Клік по підпису ставить фокус у поле |
| Достатній контраст тексту (≥ 4.5:1) | DevTools → Elements → колір → Contrast ratio |
| Іконки-кнопки мають `aria-label` | ♥, ✕, +, − |
| Кожна сторінка має один `<h1>` | Lighthouse / розширення axe DevTools |
| Мова документа | `<html lang="uk">` в `index.html` |

Швидкий автоматичний аудит — вкладка **Lighthouse** у Chrome DevTools (категорії Performance, Accessibility, Best Practices, SEO).

## Хід роботи (варіант А)

### Крок 1. Контекст «Обране»

На практичній 5 «обране» (♥) було локальним станом картки: позначка зникала після переходу на іншу сторінку, а показати список обраних було неможливо. Тепер ці дані потрібні карткам, шапці (лічильник) і окремій сторінці — отже, їм місце в контексті. Зберігатимемо їх у `localStorage` за допомогою вже готового хука.

```jsx title="src/context/FavoritesContext.jsx"
import { createContext, useContext, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const FavoritesContext = createContext(null);

// Зберігаємо лише поля, потрібні для картки, — без масиву images
function toFavorite(product) {
  const { id, title, description, price, discountPercentage, rating, stock, brand, category, thumbnail } =
    product;
  return { id, title, description, price, discountPercentage, rating, stock, brand, category, thumbnail };
}

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useLocalStorage('mini-shop:favorites', []);

  const value = useMemo(
    () => ({
      favorites,
      count: favorites.length,
      isFavorite: (id) => favorites.some((item) => item.id === id),
      toggleFavorite: (product) =>
        setFavorites((prev) =>
          prev.some((item) => item.id === product.id)
            ? prev.filter((item) => item.id !== product.id)
            : [...prev, toFavorite(product)],
        ),
      clearFavorites: () => setFavorites([]),
    }),
    [favorites, setFavorites],
  );

  return <FavoritesContext value={value}>{children}</FavoritesContext>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === null) {
    throw new Error('useFavorites() потрібно викликати всередині <FavoritesProvider>');
  }
  return context;
}
```

Чому зберігаємо копію товару, а не лише `id`? Тоді сторінка «Обране» відкривається миттєво й без запитів до API. Недолік — ціна в обраному може застаріти; для навчального проєкту це прийнятно (у реальному магазині зберігали б `id` і довантажували актуальні дані).

Підключіть провайдер у `main.jsx`:

```jsx title="src/main.jsx (фрагмент)" {1,6,8}
import { FavoritesProvider } from './context/FavoritesContext';
// ...

<BrowserRouter>
  <CartProvider>
    <FavoritesProvider>
      <App />
    </FavoritesProvider>
  </CartProvider>
</BrowserRouter>
```

### Крок 2. ♥ у картці через контекст

У `ProductCard` замініть локальний стан `isFavorite` на контекст:

```jsx title="src/components/ProductCard.jsx (зміни)" {3,7-8,14-17}
import { Link } from 'react-router';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
// ...

export default function ProductCard({ product }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(product.id);
  const { addItem } = useCart();
  // ...

  <button
    type="button"
    className={`product-card__fav${favorite ? ' product-card__fav--active' : ''}`}
    onClick={() => toggleFavorite(product)}
    aria-pressed={favorite}
    aria-label={favorite ? 'Прибрати з обраного' : 'Додати в обране'}
    title={favorite ? 'Прибрати з обраного' : 'Додати в обране'}
  >
    {favorite ? '♥' : '♡'}
  </button>
}
```

Імпорт `useState` з картки, найімовірніше, більше не потрібен — приберіть його, щоб ESLint не попереджав про невикористаний імпорт.

### Крок 3. Сторінка /favorites

```jsx title="src/pages/FavoritesPage.jsx"
import { Link } from 'react-router';
import ProductList from '../components/ProductList';
import { useFavorites } from '../context/FavoritesContext';

export default function FavoritesPage() {
  const { favorites, clearFavorites } = useFavorites();

  return (
    <section>
      <title>Обране — Міні-магазин</title>
      <h1 className="page-title">Обране</h1>

      {favorites.length === 0 ? (
        <div className="empty-state">
          <p>У списку обраного поки порожньо. Натисніть ♡ на картці товару, щоб зберегти його тут.</p>
          <Link to="/">Перейти до каталогу</Link>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <p className="toolbar__info">Збережено: {favorites.length}</p>
            <button type="button" className="btn btn--secondary" onClick={clearFavorites}>
              Очистити обране
            </button>
          </div>
          <ProductList products={favorites} />
        </>
      )}
    </section>
  );
}
```

Тут знову окупилося рішення з практичної 9: `ProductList` нічого не знає про джерело товарів, тож показує обране без жодних змін. Тег `<title>` усередині компонента React 19 переносить у `<head>`.

Додайте маршрут і пункт меню:

```jsx title="src/App.jsx (фрагмент)"
import FavoritesPage from './pages/FavoritesPage';
// ...
<Route path="favorites" element={<FavoritesPage />} />
```

```jsx title="src/components/Header.jsx (фрагмент)"
import { useFavorites } from '../context/FavoritesContext';
// ...
const { count: favoritesCount } = useFavorites();
// ...у <nav> між «Каталог» і «Кошик»:
<NavLink to="/favorites" className={navClass}>
  ♥ Обране
  {favoritesCount > 0 && <span className="header__badge">{favoritesCount}</span>}
</NavLink>
```

Перевірте: позначте 2–3 товари — лічильник у шапці зростає; на `/favorites` вони показуються; ♥ на сторінці «Обране» прибирає товар зі списку; після F5 обране зберігається.

### Крок 4. Пагінація через limit і skip

Зараз каталог показує лише перші 30 товарів з понад 190. DummyJSON підтримує параметри `limit` (скільки) і `skip` (скільки пропустити) для всіх списків, а у відповіді повертає `total` — загальну кількість. Сторінка `N` при розмірі сторінки `PAGE_SIZE` — це `skip = (N - 1) * PAGE_SIZE`.

Оновіть `utils/api.js` — константу `PRODUCTS_LIMIT` замінює `PAGE_SIZE`:

```js title="src/utils/api.js (зміни)"
export const PAGE_SIZE = 12;

// Адреса списку товарів з урахуванням пошуку, категорії і номера сторінки
export function buildProductsUrl({ query = '', category = '', page = 1 } = {}) {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    skip: String((page - 1) * PAGE_SIZE),
  });

  if (query) {
    params.set('q', query);
    return `${API_URL}/products/search?${params}`;
  }
  if (category) {
    return `${API_URL}/products/category/${encodeURIComponent(category)}?${params}`;
  }
  return `${API_URL}/products?${params}`;
}
```

`URLSearchParams` сам кодує значення, тому окремий `encodeURIComponent` для `q` не потрібен.

Компонент пагінації:

```jsx title="src/components/Pagination.jsx"
import './Pagination.css';

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav className="pagination" aria-label="Сторінки каталогу">
      <button
        type="button"
        className="pagination__btn"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
      >
        ← Назад
      </button>

      {pages.map((number) => (
        <button
          key={number}
          type="button"
          className={`pagination__btn${number === page ? ' pagination__btn--active' : ''}`}
          onClick={() => onPageChange(number)}
          aria-current={number === page ? 'page' : undefined}
          aria-label={`Сторінка ${number}`}
        >
          {number}
        </button>
      ))}

      <button
        type="button"
        className="pagination__btn"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
      >
        Далі →
      </button>
    </nav>
  );
}
```

```css title="src/components/Pagination.css"
.pagination {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  justify-content: center;
  margin-top: 2rem;
}

.pagination__btn {
  min-width: 2.5rem;
  min-height: 2.5rem; /* зручна зона натискання на сенсорних екранах */
  padding: 0 0.75rem;
  font: inherit;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
}

.pagination__btn--active {
  color: #fff;
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.pagination__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

### Крок 5. HomePage з пагінацією

Номер сторінки — ще один параметр URL (`/?page=3`), тож посиланням на третю сторінку каталогу можна поділитися.

Є нюанс: DummyJSON не вміє шукати всередині категорії. Досі ми фільтрували результати пошуку за категорією на клієнті, але з пагінацією це дає неправильні числа (сервер каже «34 результати на 3 сторінки», а після клієнтського фільтра на сторінці залишається 2 товари). Тому приймаємо UX-рішення: **пошук і категорія взаємовиключні** — введення пошуку скидає категорію, вибір категорії очищає пошук. Будь-яка зміна фільтрів повертає на першу сторінку.

```jsx title="src/pages/HomePage.jsx (зміни)"
import Pagination from '../components/Pagination';
import { API_URL, PAGE_SIZE, buildProductsUrl } from '../utils/api';
import { sortProducts } from '../utils/products';

// ...після читання q, category, sort:
const page = Math.max(1, Number(searchParams.get('page')) || 1);

const debouncedQuery = useDebounce(query.trim(), 400);
const { data, loading, error, refetch } = useFetch(
  buildProductsUrl({ query: debouncedQuery, category, page }),
);
const { data: categories } = useFetch(`${API_URL}/products/categories`);

const products = data?.products ?? [];
const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
// Сортування — у межах поточної сторінки (серверне — завдання ★★★)
const visibleProducts = sortProducts(products, sort);

function handlePageChange(nextPage) {
  updateParams({ page: nextPage === 1 ? '' : String(nextPage) });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ...у content для успішного стану:
content = (
  <>
    <ProductList products={visibleProducts} />
    <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
  </>
);

// ...обробники фільтрів у JSX:
<SearchBar
  value={query}
  onChange={(value) => updateParams({ q: value, category: '', page: '' }, { replace: true })}
/>
<CategoryFilter
  categories={categories ?? []}
  value={category}
  onChange={(value) => updateParams({ category: value, q: '', page: '' })}
/>

// ...лічильник у панелі — загальна кількість із сервера:
{!loading && !error && <p className="toolbar__info">Знайдено: {data?.total ?? 0}</p>}
```

Функцію `filterByCategory` в `HomePage` більше не використовуємо — приберіть її з імпорту.

Перевірте: внизу каталогу — сторінки 1…17; перехід на 3-тю змінює адресу на `/?page=3` і прокручує вгору; «Назад» браузера повертає на попередню сторінку; вибір категорії скидає номер сторінки і пошук; результати пошуку `phone` теж розбиті на сторінки (якщо їх більше 12).

:::tip[Альтернатива: «Показати ще»]
Замість нумерованих сторінок можна зробити кнопку «Показати ще», що додає наступні 12 товарів до вже показаних (нескінченна стрічка). Для цього результати накопичують у масиві, а наступну порцію завантажують в обробнику кліку з `skip = products.length`. Нумерована пагінація простіша, краще поєднується з URL і зручніша для повернення «Назад» — тому в основному завданні використовуємо її.
:::

### Крок 6. Адаптивність

Перевірте застосунок у режимі пристроїв (DevTools → Toggle device toolbar, `Ctrl+Shift+M`) на ширинах 360, 768 і 1280 px. Типові проблеми і розв'язки:

```css title="src/components/Header.css (додати)"
/* Вузькі екрани: логотип і меню — у два рядки, меню прокручується горизонтально */
@media (max-width: 600px) {
  .header__inner {
    flex-direction: column;
    gap: 0.5rem;
    padding-block: 0.5rem;
  }

  .header__nav {
    max-width: 100%;
    overflow-x: auto;
  }

  .header__link {
    padding: 0.4rem 0.7rem;
    font-size: 0.9rem;
    white-space: nowrap;
  }
}
```

```css title="src/components/CartSummary.css (додати)"
/* Вузькі екрани: позиція кошика — у два рядки */
@media (max-width: 520px) {
  .cart-item {
    grid-template-columns: 56px 1fr auto;
  }

  .cart-item__qty {
    grid-column: 2;
  }

  .cart-item__sum {
    grid-column: 3;
  }

  .cart-item__remove {
    grid-row: 1;
    grid-column: 3;
    justify-self: end;
  }
}
```

```css title="src/App.css (додати)"
@media (max-width: 600px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar__info {
    margin-left: 0;
  }
}
```

Критерій: на ширині 360 px немає горизонтальної прокрутки сторінки, текст читається без масштабування, кнопки не менші за ~40×40 px.

### Крок 7. Доступність

1. Перевірте, що в `index.html` вказано `<html lang="uk">` і змістовний `<title>`.
2. Додайте видимий стиль фокусу для всіх інтерактивних елементів:

   ```css title="src/index.css (додати)"
   :focus-visible {
     outline: 3px solid var(--color-primary);
     outline-offset: 2px;
   }
   ```

   `:focus-visible` показує рамку при навігації клавіатурою і не показує при кліку мишею.

3. Додайте посилання «Перейти до вмісту» (skip link) — перший елемент, на який потрапляє Tab:

   ```jsx title="src/components/Layout.jsx (фрагмент)"
   <a href="#main" className="skip-link">Перейти до вмісту</a>
   <Header />
   <main id="main" className="container page">
     <Outlet />
   </main>
   ```

   ```css title="src/index.css (додати)"
   .skip-link {
     position: absolute;
     top: -100px;
     left: 1rem;
     z-index: 200;
     padding: 0.5rem 1rem;
     color: #fff;
     background: var(--color-primary);
     border-radius: 8px;
   }

   .skip-link:focus {
     top: 0.5rem;
   }
   ```

4. Пройдіть увесь сценарій покупки **лише клавіатурою**: пошук → категорія → картка → «У кошик» → ♥ → кошик → `+`/`−` → форма → відправлення.
5. Запустіть **Lighthouse** (режим Navigation, категорія Accessibility) для каталогу і сторінки товару. Мета — 90+ балів. Виправте знайдені проблеми (найчастіше — контраст сірого тексту і кнопки без доступної назви).

### Крок 8. Production-збірка і локальна перевірка

```bash
npm run lint      # виправте всі помилки ESLint
npm run build
npm run preview
```

Після `build` у терміналі з'явиться список файлів з розмірами (у т. ч. gzip). Відкрийте `http://localhost:4173` і пройдіть основний сценарій. Відкрийте вкладку Network: замість десятків модулів — кілька файлів з хешами.

:::note
`npm run preview` віддає `index.html` на будь-яку адресу, як і dev-сервер, тож проблему з F5 на `/product/12` він не покаже. Вона проявиться лише на реальному хостингу без fallback — це перевіримо після деплою.
:::

### Крок 9. Деплой

Спершу додайте файл правил для обраного хостингу.

**Netlify:**

```text title="public/_redirects"
/*    /index.html    200
```

**Vercel:**

```json title="vercel.json"
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Закомітьте зміни і завантажте репозиторій на GitHub:

```bash
git add .
git commit -m "P14: favorites, pagination, a11y, deploy config"
git push
```

Далі — один зі способів:

| Хостинг | Кроки |
|---|---|
| **Netlify** | *Add new site → Import an existing project* → GitHub → оберіть репозиторій. Build command: `npm run build`, Publish directory: `dist`. *Deploy*. Швидкий варіант без Git — перетягнути папку `dist` на сторінку [app.netlify.com/drop](https://app.netlify.com/drop) (тоді `_redirects` має бути всередині `dist`, що й забезпечує папка `public`) |
| **Vercel** | *Add New → Project* → імпорт репозиторію з GitHub. Framework Preset визначиться як **Vite** (Build: `npm run build`, Output: `dist`). *Deploy* |

При підключенні через Git кожен `git push` у гілку `main` автоматично запускає нову збірку і деплой (CI/CD).

**Перевірка після деплою:**

1. Відкрийте отриману адресу (`https://….netlify.app` або `https://….vercel.app`).
2. Перейдіть на сторінку товару і натисніть **F5** — сторінка має відкритися (а не 404 хостингу).
3. Відкрийте в новій вкладці напряму `https://ваш-сайт/product/5` і `https://ваш-сайт/?category=laptops&page=2`.
4. Відкрийте неіснуючу адресу — має показатися **ваша** сторінка 404 (з шапкою), а не сторінка хостингу.
5. Перевірте на телефоні.

### Крок 10. README

Створіть (або замініть згенерований Vite) `README.md` у корені проєкту:

````markdown title="README.md"
# Міні-магазин

Навчальний SPA-застосунок інтернет-магазину на React 19 + React Router v7.
Дані — з публічного API [DummyJSON](https://dummyjson.com).

**Демо:** https://ваш-сайт.netlify.app

## Можливості

- Каталог з пошуком (debounce), фільтром за категорією, сортуванням і пагінацією; стан фільтрів зберігається в URL
- Сторінка товару з галереєю зображень
- Кошик з керуванням кількістю, збереженням у localStorage та формою оформлення з валідацією
- Список обраного (/favorites)
- Адаптивна верстка, навігація з клавіатури

## Технології

React 19, Vite, React Router v7 (declarative mode), Context API, власні хуки
(useFetch, useLocalStorage, useDebounce), CSS.

## Запуск локально

```bash
npm install
npm run dev
```

## Структура

```text
src/
├── components/   повторно використовувані компоненти
├── pages/        сторінки (маршрути)
├── context/      CartContext, FavoritesContext
├── hooks/        власні хуки
└── utils/        API, форматування, робота з товарами
```

## Автор

Прізвище Ім'я, група ___
````

Додайте у README 1–2 скриншоти (поклавши файли в папку `docs/` репозиторію) і закомітьте.

**Результат роботи (варіант А):** завершений SPA «Міні-магазин» з каталогом, пагінацією, сторінками товару, кошика, обраного і 404, розгорнутий на публічній адресі з коректною роботою прямих посилань і оновлення сторінки.

## Варіант Б: власна тема

Замість «Міні-магазину» можна виконати власний SPA. Обирайте API **без ключів і реєстрації**:

| № | Ідея | API | Що можна реалізувати |
|---|---|---|---|
| 1 | Енциклопедія «Rick and Morty» | [rickandmortyapi.com](https://rickandmortyapi.com/documentation) — `/api/character?page=&name=&status=` | Каталог персонажів з пошуком і фільтром за статусом, сторінка персонажа з епізодами, «улюблені» |
| 2 | Країни світу | [restcountries.com](https://restcountries.com) — `/v3.1/all?fields=…`, `/v3.1/alpha/{code}` | Пошук і фільтр за регіоном, сторінка країни з сусідами (посилання на інші країни), порівняння двох країн |
| 3 | Книжкова полиця | [Open Library](https://openlibrary.org/developers/api) — `/search.json?q=&page=` | Пошук книг, сторінка книги, власні полиці «Хочу прочитати» / «Прочитано» в localStorage |
| 4 | Книга рецептів | [TheMealDB](https://www.themealdb.com/api.php) — `/api/json/v1/1/search.php?s=`, `/lookup.php?i=` (публічний тестовий ключ `1`) | Пошук страв, фільтр за категорією/кухнею, сторінка рецепта з інгредієнтами, список покупок |
| 5 | Прогноз погоди | [Open-Meteo](https://open-meteo.com/en/docs) — геокодування + `/v1/forecast` | Пошук міста, прогноз на 7 днів, сторінка дня з погодинним графіком, збережені міста |
| 6 | Покедекс | [PokeAPI](https://pokeapi.co/docs/v2) — `/api/v2/pokemon?limit=&offset=`, `/pokemon/{name}` | Каталог з пагінацією, сторінка покемона з характеристиками, фільтр за типом, команда з 6 покемонів |

Тему потрібно погодити з викладачем до кінця цієї пари: назва, API, перелік сторінок (маршрутів) і функцій.

## Обов'язкові вимоги до мініпроєкту

Однакові для варіантів А і Б:

1. **Стек:** React 19 + Vite, JavaScript, функціональні компоненти й хуки.
2. **Маршрутизація:** щонайменше 4 маршрути, серед них динамічний (`/:id`) і сторінка 404; спільний макет з `Outlet`; навігація через `NavLink` з активним станом.
3. **Робота з API:** стани завантаження і помилки на кожній сторінці з даними, кнопка повторної спроби, скасування запитів (`AbortController`), обробка `!res.ok`.
4. **Пошук/фільтрація:** щонайменше один пошук з debounce і один фільтр; стан фільтрів і пагінації — в URL (`useSearchParams`).
5. **Форма:** щонайменше одна керована форма з валідацією і повідомленнями про помилки (оформлення замовлення, відгук, додавання нотатки тощо).
6. **Стан:** щонайменше один контекст з власним хуком доступу; щонайменше два власні хуки; дані користувача (кошик, обране, полиці) зберігаються в `localStorage`.
7. **Інтерфейс:** адаптивність від 360 px, доступність за чеклістом з теоретичних відомостей; без помилок і попереджень у консолі браузера.
8. **Якість коду:** логічна структура папок (`components`, `pages`, `context`, `hooks`, `utils`), зрозумілі назви, без закоментованого «мертвого» коду, `npm run lint` без помилок.
9. **Публікація:** деплой на Netlify або Vercel з робочими прямими посиланнями і F5; README з посиланням на демо, описом і інструкцією запуску; історія з щонайменше 10 змістовних комітів.

## Критерії оцінювання

Максимум — **12 балів**.

| Критерій | Бали | Що перевіряється |
|---|---|---|
| Маршрутизація | 2 | Усі маршрути працюють, динамічна сторінка завантажує дані за параметром, 404, макет, активні посилання, програмна навігація |
| Робота з API | 2 | Коректні стани loading/error/data, повторна спроба, скасування запитів, обробка «не знайдено» |
| Стан, контекст і хуки | 2 | Немає дубльованого і зайвого стану, похідні дані обчислюються, контекст замість prop drilling, власні хуки, `localStorage` |
| Форми | 1 | Керовані поля, валідація, повідомлення під полями, `preventDefault`, очищення після відправлення |
| Пошук, фільтри, пагінація | 1 | Debounce, параметри в URL, коректна робота «Назад» і прямих посилань |
| Інтерфейс | 1 | Адаптивність, клавіатурна навігація, видимий фокус, `alt`, підписи полів, Lighthouse Accessibility ≥ 90 |
| Якість коду | 1 | Структура, іменування, відсутність помилок у консолі і ESLint |
| Публікація | 1 | Робочий деплой із SPA-fallback, README, історія комітів |
| Захист | 1 | Студент пояснює архітектуру, потік даних і будь-який фрагмент свого коду, відповідає на питання |

| Сума балів | Рівень |
|---|---|
| 10–12 | Високий |
| 7–9 | Достатній |
| 4–6 | Середній |
| 1–3 | Початковий |

:::caution[Важливо]
- Якщо студент не може пояснити власний код на захисті, бали за відповідний критерій не зараховуються.
- Використання ШІ-асистентів допускається як довідника, але кожне рішення в проєкті ви маєте розуміти й уміти змінити на захисті.
- Здача після встановленого терміну — мінус 1 бал за кожен тиждень запізнення.
:::

## Завдання для самостійного виконання

1. ★ Додайте на сторінку товару кнопку ♥, що працює через `useFavorites()`, синхронно з карткою в каталозі.
2. ★ Покажіть на сторінці кошика підказку «Безкоштовна доставка від $100» з прогрес-баром до цієї суми (похідне значення від `totalPrice`).
3. ★★ Реалізуйте ThemeContext (світла/темна тема) з практичної 13, якщо ще не зробили, використовуючи CSS-змінні з `index.css`.
4. ★★ Додайте ліниве завантаження сторінок: `const ProductPage = lazy(() => import('./pages/ProductPage'))` і `<Suspense fallback={<Loader />}>` навколо `<Outlet />`. Порівняйте кількість JS-файлів у `dist/assets` до і після.
5. ★★★ Перенесіть сортування на сервер: DummyJSON підтримує `sortBy` і `order` (`/products?sortBy=price&order=asc&limit=12&skip=0`). Тоді сортування коректно працюватиме для всіх сторінок, а не лише поточної.

## Контрольні питання

1. Чим відрізняються `npm run dev`, `npm run build` і `npm run preview`? Що міститься в папці `dist`?
2. Навіщо в назвах зібраних файлів хеші?
3. Чому без SPA-fallback оновлення сторінки `/product/12` на хостингу дає 404? Як це виправити на Netlify і Vercel?
4. Чому файл `_redirects` розміщують у папці `public`?
5. Чому «обране» з практичної 5 довелося перенести з локального стану картки в контекст?
6. Як обчислюються `skip` і кількість сторінок під час пагінації? Чому номер сторінки зберігаємо в URL?
7. Чому з пагінацією пошук і фільтр за категорією в нашому магазині стали взаємовиключними?
8. Що перевіряє чекліст доступності? Чим `:focus-visible` відрізняється від `:focus`?
9. Що таке skip link і кому він допомагає?
10. Які розділи має містити README навчального проєкту?

## Домашнє завдання

1. Завершіть мініпроєкт відповідно до обов'язкових вимог (варіант А або погоджений варіант Б).
2. Розгорніть його на Netlify або Vercel і перевірте прямі посилання та F5 на всіх маршрутах.
3. Підготуйтеся до захисту: 3–5 хвилин демонстрації (основний сценарій користувача) і пояснення, де в коді живе стан, як дані потрапляють із сервера на екран і як працює маршрутизація.

## Що здати

- Посилання на GitHub-репозиторій з README і історією комітів.
- Посилання на розгорнутий застосунок.
- Скриншот звіту Lighthouse (Accessibility) для головної сторінки.
- Скриншоти застосунку на ширинах 360 px і 1280 px.
- Для варіанта Б — погоджений опис теми (API, маршрути, функції).
