---
title: "React Router: маршрутизація SPA"
description: "Клієнтська маршрутизація в односторінкових застосунках: React Router v7 у декларативному режимі — BrowserRouter, Routes і Route, вкладені маршрути та Outlet, Link і NavLink, параметри URL, програмна навігація, query-параметри, сторінка 404 і огляд data/framework mode."
type: lecture
pair: 8
topic: 78
---

## Мета заняття

- Зрозуміти, що таке маршрутизація (routing) в односторінковому застосунку (SPA) і чим клієнтська маршрутизація відрізняється від серверної.
- Розібратися, як браузерний History API дозволяє змінювати адресу без перезавантаження сторінки.
- Опанувати React Router v7 у декларативному режимі (declarative mode): `BrowserRouter`, `Routes`, `Route`, індексні та вкладені маршрути, `Outlet`.
- Навчитися будувати навігацію за допомогою `Link` і `NavLink`, читати параметри URL (`useParams`) і рядок запиту (`useSearchParams`), виконувати програмну навігацію (`useNavigate`, `Navigate`).
- Реалізувати сторінку 404, захищений маршрут і зрозуміти, що потрібно для розгортання SPA на хостингу.
- Отримати уявлення про режими data mode і framework mode.

## План лекції

1. Навіщо SPA маршрутизація. Серверна vs клієнтська.
2. Як це працює: History API і подія `popstate`.
3. React Router v7: режими, встановлення, перший маршрут.
4. `Routes` і `Route`: шляхи, індексні маршрути, порядок зіставлення.
5. Вкладені маршрути, макети (layout) і `Outlet`.
6. Навігація: `Link`, `NavLink`, відносні шляхи.
7. Динамічні сегменти і `useParams`.
8. Програмна навігація: `useNavigate`, `Navigate`, `useLocation`.
9. Рядок запиту: `useSearchParams`.
10. Сторінка 404, захищені маршрути, розгортання.
11. Data mode і framework mode: що далі.

## 1. Навіщо SPA маршрутизація

### Багатосторінковий сайт (MPA)

У класичному сайті (multi-page application, MPA) — наприклад, на PHP — кожна адреса відповідає окремому документу, який формує сервер:

```text
GET /courses        → сервер виконує courses.php → новий HTML
GET /courses/42     → сервер виконує course.php?id=42 → новий HTML
```

При кожному переході браузер **повністю перезавантажує сторінку**: заново завантажує HTML, CSS, JS, втрачає стан скриптів, прокрутку, введені дані.

### Односторінковий застосунок (SPA)

React-застосунок, створений через Vite, — це **один** HTML-файл `index.html` з `<div id="root">` і JavaScript-бандлом. Увесь інтерфейс малює React. Якщо нічого не робити, у застосунку буде **одна адреса** — `/`, і:

- не можна поділитися посиланням на конкретний товар чи статтю;
- не працюють кнопки «Назад» / «Вперед» браузера;
- оновлення сторінки (F5) скидає користувача на «головний екран»;
- пошукові системи бачать лише одну сторінку.

Можна було б перемикати «сторінки» через стан (`const [page, setPage] = useState('home')`), але це не розв'язує жодної з проблем вище — адреса в браузері не змінюється.

**Клієнтська маршрутизація (client-side routing)** — це підхід, за якого JavaScript у браузері:

1. Перехоплює кліки по посиланнях і **змінює URL без запиту до сервера**.
2. Читає поточний URL і **вирішує, які компоненти показати**.
3. Реагує на кнопки «Назад» / «Вперед».

### Порівняння

| Характеристика | Серверна маршрутизація (MPA) | Клієнтська маршрутизація (SPA) |
|---|---|---|
| Хто вирішує, що показати | Сервер (PHP, Node.js…) | JavaScript у браузері (React Router) |
| Перехід між сторінками | Повне перезавантаження | Перемальовується лише змінена частина |
| Стан застосунку при переході | Втрачається | Зберігається (кошик, введені дані) |
| Перше завантаження | Швидке (готовий HTML) | Довше (потрібно завантажити JS) |
| Наступні переходи | Повільніші | Миттєві (дані — через `fetch`) |
| SEO | Просто | Потребує додаткових зусиль (SSR, пререндеринг) |
| Налаштування хостингу | Звичайне | Потрібен «fallback» на `index.html` |

:::note
Сучасні фреймворки (Next.js, React Router у framework mode, Remix) поєднують обидва підходи: перша сторінка рендериться на сервері, а подальші переходи — клієнтські. Але базою для всіх є саме клієнтська маршрутизація, яку ми розглядаємо сьогодні.
:::

## 2. Як це працює: History API

Браузер надає **History API** — набір методів для керування історією сесії без перезавантаження:

```js
// Додати новий запис в історію і змінити адресу (сторінка НЕ перезавантажується)
history.pushState({ from: 'home' }, '', '/courses/42');

// Замінити поточний запис (кнопка «Назад» не поверне на попередню адресу)
history.replaceState(null, '', '/login');

// Перейти назад / вперед
history.back();
history.forward();
history.go(-2);

// Подія спрацьовує, коли користувач натискає «Назад» / «Вперед»
window.addEventListener('popstate', () => {
  console.log('Нова адреса:', location.pathname);
});
```

Спрощено бібліотеку маршрутизації можна написати самостійно:

```jsx title="Наївний роутер (лише для розуміння!)"
import { useEffect, useState } from 'react';

function usePathname() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function navigate(to) {
    window.history.pushState(null, '', to);
    setPath(to); // pushState не генерує popstate — оновлюємо стан самі
  }

  return [path, navigate];
}

export default function App() {
  const [path, navigate] = usePathname();

  return (
    <>
      <nav>
        <button onClick={() => navigate('/')}>Головна</button>
        <button onClick={() => navigate('/about')}>Про нас</button>
      </nav>
      {path === '/' && <h1>Головна</h1>}
      {path === '/about' && <h1>Про нас</h1>}
    </>
  );
}
```

Це працює, але вже на п'яти-шести сторінках з'являються питання: як описати параметри (`/courses/:id`), вкладені макети, сторінку 404, активні посилання, рядок запиту, відносні шляхи? Саме це і розв'язує **React Router** — найпоширеніша бібліотека маршрутизації для React.

## 3. React Router v7: режими і встановлення

### Три режими

Починаючи з версії 7, React Router (який об'єднався з фреймворком Remix) можна використовувати в трьох режимах:

| Режим | Як підключається | Що дає | Коли обирати |
|---|---|---|---|
| **Declarative mode** (декларативний) | `<BrowserRouter>`, `<Routes>`, `<Route>` | Зіставлення URL, навігація, активні посилання, параметри | Невеликі й середні SPA, навчання, поступове додавання до проєкту |
| **Data mode** (режим даних) | `createBrowserRouter()`, `<RouterProvider>` | + завантаження даних до рендеру (`loader`), обробка форм (`action`), стани очікування | SPA з великою кількістю запитів |
| **Framework mode** (фреймворк) | Плагін Vite `@react-router/dev`, файл `routes.ts` | + серверний рендеринг, розбиття коду, типізація маршрутів | Повноцінні вебзастосунки, аналог Next.js |

У курсі ми використовуємо **декларативний режим** — він найпростіший і дає повне розуміння основних понять. Решта режимів побудовані поверх тих самих ідей.

### Встановлення

```bash
npm i react-router
```

:::caution[react-router чи react-router-dom?]
До версії 6 включно для вебу встановлювали пакет `react-router-dom`. У **v7** усе необхідне для вебу міститься в пакеті **`react-router`**, а `react-router-dom` залишено лише для сумісності (він просто реекспортує `react-router`). У нових проєктах імпортуйте з `'react-router'`. У старих статтях і відповідях на Stack Overflow ви часто бачитимете `react-router-dom` і API v5 (`Switch`, `component={...}`, `useHistory`) — це застарілий код.
:::

### Підключення: BrowserRouter

`BrowserRouter` — компонент-«маршрутизатор» (router), який стежить за адресою в браузері та надає її всім нащадкам через контекст. Його розміщують один раз, якомога вище в дереві:

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

Усі хуки та компоненти React Router (`Link`, `useParams`, `useNavigate`…) працюють **лише всередині** `BrowserRouter`. Спроба використати їх поза ним дає помилку на кшталт «useNavigate() may be used only in the context of a `<Router>` component».

Інші маршрутизатори:

| Компонент | URL виглядає як | Застосування |
|---|---|---|
| `BrowserRouter` | `/courses/42` | Стандарт для вебу; потребує налаштування сервера (див. розділ 10) |
| `HashRouter` | `/#/courses/42` | Хостинг, де не можна налаштувати fallback (наприклад, простий статичний хостинг). Частина після `#` не надсилається на сервер |
| `MemoryRouter` | (адреса не змінюється) | Тести, вбудовані віджети |

## 4. Routes і Route

Наскрізний приклад лекції — навчальна платформа «CourseHub» з такими сторінками:

| Адреса | Сторінка |
|---|---|
| `/` | Головна |
| `/courses` | Список курсів |
| `/courses/react-basics` | Сторінка курсу |
| `/courses/react-basics/lessons/3` | Урок курсу |
| `/about` | Про платформу |
| `/dashboard` | Особистий кабінет (лише для авторизованих) |
| будь-яка інша | Сторінка 404 |

### Найпростіша конфігурація

```jsx title="src/App.jsx"
import { Routes, Route } from 'react-router';
import HomePage from './pages/HomePage';
import CoursesPage from './pages/CoursesPage';
import AboutPage from './pages/AboutPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/courses" element={<CoursesPage />} />
      <Route path="/about" element={<AboutPage />} />
    </Routes>
  );
}
```

- `<Routes>` переглядає всі вкладені `<Route>` і рендерить **найкращий збіг** для поточного URL.
- `path` — шаблон шляху; `element` — **JSX-елемент** (не компонент!), який треба показати.

:::caution[Типова помилка]
`element={HomePage}` — неправильно, потрібен саме елемент: `element={<HomePage />}`. Перевага такого запису — можна одразу передати пропси: `element={<CoursesPage level="beginner" />}`.
:::

### Як React Router обирає маршрут

На відміну від старого `Switch` з v5, порядок маршрутів у `<Routes>` **не важливий**. Бібліотека ранжує шляхи за специфічністю:

| Тип сегмента | Приклад | Пріоритет |
|---|---|---|
| Статичний | `/courses/new` | найвищий |
| Динамічний | `/courses/:courseId` | середній |
| Splat (усе, що залишилося) | `/courses/*`, `*` | найнижчий |

Тому `/courses/new` і `/courses/:courseId` можуть співіснувати: адреса `/courses/new` потрапить на статичний маршрут, а `/courses/react-basics` — на динамічний.

Інші правила:

- Шляхи нечутливі до регістру за замовчуванням (`/About` = `/about`); `caseSensitive` змінює це.
- Кінцевий слеш ігнорується (`/about/` = `/about`).
- Рядок запиту (`?page=2`) і хеш (`#top`) **не беруть участі** в зіставленні.

## 5. Вкладені маршрути, макети і Outlet

### Проблема

Майже кожна сторінка має однакові «шапку», меню і футер. Копіювати `<Header />` у кожну сторінку — погано. Крім того, сторінка курсу має власну внутрішню навігацію («Опис», «Програма», «Уроки»), яка має залишатися на місці при переході між уроками.

### Вкладені маршрути

Маршрути можна вкладати один в одний. Тоді:

- шлях дочірнього маршруту **додається** до шляху батьківського;
- батьківський компонент рендериться **разом** із дочірнім;
- місце, де саме має з'явитися дочірній компонент, позначається компонентом **`<Outlet />`**.

```jsx title="src/App.jsx"
import { Routes, Route } from 'react-router';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import CoursesPage from './pages/CoursesPage';
import CoursePage from './pages/CoursePage';
import LessonPage from './pages/LessonPage';
import AboutPage from './pages/AboutPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      {/* Маршрут-макет без path: лише обгортає дочірні сторінки */}
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="courses">
          <Route index element={<CoursesPage />} />
          <Route path=":courseId" element={<CoursePage />}>
            <Route path="lessons/:lessonId" element={<LessonPage />} />
          </Route>
        </Route>
        <Route path="about" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
```

```jsx title="src/components/Layout.jsx"
import { Outlet } from 'react-router';
import Header from './Header';

export default function Layout() {
  return (
    <div className="app">
      <Header />
      <main className="container">
        {/* Сюди React Router підставить сторінку, що відповідає URL */}
        <Outlet />
      </main>
      <footer className="footer">© CourseHub, {new Date().getFullYear()}</footer>
    </div>
  );
}
```

Що буде показано для різних адрес:

| URL | Дерево компонентів |
|---|---|
| `/` | `Layout` → `HomePage` |
| `/courses` | `Layout` → `CoursesPage` |
| `/courses/react-basics` | `Layout` → `CoursePage` (його `Outlet` порожній) |
| `/courses/react-basics/lessons/3` | `Layout` → `CoursePage` → `LessonPage` |
| `/qwerty` | `Layout` → `NotFoundPage` |

### Різновиди маршрутів

| Різновид | Запис | Призначення |
|---|---|---|
| Звичайний | `<Route path="about" element={<AboutPage />} />` | Сторінка за адресою |
| Індексний (index route) | `<Route index element={<CoursesPage />} />` | Показується в `Outlet` батька, коли URL збігається **точно** з батьківським шляхом. Не має власного `path` і не може мати дітей |
| Макет (layout route) | `<Route element={<Layout />}>…</Route>` | Не має `path`, не додає сегментів до URL — лише спільна обгортка |
| Префікс (prefix route) | `<Route path="courses">…</Route>` | Має `path`, але не має `element` — групує дочірні маршрути під спільним префіксом |

:::tip[Абсолютні й відносні шляхи у Route]
Шлях дочірнього маршруту зазвичай пишуть **без** початкового слеша (`path="about"`) — він відносний до батька. Абсолютний шлях (`path="/about"`) всередині вкладеного маршруту також допустимий, але лише якщо він починається з повного шляху батька. Щоб не плутатися, у вкладених маршрутах пишіть відносні шляхи.
:::

### Outlet і передавання даних

`Outlet` може передати дочірнім маршрутам дані через проп `context`, а дочірні читають їх хуком `useOutletContext()`:

```jsx
// CoursePage.jsx
<Outlet context={{ course }} />

// LessonPage.jsx
import { useOutletContext } from 'react-router';
const { course } = useOutletContext();
```

Це зручно, коли батьківська сторінка вже завантажила дані, потрібні дочірнім.

## 6. Навігація: Link і NavLink

### Чому не `<a href>`

Звичайне посилання `<a href="/about">` змушує браузер зробити **новий запит** до сервера і перезавантажити сторінку — увесь стан React втрачається. Компонент **`Link`** рендерить той самий тег `<a>` (тобто зберігається доступність, відкриття в новій вкладці через Ctrl+клік, копіювання адреси), але перехоплює клік і виконує клієнтську навігацію через History API.

```jsx
import { Link } from 'react-router';

<Link to="/courses">Усі курси</Link>
<Link to={`/courses/${course.slug}`}>{course.title}</Link>

{/* Об'єкт замість рядка */}
<Link to={{ pathname: '/courses', search: '?level=beginner' }}>Для початківців</Link>

{/* Замінити запис в історії замість додавання */}
<Link to="/login" replace>Увійти</Link>

{/* Передати стан, який не відображається в URL */}
<Link to="/checkout" state={{ from: 'cart' }}>Оформити</Link>
```

Для зовнішніх адрес (`https://react.dev`) використовуйте звичайний `<a>`.

### NavLink — посилання, що знає, чи воно активне

Для меню потрібно підсвічувати пункт, що відповідає поточній сторінці. `NavLink` — це `Link`, який:

- автоматично додає клас `active`, коли його `to` збігається з поточною адресою;
- додає атрибут `aria-current="page"` (важливо для екранних читачів);
- дозволяє передати функцію в `className`, `style` або `children`.

```jsx title="src/components/Header.jsx"
import { NavLink, Link } from 'react-router';
import './Header.css';

const linkClass = ({ isActive }) => (isActive ? 'nav__link nav__link--active' : 'nav__link');

export default function Header() {
  return (
    <header className="header">
      <Link to="/" className="logo">CourseHub</Link>
      <nav className="nav">
        <NavLink to="/" end className={linkClass}>Головна</NavLink>
        <NavLink to="/courses" className={linkClass}>Курси</NavLink>
        <NavLink to="/about" className={linkClass}>Про нас</NavLink>
      </nav>
    </header>
  );
}
```

```css title="src/components/Header.css"
.nav__link {
  padding: 0.5rem 0.75rem;
  color: #334155;
  text-decoration: none;
  border-radius: 6px;
}

.nav__link--active {
  background: #e0e7ff;
  color: #3730a3;
  font-weight: 600;
}
```

Зверніть увагу на проп **`end`** у посилання на `/`. За замовчуванням `NavLink` активний і тоді, коли поточна адреса **починається** з його шляху: посилання «Курси» (`/courses`) підсвічене і на `/courses/react-basics` — це зручно. Але адреса `/` є початком **будь-якої** адреси, тому без `end` пункт «Головна» підсвічувався б завжди.

Функція в `className` також отримує `isPending` і `isTransitioning` — вони мають сенс у data mode.

### Відносні посилання

Якщо `to` не починається зі слеша, шлях обчислюється **відносно поточного маршруту** (а не поточного URL):

```jsx
// Усередині CoursePage (маршрут /courses/:courseId)
<Link to="lessons/1">Перший урок</Link>      {/* → /courses/react-basics/lessons/1 */}
<Link to="..">Назад до списку курсів</Link>  {/* → /courses */}
```

`..` піднімається на один **рівень ієрархії маршрутів**. Якщо потрібно піднятися саме на один сегмент URL, додайте `relative="path"`.

## 7. Динамічні сегменти і useParams

Сегмент шляху, що починається з двокрапки, — **динамічний сегмент** (URL parameter). Він збігається з будь-яким значенням, а саме значення можна прочитати хуком `useParams()`:

```jsx title="src/pages/LessonPage.jsx"
import { useParams, Link } from 'react-router';
import { lessons } from '../data/lessons';

export default function LessonPage() {
  // Для маршруту courses/:courseId/lessons/:lessonId
  const { courseId, lessonId } = useParams();

  // Параметри — ЗАВЖДИ рядки (або undefined)
  const lesson = lessons.find(
    (l) => l.courseId === courseId && l.number === Number(lessonId),
  );

  if (!lesson) {
    return <p>Урок не знайдено. <Link to="..">До курсу</Link></p>;
  }

  return (
    <article>
      <h2>Урок {lesson.number}. {lesson.title}</h2>
      <p>{lesson.content}</p>
      {/* '..' — батьківський маршрут (:courseId), далі — наступний урок */}
      <Link to={`../lessons/${lesson.number + 1}`}>Наступний урок →</Link>
    </article>
  );
}
```

Важливі моменти:

- Значення параметрів — **рядки**. Порівняння `l.id === lessonId`, де `l.id` — число, завжди дасть `false`. Перетворюйте явно: `Number(lessonId)`.
- `useParams()` повертає параметри **поточного маршруту і всіх батьківських**.
- Якщо користувач переходить з `/courses/a` на `/courses/b`, React Router **не перемонтовує** компонент `CoursePage` — змінюється лише значення `courseId`. Тому ефекти, що завантажують дані, повинні мати `courseId` у масиві залежностей:

```jsx
const { courseId } = useParams();

useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/courses/${courseId}`, { signal: controller.signal })
    .then((res) => res.json())
    .then(setCourse)
    .catch((err) => {
      if (err.name !== 'AbortError') setError(err);
    });
  return () => controller.abort();
}, [courseId]); // ← без цього при переході між курсами дані не оновляться
```

### Необов'язкові сегменти і splat

```jsx
{/* :lang? — необов'язковий сегмент: збігається і з /about, і з /en/about */}
<Route path=":lang?/about" element={<AboutPage />} />

{/* * — splat: усе, що залишилося від URL */}
<Route path="docs/*" element={<DocsPage />} />
```

У компоненті значення splat доступне як `useParams()['*']`: для `/docs/hooks/use-state` це `'hooks/use-state'`.

## 8. Програмна навігація

### useNavigate

Іноді перейти потрібно не по кліку на посилання, а в результаті дії: після відправлення форми, входу в систему, видалення запису. Для цього є хук `useNavigate()`, що повертає функцію `navigate`:

```jsx title="src/pages/LoginPage.jsx"
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');

  // Куди повернути після входу (див. ProtectedRoute нижче)
  const from = location.state?.from ?? '/dashboard';

  async function handleSubmit(event) {
    event.preventDefault();
    await login(email);
    // replace: сторінка входу не залишиться в історії —
    // «Назад» з кабінету не поверне на форму входу
    navigate(from, { replace: true });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <button type="submit">Увійти</button>
    </form>
  );
}
```

Варіанти виклику:

| Виклик | Дія |
|---|---|
| `navigate('/courses')` | Перехід на адресу (новий запис в історії) |
| `navigate('/login', { replace: true })` | Замінити поточний запис |
| `navigate('/checkout', { state: { total: 120 } })` | Перехід з передаванням стану (читається через `useLocation().state`) |
| `navigate(-1)` | Назад (як кнопка браузера) |
| `navigate(1)` | Вперед |
| `navigate('..')` | Відносна навігація — на рівень вище |

:::caution[navigate — не під час рендеру]
`navigate()` викликають в **обробниках подій** або в ефектах, але не безпосередньо в тілі компонента під час рендеру. Якщо потрібно перенаправити користувача одразу під час рендеру — використовуйте компонент `<Navigate>`.
:::

:::tip[Link чи navigate?]
Якщо елемент для користувача — це перехід «кудись», використовуйте `Link`: він є справжнім посиланням (можна відкрити в новій вкладці, екранний читач оголосить «посилання»). `navigate()` — для переходів як **наслідку дії** (форма, кнопка «Зберегти»).
:::

### Компонент Navigate

`<Navigate to="..." />` виконує перехід, щойно буде відрендерений. Типове застосування — перенаправлення (redirect):

```jsx
{/* Стара адреса більше не використовується */}
<Route path="catalog" element={<Navigate to="/courses" replace />} />
```

### useLocation

`useLocation()` повертає об'єкт поточної адреси:

```js
{
  pathname: '/courses/react-basics',
  search: '?tab=program',
  hash: '#lesson-3',
  state: { from: '/dashboard' }, // те, що передали через Link state / navigate state
  key: 'k3j2h1',                 // унікальний ключ запису історії ('default' для першого входу)
}
```

Типові застосування: прочитати `state`, відправити подію аналітики при зміні `pathname`, прокрутити сторінку вгору при переході.

## 9. Рядок запиту: useSearchParams

Стан фільтрів, пошуку, сортування, номера сторінки зручно зберігати в **рядку запиту** (query string): `/courses?level=beginner&q=react&page=2`. Переваги:

- посиланням з фільтрами можна поділитися;
- фільтри зберігаються при оновленні сторінки;
- кнопка «Назад» повертає попередні фільтри.

Хук `useSearchParams()` працює подібно до `useState`, але зберігає значення в URL. Він повертає екземпляр стандартного класу [`URLSearchParams`](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) і функцію для його зміни:

```jsx title="src/pages/CoursesPage.jsx"
import { useSearchParams, Link } from 'react-router';
import { courses } from '../data/courses';

export default function CoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // get() повертає рядок або null
  const level = searchParams.get('level') ?? 'all';
  const q = searchParams.get('q') ?? '';

  function updateParam(key, value) {
    // Функціональне оновлення: беремо попередні параметри і змінюємо один
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value && value !== 'all') next.set(key, value);
      else next.delete(key); // порожні значення прибираємо з URL
      return next;
    });
  }

  // Похідні дані — обчислюємо під час рендеру
  const visible = courses
    .filter((c) => level === 'all' || c.level === level)
    .filter((c) => c.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <section>
      <h1>Курси</h1>
      <input
        type="search"
        placeholder="Пошук курсу"
        value={q}
        onChange={(e) => updateParam('q', e.target.value)}
      />
      <select value={level} onChange={(e) => updateParam('level', e.target.value)}>
        <option value="all">Усі рівні</option>
        <option value="beginner">Початковий</option>
        <option value="advanced">Просунутий</option>
      </select>

      <ul>
        {visible.map((c) => (
          <li key={c.slug}>
            <Link to={c.slug}>{c.title}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

Що варто знати про `setSearchParams`:

- приймає об'єкт (`setSearchParams({ q: 'react' })`), `URLSearchParams` або функцію `prev => next`;
- передача об'єкта **повністю замінює** рядок запиту — інші параметри зникнуть, тому для зміни одного параметра використовуйте функціональну форму, як у прикладі;
- кожен виклик — це навігація, яка за замовчуванням додає запис в історію. Для поля пошуку, що змінюється на кожну літеру, краще передати `{ replace: true }`: `setSearchParams(updater, { replace: true })`;
- значення в URL — завжди рядки: `Number(searchParams.get('page') ?? 1)`.

### Де зберігати стан: порівняння

| Де | Приклад | Переживає F5 | Можна поділитися | Видно в URL |
|---|---|---|---|---|
| `useState` | Відкрите меню, текст у полі до відправлення | ✗ | ✗ | ✗ |
| Параметр шляху (`:id`) | Який товар / курс відкрито | ✓ | ✓ | ✓ |
| Рядок запиту (`?q=`) | Фільтри, пошук, сортування, сторінка | ✓ | ✓ | ✓ |
| `location.state` | «Звідки прийшов» користувач | ✓ (у межах вкладки) | ✗ | ✗ |
| `localStorage` | Кошик, тема оформлення | ✓ | ✗ | ✗ |

Правило: якщо стан визначає, **що саме бачить користувач на сторінці**, і ним є сенс поділитися — йому місце в URL.

## 10. Сторінка 404, захищені маршрути, розгортання

### Сторінка 404

Маршрут з `path="*"` має найнижчий пріоритет і збігається з будь-якою адресою, для якої не знайшлося кращого варіанта:

```jsx title="src/pages/NotFoundPage.jsx"
import { Link, useLocation } from 'react-router';

export default function NotFoundPage() {
  const { pathname } = useLocation();
  return (
    <section className="not-found">
      <h1>404</h1>
      <p>Сторінки <code>{pathname}</code> не існує.</p>
      <Link to="/">На головну</Link>
    </section>
  );
}
```

Якщо `*` розмістити всередині маршруту-макета (як у розділі 5), сторінка 404 буде з шапкою і футером.

Зверніть увагу: маршрут `courses/:courseId` збігається і з `/courses/neisnuiuchyi-kurs`. Те, що такого курсу немає, з'ясовується лише після пошуку в даних або запиту до API — тож обробити «не знайдено» потрібно **у самому компоненті сторінки**.

### Захищений маршрут (protected route)

Особистий кабінет має бачити лише авторизований користувач. У декларативному режимі це зручно реалізувати маршрутом-обгорткою:

```jsx title="src/components/ProtectedRoute.jsx"
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth';

export default function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Запам'ятовуємо, куди користувач хотів потрапити
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
```

```jsx title="src/App.jsx (фрагмент)"
<Route element={<Layout />}>
  {/* ...публічні маршрути */}
  <Route path="login" element={<LoginPage />} />
  <Route element={<ProtectedRoute />}>
    <Route path="dashboard" element={<DashboardPage />} />
    <Route path="settings" element={<SettingsPage />} />
  </Route>
</Route>
```

:::danger[Безпека]
Захищений маршрут — це лише **зручність інтерфейсу**. Увесь JavaScript-код SPA доступний у браузері, і будь-хто може його прочитати. Справжній захист даних — на сервері: API повинен перевіряти токен/сесію на кожному запиті.
:::

### Прокрутка вгору при переході

При клієнтській навігації браузер не прокручує сторінку на початок. У декларативному режимі це можна зробити невеликим компонентом:

```jsx title="src/components/ScrollToTop.jsx"
import { useEffect } from 'react';
import { useLocation } from 'react-router';

export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
```

Розмістіть `<ScrollToTop />` всередині `BrowserRouter` (наприклад, у `Layout`).

### Розгортання SPA: fallback на index.html

Під час розробки сервер Vite віддає `index.html` на будь-яку адресу. На хостингу ж запит `GET /courses/react-basics` (користувач відкрив посилання або натиснув F5) сервер спробує знайти як **файл** `courses/react-basics` — і поверне 404, бо такого файлу немає.

Розв'язок — налаштувати **fallback**: на всі невідомі адреси віддавати `index.html`, а далі маршрут визначить React Router.

| Хостинг | Налаштування |
|---|---|
| Netlify | Файл `public/_redirects`: `/*  /index.html  200` |
| Vercel | Файл `vercel.json` з `rewrites` на `/index.html` |
| Apache | `.htaccess` з `FallbackResource /index.html` |
| Nginx | `try_files $uri $uri/ /index.html;` |
| GitHub Pages | Немає штатного fallback → `HashRouter` або хитрощі з `404.html` |

Детально розгортання розглянемо на підсумковій практичній.

## 11. Data mode і framework mode: що далі

У декларативному режимі дані завантажуються **після** рендеру сторінки — у `useEffect`. Це призводить до «водоспаду» запитів (спочатку завантажився JS сторінки, потім вона відрендерилась, потім почався `fetch`) і до однакового коду станів loading/error на кожній сторінці.

**Data mode** розв'язує це: маршрути описуються об'єктами, а кожен маршрут може мати функцію `loader`, яка виконується **до** рендеру:

```jsx title="Приклад data mode (для ознайомлення)"
import { createBrowserRouter, RouterProvider, useLoaderData } from 'react-router';

const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      {
        path: 'courses/:courseId',
        Component: CoursePage,
        // Дані завантажуються паралельно із завантаженням коду сторінки
        loader: async ({ params }) => {
          const res = await fetch(`/api/courses/${params.courseId}`);
          if (!res.ok) throw new Response('Not Found', { status: 404 });
          return res.json();
        },
      },
    ],
  },
]);

function CoursePage() {
  const course = useLoaderData(); // дані вже готові, без useEffect і loading
  return <h1>{course.title}</h1>;
}

createRoot(document.getElementById('root')).render(<RouterProvider router={router} />);
```

Додатково data mode дає `action` для обробки форм, `errorElement`/`ErrorBoundary` для помилок завантаження, `useNavigation()` для індикаторів очікування.

**Framework mode** — наступний крок: React Router стає повноцінним фреймворком із серверним рендерингом (SSR), маршрутами у файлі `routes.ts`, автоматичним розбиттям коду і типізацією. Створюється командою `npx create-react-router@latest`.

| | Declarative | Data | Framework |
|---|---|---|---|
| Опис маршрутів | JSX `<Route>` | об'єкти `createBrowserRouter` | файл `routes.ts` |
| Завантаження даних | `useEffect` у компоненті | `loader` | `loader` / `clientLoader` (на сервері чи клієнті) |
| Форми | вручну | `action`, `<Form>` | `action`, `<Form>` |
| SSR | ✗ | ✗ (вручну) | ✓ |
| Складність | низька | середня | вища |

Усі поняття сьогоднішньої лекції — вкладені маршрути, `Outlet`, `Link`, `NavLink`, `useParams`, `useNavigate`, `useSearchParams` — однаково працюють у всіх трьох режимах.

## Типові помилки

| Помилка | Наслідок | Як правильно |
|---|---|---|
| `<a href="/cart">` всередині застосунку | Повне перезавантаження, стан втрачено | `<Link to="/cart">` |
| `element={HomePage}` | Помилка або порожня сторінка | `element={<HomePage />}` |
| Хук `useNavigate` поза `BrowserRouter` | Помилка «may be used only in the context of a Router» | Обгорнути `App` у `BrowserRouter` у `main.jsx` |
| Забули `<Outlet />` у макеті | Дочірні сторінки не показуються | Додати `<Outlet />` у місце вставки |
| `NavLink to="/"` без `end` | «Головна» завжди активна | `<NavLink to="/" end>` |
| `product.id === id` з `useParams` | Порівняння числа з рядком — `false` | `product.id === Number(id)` |
| Немає параметра в залежностях ефекту | Дані не оновлюються при переході між `/item/1` і `/item/2` | `useEffect(..., [id])` |
| `setSearchParams({ q })` при наявності інших параметрів | Інші параметри зникають | Функціональна форма з `new URLSearchParams(prev)` |
| Імпорт з `react-router-dom` і v5-API (`Switch`, `useHistory`) | Помилки імпорту | v7: `Routes`, `useNavigate`, імпорт з `react-router` |
| Немає fallback на хостингу | 404 при оновленні сторінки | `_redirects` / `vercel.json` |

## Підсумки

- **Клієнтська маршрутизація** змінює URL через History API без перезавантаження і визначає, які компоненти показати, на боці браузера.
- **React Router v7** встановлюється пакетом `react-router`; у декларативному режимі застосунок обгортається в `BrowserRouter`, а маршрути описуються через `Routes` і `Route` з пропом `element`.
- Маршрути обираються за специфічністю: статичні > динамічні > splat. `path="*"` — сторінка 404.
- **Вкладені маршрути** успадковують шлях батька; батьківський компонент показує дочірній через `<Outlet />`. Маршрут без `path` — макет, `index` — сторінка за замовчуванням.
- `Link` — клієнтське посилання; `NavLink` додатково знає, чи він активний (клас `active`, `aria-current`, проп `end`).
- `useParams` повертає динамічні сегменти (завжди рядки); `useNavigate` і `<Navigate>` виконують програмну навігацію; `useLocation` дає поточну адресу і `state`.
- `useSearchParams` зберігає фільтри, пошук і пагінацію в рядку запиту — їх можна зберегти, поділитися ними і повернутися кнопкою «Назад».
- Для хостингу SPA потрібен fallback на `index.html`. Data і framework mode додають завантаження даних до рендеру та SSR.

## Контрольні питання

1. Чим клієнтська маршрутизація відрізняється від серверної? Назвіть по дві переваги й недоліки кожного підходу.
2. Які методи History API використовуються для навігації без перезавантаження? Коли спрацьовує подія `popstate`?
3. Чим відрізняються пакети `react-router` і `react-router-dom` у версії 7? Які три режими має React Router v7?
4. Як React Router обирає маршрут, якщо під адресу підходять кілька шаблонів? Наведіть приклад.
5. Що таке індексний маршрут і маршрут-макет? Яку роль відіграє `<Outlet />`?
6. Чому всередині SPA не можна використовувати `<a href>` для внутрішніх переходів? Чим `NavLink` відрізняється від `Link` і навіщо проп `end`?
7. Що повертає `useParams()`? Чому після переходу з `/product/1` на `/product/2` дані можуть не оновитися і як це виправити?
8. Коли використовують `useNavigate()`, а коли — компонент `<Navigate>`? Що робить опція `replace`?
9. Які дані варто зберігати в рядку запиту? Як змінити один параметр, не втративши інші?
10. Чому SPA, розгорнута на хостингу, може повертати 404 при оновленні сторінки, і як це виправити?

## Домашнє завдання

1. Створіть невеликий Vite-проєкт `router-demo` (`npm create vite@latest router-demo -- --template react`, `npm i react-router`) з маршрутами: `/` (головна), `/team` (список 3–4 людей з масиву), `/team/:memberId` (картка людини), `*` (404). Використайте маршрут-макет з `Header` і `<Outlet />`, у шапці — `NavLink` з підсвічуванням активного пункту.
2. На сторінці `/team/:memberId` обробіть випадок, коли людини з таким ідентифікатором немає, і додайте кнопку «Назад» через `useNavigate`.
3. На сторінці `/team` додайте поле пошуку за ім'ям, значення якого зберігається в `?q=` (через `useSearchParams`). Перевірте, що після F5 пошук зберігається.

**Що здати:** посилання на репозиторій або архів проєкту без `node_modules`. Цей досвід знадобиться на практичній 12, де ми додамо маршрутизацію в «Міні-магазин».
