---
title: "Робота з масивами та об'єктами"
description: "Опановуємо методи масивів map, filter, reduce, sort, find, деструктуризацію, spread і Object.entries: рахуємо суму і статистику за категоріями, сортуємо та фільтруємо витрати в «Трекері витрат»."
type: practice
pair: 8
topic: 50
---

## Мета роботи

- Опанувати основні методи масивів: `forEach`, `map`, `filter`, `reduce`, `find`, `findIndex`, `some`, `every`, `sort`, `toSorted`.
- Розрізняти методи, що **змінюють** масив (мутуючі), і методи, що **повертають новий** масив.
- Навчитися групувати дані за допомогою `reduce` і перебирати об'єкти через `Object.keys`, `Object.values`, `Object.entries`.
- Застосувати деструктуризацію (destructuring), оператор розгортання (spread) і залишкові параметри (rest).
- Розширити «Трекер витрат»: суму через `reduce`, статистику за категоріями, сортування за датою й сумою, фільтрацію за категорією.

## Що потрібно

- VS Code з розширенням **Live Server**, браузер Chrome з DevTools.
- Проєкт `expense-tracker/` у стані після практичної 7 (див. нижче).
- Документація MDN: [Array](https://developer.mozilla.org/uk/docs/Web/JavaScript/Reference/Global_Objects/Array), [Object.entries](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries), [Деструктуризація](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment).

### Стартовий стан проєкту

На практичній 7 ми створили проєкт `expense-tracker/`:

```text
expense-tracker/
├── index.html   # розмітка з фіксованими id
├── style.css    # стилі (кольори задано CSS-змінними в :root)
└── app.js       # дані та функції рендерингу
```

Коротко про те, що вже є:

- у `index.html` — форма `form#expense-form` з полями `#title`, `#amount`, `#category`, `#date` (поки без обробки), панель `.toolbar` з фільтром `select#filter` і сумою `p#total`, секція `section#stats` із заглушкою `p.stats__empty` і список `ul#list`; скрипт підключено з атрибутом `defer`;
- в `app.js` — масив `expenses` із 6 витрат, константи `CATEGORIES` і `BIG_EXPENSE` (витрати від 500 грн підсвічуються класом `expense--big`), утиліти `formatMoney`, `formatDate`, `todayISO`, функції `fillSelects`, `createExpenseItem`, `renderList` (з порожнім станом `li.list__empty`) і `renderTotal`.

Якщо ви пропустили практичну 7, візьміть `index.html` і `style.css` з кроку 15 практичної 7, а `app.js` — нижче. Саме від цього коду ми рухаємося далі.

```js title="app.js (стан після практичної 7)"
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

:::note
Кнопка «✕» поки що нічого не робить — обробку подій ми додамо на практичній 10. Сьогодні працюємо лише з даними та їх виведенням. Усі зміни сьогодні стосуються `app.js` і `style.css`; `index.html` не змінюється.
:::

## Короткі теоретичні відомості

### Мутуючі та немутуючі методи

| Метод | Що робить | Повертає | Змінює вихідний масив? |
|---|---|---|---|
| `forEach(fn)` | викликає `fn` для кожного елемента | `undefined` | ні |
| `map(fn)` | перетворює кожен елемент | новий масив тієї ж довжини | ні |
| `filter(fn)` | залишає елементи, для яких `fn` повертає `true` | новий масив (може бути коротшим) | ні |
| `reduce(fn, init)` | «згортає» масив в одне значення | будь-яке значення | ні |
| `find(fn)` / `findIndex(fn)` | перший елемент / його індекс, що задовольняє умову | елемент або `undefined` / індекс або `-1` | ні |
| `some(fn)` / `every(fn)` | чи є хоч один / чи всі задовольняють умову | `boolean` | ні |
| `includes(value)` | чи є значення в масиві | `boolean` | ні |
| `slice(start, end)` | вирізає частину | новий масив | ні |
| `toSorted(fn)`, `toReversed()` | сортує / розвертає копію (ES2023) | новий масив | ні |
| `push`, `pop`, `shift`, `unshift` | додають/видаляють елементи з країв | довжину / елемент | **так** |
| `splice(start, count, ...items)` | видаляє/вставляє в середині | масив видалених | **так** |
| `sort(fn)`, `reverse()` | сортує / розвертає | **той самий** масив | **так** |

Колбек (callback) методів перебору отримує три аргументи: `(element, index, array)`. Найчастіше використовують лише перший.

### Як працює `reduce`

`reduce` проходить масивом і на кожному кроці передає в колбек **акумулятор** (accumulator) — результат попереднього кроку — та поточний елемент. Те, що поверне колбек, стане акумулятором для наступного кроку.

```js
const numbers = [10, 20, 30];
const sum = numbers.reduce((acc, n) => acc + n, 0);
// крок 1: acc = 0,  n = 10 → 10
// крок 2: acc = 10, n = 20 → 30
// крок 3: acc = 30, n = 30 → 60
```

:::caution[Завжди передавайте початкове значення]
Без другого аргументу `reduce` бере першим акумулятором перший елемент масиву. Для масиву об'єктів це дає безглуздий результат (`[object Object]200...`), а для порожнього масиву — помилку `TypeError: Reduce of empty array with no initial value`.
:::

### Деструктуризація, spread і rest

```js
const expense = { id: 1, title: 'Кава', amount: 60, category: 'Їжа' };

// Деструктуризація об'єкта (можна перейменувати і задати значення за замовчуванням)
const { title, amount: price, note = 'без примітки' } = expense;

// Деструктуризація масиву
const [year, month, day] = '2026-02-03'.split('-');

// Spread: копія об'єкта зі зміною одного поля (оригінал не змінюється)
const updated = { ...expense, amount: 75 };

// Spread: копія та об'єднання масивів
const copy = [...expenses];
const all = [...expenses, updated];

// Rest: зібрати «решту» властивостей або аргументів
const { id, ...withoutId } = expense;
function sumAll(...numbers) {
  return numbers.reduce((acc, n) => acc + n, 0);
}
```

Spread робить **поверхневу** (shallow) копію: вкладені об'єкти й масиви не копіюються, а передаються за посиланням. Для повної копії використовують `structuredClone(value)`.

### Перебір властивостей об'єкта

| Вираз | Результат для `{ 'Їжа': 1005.5, 'Транспорт': 480 }` |
|---|---|
| `Object.keys(obj)` | `['Їжа', 'Транспорт']` |
| `Object.values(obj)` | `[1005.5, 480]` |
| `Object.entries(obj)` | `[['Їжа', 1005.5], ['Транспорт', 480]]` |
| `Object.fromEntries(entries)` | зворотна операція: з пар знову об'єкт |

Пари з `Object.entries` зручно деструктуризувати в циклі: `for (const [key, value] of Object.entries(obj)) { ... }`.

## Хід роботи

### Крок 1. Досліджуємо дані в консолі

Запустіть `index.html` через Live Server і відкрийте DevTools → **Console**. Оскільки `app.js` — звичайний (не модульний) скрипт, його константи і функції доступні з консолі.

```js
console.table(expenses);              // таблиця з усіма полями
expenses.length;                      // 6
expenses[0].title;                    // 'Продукти в АТБ'
expenses.map((e) => e.title);         // масив назв
expenses.filter((e) => e.amount > 400).length; // 3
```

`console.table` — найзручніший спосіб переглянути масив об'єктів: кожен об'єкт — рядок, кожна властивість — стовпець. Таблицю можна сортувати кліком по заголовку стовпця.

Спробуйте самостійно в консолі:

1. Отримати масив сум: `expenses.map((e) => e.amount)`.
2. Перевірити, чи є витрати дорожчі за 1000 грн: `expenses.some((e) => e.amount > 1000)`.
3. Перевірити, чи всі витрати мають коректну категорію: `expenses.every((e) => CATEGORIES.includes(e.category))`.

### Крок 2. Деструктуризація параметра в `createExpenseItem`

У `formatDate` деструктуризацію масиву ми вже використали на практичній 7: `const [year, month, day] = isoDate.split('-')`. Тепер застосуємо деструктуризацію **об'єкта** в параметрі функції. Зараз `createExpenseItem` вісім разів звертається до `expense.щось`. Замість цього «розпакуємо» потрібні поля прямо в сигнатурі:

```js title="app.js (замініть функцію createExpenseItem)" {2,5-7,16,20,22,26,33,35}
// Створює <li class="expense"> для однієї витрати
function createExpenseItem({ id, title, amount, category, date }) {
  const li = document.createElement('li');
  li.classList.add('expense');
  li.dataset.id = id;
  li.dataset.category = category;
  if (amount >= BIG_EXPENSE) {
    li.classList.add('expense--big');
  }

  const info = document.createElement('div');
  info.className = 'expense__info';

  const titleEl = document.createElement('span');
  titleEl.className = 'expense__title';
  titleEl.textContent = title;

  const metaEl = document.createElement('span');
  metaEl.className = 'expense__meta';
  metaEl.textContent = `${category} · ${formatDate(date)}`;

  info.append(titleEl, metaEl);

  const amountEl = document.createElement('span');
  amountEl.className = 'expense__amount';
  amountEl.textContent = formatMoney(amount);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'delete';
  deleteBtn.textContent = '✕';
  deleteBtn.title = 'Видалити';
  deleteBtn.setAttribute('aria-label', `Видалити «${title}»`);

  li.append(info, amountEl, deleteBtn);
  return li;
}
```

Що змінилося, а що ні:

- параметр `expense` замінено на `{ id, title, amount, category, date }`, усі звертання `expense.title` тощо стали просто `title`;
- локальні змінні для елементів перейменовано на `titleEl`, `metaEl`, `amountEl` — інакше `const title = document.createElement(...)` конфліктувало б з параметром `title` (`SyntaxError: Identifier 'title' has already been declared`);
- підсвічування великих витрат (`expense--big` від `BIG_EXPENSE`), атрибути `data-id` і `data-category`, клас `expense__info` і кнопка `button.delete` **залишаються без змін** — вони знадобляться на наступних практичних.

Збережіть файл — сторінка має виглядати так само, як і раніше. Це **рефакторинг** (refactoring): зміна коду без зміни поведінки.

### Крок 3. `map` і spread у `renderList`

Цикл `for...of` у `renderList` по суті перетворює масив витрат на масив елементів `<li>`. Саме для цього існує `map`. Порожній стан (`li.list__empty`) залишаємо як є, змінюємо лише останній цикл:

```js title="app.js (замініть функцію renderList)" {13}
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

  listEl.append(...items.map(createExpenseItem));
}
```

Розберімо виділений рядок:

1. `items.map(createExpenseItem)` — для кожної витрати викликає `createExpenseItem` і повертає **новий масив** елементів `<li>`.
2. `...` (spread) «розгортає» цей масив в окремі аргументи: `listEl.append(li1, li2, li3, ...)`.
3. `append` приймає будь-яку кількість вузлів і вставляє їх за одну операцію.

Перевірте порожній стан з консолі: `renderList([])` — має з'явитися «Витрат поки немає»; `renderList(expenses)` — список повернеться.

:::caution[Пастка з передаванням функції в map]
`items.map(createExpenseItem)` працює, бо `createExpenseItem` бере лише перший аргумент. Але `['1', '2', '3'].map(parseInt)` поверне `[1, NaN, NaN]`: `map` передає другим аргументом індекс, а `parseInt` сприймає його як систему числення. Якщо сумніваєтеся — пишіть стрілкову функцію явно: `items.map((item) => createExpenseItem(item))`.
:::

### Крок 4. Сума через `reduce`

Винесемо обчислення суми в окрему **чисту функцію** (pure function) — таку, що лише рахує і повертає результат, не змінюючи нічого навколо. Її зручно тестувати в консолі й використовувати повторно.

```js title="app.js"
// Загальна сума витрат
function getTotal(items) {
  return items.reduce((sum, expense) => sum + expense.amount, 0);
}

// Виведення загальної суми та кількості записів
function renderTotal(items) {
  totalEl.textContent = `Разом: ${formatMoney(getTotal(items))} · записів: ${items.length}`;
}
```

Перевірте в консолі:

```js
getTotal(expenses);   // 3235.5
getTotal([]);         // 0 — завдяки початковому значенню 0
```

На сторінці має з'явитися: **«Разом: 3 235,50 грн · записів: 6»**.

:::tip[Розділяйте обчислення і відображення]
Функція `getTotal` нічого не знає про DOM, а `renderTotal` нічого не рахує сама — лише показує. Такий поділ ми використовуватимемо в усьому проєкті: функції `get...` рахують, функції `render...` малюють.
:::

### Крок 5. Групування за категоріями: `getStats`

Потрібно отримати об'єкт виду «категорія → сума витрат у ній»:

```js
{ 'Їжа': 1005.5, 'Транспорт': 480, 'Розваги': 250, 'Навчання': 1200, 'Комунальні': 300 }
```

Це класичне завдання для `reduce`, де акумулятором є об'єкт:

```js title="app.js"
// Статистика: { категорія: сума }
function getStats(items) {
  return items.reduce((stats, { category, amount }) => {
    stats[category] = (stats[category] ?? 0) + amount;
    return stats;
  }, {});
}
```

Що тут відбувається:

- Початкове значення акумулятора — порожній об'єкт `{}`.
- Другий параметр колбека одразу деструктуризовано: беремо з витрати лише `category` і `amount`.
- `stats[category]` — доступ до властивості за **обчислюваним ключем** (ім'я властивості береться зі змінної).
- `stats[category] ?? 0` — якщо категорії ще немає в об'єкті (`undefined`), беремо 0. Оператор `??` (nullish coalescing) підставляє праве значення лише для `null` і `undefined`, на відміну від `||`, який спрацьовує і на `0`.
- Колбек **обов'язково** повертає акумулятор. Якщо забути `return stats`, на наступному кроці акумулятор стане `undefined`, і ви отримаєте `TypeError: Cannot read properties of undefined`.

Перевірте в консолі, як перетворювати об'єкт на масиви:

```js
const stats = getStats(expenses);
Object.keys(stats);     // ['Їжа', 'Транспорт', 'Розваги', 'Навчання', 'Комунальні']
Object.values(stats);   // [1005.5, 480, 250, 1200, 300]
Object.entries(stats);  // [['Їжа', 1005.5], ['Транспорт', 480], ...]

// Найбільша категорія: сортуємо пари за спаданням суми
Object.entries(stats).sort(([, a], [, b]) => b - a)[0]; // ['Навчання', 1200]
```

Зверніть увагу на `([, a], [, b])` — це деструктуризація масиву з пропуском першого елемента: з пари `['Навчання', 1200]` беремо лише суму.

### Крок 6. Виведення статистики: `renderStats`

Тепер виведемо статистику в `section#stats`: для кожної категорії — назва, сума, відсоток від загальної суми і смужка-індикатор. Функція повністю замінює вміст секції, тож заглушка «Статистика за категоріями з'явиться згодом» з `index.html` зникне після першого виклику. Для порожнього масиву показуємо той самий абзац `p.stats__empty`, для якого вже є стилі.

```js title="app.js (додайте після renderTotal)"
function renderStats(items) {
  const total = getTotal(items);
  const entries = Object.entries(getStats(items)).sort(([, a], [, b]) => b - a);

  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'stats__empty';
    empty.textContent = 'Немає даних для статистики';
    statsEl.replaceChildren(empty);
    return;
  }

  const list = document.createElement('ul');
  list.className = 'stats__list';

  for (const [category, sum] of entries) {
    const percent = Math.round((sum / total) * 100);

    const item = document.createElement('li');
    item.className = 'stats__item';

    const label = document.createElement('span');
    label.textContent = category;

    const value = document.createElement('span');
    value.className = 'stats__value';
    value.textContent = `${formatMoney(sum)} (${percent}%)`;

    const bar = document.createElement('div');
    bar.className = 'stats__bar';
    const fill = document.createElement('div');
    fill.className = 'stats__fill';
    fill.style.width = `${percent}%`;
    bar.append(fill);

    item.append(label, value, bar);
    list.append(item);
  }

  statsEl.replaceChildren(list);
}
```

Перевірка `entries.length === 0` потрібна ще й для того, щоб не ділити на нуль, коли витрат немає (`0 / 0` дає `NaN`). `fill.style.width` — єдиний стиль, який ми задаємо з JS: ширина залежить від даних, тому в CSS її не запишеш.

Додайте стилі в кінець `style.css` (кольори беруться з CSS-змінних практичної 7):

```css title="style.css"
/* ===== Статистика за категоріями (П8) ===== */
.stats__list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.stats__item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px;
  font-size: 0.9rem;
}

.stats__value {
  font-variant-numeric: tabular-nums;
  color: var(--color-muted);
}

.stats__bar {
  grid-column: 1 / -1;
  height: 8px;
  border-radius: 4px;
  background: var(--color-border);
  overflow: hidden;
}

.stats__fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.3s;
}
```

### Крок 7. Фільтрація за категорією

Функція фільтрації приймає масив і назву категорії. Значення `'all'` (так ми назвали перший пункт у `select#filter`) означає «без фільтра»:

```js title="app.js"
// Фільтрація за категорією ('all' — усі категорії)
function filterByCategory(items, category) {
  if (category === 'all') return items;
  return items.filter((expense) => expense.category === category);
}
```

Обробників подій у нас ще немає, тому зміна значення у `select#filter` поки нічого не робить. Щоб перевірити фільтрацію вже зараз, додамо допоміжну функцію, яку викликатимемо з консолі:

```js title="app.js"
// Тимчасова функція для консолі: показати витрати однієї категорії
function showCategory(category) {
  const items = filterByCategory(expenses, category);
  renderList(items);
  renderTotal(items);
}
```

У консолі:

```js
showCategory('Їжа');     // у списку 2 витрати, «Разом: 1 005,50 грн · записів: 2»
showCategory('Інше');    // порожній список, «Разом: 0,00 грн · записів: 0»
showCategory('all');     // знову всі витрати
expenses.length;         // 6 — filter не змінив вихідний масив
```

### Крок 8. Сортування без зміни вихідного масиву

Метод `sort` має дві особливості, які часто призводять до помилок:

1. Без функції порівняння він сортує елементи **як рядки**: `[100, 25, 3].sort()` дає `[100, 25, 3]`, бо `'1' < '2' < '3'`.
2. Він **змінює** масив, на якому викликаний, і повертає той самий масив.

Переконайтеся в другому пункті в консолі:

```js
const sortedBad = expenses.sort((a, b) => a.amount - b.amount);
sortedBad === expenses;  // true — це той самий масив!
console.table(expenses); // вихідні дані тепер відсортовані за сумою
```

Перезавантажте сторінку, щоб повернути початковий порядок. Правильний підхід — сортувати **копію**:

```js title="app.js"
// Сортування копії масиву за вибраним ключем
function sortExpenses(items, sortKey) {
  const sorted = [...items]; // копія: sort() змінює масив на місці
  switch (sortKey) {
    case 'date-asc':
      return sorted.sort((a, b) => a.date.localeCompare(b.date));
    case 'date-desc':
      return sorted.sort((a, b) => b.date.localeCompare(a.date));
    case 'amount-asc':
      return sorted.sort((a, b) => a.amount - b.amount);
    case 'amount-desc':
      return sorted.sort((a, b) => b.amount - a.amount);
    default:
      return sorted;
  }
}
```

Функція порівняння повертає від'ємне число, якщо `a` має стояти перед `b`, додатне — якщо після, і 0 — якщо порядок не важливий. Для чисел це просто різниця `a - b`. Дати у форматі `YYYY-MM-DD` можна порівнювати як рядки (`localeCompare`), бо лексикографічний порядок таких рядків збігається з хронологічним.

:::note[toSorted — сучасна альтернатива]
У сучасних браузерах є метод `toSorted(fn)` (ES2023), який одразу повертає відсортовану копію: `items.toSorted((a, b) => a.amount - b.amount)`. Ми використовуємо `[...items].sort()`, бо так явно видно ідею копіювання, але обидва варіанти правильні.
:::

Перевірте в консолі:

```js
renderList(sortExpenses(expenses, 'amount-desc')); // від найдорожчої
renderList(sortExpenses(expenses, 'date-asc'));    // від найстарішої
console.table(expenses);                           // вихідний порядок не змінився
```

### Крок 9. Пошук і незмінне оновлення: `find` і spread

Для видалення і редагування витрат (наступні практичні) нам знадобиться пошук витрати за `id`:

```js title="app.js"
// Пошук витрати за id
function findExpense(id) {
  return expenses.find((expense) => expense.id === id);
}
```

Поекспериментуйте в консолі:

```js
findExpense(3);                         // { id: 3, title: 'Кіно «Дюна»', ... }
findExpense(42);                        // undefined
findExpense(42)?.title;                 // undefined, без помилки (optional chaining)
expenses.findIndex((e) => e.id === 3);  // 2

// Незмінне (immutable) оновлення: створюємо НОВИЙ об'єкт з іншою сумою
const cinema = findExpense(3);
const cheaperCinema = { ...cinema, amount: 200 };
cinema.amount;          // 250 — оригінал не змінився
cheaperCinema.amount;   // 200

// Новий масив, у якому одну витрату замінено
const updatedList = expenses.map((e) => (e.id === 3 ? cheaperCinema : e));
getTotal(updatedList);  // 3185.5
getTotal(expenses);     // 3235.5
```

:::caution[Чому `===`, а не `==`?]
`id` у даних — число. Коли пізніше ми зчитуватимемо його з `data-id`, отримаємо **рядок** `'3'`. `3 === '3'` дає `false`, тому перед пошуком рядок треба перетворити на число: `Number(li.dataset.id)`. Не «лікуйте» це заміною на `==` — нестроге порівняння приховує помилки типів.
:::

### Крок 10. Початковий виклик функцій

Оновіть блок «Запуск» у кінці файлу: список одразу виводимо відсортованим від нових до старих витрат і додаємо виклик статистики.

```js title="app.js" {3,5}
// ===== Запуск =====
fillSelects();
dateInput.value = todayISO();
renderList(sortExpenses(expenses, 'date-desc'));
renderTotal(expenses);
renderStats(expenses);
```

**Результат роботи:** на сторінці список із 6 витрат (найновіша — «Інтернет», 10.02.2026 — вгорі, дві великі витрати підсвічені), рядок «Разом: 3 235,50 грн · записів: 6» і блок статистики, де категорії впорядковані за спаданням суми: Навчання (37%), Їжа (31%), Транспорт (15%), Комунальні (9%), Розваги (8%). З консолі працюють `showCategory(...)`, `sortExpenses(...)`, `findExpense(...)`.

:::tip[Порядок функцій у файлі]
Оголошення функцій (function declaration) «піднімаються» (hoisting), тому їх можна викликати до місця оголошення. Проте для читабельності тримайтеся порядку: константи → елементи DOM → допоміжні функції (`format...`) → обробка даних (`get...`, `filter...`, `sort...`, `find...`) → рендеринг (`fill...`, `render...`) → запуск у кінці файлу.
:::

## Завдання для самостійного виконання

Завдання 1–3 виконуйте в окремому файлі `practice-08/exercises.js` (підключіть його до порожнього `index.html` або вставте в консоль). Використайте такі дані:

```js title="practice-08/exercises.js"
const students = [
  { name: 'Олена', group: 'ПЗ-21', grades: [90, 85, 77] },
  { name: 'Андрій', group: 'ПЗ-22', grades: [60, 72, 58] },
  { name: 'Марія', group: 'ПЗ-21', grades: [95, 98, 100] },
  { name: 'Тарас', group: 'ПЗ-22', grades: [81, 79, 88] },
  { name: 'Ірина', group: 'ПЗ-21', grades: [55, 61, 70] },
];
```

1. ★ Отримайте масив імен студентів групи `ПЗ-21`, відсортований за абеткою (`filter` + `map` + `sort` з `localeCompare`).
2. ★ Додайте кожному студенту поле `average` (середній бал, округлений до одного знака) і **не змінюйте** вихідний масив: `students.map((s) => ({ ...s, average: ... }))`. Виведіть результат через `console.table`.
3. ★★ Згрупуйте студентів за групами: отримайте об'єкт `{ 'ПЗ-21': ['Олена', 'Марія', 'Ірина'], 'ПЗ-22': [...] }` за допомогою `reduce`. Потім виведіть для кожної групи рядок «ПЗ-21: 3 студенти» через `Object.entries`.
4. ★★ У «Трекері витрат» напишіть функцію `getSummary(items)`, яка повертає об'єкт `{ count, total, average, max }`, де `max` — найдорожча витрата (об'єкт). Використайте `reduce` і деструктуризацію результату: `const { average, max } = getSummary(expenses);`. Виведіть під загальною сумою рядок «Середня витрата: … · Найбільша: …».
5. ★★★ Напишіть функцію `getStatsByMonth(items)`, що повертає вкладений об'єкт `{ '2026-02': { 'Їжа': 1005.5, ... }, ... }` (місяць беріть як `date.slice(0, 7)`). Додайте в `expenses` кілька витрат за березень і перевірте результат. Підказка: акумулятор `stats[month] ??= {}` (оператор `??=` присвоює, лише якщо значення `null`/`undefined`).

## Контрольні питання

1. Чим `map` відрізняється від `forEach`? Що повертає кожен із них?
2. Які методи масивів змінюють вихідний масив? Чому це може бути небезпечно?
3. Що станеться, якщо викликати `reduce` без початкового значення на порожньому масиві?
4. Чому `[100, 25, 3].sort()` повертає `[100, 25, 3]`? Як відсортувати числа правильно?
5. Що повертає `find`, якщо елемент не знайдено? А `findIndex`?
6. Поясніть різницю між операторами `??` і `||` на прикладі `0 ?? 5` і `0 || 5`.
7. Що таке поверхнева копія? Чи скопіює `{ ...obj }` вкладений масив?
8. Що повертає `Object.entries` і як зручно перебрати його результат у циклі?
9. Що таке чиста функція? Чому `getTotal` чиста, а `renderTotal` — ні?

## Домашнє завдання

1. Доробіть «Трекер витрат» до стану, описаного в кроці 10, — від нього починатиметься практична 10.
2. Додайте в масив `expenses` ще 3–4 власні витрати (зокрема в категорії «Інше») і переконайтеся, що сума і статистика перераховуються правильно.
3. Виконайте завдання ★ 1 і 2 з розділу самостійної роботи.

## Що здати

- Скриншот сторінки трекера зі списком, сумою і блоком статистики.
- Скриншот консолі з результатами `showCategory('Їжа')`, `sortExpenses(expenses, 'amount-desc')` і `getStats(expenses)`.
- Файл `app.js` і файл `practice-08/exercises.js` з розв'язками самостійних завдань.
- Відповіді на контрольні питання.
