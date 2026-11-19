---
title: "Робота з DOM: доступ до елементів"
description: "Знайомимося з DOM, створюємо наскрізний проєкт «Трекер витрат»: вибираємо елементи, змінюємо текст, класи й атрибути, створюємо елементи з JavaScript і виводимо список витрат та загальну суму."
type: practice
pair: 7
topic: 49
---

## Мета роботи

- Зрозуміти, що таке DOM (Document Object Model) і як браузер перетворює HTML на дерево об'єктів.
- Навчитися знаходити елементи: `getElementById`, `querySelector`, `querySelectorAll`, `closest`.
- Змінювати вміст елементів через `textContent` та `innerHTML` і розуміти, чому `innerHTML` з даними користувача небезпечний (XSS).
- Керувати класами (`classList`), атрибутами (`getAttribute`/`setAttribute`) та data-атрибутами (`dataset`).
- Створювати елементи з JavaScript (`createElement`, `append`, `replaceChildren`).
- Створити наскрізний проєкт **«Трекер витрат»** (`expense-tracker/`): розмітку, стилі та перші функції рендерингу `renderList(items)` і `renderTotal(items)`.

## Що потрібно

- VS Code з розширенням Live Server, Chrome з DevTools (вкладки **Elements** і **Console**).
- Знання з лекцій 1–6: змінні, функції, об'єкти та масиви.
- Нова папка для проєкту — `expense-tracker/` (поруч із `practice-03` і `practice-05`).

:::note[Наскрізний проєкт]
Починаючи з цієї пари і до кінця модуля ми будуємо один застосунок — **«Трекер витрат»**. Кожна наступна практична починається з результату попередньої, тому зберігайте код і не перейменовуйте ідентифікатори елементів і функцій: на них спиратимуться наступні роботи. Радимо вести проєкт у Git і робити коміт наприкінці кожної пари.
:::

## Короткі теоретичні відомості

### Що таке DOM

Коли браузер завантажує HTML, він не працює з текстом напряму. Він **розбирає** (parse) розмітку й будує в пам'яті дерево об'єктів — **DOM** (Document Object Model, об'єктна модель документа). Кожен тег стає **вузлом-елементом**, текст усередині тегів — **текстовим вузлом**. JavaScript змінює саме це дерево, а браузер перемальовує сторінку відповідно до змін.

```html
<body>
  <header>
    <h1>Трекер витрат</h1>
  </header>
  <ul id="list">
    <li>Обід</li>
  </ul>
</body>
```

```text
document
└── html
    ├── head
    └── body
        ├── header
        │   └── h1
        │       └── "Трекер витрат"   (текстовий вузол)
        └── ul#list
            └── li
                └── "Обід"
```

Термінологія дерева: у `header` **батьківський** елемент (parent) — `body`, **дочірній** (child) — `h1`; `header` і `ul` — **сусідні** (siblings).

Вхідна точка — глобальний об'єкт `document`. Зміни DOM **не змінюють файл** `index.html`: після перезавантаження сторінки все повертається до вихідної розмітки.

| Поняття | Що це | Приклад |
|---|---|---|
| Вузол (Node) | будь-який об'єкт дерева | елемент, текст, коментар |
| Елемент (Element) | вузол, що відповідає тегу | `<li>`, `<form>` |
| `HTMLCollection` | «жива» колекція елементів | `form.elements`, `ul.children` |
| `NodeList` | колекція вузлів (з `querySelectorAll` — статична) | результат `querySelectorAll('li')` |

### Пошук елементів

| Метод | Повертає | Якщо не знайдено |
|---|---|---|
| `document.getElementById('list')` | один елемент за `id` (без `#`) | `null` |
| `document.querySelector('.card h2')` | **перший** елемент за CSS-селектором | `null` |
| `document.querySelectorAll('li.expense')` | `NodeList` усіх відповідних елементів | порожній `NodeList` |
| `element.querySelector(...)` | пошук усередині елемента | `null` |
| `element.closest('li')` | найближчий предок (або сам елемент) за селектором | `null` |

Селектори — ті самі, що в CSS: `#id`, `.class`, `tag`, `[type="date"]`, `form > button`, `li:first-child`.

### Вміст і властивості

| Властивість / метод | Призначення |
|---|---|
| `el.textContent` | текст елемента; присвоєння вставляє **текст** (теги не розбираються) |
| `el.innerHTML` | HTML-вміст; присвоєння **розбирає рядок як HTML** |
| `el.value` | значення полів `input`, `select`, `textarea` |
| `el.classList.add/remove/toggle/contains` | керування класами |
| `el.getAttribute/setAttribute/removeAttribute` | довільні атрибути |
| `el.dataset.id` | атрибути `data-*` (`data-id` → `dataset.id`) |
| `document.createElement('li')` | створити новий елемент (поки поза сторінкою) |
| `parent.append(a, b)` / `prepend` | вставити в кінець / на початок |
| `el.remove()` | видалити елемент |
| `parent.replaceChildren(...)` | замінити всіх дітей (без аргументів — очистити) |

## Хід роботи

### Крок 1. Структура проєкту

Створіть папку і три порожні файли:

```text
js-course/
├── practice-03/
├── practice-05/
└── expense-tracker/
    ├── index.html
    ├── style.css
    └── app.js
```

Модель даних, з якою працюватиме застосунок, — **витрата**:

```js
{
  id: 1,                    // унікальний номер (number)
  title: 'Продукти в АТБ',  // назва (string)
  amount: 845.5,            // сума в гривнях (number)
  category: 'Їжа',          // одна з CATEGORIES (string)
  date: '2026-02-03',       // дата у форматі 'YYYY-MM-DD' (string)
}
```

Формат дати `YYYY-MM-DD` обрано не випадково: саме його повертає `<input type="date">`, і такі рядки правильно сортуються навіть звичайним порівнянням рядків.

### Крок 2. Розмітка index.html

Розмітка містить усі елементи, які знадобляться до кінця модуля. Ідентифікатори (`id`) **фіксовані** — за ними JavaScript знаходитиме елементи.

```html title="expense-tracker/index.html"
<!doctype html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Трекер витрат</title>
  <link rel="stylesheet" href="style.css">
  <script src="app.js" defer></script>
</head>
<body>
  <header class="header">
    <h1>Трекер витрат</h1>
    <p class="header__subtitle">Облік особистих витрат студента</p>
  </header>

  <main class="container">
    <!-- Форма додавання витрати (обробку підключимо на практичній 10) -->
    <section class="card">
      <h2>Нова витрата</h2>
      <form id="expense-form" class="form" novalidate>
        <label class="form__field">
          Назва
          <input type="text" id="title" name="title" placeholder="Наприклад, обід" required>
        </label>
        <label class="form__field">
          Сума, грн
          <input type="number" id="amount" name="amount" min="0.01" step="0.01" placeholder="0.00" required>
        </label>
        <label class="form__field">
          Категорія
          <select id="category" name="category" required>
            <option value="" disabled selected>Оберіть категорію</option>
            <!-- решту варіантів додасть JavaScript із CATEGORIES -->
          </select>
        </label>
        <label class="form__field">
          Дата
          <input type="date" id="date" name="date" required>
        </label>
        <button type="submit" class="btn btn--primary">Додати</button>
      </form>
    </section>

    <!-- Список витрат, фільтр, сума і статистика -->
    <section class="card">
      <div class="toolbar">
        <label class="form__field">
          Фільтр
          <select id="filter">
            <!-- «Усі категорії» і категорії додасть JavaScript -->
          </select>
        </label>
        <p id="total" class="total">Разом: 0,00 грн</p>
      </div>

      <section id="stats" class="stats" aria-label="Статистика за категоріями">
        <p class="stats__empty">Статистика за категоріями з'явиться згодом</p>
      </section>

      <ul id="list" class="list">
        <!-- елементи li.expense створює функція renderList() -->
      </ul>
    </section>
  </main>
</body>
</html>
```

Зверніть увагу:

- `<script src="app.js" defer>` у `<head>`: скрипт виконається, коли вся розмітка вже розібрана, тож усі елементи можна знайти.
- `novalidate` у формі вимикає вбудовані підказки браузера — валідацію ми напишемо самі на практичній 10. Атрибути `required`, `min`, `step` залишаємо як опис вимог (і для перевірки через JS).
- Перший `<option>` у `#category` порожній і `disabled`: користувач мусить свідомо вибрати категорію.
- Кожне поле обгорнуте в `<label>` — клік по підпису ставить фокус у поле, а екранні зчитувачі озвучують підпис.

Відкрийте `index.html` через **Live Server**. Поки що сторінка без стилів, а списки категорій порожні.

### Крок 3. Стилі style.css

Стилі — не головна тема пари, тому дайте їх цілком. Кольори винесено в CSS-змінні (custom properties): на практичній 14 це дозволить додати темну тему, змінивши лише змінні.

```css title="expense-tracker/style.css"
/* ===== Змінні ===== */
:root {
  --color-bg: #f1f5f9;
  --color-surface: #ffffff;
  --color-text: #0f172a;
  --color-muted: #64748b;
  --color-border: #e2e8f0;
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-danger: #dc2626;
  --color-danger-bg: #fee2e2;
  --color-accent: #f59e0b;
  --color-accent-bg: #fffbeb;
  --radius: 12px;
  --shadow: 0 1px 3px rgb(15 23 42 / 0.08), 0 4px 12px rgb(15 23 42 / 0.05);
}

/* ===== Базові стилі ===== */
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.5;
  background: var(--color-bg);
  color: var(--color-text);
}

/* ===== Шапка ===== */
.header {
  padding: 24px 16px;
  text-align: center;
  background: var(--color-primary);
  color: #ffffff;
}

.header h1 {
  margin: 0;
  font-size: 1.75rem;
}

.header__subtitle {
  margin: 4px 0 0;
  opacity: 0.85;
}

/* ===== Розкладка ===== */
.container {
  display: grid;
  gap: 20px;
  max-width: 880px;
  margin: 24px auto;
  padding: 0 16px;
}

.card {
  padding: 20px;
  border-radius: var(--radius);
  background: var(--color-surface);
  box-shadow: var(--shadow);
}

.card h2 {
  margin: 0 0 16px;
  font-size: 1.15rem;
}

/* ===== Форма ===== */
.form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  align-items: end;
}

.form__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.875rem;
  color: var(--color-muted);
}

input,
select {
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font: inherit;
  color: var(--color-text);
  background: var(--color-surface);
}

input:focus,
select:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

/* Підсвічування помилки (використаємо на практичній 10) */
.is-invalid {
  border-color: var(--color-danger);
  background: var(--color-danger-bg);
}

.btn {
  padding: 9px 16px;
  border: none;
  border-radius: 8px;
  font: inherit;
  cursor: pointer;
}

.btn--primary {
  font-weight: 600;
  color: #ffffff;
  background: var(--color-primary);
}

.btn--primary:hover {
  background: var(--color-primary-hover);
}

/* ===== Панель над списком ===== */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: end;
  gap: 12px;
  margin-bottom: 16px;
}

.total {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

/* ===== Статистика ===== */
.stats {
  margin-bottom: 16px;
}

.stats__empty {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-muted);
}

/* ===== Список витрат ===== */
.list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.expense {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-primary);
  border-radius: 8px;
}

.expense--big {
  border-left-color: var(--color-accent);
  background: var(--color-accent-bg);
}

.expense__title {
  display: block;
  font-weight: 600;
}

.expense__meta {
  display: block;
  font-size: 0.8rem;
  color: var(--color-muted);
}

.expense__amount {
  font-weight: 700;
  white-space: nowrap;
}

.delete {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  font-size: 1rem;
  color: var(--color-muted);
  background: transparent;
  cursor: pointer;
}

.delete:hover,
.delete:focus-visible {
  color: var(--color-danger);
  background: var(--color-danger-bg);
}

.list__empty {
  padding: 24px;
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  text-align: center;
  color: var(--color-muted);
}

/* ===== Вузькі екрани ===== */
@media (max-width: 520px) {
  .header h1 {
    font-size: 1.4rem;
  }

  .expense {
    grid-template-columns: 1fr auto;
  }

  .expense__amount {
    grid-column: 1;
  }

  .delete {
    grid-row: 1 / span 2;
    grid-column: 2;
  }
}
```

Збережіть — сторінка отримає шапку, картки й охайну форму.

### Крок 4. Дані в app.js

Почнемо `app.js` з даних: константа категорій і початковий масив витрат. Подій ще немає, тому дані поки «зашиті» в код (на практичній 11 вони завантажуватимуться з JSON-файлу).

```js title="expense-tracker/app.js"
'use strict';

// ===== Дані =====
const CATEGORIES = ['Їжа', 'Транспорт', 'Розваги', 'Навчання', 'Комунальні', 'Інше'];

// Витрата від цієї суми вважається «великою» і підсвічується, грн
const BIG_EXPENSE = 500;

const expenses = [
  { id: 1, title: 'Продукти в АТБ', amount: 845.5, category: 'Їжа', date: '2026-02-03' },
  { id: 2, title: 'Проїзний на місяць', amount: 480, category: 'Транспорт', date: '2026-02-01' },
  { id: 3, title: 'Кіно «Дюна»', amount: 250, category: 'Розваги', date: '2026-02-07' },
  { id: 4, title: 'Курс англійської', amount: 1200, category: 'Навчання', date: '2026-02-05' },
  { id: 5, title: 'Інтернет', amount: 300, category: 'Комунальні', date: '2026-02-10' },
  { id: 6, title: 'Кава з друзями', amount: 160, category: 'Їжа', date: '2026-02-08' },
];

console.table(expenses);
```

У консолі має з'явитися таблиця з шістьма витратами. `const expenses` означає, що змінну не можна переприсвоїти, але вміст масиву (додавання, видалення) змінювати можна — це знадобиться пізніше.

### Крок 5. Пошук елементів

Перш ніж писати код у файлі, поекспериментуйте в **консолі** (сторінка має бути відкрита через Live Server):

```js
document.getElementById('list');          // <ul id="list" class="list">
document.querySelector('#total');         // <p id="total" class="total">
document.querySelector('.card h2');       // перший h2 у картці — «Нова витрата»
document.querySelectorAll('.form__field'); // NodeList(5) [label, label, ...]
document.querySelector('[type="date"]');  // <input type="date" id="date">
document.getElementById('nope');          // null
```

Корисні прийоми DevTools:

1. Наведіть курсор на результат у консолі — елемент підсвітиться на сторінці.
2. На вкладці **Elements** виділіть будь-який елемент — у консолі він доступний як `$0`. Спробуйте: виділіть `h1` і введіть `$0.textContent`.
3. Клацніть правою кнопкою на результат у консолі → **Reveal in Elements panel**.

`querySelectorAll` повертає `NodeList`. У нього є `length`, доступ за індексом і метод `forEach`, і його можна перебрати `for...of`. Але методів `map`/`filter` немає — для них перетворюємо на масив:

```js
const fields = document.querySelectorAll('.form__field');
fields.length;                       // 5
fields[0];                           // перший label
fields.forEach((f) => console.log(f.textContent.trim()));
const labels = [...fields].map((f) => f.textContent.trim().split('\n')[0]);
```

Тепер додайте до `app.js` пошук усіх потрібних елементів. Їх знаходимо **один раз** на початку і зберігаємо в константи:

```js title="expense-tracker/app.js (додати)"
// ===== Елементи DOM =====
const form = document.getElementById('expense-form');
const titleInput = document.getElementById('title');
const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const dateInput = document.getElementById('date');
const filterSelect = document.getElementById('filter');
const totalEl = document.getElementById('total');
const statsEl = document.getElementById('stats');
const listEl = document.getElementById('list');

console.log(form, listEl, totalEl);
```

Деякі з цих констант (`form`, `titleInput`, `amountInput`, `statsEl`) знадобляться лише на наступних парах, але зручно мати всі посилання в одному місці.

| Коли що використовувати | Метод |
|---|---|
| Елемент з `id` | `getElementById` — найшвидший і найочевидніший |
| Складний селектор, один елемент | `querySelector` |
| Кілька елементів | `querySelectorAll` |
| Пошук у межах відомого елемента | `element.querySelector(...)` |
| Від вкладеного елемента вгору до «картки» | `element.closest(...)` |

:::caution[Типова помилка: null]
Якщо в консолі `TypeError: Cannot read properties of null (reading 'textContent')`, то елемент не знайдено. Причини: помилка в `id` (у `getElementById` пишемо без `#`, у `querySelector` — з `#`), скрипт підключено без `defer` у `<head>` (елементів ще немає), або елемент створюється пізніше.
:::

### Крок 6. textContent та innerHTML

Знову в консолі:

```js
totalEl.textContent;                    // 'Разом: 0,00 грн'
totalEl.textContent = 'Разом: 100 грн';   // текст змінився на сторінці

totalEl.innerHTML = 'Разом: <strong>100 грн</strong>';  // тег розібрано — жирний текст
totalEl.textContent = 'Разом: <strong>100 грн</strong>'; // теги показано як текст
```

Різниця принципова: `textContent` завжди вставляє **текст**, а `innerHTML` **розбирає рядок як HTML**. Чому це важливо? Уявіть, що назву витрати ввів користувач (а на практичній 10 так і буде):

```js
const userTitle = '<img src="x" onerror="alert(\'Вас зламано!\')">';

listEl.innerHTML = `<li>${userTitle}</li>`;   // з'явиться alert — виконано чужий код!
listEl.innerHTML = '';                        // очистили

const li = document.createElement('li');
li.textContent = userTitle;                   // безпечно: на сторінці просто текст
listEl.append(li);
```

Це атака **XSS** (Cross-Site Scripting, міжсайтовий скриптинг): зловмисник «підсовує» HTML з JavaScript у дані, а сайт вставляє їх через `innerHTML`. Через XSS можна викрасти дані сесії, виконати дії від імені користувача чи підмінити вміст сторінки.

| | `textContent` | `innerHTML` |
|---|---|---|
| Що вставляє | текст | HTML-розмітку |
| Безпечний для даних користувача | **так** | **ні** (XSS) |
| Швидкість | швидше | повільніше (розбір HTML) |
| Обробники подій усередині | зберігаються | знищуються (елементи створюються заново) |
| Коли використовувати | будь-який текст, особливо з даних | лише статичний HTML, який ви написали самі |

:::danger[Правило проєкту]
Дані витрат (назви, категорії, суми) **ніколи** не вставляємо через `innerHTML`. Елементи створюємо `createElement`, текст ставимо через `textContent`. `innerHTML = ''` для очищення допустимий, але ми використаємо ще зрозуміліше `replaceChildren()`.
:::

Перезавантажте сторінку (`F5`), щоб повернути вихідний стан.

### Крок 7. Класи, атрибути, dataset

Експерименти в консолі:

```js
const h1 = document.querySelector('h1');

// classList
h1.classList.add('highlight');          // додати клас
h1.classList.contains('highlight');     // true
h1.classList.toggle('highlight');       // прибрати, якщо є; додати, якщо немає
h1.classList.remove('highlight');
h1.className;                           // рядок усіх класів (перезаписує всі разом!)

// Стилі напряму — лише для динамічних значень; зазвичай краще класи
h1.style.color = 'gold';
h1.style.removeProperty('color');

// Атрибути
amountInput.getAttribute('min');        // '0.01' — завжди рядок
amountInput.setAttribute('placeholder', 'Сума');
amountInput.hasAttribute('required');   // true
amountInput.removeAttribute('placeholder');

// Багато атрибутів доступні як властивості
dateInput.type;                         // 'date'
titleInput.required;                    // true — boolean, а не рядок
```

**Data-атрибути** (`data-*`) призначені для зберігання власних даних в елементах. JavaScript читає їх через об'єкт `dataset`; назви перетворюються з kebab-case у camelCase:

```js
const li = document.createElement('li');
li.dataset.id = 42;                 // у DOM: data-id="42"
li.dataset.categoryName = 'Їжа';   // у DOM: data-category-name="Їжа"
li.outerHTML;                       // '<li data-id="42" data-category-name="Їжа"></li>'
li.dataset.id;                      // '42' — рядок! Для порівняння: Number(li.dataset.id)
```

У трекері кожен `li.expense` матиме `data-id` з id витрати. Так на практичній 10, клацнувши «видалити», ми дізнаємося, **яку саме** витрату видаляти.

| Механізм | Призначення | Приклад |
|---|---|---|
| `classList` | вигляд і стани (через CSS) | `expense--big`, `is-invalid` |
| `setAttribute` | стандартні атрибути | `aria-label`, `href`, `disabled` |
| `dataset` | власні дані, прив'язані до елемента | `data-id="3"` |
| `style` | динамічні значення, які не задати класом | ширина смужки діаграми у відсотках |

### Крок 8. Допоміжні функції форматування

Додайте до `app.js` дві чисті функції для виведення сум і дат та функцію для сьогоднішньої дати:

```js title="expense-tracker/app.js (додати)"
// ===== Допоміжні функції =====
// 1234.5 → '1 234,50 грн'
function formatMoney(amount) {
  return amount.toLocaleString('uk-UA', { style: 'currency', currency: 'UAH' });
}

// '2026-03-02' → '02.03.2026'
function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-');
  return `${day}.${month}.${year}`;
}

// Сьогоднішня дата у форматі 'YYYY-MM-DD' (за місцевим часом)
function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
```

Перевірте в консолі: `formatMoney(1234.5)`, `formatDate('2026-03-02')`, `todayISO()`.

Формат валюти будує сам браузер за правилами локалі `uk-UA`: Chrome виводить «1 234,50 грн», деякі інші браузери — «1 234,50 ₴». Пробіл між розрядами — нерозривний (non-breaking space), тому сума не переноситься на два рядки.

:::note
Чому не `new Date().toISOString().slice(0, 10)`? `toISOString` повертає дату за **UTC**. Для України (UTC+2/+3) з 00:00 до 02:00–03:00 ночі це буде ще «вчорашня» дата.
:::

### Крок 9. Заповнення списків категорій

Варіанти `<select>` не дублюємо вручну в HTML — створюємо з масиву `CATEGORIES`. Так список категорій зберігається в одному місці.

```js title="expense-tracker/app.js (додати)"
// ===== Рендеринг =====
// Заповнює select#category (форма) і select#filter (фільтр) категоріями
function fillSelects() {
  // Перший пункт фільтра: значення 'all' означає «без фільтра»
  filterSelect.append(new Option('Усі категорії', 'all'));

  for (const category of CATEGORIES) {
    // Спосіб 1: createElement
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.append(option);

    // Спосіб 2: конструктор Option(текст, значення)
    filterSelect.append(new Option(category, category));
  }
}
```

Один елемент не можна вставити у два місця одночасно: `append` **переміщує** вузол. Тому для кожного `select` створюємо окремий `option`.

Перший пункт фільтра «Усі категорії» має значення `'all'` — домовленість на весь проєкт: на практичних 8 і 10 саме за цим значенням функція фільтрації зрозуміє, що фільтр вимкнено.

### Крок 10. Створення елемента витрати

Функція `createExpenseItem` отримує об'єкт витрати і повертає готовий `<li>`. Вона нічого не вставляє на сторінку — це робитиме `renderList`.

Цільова розмітка одного елемента:

```html
<li class="expense expense--big" data-id="4" data-category="Навчання">
  <div class="expense__info">
    <span class="expense__title">Курс англійської</span>
    <span class="expense__meta">Навчання · 05.02.2026</span>
  </div>
  <span class="expense__amount">1 200,00 грн</span>
  <button type="button" class="delete" aria-label="Видалити «Курс англійської»" title="Видалити">✕</button>
</li>
```

```js title="expense-tracker/app.js (додати)"
// Створює <li class="expense"> для однієї витрати
function createExpenseItem(expense) {
  const li = document.createElement('li');
  li.classList.add('expense');
  li.dataset.id = expense.id;
  li.dataset.category = expense.category;
  if (expense.amount >= BIG_EXPENSE) {
    li.classList.add('expense--big');
  }

  // Ліва частина: назва і категорія з датою
  const info = document.createElement('div');
  info.className = 'expense__info';

  const title = document.createElement('span');
  title.className = 'expense__title';
  title.textContent = expense.title;        // textContent — захист від XSS

  const meta = document.createElement('span');
  meta.className = 'expense__meta';
  meta.textContent = `${expense.category} · ${formatDate(expense.date)}`;

  info.append(title, meta);

  // Сума
  const amount = document.createElement('span');
  amount.className = 'expense__amount';
  amount.textContent = formatMoney(expense.amount);

  // Кнопка видалення (обробник додамо на практичній 10)
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'delete';
  deleteBtn.textContent = '✕';
  deleteBtn.title = 'Видалити';
  deleteBtn.setAttribute('aria-label', `Видалити «${expense.title}»`);

  li.append(info, amount, deleteBtn);
  return li;
}
```

Перевірте в консолі:

```js
const item = createExpenseItem(expenses[3]);
item;               // розгорніть — видно структуру
item.outerHTML;     // HTML-рядок елемента
listEl.append(item); // з'явився на сторінці
```

Пояснення до коду:

- `className = 'expense__title'` — для нового елемента, де класів ще немає, це коротше за `classList.add`. Для наявних елементів використовуйте `classList`, бо `className` перезаписує всі класи.
- `aria-label` дає кнопці зі значком «✕» зрозумілу назву для екранних зчитувачів.
- `type="button"` у кнопки, бо в майбутньому `li` не буде у формі, але це хороша звичка: кнопка всередині `<form>` без типу за замовчуванням має `type="submit"`.

### Крок 11. Функція renderList(items)

`renderList` **перемальовує** список повністю: очищає `ul#list` і заповнює його елементами для переданого масиву. Масив передаємо параметром — так ту саму функцію можна викликати і для всіх витрат, і для відфільтрованих.

```js title="expense-tracker/app.js (додати)"
// Перемальовує ul#list для переданого масиву витрат
function renderList(items) {
  listEl.replaceChildren(); // очистити список

  if (items.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'list__empty';
    empty.textContent = 'Витрат поки немає';
    listEl.append(empty);
    return;
  }

  for (const expense of items) {
    listEl.append(createExpenseItem(expense));
  }
}
```

Чому спершу очищаємо? Якщо викликати `renderList` двічі без очищення, елементи задублюються. Принцип «дані → повна перемальовка» простий і надійний: список на сторінці завжди відповідає масиву.

:::tip[DocumentFragment]
Кожен `append` у видимий елемент може спричиняти перерахунок розмітки. Для великих списків елементи спочатку збирають у `DocumentFragment` (невидимий контейнер) і вставляють одним викликом:

```js
const fragment = document.createDocumentFragment();
for (const e of items) fragment.append(createExpenseItem(e));
listEl.replaceChildren(fragment);
```

Для десятків елементів різниця непомітна, тому в проєкті залишаємо простий варіант.
:::

### Крок 12. Функція renderTotal(items)

```js title="expense-tracker/app.js (додати)"
// Показує загальну суму переданих витрат у p#total
function renderTotal(items) {
  let sum = 0;
  for (const expense of items) {
    sum += expense.amount;
  }
  totalEl.textContent = `Разом: ${formatMoney(sum)}`;
}
```

На практичній 8 ми перепишемо цикл на `reduce`. Поки що залишаємо цикл `for...of`, щоб логіка була очевидною.

### Крок 13. Запуск застосунку

Наприкінці файлу викликаємо функції в потрібному порядку. Заодно ставимо в поле дати сьогоднішнє число. Видаліть з файлу тимчасові `console.table` і `console.log` з кроків 4–5.

```js title="expense-tracker/app.js (додати в кінець)"
// ===== Запуск =====
fillSelects();
dateInput.value = todayISO();
renderList(expenses);
renderTotal(expenses);
```

Збережіть. Очікуваний результат:

- у списку шість витрат; «Продукти в АТБ» і «Курс англійської» підсвічені жовтим (сума ≥ 500 грн);
- над списком: **«Разом: 3 235,50 грн»**;
- у формі: категорії в списку «Категорія», сьогоднішня дата в полі «Дата»;
- у фільтрі — «Усі категорії» та шість категорій.

На вкладці **Elements** розгорніть `ul#list` і переконайтеся, що кожен `li` має `class="expense"` і `data-id`.

### Крок 14. Керування застосунком з консолі

Обробників подій ще немає (це тема лекції 9), але завдяки функціям ми вже можемо «керувати» сторінкою з консолі. Функції й константи, оголошені на верхньому рівні звичайного скрипта, доступні в консолі.

```js
// Показати лише «Їжу»
const food = expenses.filter((e) => e.category === 'Їжа');
renderList(food);
renderTotal(food);

// Повернути все
renderList(expenses);
renderTotal(expenses);

// Додати витрату і перемалювати
expenses.push({ id: 7, title: 'Кава', amount: 55, category: 'Їжа', date: todayISO() });
renderList(expenses);
renderTotal(expenses);

// Порожній список
renderList([]);

// Перевірка захисту від XSS: тег буде показано як текст
renderList([{ id: 99, title: '<b>жирний?</b>', amount: 1, category: 'Інше', date: '2026-03-07' }]);

// Скільки елементів у списку і які id
document.querySelectorAll('li.expense').length;
[...document.querySelectorAll('li.expense')].map((li) => Number(li.dataset.id));
```

Знайдіть елемент за `data-id` селектором атрибута:

```js
const li = document.querySelector('li.expense[data-id="3"]');
li.classList.add('expense--big');           // підсвітили
li.querySelector('.expense__amount').textContent; // '250,00 грн'
li.querySelector('.delete').closest('li') === li; // true — closest знаходить батьківський li
```

Останній рядок — підготовка до практичної 10: при кліку на кнопку `.delete` ми через `closest('li')` знайдемо елемент витрати й прочитаємо його `dataset.id`.

Перезавантажте сторінку, щоб повернути вихідний стан (зміни масиву в консолі не зберігаються — збереження додамо на практичній 14).

### Крок 15. Повний код проєкту після практичної 7

Звірте свої файли з повними лістингами. **Наступна практична (8) починається саме з цього стану.**

`index.html` — без змін відносно кроку 2, `style.css` — без змін відносно кроку 3. Наводимо їх повторно, щоб усі три файли були в одному місці.

```html title="expense-tracker/index.html"
<!doctype html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Трекер витрат</title>
  <link rel="stylesheet" href="style.css">
  <script src="app.js" defer></script>
</head>
<body>
  <header class="header">
    <h1>Трекер витрат</h1>
    <p class="header__subtitle">Облік особистих витрат студента</p>
  </header>

  <main class="container">
    <!-- Форма додавання витрати (обробку підключимо на практичній 10) -->
    <section class="card">
      <h2>Нова витрата</h2>
      <form id="expense-form" class="form" novalidate>
        <label class="form__field">
          Назва
          <input type="text" id="title" name="title" placeholder="Наприклад, обід" required>
        </label>
        <label class="form__field">
          Сума, грн
          <input type="number" id="amount" name="amount" min="0.01" step="0.01" placeholder="0.00" required>
        </label>
        <label class="form__field">
          Категорія
          <select id="category" name="category" required>
            <option value="" disabled selected>Оберіть категорію</option>
            <!-- решту варіантів додасть JavaScript із CATEGORIES -->
          </select>
        </label>
        <label class="form__field">
          Дата
          <input type="date" id="date" name="date" required>
        </label>
        <button type="submit" class="btn btn--primary">Додати</button>
      </form>
    </section>

    <!-- Список витрат, фільтр, сума і статистика -->
    <section class="card">
      <div class="toolbar">
        <label class="form__field">
          Фільтр
          <select id="filter">
            <!-- «Усі категорії» і категорії додасть JavaScript -->
          </select>
        </label>
        <p id="total" class="total">Разом: 0,00 грн</p>
      </div>

      <section id="stats" class="stats" aria-label="Статистика за категоріями">
        <p class="stats__empty">Статистика за категоріями з'явиться згодом</p>
      </section>

      <ul id="list" class="list">
        <!-- елементи li.expense створює функція renderList() -->
      </ul>
    </section>
  </main>
</body>
</html>
```

```css title="expense-tracker/style.css"
/* ===== Змінні ===== */
:root {
  --color-bg: #f1f5f9;
  --color-surface: #ffffff;
  --color-text: #0f172a;
  --color-muted: #64748b;
  --color-border: #e2e8f0;
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-danger: #dc2626;
  --color-danger-bg: #fee2e2;
  --color-accent: #f59e0b;
  --color-accent-bg: #fffbeb;
  --radius: 12px;
  --shadow: 0 1px 3px rgb(15 23 42 / 0.08), 0 4px 12px rgb(15 23 42 / 0.05);
}

/* ===== Базові стилі ===== */
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.5;
  background: var(--color-bg);
  color: var(--color-text);
}

/* ===== Шапка ===== */
.header {
  padding: 24px 16px;
  text-align: center;
  background: var(--color-primary);
  color: #ffffff;
}

.header h1 {
  margin: 0;
  font-size: 1.75rem;
}

.header__subtitle {
  margin: 4px 0 0;
  opacity: 0.85;
}

/* ===== Розкладка ===== */
.container {
  display: grid;
  gap: 20px;
  max-width: 880px;
  margin: 24px auto;
  padding: 0 16px;
}

.card {
  padding: 20px;
  border-radius: var(--radius);
  background: var(--color-surface);
  box-shadow: var(--shadow);
}

.card h2 {
  margin: 0 0 16px;
  font-size: 1.15rem;
}

/* ===== Форма ===== */
.form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  align-items: end;
}

.form__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.875rem;
  color: var(--color-muted);
}

input,
select {
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font: inherit;
  color: var(--color-text);
  background: var(--color-surface);
}

input:focus,
select:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

/* Підсвічування помилки (використаємо на практичній 10) */
.is-invalid {
  border-color: var(--color-danger);
  background: var(--color-danger-bg);
}

.btn {
  padding: 9px 16px;
  border: none;
  border-radius: 8px;
  font: inherit;
  cursor: pointer;
}

.btn--primary {
  font-weight: 600;
  color: #ffffff;
  background: var(--color-primary);
}

.btn--primary:hover {
  background: var(--color-primary-hover);
}

/* ===== Панель над списком ===== */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: end;
  gap: 12px;
  margin-bottom: 16px;
}

.total {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

/* ===== Статистика ===== */
.stats {
  margin-bottom: 16px;
}

.stats__empty {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-muted);
}

/* ===== Список витрат ===== */
.list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.expense {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-primary);
  border-radius: 8px;
}

.expense--big {
  border-left-color: var(--color-accent);
  background: var(--color-accent-bg);
}

.expense__title {
  display: block;
  font-weight: 600;
}

.expense__meta {
  display: block;
  font-size: 0.8rem;
  color: var(--color-muted);
}

.expense__amount {
  font-weight: 700;
  white-space: nowrap;
}

.delete {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  font-size: 1rem;
  color: var(--color-muted);
  background: transparent;
  cursor: pointer;
}

.delete:hover,
.delete:focus-visible {
  color: var(--color-danger);
  background: var(--color-danger-bg);
}

.list__empty {
  padding: 24px;
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  text-align: center;
  color: var(--color-muted);
}

/* ===== Вузькі екрани ===== */
@media (max-width: 520px) {
  .header h1 {
    font-size: 1.4rem;
  }

  .expense {
    grid-template-columns: 1fr auto;
  }

  .expense__amount {
    grid-column: 1;
  }

  .delete {
    grid-row: 1 / span 2;
    grid-column: 2;
  }
}
```

```js title="expense-tracker/app.js"
'use strict';

// ===== Дані =====
const CATEGORIES = ['Їжа', 'Транспорт', 'Розваги', 'Навчання', 'Комунальні', 'Інше'];

// Витрата від цієї суми вважається «великою» і підсвічується, грн
const BIG_EXPENSE = 500;

const expenses = [
  { id: 1, title: 'Продукти в АТБ', amount: 845.5, category: 'Їжа', date: '2026-02-03' },
  { id: 2, title: 'Проїзний на місяць', amount: 480, category: 'Транспорт', date: '2026-02-01' },
  { id: 3, title: 'Кіно «Дюна»', amount: 250, category: 'Розваги', date: '2026-02-07' },
  { id: 4, title: 'Курс англійської', amount: 1200, category: 'Навчання', date: '2026-02-05' },
  { id: 5, title: 'Інтернет', amount: 300, category: 'Комунальні', date: '2026-02-10' },
  { id: 6, title: 'Кава з друзями', amount: 160, category: 'Їжа', date: '2026-02-08' },
];

// ===== Елементи DOM =====
const form = document.getElementById('expense-form');
const titleInput = document.getElementById('title');
const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const dateInput = document.getElementById('date');
const filterSelect = document.getElementById('filter');
const totalEl = document.getElementById('total');
const statsEl = document.getElementById('stats');
const listEl = document.getElementById('list');

// ===== Допоміжні функції =====
// 1234.5 → '1 234,50 грн'
function formatMoney(amount) {
  return amount.toLocaleString('uk-UA', { style: 'currency', currency: 'UAH' });
}

// '2026-03-02' → '02.03.2026'
function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-');
  return `${day}.${month}.${year}`;
}

// Сьогоднішня дата у форматі 'YYYY-MM-DD' (за місцевим часом)
function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// ===== Рендеринг =====
// Заповнює select#category (форма) і select#filter (фільтр) категоріями
function fillSelects() {
  // Перший пункт фільтра: значення 'all' означає «без фільтра»
  filterSelect.append(new Option('Усі категорії', 'all'));

  for (const category of CATEGORIES) {
    // Спосіб 1: createElement
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.append(option);

    // Спосіб 2: конструктор Option(текст, значення)
    filterSelect.append(new Option(category, category));
  }
}

// Створює <li class="expense"> для однієї витрати
function createExpenseItem(expense) {
  const li = document.createElement('li');
  li.classList.add('expense');
  li.dataset.id = expense.id;
  li.dataset.category = expense.category;
  if (expense.amount >= BIG_EXPENSE) {
    li.classList.add('expense--big');
  }

  // Ліва частина: назва і категорія з датою
  const info = document.createElement('div');
  info.className = 'expense__info';

  const title = document.createElement('span');
  title.className = 'expense__title';
  title.textContent = expense.title;        // textContent — захист від XSS

  const meta = document.createElement('span');
  meta.className = 'expense__meta';
  meta.textContent = `${expense.category} · ${formatDate(expense.date)}`;

  info.append(title, meta);

  // Сума
  const amount = document.createElement('span');
  amount.className = 'expense__amount';
  amount.textContent = formatMoney(expense.amount);

  // Кнопка видалення (обробник додамо на практичній 10)
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'delete';
  deleteBtn.textContent = '✕';
  deleteBtn.title = 'Видалити';
  deleteBtn.setAttribute('aria-label', `Видалити «${expense.title}»`);

  li.append(info, amount, deleteBtn);
  return li;
}

// Перемальовує ul#list для переданого масиву витрат
function renderList(items) {
  listEl.replaceChildren(); // очистити список

  if (items.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'list__empty';
    empty.textContent = 'Витрат поки немає';
    listEl.append(empty);
    return;
  }

  for (const expense of items) {
    listEl.append(createExpenseItem(expense));
  }
}

// Показує загальну суму переданих витрат у p#total
function renderTotal(items) {
  let sum = 0;
  for (const expense of items) {
    sum += expense.amount;
  }
  totalEl.textContent = `Разом: ${formatMoney(sum)}`;
}

// ===== Запуск =====
fillSelects();
dateInput.value = todayISO();
renderList(expenses);
renderTotal(expenses);
```

Зробіть коміт:

```bash
git add .
git commit -m "P7: expense tracker markup, styles, renderList and renderTotal"
```

**Результат роботи:** застосунок «Трекер витрат» показує список із шести витрат (великі підсвічені), загальну суму 3 235,50 грн, заповнені списки категорій і сьогоднішню дату у формі; функціями `renderList` і `renderTotal` можна керувати з консолі.

## Завдання для самостійного виконання

1. ★ Додайте до шапки абзац `p#today`, у якому JavaScript під час запуску показує сьогоднішню дату у форматі `formatDate(todayISO())` — «Сьогодні: 13.03.2026». (Не забудьте додати елемент у HTML.)
2. ★ Напишіть у консолі код, який підсвічує класом `expense--big` усі витрати категорії «Їжа», використовуючи `querySelectorAll` із селектором атрибута `[data-category="Їжа"]` і `forEach`.
3. ★★ Додайте до `createExpenseItem` елемент-«бейдж» категорії: `span.badge` з текстом категорії перед назвою. Опишіть стилі `.badge` у `style.css` (маленький шрифт, заокруглений фон). Колір бейджа задайте через атрибут `data-category` у CSS: `.expense[data-category="Транспорт"] .badge { ... }`.
4. ★★ Напишіть функцію `renderCount(items)`, що виводить під сумою текст «Записів: 6» в окремий елемент `p#count`. Подумайте, де в HTML його розмістити, і викличте функцію при запуску.
5. ★★★ Перепишіть `renderList` з використанням `DocumentFragment`. Згенеруйте в консолі масив із 5000 випадкових витрат (`Array.from`) і порівняйте час обох версій через `console.time`/`console.timeEnd`.
6. ★★★ Напишіть версію `createExpenseItemUnsafe(expense)` через шаблонний рядок та `insertAdjacentHTML('beforeend', ...)`. Продемонструйте XSS-атаку через назву витрати, а потім напишіть функцію `escapeHtml(str)`, яка замінює `&`, `<`, `>`, `"`, `'` на HTML-сутності, і покажіть, що атака більше не спрацьовує. Поясніть у коментарі, чому все одно краще використовувати `textContent`.

## Контрольні питання

1. Що таке DOM? Чи змінює JavaScript файл `index.html`, коли змінює DOM?
2. Чим `getElementById` відрізняється від `querySelector`? Що повертають обидва методи, якщо елемент не знайдено?
3. Що повертає `querySelectorAll`? Як застосувати до результату метод `map`?
4. Чим відрізняються `textContent` та `innerHTML`? Що таке XSS і як від нього захиститися?
5. Чому для наявних елементів краще `classList.add`, ніж присвоєння `className`?
6. Що таке data-атрибути? Як прочитати `data-category-name` з JavaScript і якого типу буде значення?
7. Чому для двох `select` ми створюємо два окремі `option`, а не вставляємо один і той самий?
8. Навіщо `renderList` спершу очищає список? Що станеться без очищення?
9. Чому `renderList` і `renderTotal` приймають масив параметром, а не беруть глобальний `expenses`?
10. Як за допомогою `closest` від кнопки `.delete` дістатися до її `li` і дізнатися id витрати?

## Домашнє завдання

1. Завершіть завдання ★ (обидва) і зробіть коміт.
2. Напишіть функцію `renderLatest(items, count = 3)`, яка виводить в окремий список `ul#latest` (додайте в HTML окрему картку «Останні витрати») назви й суми `count` найновіших витрат за датою. Не змінюйте вихідний масив (використайте `toSorted` або копію). Дані — лише через `textContent`.
3. Прочитайте на MDN статтю [Introduction to the DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction) і запишіть три нових для вас факти.

## Що здати

- Папку `expense-tracker/` з файлами `index.html`, `style.css`, `app.js` (архівом або посиланням на репозиторій з комітом `P7`).
- Скриншот застосунку зі списком витрат і сумою та скриншот вкладки **Elements** з розгорнутим `ul#list` (видно `data-id`).
- Відповіді на контрольні питання; на захисті — продемонструвати виклик `renderList` з відфільтрованим масивом у консолі.
