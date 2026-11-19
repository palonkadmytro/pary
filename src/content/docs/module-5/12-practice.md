---
title: "Маршрутизація і запити до API"
description: "Додаємо React Router у «Міні-магазин»: Layout з Outlet, сторінки каталогу, товару, кошика і 404, NavLink з активними стилями, useParams для завантаження одного товару, useNavigate, пошук і категорія в URL через useSearchParams. Відчуваємо біль prop drilling."
type: practice
pair: 12
topic: 82
---

## Мета роботи

- Підключити React Router v7 (декларативний режим) до «Міні-магазину» і розділити застосунок на сторінки.
- Створити спільний макет `Layout` з `Header` і `<Outlet />`, налаштувати `NavLink` з активними стилями.
- Реалізувати сторінку товару `/product/:id`: читання параметра через `useParams`, завантаження одного товару, галерея зображень, обробка «товар не знайдено».
- Перенести кошик і оформлення замовлення на сторінку `/cart`, використати `useNavigate` для повернення назад і переходу після оформлення.
- Зберігати пошук, категорію і сортування в адресному рядку через `useSearchParams`.
- Побачити проблему передавання пропсів крізь багато рівнів (prop drilling) як мотивацію для контексту.

## Що потрібно

- Проєкт `mini-shop` після практичної 11: дані з DummyJSON, `Loader`, `ErrorMessage`, пошук з debounce, `Modal` з кошиком і `CheckoutForm`, модуль `utils/api.js`.
- Лекція 8 «React Router: маршрутизація SPA».
- Документація: [reactrouter.com — Declarative mode](https://reactrouter.com/start/declarative/installation), [Routing](https://reactrouter.com/start/declarative/routing), [Navigating](https://reactrouter.com/start/declarative/navigating), [URL Values](https://reactrouter.com/start/declarative/url-values).

## Короткі теоретичні відомості

Нагадаємо основні елементи React Router, які знадобляться сьогодні:

| Елемент | Призначення в «Міні-магазині» |
|---|---|
| `BrowserRouter` | Обгортає весь застосунок у `main.jsx` |
| `Routes`, `Route` | Таблиця маршрутів в `App.jsx` |
| Маршрут-макет + `Outlet` | `Layout`: шапка і футер спільні для всіх сторінок |
| `index` | Каталог за адресою `/` |
| `:id` + `useParams` | Сторінка товару `/product/12` |
| `path="*"` | Сторінка 404 |
| `Link`, `NavLink` | Посилання на товар, меню з активним пунктом |
| `useNavigate` | «← Назад», перехід до каталогу після замовлення |
| `useSearchParams` | `/?q=phone&category=smartphones&sort=price-asc` |

Карта сторінок після цієї пари:

```text
/                         HomePage      каталог: пошук, категорія, сортування (у URL)
/product/:id              ProductPage   один товар: галерея, опис, «У кошик»
/cart                     CartPage      кошик + CheckoutForm
*                         NotFoundPage  404
```

Усі сторінки відображаються всередині `Layout`:

```text
Layout
├── Header (NavLink «Каталог», NavLink «Кошик (N)»)
├── <main> <Outlet /> </main>   ← сюди підставляється сторінка
└── footer
```

### Де жити кошику

Кошик потрібен на трьох сторінках і в шапці, тому його стан залишається у найближчому спільному батькові — `App`. Функції роботи з кошиком доведеться передавати через пропси на кілька рівнів униз. Наприкінці пари ми проаналізуємо, наскільки це зручно.

## Хід роботи

### Крок 1. Встановлення і BrowserRouter

```bash
npm i react-router
```

Перевірте в `package.json`, що з'явилася залежність `"react-router": "^7..."`. Пакет `react-router-dom` встановлювати **не потрібно**.

```jsx title="src/main.jsx" {3,9,11}
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

### Крок 2. Структура папок

Створіть папку `src/pages/`. Після цієї пари структура буде такою:

```text
src/
├── main.jsx
├── App.jsx                 ← стан кошика + таблиця маршрутів
├── components/
│   ├── Layout.jsx          ← НОВИЙ
│   ├── Header.jsx          ← NavLink замість кнопки
│   ├── ProductCard.jsx     ← посилання на сторінку товару
│   ├── ProductList.jsx, SearchBar.jsx, CategoryFilter.jsx, SortSelect.jsx
│   ├── CartSummary.jsx, CheckoutForm.jsx, FormField.jsx
│   ├── Loader.jsx, ErrorMessage.jsx, Modal.jsx
├── pages/
│   ├── HomePage.jsx        ← НОВИЙ: каталог (код переїжджає з App)
│   ├── ProductPage.jsx     ← НОВИЙ
│   ├── CartPage.jsx        ← НОВИЙ
│   └── NotFoundPage.jsx    ← НОВИЙ
└── utils/ api.js, format.js, products.js
```

Компоненти в `pages/` відповідають маршрутам і «збирають» сторінку з дрібніших компонентів з `components/`.

### Крок 3. Layout і Header з NavLink

```jsx title="src/components/Layout.jsx"
import { Outlet } from 'react-router';
import Header from './Header';

export default function Layout({ cartCount }) {
  return (
    <>
      <Header cartCount={cartCount} />
      <main className="container page">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container">
          Міні-магазин · навчальний проєкт · дані: <a href="https://dummyjson.com">DummyJSON</a>
        </div>
      </footer>
    </>
  );
}
```

Шапка тепер містить навігацію замість кнопки відкриття модального вікна:

```jsx title="src/components/Header.jsx"
import { Link, NavLink } from 'react-router';
import './Header.css';

// Функція для className: NavLink передає { isActive }
const navClass = ({ isActive }) =>
  isActive ? 'header__link header__link--active' : 'header__link';

export default function Header({ cartCount }) {
  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="header__logo">
          🛍️ Міні-магазин
        </Link>

        <nav className="header__nav" aria-label="Головна навігація">
          {/* end — інакше «Каталог» був би активним на будь-якій сторінці */}
          <NavLink to="/" end className={navClass}>
            Каталог
          </NavLink>
          <NavLink to="/cart" className={navClass}>
            🛒 Кошик
            {cartCount > 0 && <span className="header__badge">{cartCount}</span>}
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
```

```css title="src/components/Header.css"
.header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
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
  color: #0f172a;
  text-decoration: none;
}

.header__nav {
  display: flex;
  gap: 0.5rem;
}

.header__link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
  color: #334155;
  text-decoration: none;
  border-radius: 999px;
}

.header__link:hover {
  background: #f1f5f9;
}

.header__link--active {
  color: #fff;
  background: #4f46e5;
}

.header__link--active:hover {
  background: #4338ca;
}

.header__badge {
  min-width: 1.4rem;
  padding: 0 0.35rem;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.4rem;
  text-align: center;
  color: #fff;
  background: #ef4444;
  border-radius: 999px;
}
```

Додайте стилі сторінки і футера:

```css title="src/App.css (додати)"
.page {
  min-height: calc(100vh - 64px - 64px);
  padding-block: 1.5rem 3rem;
}

.footer {
  padding: 1.25rem 0;
  font-size: 0.85rem;
  color: #64748b;
  border-top: 1px solid #e2e8f0;
}

.page-title {
  margin: 0 0 1.25rem;
}

.back-button {
  margin-bottom: 1rem;
  padding: 0.4rem 0.8rem;
  font: inherit;
  color: #4f46e5;
  background: none;
  border: 1px solid #c7d2fe;
  border-radius: 8px;
  cursor: pointer;
}
```

### Крок 4. HomePage: каталог з параметрами в URL

Переносимо в `HomePage` усе, що стосується каталогу: завантаження товарів і категорій, пошук, фільтр, сортування. Головна зміна — значення фільтрів тепер зберігаються **не в `useState`, а в URL**.

```jsx title="src/pages/HomePage.jsx"
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import SearchBar from '../components/SearchBar';
import CategoryFilter from '../components/CategoryFilter';
import SortSelect from '../components/SortSelect';
import ProductList from '../components/ProductList';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { API_URL, fetchJson, buildProductsUrl } from '../utils/api';
import { filterByCategory, sortProducts } from '../utils/products';

export default function HomePage({ onAddToCart }) {
  // --- Фільтри живуть в URL: /?q=phone&category=smartphones&sort=price-asc ---
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const sort = searchParams.get('sort') ?? 'default';

  // Змінює кілька параметрів, зберігаючи інші; порожні значення прибирає з URL
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

  // --- Debounce: запит до API — через 400 мс після останньої зміни q ---
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim());

  useEffect(() => {
    const timerId = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(timerId);
  }, [query]);

  // --- Завантаження товарів ---
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

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

  // --- Категорії ---
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchJson(`${API_URL}/products/categories`, { signal: controller.signal })
      .then((data) => setCategories(data))
      .catch((err) => {
        if (err.name !== 'AbortError') console.error('Не вдалося завантажити категорії:', err);
      });
    return () => controller.abort();
  }, []);

  // --- Похідні дані ---
  const visibleProducts = sortProducts(filterByCategory(products, category), sort);

  let content;
  if (error) {
    content = <ErrorMessage message={error.message} onRetry={() => setReloadKey((k) => k + 1)} />;
  } else if (loading) {
    content = <Loader text="Завантажуємо товари…" />;
  } else {
    content = <ProductList products={visibleProducts} onAddToCart={onAddToCart} />;
  }

  return (
    <section>
      <h1 className="page-title">Каталог</h1>

      <div className="toolbar">
        {/* replace: набір тексту не повинен створювати запис в історії на кожну літеру */}
        <SearchBar value={query} onChange={(value) => updateParams({ q: value }, { replace: true })} />
        <CategoryFilter
          categories={categories}
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

Зверніть увагу на кілька рішень:

| Рішення | Пояснення |
|---|---|
| `query`, `category`, `sort` обчислюються з `searchParams` | URL — **єдине джерело істини** для фільтрів; немає дублювання в `useState` |
| Поле пошуку керується значенням з URL | Кнопки «Назад»/«Вперед» і F5 автоматично відновлюють текст у полі |
| `{ replace: true }` для пошуку | Інакше слово «laptop» створило б 6 записів в історії, і «Назад» стирав би по літері |
| Для категорії і сортування — без `replace` | «Назад» повертає попередню категорію — очікувана поведінка |
| `sort=default` не пишемо в URL | Адреса без зайвих параметрів: `/` замість `/?sort=default` |
| `debouncedQuery` ініціалізується з URL | Якщо відкрити посилання `/?q=phone`, перший запит одразу піде з пошуком, без затримки |

### Крок 5. Посилання з картки на сторінку товару

У `ProductCard` зробимо зображення і назву посиланням на `/product/:id`:

```jsx title="src/components/ProductCard.jsx (зміни)" {2,7,12-23,27-29}
import { useState } from 'react';
import { Link } from 'react-router';
// ...інші імпорти без змін

export default function ProductCard({ product, onAddToCart }) {
  // ...стан isFavorite і деструктуризація product без змін
  const productUrl = `/product/${product.id}`;

  return (
    <article className="product-card">
      {/* ...кнопка ♥ без змін */}
      <Link to={productUrl} tabIndex={-1} aria-hidden="true">
        <img
          className="product-card__image"
          src={thumbnail}
          alt=""
          width="300"
          height="300"
          loading="lazy"
        />
      </Link>

      <div className="product-card__body">
        {brand && <p className="product-card__brand">{brand}</p>}
        <h3 className="product-card__title">
          <Link to={productUrl} className="product-card__link">{title}</Link>
        </h3>
        {/* ...опис, рейтинг, ціна, наявність, кнопка «У кошик» без змін */}
      </div>
    </article>
  );
}
```

```css title="src/components/ProductCard.css (додати)"
.product-card__link {
  color: inherit;
  text-decoration: none;
}

.product-card__link:hover {
  color: #4f46e5;
  text-decoration: underline;
}
```

Чому на зображенні `tabIndex={-1}` і `aria-hidden`? Картка містить два посилання на ту саму адресу. Користувач клавіатури або екранного читача натрапив би на них двічі. Залишаємо доступним лише текстове посилання з назвою, а зображення — додатковою зоною кліку для миші. Порожній `alt` тут доречний: назва товару вже є в текстовому посиланні поруч.

### Крок 6. ProductPage: товар за id

```jsx title="src/pages/ProductPage.jsx"
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { API_URL, fetchJson } from '../utils/api';
import { formatPrice } from '../utils/format';
import './ProductPage.css';

export default function ProductPage({ onAddToCart }) {
  const { id } = useParams(); // рядок, наприклад '12'
  const navigate = useNavigate();
  const location = useLocation();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProduct() {
      setLoading(true);
      setError(null);
      setActiveImage(0); // новий товар — починаємо галерею з першого фото
      setAdded(false);
      try {
        const data = await fetchJson(`${API_URL}/products/${id}`, { signal: controller.signal });
        setProduct(data);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadProduct();
    return () => controller.abort();
  }, [id, reloadKey]); // id у залежностях: перехід /product/1 → /product/2 перезавантажить дані

  function handleBack() {
    // Якщо сторінку відкрили за прямим посиланням, «назад» вивело б із сайту
    if (location.key === 'default') navigate('/');
    else navigate(-1);
  }

  function handleAdd() {
    onAddToCart(product);
    setAdded(true);
  }

  if (loading) return <Loader text="Завантажуємо товар…" />;

  if (error) {
    // 404 від API — товару не існує, повторювати запит немає сенсу
    if (error.status === 404) {
      return (
        <div className="empty-state">
          <p>Товар №{id} не знайдено.</p>
          <Link to="/">Перейти до каталогу</Link>
        </div>
      );
    }
    return <ErrorMessage message={error.message} onRetry={() => setReloadKey((k) => k + 1)} />;
  }

  const images = product.images?.length ? product.images : [product.thumbnail];

  return (
    <article className="product-page">
      <button type="button" className="back-button" onClick={handleBack}>
        ← Назад
      </button>

      <div className="product-page__layout">
        <div className="gallery">
          <img src={images[activeImage]} alt={product.title} className="gallery__main" />
          {images.length > 1 && (
            <div className="gallery__thumbs">
              {images.map((src, index) => (
                <button
                  key={src}
                  type="button"
                  className={`gallery__thumb ${index === activeImage ? 'gallery__thumb--active' : ''}`}
                  onClick={() => setActiveImage(index)}
                  aria-label={`Фото ${index + 1}`}
                  aria-pressed={index === activeImage}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-page__info">
          <Link to={`/?category=${product.category}`} className="product-page__category">
            {product.category}
          </Link>
          <h1 className="product-page__title">{product.title}</h1>
          {product.brand && <p className="product-page__brand">Бренд: {product.brand}</p>}
          <p className="product-page__rating">★ {product.rating.toFixed(1)}</p>

          <p className="product-page__price">
            {formatPrice(product.price)}
            {product.discountPercentage > 0 && (
              <span className="product-page__discount">−{Math.round(product.discountPercentage)}%</span>
            )}
          </p>

          <p className={product.stock > 0 ? 'product-page__stock' : 'product-page__stock product-page__stock--out'}>
            {product.stock > 0 ? `В наявності: ${product.stock} шт.` : 'Немає в наявності'}
          </p>

          <p className="product-page__description">{product.description}</p>

          <div className="product-page__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleAdd}
              disabled={product.stock === 0}
            >
              {added ? 'Додати ще' : 'У кошик'}
            </button>
            {added && <Link to="/cart">Перейти до кошика →</Link>}
          </div>
        </div>
      </div>
    </article>
  );
}
```

```css title="src/pages/ProductPage.css"
.product-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 2rem;
}

@media (max-width: 768px) {
  .product-page__layout {
    grid-template-columns: 1fr;
  }
}

.gallery__main {
  width: 100%;
  aspect-ratio: 1;
  object-fit: contain;
  background: #f8fafc;
  border-radius: 14px;
}

.gallery__thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.gallery__thumb {
  width: 64px;
  height: 64px;
  padding: 0;
  overflow: hidden;
  background: #f8fafc;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
}

.gallery__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery__thumb--active {
  border-color: #4f46e5;
}

.product-page__category {
  font-size: 0.85rem;
  color: #4f46e5;
  text-transform: capitalize;
}

.product-page__title {
  margin: 0.25rem 0 0.5rem;
}

.product-page__brand,
.product-page__rating {
  margin: 0.25rem 0;
  color: #475569;
}

.product-page__price {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin: 1rem 0 0.5rem;
  font-size: 1.75rem;
  font-weight: 700;
}

.product-page__discount {
  padding: 0.15rem 0.5rem;
  font-size: 0.9rem;
  color: #fff;
  background: #ef4444;
  border-radius: 6px;
}

.product-page__stock {
  color: #16a34a;
}

.product-page__stock--out {
  color: #dc2626;
}

.product-page__description {
  line-height: 1.6;
}

.product-page__actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-top: 1.5rem;
}
```

Ключові моменти:

- `id` з `useParams` — рядок. Тут він лише підставляється в URL, тож перетворення не потрібне.
- `id` у залежностях ефекту: React Router не перемонтовує `ProductPage` при переході між товарами, змінюється лише параметр.
- Розрізняємо помилки: на 404 повторна спроба не допоможе, а на помилку мережі — допоможе. Для цього в `fetchJson` на практичній 11 ми зберегли `error.status`.
- Посилання на категорію веде в каталог з параметром `?category=` — і `HomePage` одразу покаже відфільтрований список. Це перевага зберігання фільтрів в URL.
- Ранні `return` стоять **після** усіх хуків.

:::tip[Скидання стану через key]
Замість ручного скидання `activeImage` і `added` в ефекті можна змусити React створити компонент заново при зміні `id`, передавши йому `key`: винести вміст у `ProductDetails` і рендерити `<ProductDetails key={id} ... />`. Новий `key` — новий екземпляр компонента з початковим станом. Це рекомендований react.dev спосіб «скинути весь стан при зміні пропса».
:::

### Крок 7. CartPage: кошик і оформлення

Модальне вікно для кошика більше не потрібне — у нього тепер окрема сторінка. Компонент `Modal` залишаємо в проєкті: він знадобиться для інших задач (наприклад, `ReviewForm`).

```jsx title="src/pages/CartPage.jsx"
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import CartSummary from '../components/CartSummary';
import CheckoutForm from '../components/CheckoutForm';
import { formatPrice } from '../utils/format';

export default function CartPage({ items, onIncrement, onDecrement, onRemove, onClear }) {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  function handleOrderSubmit(values) {
    console.log('Нове замовлення:', { ...values, items, total });
    setOrder({ id: Date.now(), name: values.name, total });
    onClear();
  }

  if (order) {
    return (
      <section className="order-success">
        <p className="order-success__icon">✅</p>
        <h1 className="page-title">Дякуємо, {order.name}!</h1>
        <p>
          Замовлення №{order.id} на суму <strong>{formatPrice(order.total)}</strong> прийнято.
        </p>
        {/* Програмна навігація після завершення дії */}
        <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>
          Продовжити покупки
        </button>
      </section>
    );
  }

  return (
    <section className="cart-page">
      <h1 className="page-title">Кошик</h1>
      <CartSummary
        items={items}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        onRemove={onRemove}
      />
      {items.length > 0 ? (
        <CheckoutForm total={total} onSubmit={handleOrderSubmit} />
      ) : (
        <p>
          <Link to="/">← Перейти до каталогу</Link>
        </p>
      )}
    </section>
  );
}
```

```css title="src/App.css (додати)"
.cart-page {
  max-width: 760px;
}
```

### Крок 8. NotFoundPage

```jsx title="src/pages/NotFoundPage.jsx"
import { Link, useLocation } from 'react-router';

export default function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <section className="not-found">
      <p className="not-found__code">404</p>
      <h1 className="page-title">Сторінку не знайдено</h1>
      <p>
        За адресою <code>{pathname}</code> нічого немає.
      </p>
      <Link to="/" className="btn btn--primary">
        На головну
      </Link>
    </section>
  );
}
```

```css title="src/App.css (додати)"
.not-found {
  padding: 3rem 1rem;
  text-align: center;
}

.not-found__code {
  margin: 0;
  font-size: 5rem;
  font-weight: 800;
  color: #c7d2fe;
}
```

### Крок 9. App.jsx: стан кошика і маршрути

`App` тепер відповідає лише за дві речі: стан кошика і таблицю маршрутів.

```jsx title="src/App.jsx"
import { useState } from 'react';
import { Routes, Route } from 'react-router';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import NotFoundPage from './pages/NotFoundPage';
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

  function handleClear() {
    setCart([]);
  }

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <Routes>
      <Route element={<Layout cartCount={cartCount} />}>
        <Route index element={<HomePage onAddToCart={handleAddToCart} />} />
        <Route path="product/:id" element={<ProductPage onAddToCart={handleAddToCart} />} />
        <Route
          path="cart"
          element={
            <CartPage
              items={cart}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onRemove={handleRemove}
              onClear={handleClear}
            />
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
```

### Крок 10. Перевірка

Пройдіть сценарій і переконайтеся, що все працює:

1. `/` — каталог, у шапці активний пункт «Каталог».
2. Введіть у пошук `phone` — адреса стала `/?q=phone`. Оберіть категорію `smartphones` — `/?q=phone&category=smartphones`. Змініть сортування — додався `sort`.
3. Натисніть **F5** — фільтри і текст у полі збереглися. Скопіюйте адресу і відкрийте в новій вкладці — той самий результат.
4. Натисніть «Назад» браузера — повернулися до попередньої категорії (а не до кожної літери пошуку).
5. Клацніть на назву товару — `/product/…`, галерея перемикається, «У кошик» збільшує лічильник у шапці; з'явилося посилання «Перейти до кошика».
6. Клацніть на категорію над назвою товару — каталог з відфільтрованою категорією.
7. Відкрийте `/product/1` напряму в новій вкладці і натисніть «← Назад» — потрапили в каталог, а не на порожню вкладку.
8. Відкрийте `/product/99999` — «Товар №99999 не знайдено».
9. `/cart` — активний пункт «Кошик»; оформіть замовлення — повідомлення з кнопкою «Продовжити покупки», яка веде в каталог.
10. `/abracadabra` — сторінка 404 з шапкою і футером.

:::caution[Кошик зникає після F5]
Кошик зберігається у стані `App` — у пам'яті. Оновлення сторінки його очищає. Це виправимо на наступній парі за допомогою `localStorage` і власного хука `useLocalStorage`.
:::

### Крок 11. Аналіз: prop drilling

Подивіться, який шлях проходить функція `handleAddToCart` від місця, де вона створена, до кнопки, що її викликає:

```text
App (handleAddToCart)
 └─ Route element ─► HomePage (onAddToCart)        ← сам не використовує, лише передає
                      └─► ProductList (onAddToCart) ← сам не використовує, лише передає
                           └─► ProductCard (onAddToCart) ← нарешті викликає

App (cartCount)
 └─► Layout (cartCount)  ← сам не використовує, лише передає
      └─► Header (cartCount)

App (cart, 5 обробників)
 └─► CartPage (items, onIncrement, onDecrement, onRemove, onClear)
      └─► CartSummary (items, onIncrement, onDecrement, onRemove)
```

Ця ситуація називається **prop drilling** («просвердлювання пропсів»): дані передаються крізь компоненти, яким вони не потрібні, лише щоб дістатися до глибоко вкладеного споживача. Недоліки:

- Проміжні компоненти (`HomePage`, `ProductList`, `Layout`) мають пропси, які до них не стосуються, — їх важче перевикористати.
- Додати кошик у новий компонент (наприклад, кнопку «У кошик» у блоці «Схожі товари») — означає протягнути пропс через усі рівні.
- Перейменування пропса зачіпає 3–4 файли.

Запишіть у звіт: скільки компонентів отримують пропси кошика, але самі їх не використовують? На практичній 13 ми розв'яжемо цю проблему за допомогою **контексту** (Context API).

```bash
git add .
git commit -m "P12: React Router pages, URL search params"
```

**Результат роботи:** «Міні-магазин» став багатосторінковим SPA: каталог з фільтрами в URL, сторінка товару з галереєю, кошик з оформленням замовлення, сторінка 404; навігація без перезавантаження з підсвічуванням активного пункту меню.

## Завдання для самостійного виконання

1. ★ Додайте в шапку посилання «Про магазин» (`/about`) і створіть просту сторінку `AboutPage`.
2. ★ Змініть заголовок вкладки браузера відповідно до сторінки: у React 19 можна просто відрендерити `<title>{product.title} — Міні-магазин</title>` усередині компонента сторінки — React перенесе його в `<head>`.
3. ★★ На сторінці товару додайте блок «Інші товари цієї категорії»: завантажте `/products/category/{slug}?limit=5`, виключіть поточний товар і покажіть картки з посиланнями. Перевірте, що перехід на інший товар з цього блоку оновлює сторінку (саме тут знадобиться `id` у залежностях).
4. ★★ Перенесіть `ReviewForm` (завдання ★★ з практичної 10) на сторінку товару.
5. ★★★ Додайте компонент `ScrollToTop` (див. лекцію 8), щоб при переході на сторінку товару вона відкривалася з початку. Подумайте, як при поверненні «Назад» у каталог відновлювати попередню позицію прокрутки (підказка: `sessionStorage` і `location.key`).

## Контрольні питання

1. Чому `BrowserRouter` розміщують у `main.jsx`, а не в окремих сторінках?
2. Яку роль виконує `Layout` і чому маршрут з ним не має `path`?
3. Навіщо `NavLink` до каталогу має проп `end`?
4. Чому пошук, категорія і сортування зберігаються в URL, а не в `useState`? Які переваги це дає користувачеві?
5. Навіщо `{ replace: true }` при оновленні параметра `q`?
6. Чому в залежностях ефекту `ProductPage` є `id`? Що станеться без нього?
7. Як сторінка товару розрізняє «товару не існує» і «немає мережі»?
8. Для чого перевірка `location.key === 'default'` у `handleBack`?
9. Що таке prop drilling? Назвіть компоненти «Міні-магазину», що страждають від нього.

## Домашнє завдання

1. Виконайте завдання ★2 (заголовок вкладки) для сторінок каталогу, товару, кошика і 404.
2. Перевірте, що застосунок коректно працює з адресами, введеними вручну: `/?category=laptops`, `/?q=watch&sort=price-desc`, `/product/5`, `/cart/`.
3. Прочитайте на react.dev розділ [Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context).

## Що здати

- Посилання на репозиторій з комітом `P12: ...`.
- Скриншоти: каталог з фільтрами в адресному рядку; сторінка товару; кошик з формою; сторінка 404.
- Схема prop drilling вашого застосунку з відповіддю на питання з кроку 11.
- Відповіді на контрольні питання.
