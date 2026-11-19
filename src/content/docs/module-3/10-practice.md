---
title: "Маніпуляції DOM та обробка подій"
description: "Оживляємо «Трекер витрат»: додавання витрат через форму з валідацією, видалення через делегування подій, фільтр за категорією, сортування кнопками та єдина функція render()."
type: practice
pair: 10
topic: 52
---

## Мета роботи

- Навчитися обробляти подію `submit` форми, скасовувати дію за замовчуванням і зчитувати значення полів.
- Реалізувати власну валідацію з підсвічуванням полів і текстом помилок.
- Застосувати делегування подій для видалення елементів динамічного списку і для панелі кнопок сортування.
- Обробляти подію `change` для фільтра.
- Перебудувати застосунок за схемою «подія → зміна стану → `render()`».

## Що потрібно

- VS Code + Live Server, Chrome з DevTools.
- Проєкт `expense-tracker/` у стані після практичної 8: функції `getTotal`, `getStats`, `renderStats`, `filterByCategory`, `sortExpenses`, `findExpense` і тимчасова `showCategory`.
- Теорія з лекції 9 «Події у JavaScript»: `addEventListener`, об'єкт події, спливання, делегування, `preventDefault`.

## Короткі теоретичні відомості

### Схема інтерактивного застосунку

Сьогодні ми переходимо від «скрипта, що один раз малює сторінку» до застосунку, який живе і реагує на користувача. Щоб код не перетворився на хаос, дотримуватимемося простого правила: **інтерфейс завжди будується з даних**.

```text
            ┌────────────── Стан (state) ──────────────┐
            │  expenses       — масив витрат           │
            │  currentFilter  — 'all' або категорія    │
            │  currentSort    — 'date-desc', ...       │
            └──────────────────────────────────────────┘
                 ▲                              │
   обробник змінює стан                   render() читає стан
                 │                              ▼
  submit / click / change  ◄──────  DOM: список, сума, статистика
```

Обробники подій **ніколи не змінюють DOM напряму** (окрім дрібниць на кшталт підсвічування поля). Вони лише змінюють змінні стану і викликають `render()`.

### Які події нам знадобляться

| Елемент | Подія | Що робимо |
|---|---|---|
| `form#expense-form` | `submit` | валідація, додавання витрати, очищення форми |
| `form#expense-form` | `input` (делегування) | прибираємо підсвічування помилки, коли користувач виправляє поле |
| `ul#list` | `click` (делегування) | видалення витрати за кнопкою `button.delete` |
| `select#filter` | `change` | зміна фільтра |
| `div#sort` | `click` (делегування) | зміна сортування |

### Ідентифікатор нової витрати

Кожна витрата має унікальний `id`. Для навчального застосунку використаємо `Date.now()` — кількість мілісекунд від 1 січня 1970 року. Два кліки в одну мілісекунду неможливі, тому значення буде унікальним. У реальних застосунках `id` зазвичай видає сервер або використовують `crypto.randomUUID()`.

## Хід роботи

### Крок 1. Доповнюємо розмітку

Форма з практичної 7 вже має атрибут `novalidate`: вбудовані підказки браузера вимкнено, перевіряти дані й показувати повідомлення будемо самі. Внесіть у `index.html` дві зміни.

1. У кожен `label.form__field` форми **після** поля додайте порожній елемент для тексту помилки. Атрибут `data-for` пов'язує його з `id` поля:

   ```html title="index.html (форма)" {4,9,17,22}
   <label class="form__field">
     Назва
     <input type="text" id="title" name="title" placeholder="Наприклад, обід" required>
     <span class="form__error" data-for="title"></span>
   </label>
   <label class="form__field">
     Сума, грн
     <input type="number" id="amount" name="amount" min="0.01" step="0.01" placeholder="0.00" required>
     <span class="form__error" data-for="amount"></span>
   </label>
   <label class="form__field">
     Категорія
     <select id="category" name="category" required>
       <option value="" disabled selected>Оберіть категорію</option>
       <!-- решту варіантів додасть JavaScript із CATEGORIES -->
     </select>
     <span class="form__error" data-for="category"></span>
   </label>
   <label class="form__field">
     Дата
     <input type="date" id="date" name="date" required>
     <span class="form__error" data-for="date"></span>
   </label>
   ```

2. У панель `.toolbar` між фільтром і `p#total` додайте групу кнопок сортування:

   ```html title="index.html (панель над списком)" {8-13}
   <div class="toolbar">
     <label class="form__field">
       Фільтр
       <select id="filter">
         <!-- «Усі категорії» і категорії додасть JavaScript -->
       </select>
     </label>
     <div class="sort" id="sort" role="group" aria-label="Сортування">
       <button type="button" class="btn btn--ghost" data-sort="date-desc">Дата ↓</button>
       <button type="button" class="btn btn--ghost" data-sort="date-asc">Дата ↑</button>
       <button type="button" class="btn btn--ghost" data-sort="amount-desc">Сума ↓</button>
       <button type="button" class="btn btn--ghost" data-sort="amount-asc">Сума ↑</button>
     </div>
     <p id="total" class="total">Разом: 0,00 грн</p>
   </div>
   ```

   Значення `data-sort` точно збігаються з ключами, які приймає наша функція `sortExpenses` з практичної 8. Атрибут `type="button"` обов'язковий для кнопок поза формою з міркувань звички: всередині форми кнопка без типу відправляла б її.

Клас підсвічування поля `.is-invalid` уже є в `style.css` з практичної 7. Додайте в кінець файлу стилі для тексту помилок і кнопок сортування:

```css title="style.css"
/* ===== Помилки форми і сортування (П10) ===== */
.form__error {
  min-height: 1.2em; /* резервуємо місце, щоб форма не «стрибала» */
  font-size: 0.8rem;
  color: var(--color-danger);
}

.btn--ghost {
  border: 1px solid var(--color-border);
  color: var(--color-text);
  background: transparent;
}

.btn--ghost:hover {
  border-color: var(--color-primary);
}

.btn.is-active {
  border-color: var(--color-primary);
  color: #ffffff;
  background: var(--color-primary);
}

.sort {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
```

### Крок 2. Змінні стану і нові елементи DOM

Досі `expenses` була константою, і ми лише читали її. Тепер масив буде **замінюватися** новим при додаванні й видаленні (`expenses = [...]`), тому оголосимо його через `let`. Також додамо дві змінні для поточного фільтра і сортування. Рядок `'use strict';` і константи `CATEGORIES`, `BIG_EXPENSE` залишаються на початку файлу без змін; коментар-заголовок `// ===== Дані =====` над ними перейменуйте на `// ===== Константи =====`, а масив перенесіть в окремий розділ «Стан застосунку».

```js title="app.js" {2,10-11}
// ===== Стан застосунку =====
let expenses = [
  { id: 1, title: 'Продукти в АТБ', amount: 845.5, category: 'Їжа', date: '2026-02-03' },
  { id: 2, title: 'Проїзний на місяць', amount: 480, category: 'Транспорт', date: '2026-02-01' },
  { id: 3, title: 'Кіно «Дюна»', amount: 250, category: 'Розваги', date: '2026-02-07' },
  { id: 4, title: 'Курс англійської', amount: 1200, category: 'Навчання', date: '2026-02-05' },
  { id: 5, title: 'Інтернет', amount: 300, category: 'Комунальні', date: '2026-02-10' },
  { id: 6, title: 'Кава з друзями', amount: 160, category: 'Їжа', date: '2026-02-08' },
];
let currentFilter = 'all';
let currentSort = 'date-desc';
```

Посилання на поля форми (`form`, `titleInput`, `amountInput`, `dateInput`) ми зберегли ще на практичній 7. Додайте до блоку елементів DOM контейнер кнопок сортування і масив полів форми:

```js title="app.js" {8,13}
// ===== Елементи DOM =====
const form = document.getElementById('expense-form');
const titleInput = document.getElementById('title');
const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const dateInput = document.getElementById('date');
const filterSelect = document.getElementById('filter');
const sortControls = document.getElementById('sort');
const totalEl = document.getElementById('total');
const statsEl = document.getElementById('stats');
const listEl = document.getElementById('list');

const formFields = [titleInput, amountInput, categorySelect, dateInput];
```

Видаліть тимчасову функцію `showCategory` — її замінить справжній фільтр.

:::note[Чому замінюємо масив, а не змінюємо його]
Можна було б писати `expenses.push(...)` і `expenses.splice(...)`. Але створення нового масиву (`[...expenses, item]`, `expenses.filter(...)`) робить кожну зміну стану явною: «ось старий стан, ось новий». Саме так стан оновлюють у React (`setState`), і такий код легше налагоджувати.
:::

### Крок 3. Єдина функція `render()`

Додайте після `findExpense` функцію, що повертає витрати, які треба показати, з урахуванням фільтра і сортування:

```js title="app.js"
// Витрати для показу: спочатку фільтр, потім сортування
function getVisibleExpenses() {
  return sortExpenses(filterByCategory(expenses, currentFilter), currentSort);
}
```

`renderList` змінювати не потрібно: порожній стан «Витрат поки немає» (`li.list__empty`) з'явився ще на практичній 7 і тепер стане в пригоді — список може спорожніти після видалення або фільтрації.

Після `renderStats` додайте функцію підсвічування активної кнопки сортування і головну функцію `render`:

```js title="app.js"
// Підсвічування активної кнопки сортування
function updateSortButtons() {
  for (const button of sortControls.querySelectorAll('[data-sort]')) {
    const isActive = button.dataset.sort === currentSort;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  }
}

// Перемальовування всього інтерфейсу зі стану
function render() {
  const visible = getVisibleExpenses();
  renderList(visible);
  renderTotal(visible);
  renderStats(expenses);
  updateSortButtons();
}
```

Зверніть увагу: список і сума показують **відфільтровані** витрати, а статистика — **усі** (інакше при фільтрі «Їжа» статистика завжди показувала б 100% для однієї категорії).

Тепер замініть блок «Запуск» у кінці файлу функцією ініціалізації:

```js title="app.js"
// ===== Ініціалізація =====
function init() {
  fillSelects();
  dateInput.value = todayISO();
  render();
}

init();
```

Перезавантажте сторінку: усе має виглядати як раніше, а кнопка «Дата ↓» — бути підсвіченою.

### Крок 4. Фільтр: подія `change`

Для `select` подія `change` спрацьовує одразу після вибору пункту. Додайте обробник у розділ обробників (над `init`):

```js title="app.js"
// ===== Обробники подій =====
function handleFilterChange() {
  currentFilter = filterSelect.value;
  render();
}
```

І зареєструйте його в `init`:

```js title="app.js" {4}
function init() {
  fillSelects();
  dateInput.value = todayISO();
  filterSelect.addEventListener('change', handleFilterChange);
  render();
}
```

Перевірте: при виборі «Їжа» залишаються 2 витрати, сума — 1 005,50 грн; при виборі «Інше» — повідомлення «Витрат поки немає».

:::caution[Передавайте функцію, а не результат її виклику]
`filterSelect.addEventListener('change', handleFilterChange())` — помилка: функція виконається один раз під час реєстрації, а обробником стане її результат `undefined`. Потрібно `handleFilterChange` без дужок.
:::

### Крок 5. Сортування: делегування на панелі кнопок

Замість чотирьох обробників на чотирьох кнопках поставимо **один** обробник на контейнер `div#sort`. Клік по будь-якій кнопці спливе до контейнера, а з `event.target` ми дізнаємося, яку кнопку натиснуто.

```js title="app.js"
function handleSortClick(event) {
  const button = event.target.closest('[data-sort]');
  if (!button) return; // клік між кнопками
  currentSort = button.dataset.sort;
  render();
}
```

```js title="app.js (у функції init)"
sortControls.addEventListener('click', handleSortClick);
```

Перевірте всі чотири кнопки. Тепер можна комбінувати фільтр і сортування: наприклад, «Їжа» + «Сума ↓».

### Крок 6. Зчитування і валідація форми

Для перевірки дати знадобиться функція `todayISO()`, яку ми написали на практичній 7 (вона вже заповнює поле дати під час запуску). Оголошувати її вдруге **не потрібно** — повторне оголошення функції в одному файлі тихо перезапише першу і заплутає читача коду.

:::caution[Чому todayISO, а не toISOString()]
`new Date().toISOString().slice(0, 10)` повертає дату за **UTC**. В Україні (UTC+2/UTC+3) з півночі до 2–3 години ночі ви отримаєте вчорашню дату. Тому `todayISO` збирає рядок з локальних `getFullYear`, `getMonth`, `getDate`.
:::

Тепер розділ роботи з формою. Функція `readForm` перетворює значення полів на об'єкт потрібних типів, а `validate` повертає об'єкт помилок, де ключ — `id` поля:

```js title="app.js"
// ===== Форма =====
function readForm() {
  return {
    title: titleInput.value.trim(),
    amount: Number(amountInput.value),
    category: categorySelect.value,
    date: dateInput.value,
  };
}

function validate({ title, amount, category, date }) {
  const errors = {};
  if (title.length < 2) {
    errors.title = 'Назва має містити щонайменше 2 символи';
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Сума має бути додатним числом';
  }
  if (!CATEGORIES.includes(category)) {
    errors.category = 'Оберіть категорію зі списку';
  }
  if (!date) {
    errors.date = 'Вкажіть дату';
  } else if (date > todayISO()) {
    errors.date = 'Дата не може бути в майбутньому';
  }
  return errors;
}
```

Кілька тонкощів:

- `trim()` прибирає пробіли з країв: назва з одних пробілів не пройде перевірку.
- `Number('')` дає `0`, а `Number('abc')` — `NaN`. Обидва випадки відсікає умова `!Number.isFinite(amount) || amount <= 0`.
- Перший пункт `select#category` — заглушка «Оберіть категорію» з `value=""`. Порожній рядок не входить до `CATEGORIES`, тож невибрана категорія дає помилку.
- Дати у форматі `YYYY-MM-DD` можна порівнювати як рядки: `'2026-03-01' > '2026-02-28'`.
- Порожній об'єкт помилок означає, що дані коректні: `Object.keys(errors).length === 0`.

Перевірте функції з консолі:

```js
validate({ title: 'К', amount: 0, category: 'Їжа', date: '2099-01-01' });
// { title: '...2 символи', amount: '...додатним числом', date: '...в майбутньому' }
validate({ title: 'Кава', amount: 60, category: 'Їжа', date: '2026-02-15' });
// {}
```

### Крок 7. Показ помилок

```js title="app.js"
// Підсвітити поле і показати текст помилки (порожній message — прибрати)
function showFieldError(field, message = '') {
  field.classList.toggle('is-invalid', message !== '');
  field.setAttribute('aria-invalid', String(message !== ''));
  const errorEl = form.querySelector(`.form__error[data-for="${field.id}"]`);
  if (errorEl) errorEl.textContent = message;
}

function showErrors(errors) {
  for (const field of formFields) {
    showFieldError(field, errors[field.id]);
  }
}
```

Для полів без помилки `errors[field.id]` дорівнює `undefined`, і спрацьовує значення параметра за замовчуванням `''` — поле очищується від підсвічування. Так одна функція і показує, і прибирає помилки.

Коли користувач починає виправляти поле, підсвічування варто одразу прибрати. Замість чотирьох обробників використаємо делегування: подія `input` спливає від поля до форми.

```js title="app.js (обробники)"
function handleFormInput(event) {
  if (event.target.classList.contains('is-invalid')) {
    showFieldError(event.target);
  }
}
```

### Крок 8. Додавання витрати

```js title="app.js"
// ===== Зміна даних =====
function addExpense(data) {
  expenses = [...expenses, { id: Date.now(), ...data }];
  render();
}
```

Spread `...data` копіює в новий об'єкт поля `title`, `amount`, `category`, `date`, а `id` ми додаємо самі.

Очищення форми після успішного додавання:

```js title="app.js (розділ «Форма»)"
function resetForm() {
  form.reset();                 // очищає поля; у select знову вибрано «Оберіть категорію»
  showErrors({});               // прибирає підсвічування
  dateInput.value = todayISO(); // зручне значення за замовчуванням
  titleInput.focus();           // курсор — у перше поле для наступного введення
}
```

І головний обробник:

```js title="app.js (обробники)"
function handleSubmit(event) {
  event.preventDefault(); // без цього сторінка перезавантажиться

  const data = readForm();
  const errors = validate(data);
  showErrors(errors);

  if (Object.keys(errors).length > 0) {
    form.querySelector('.is-invalid')?.focus(); // фокус на перше поле з помилкою
    return;
  }

  addExpense(data);
  resetForm();
}
```

Оновіть `init`:

```js title="app.js" {5-6}
function init() {
  fillSelects();
  dateInput.value = todayISO();

  form.addEventListener('submit', handleSubmit);
  form.addEventListener('input', handleFormInput);
  filterSelect.addEventListener('change', handleFilterChange);
  sortControls.addEventListener('click', handleSortClick);

  render();
}
```

Перевірте сценарії:

1. Натисніть «Додати» з порожньою формою — підсвітяться назва, сума і категорія з текстами помилок, фокус — у полі назви.
2. Почніть вводити назву — підсвічування поля зникне.
3. Вкажіть дату в майбутньому — помилка «Дата не може бути в майбутньому».
4. Заповніть усе правильно і натисніть **Enter** у полі суми — витрата з'явиться вгорі списку (сортування «Дата ↓»), сума і статистика оновляться, форма очиститься.
5. Увімкніть фільтр «Транспорт» і додайте витрату категорії «Їжа» — у списку її не видно (діє фільтр), але статистика змінилася.

:::tip[Перевірте, що сторінка не перезавантажується]
Тримайте відкритою вкладку DevTools → Console. Якщо після «Додати» консоль очищається, а введена витрата зникає, — сторінка перезавантажилася: `preventDefault()` не викликано або в коді обробника є помилка до цього рядка. Щоб побачити таку помилку, увімкніть у налаштуваннях консолі **Preserve log** — тоді повідомлення не зникатимуть при перезавантаженні.
:::

### Крок 9. Видалення через делегування

Кнопки `button.delete` створюються заново при кожному `render()`, тому вішати обробник на кожну з них безглуздо. Один обробник на постійному `ul#list` обробить кліки по всіх кнопкам — і теперішнім, і майбутнім.

```js title="app.js (розділ «Зміна даних»)"
function deleteExpense(id) {
  expenses = expenses.filter((expense) => expense.id !== id);
  render();
}
```

```js title="app.js (обробники)"
function handleListClick(event) {
  const button = event.target.closest('button.delete');
  if (!button) return; // клік не по кнопці видалення

  const id = Number(button.closest('li.expense').dataset.id); // data-id — рядок!
  const expense = findExpense(id);
  if (!expense) return;

  if (confirm(`Видалити «${expense.title}» (${formatMoney(expense.amount)})?`)) {
    deleteExpense(id);
  }
}
```

```js title="app.js (у функції init)"
listEl.addEventListener('click', handleListClick);
```

`confirm()` показує модальне вікно браузера і повертає `true` або `false`. Для навчального проєкту цього достатньо; у реальних інтерфейсах замість нього використовують власне діалогове вікно (елемент `<dialog>`) або кнопку «Скасувати» після видалення.

### Крок 10. Перевірка обробників у DevTools

1. Вкладка **Elements** → виділіть `ul#list` → праворуч панель **Event Listeners**. Ви побачите один обробник `click`. Виділіть будь-яку кнопку «✕» — власних обробників у неї немає, але в розділі `click` з позначкою **Ancestors** видно обробник списку.
2. У консолі Chrome є службова функція (працює лише в консолі, не в коді):

   ```js
   getEventListeners(listEl);  // { click: [{ listener: handleListClick, ... }] }
   getEventListeners(form);    // { submit: [...], input: [...] }
   ```

3. Поставте точку зупинки (breakpoint) на першому рядку `handleListClick` у вкладці **Sources**, клацніть «✕» і покроково (F10) пройдіть обробник, стежачи за значеннями `button`, `id`, `expense`.

### Крок 11. Повний код `app.js` після роботи

Звірте свій файл з повним лістингом. Порядок розділів: константи → стан → елементи DOM → допоміжні функції → обробка даних → зміна даних → рендеринг → форма → обробники подій → ініціалізація. Від цього стану починається практична 11.

```js title="app.js"
'use strict';

// ===== Константи =====
const CATEGORIES = ['Їжа', 'Транспорт', 'Розваги', 'Навчання', 'Комунальні', 'Інше'];

// Витрата від цієї суми вважається «великою» і підсвічується, грн
const BIG_EXPENSE = 500;


// ===== Стан застосунку =====
let expenses = [
  { id: 1, title: 'Продукти в АТБ', amount: 845.5, category: 'Їжа', date: '2026-02-03' },
  { id: 2, title: 'Проїзний на місяць', amount: 480, category: 'Транспорт', date: '2026-02-01' },
  { id: 3, title: 'Кіно «Дюна»', amount: 250, category: 'Розваги', date: '2026-02-07' },
  { id: 4, title: 'Курс англійської', amount: 1200, category: 'Навчання', date: '2026-02-05' },
  { id: 5, title: 'Інтернет', amount: 300, category: 'Комунальні', date: '2026-02-10' },
  { id: 6, title: 'Кава з друзями', amount: 160, category: 'Їжа', date: '2026-02-08' },
];
let currentFilter = 'all';
let currentSort = 'date-desc';

// ===== Елементи DOM =====
const form = document.getElementById('expense-form');
const titleInput = document.getElementById('title');
const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const dateInput = document.getElementById('date');
const filterSelect = document.getElementById('filter');
const sortControls = document.getElementById('sort');
const totalEl = document.getElementById('total');
const statsEl = document.getElementById('stats');
const listEl = document.getElementById('list');

const formFields = [titleInput, amountInput, categorySelect, dateInput];

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

// ===== Обробка даних =====
function getTotal(items) {
  return items.reduce((sum, expense) => sum + expense.amount, 0);
}

// { категорія: сума }
function getStats(items) {
  return items.reduce((stats, { category, amount }) => {
    stats[category] = (stats[category] ?? 0) + amount;
    return stats;
  }, {});
}

function filterByCategory(items, category) {
  if (category === 'all') return items;
  return items.filter((expense) => expense.category === category);
}

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

function findExpense(id) {
  return expenses.find((expense) => expense.id === id);
}

function getVisibleExpenses() {
  return sortExpenses(filterByCategory(expenses, currentFilter), currentSort);
}

// ===== Зміна даних =====
function addExpense(data) {
  expenses = [...expenses, { id: Date.now(), ...data }];
  render();
}

function deleteExpense(id) {
  expenses = expenses.filter((expense) => expense.id !== id);
  render();
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

function renderTotal(items) {
  totalEl.textContent = `Разом: ${formatMoney(getTotal(items))} · записів: ${items.length}`;
}

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

function updateSortButtons() {
  for (const button of sortControls.querySelectorAll('[data-sort]')) {
    const isActive = button.dataset.sort === currentSort;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  }
}

// Перемальовування всього інтерфейсу зі стану
function render() {
  const visible = getVisibleExpenses();
  renderList(visible);
  renderTotal(visible);
  renderStats(expenses);
  updateSortButtons();
}

// ===== Форма =====
function readForm() {
  return {
    title: titleInput.value.trim(),
    amount: Number(amountInput.value),
    category: categorySelect.value,
    date: dateInput.value,
  };
}

function validate({ title, amount, category, date }) {
  const errors = {};
  if (title.length < 2) {
    errors.title = 'Назва має містити щонайменше 2 символи';
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Сума має бути додатним числом';
  }
  if (!CATEGORIES.includes(category)) {
    errors.category = 'Оберіть категорію зі списку';
  }
  if (!date) {
    errors.date = 'Вкажіть дату';
  } else if (date > todayISO()) {
    errors.date = 'Дата не може бути в майбутньому';
  }
  return errors;
}

// Підсвітити поле і показати текст помилки (порожній message — прибрати)
function showFieldError(field, message = '') {
  field.classList.toggle('is-invalid', message !== '');
  field.setAttribute('aria-invalid', String(message !== ''));
  const errorEl = form.querySelector(`.form__error[data-for="${field.id}"]`);
  if (errorEl) errorEl.textContent = message;
}

function showErrors(errors) {
  for (const field of formFields) {
    showFieldError(field, errors[field.id]);
  }
}

function resetForm() {
  form.reset();
  showErrors({});
  dateInput.value = todayISO();
  titleInput.focus();
}

// ===== Обробники подій =====
function handleSubmit(event) {
  event.preventDefault();

  const data = readForm();
  const errors = validate(data);
  showErrors(errors);

  if (Object.keys(errors).length > 0) {
    form.querySelector('.is-invalid')?.focus();
    return;
  }

  addExpense(data);
  resetForm();
}

function handleFormInput(event) {
  if (event.target.classList.contains('is-invalid')) {
    showFieldError(event.target);
  }
}

function handleListClick(event) {
  const button = event.target.closest('button.delete');
  if (!button) return;

  const id = Number(button.closest('li.expense').dataset.id);
  const expense = findExpense(id);
  if (!expense) return;

  if (confirm(`Видалити «${expense.title}» (${formatMoney(expense.amount)})?`)) {
    deleteExpense(id);
  }
}

function handleFilterChange() {
  currentFilter = filterSelect.value;
  render();
}

function handleSortClick(event) {
  const button = event.target.closest('[data-sort]');
  if (!button) return;
  currentSort = button.dataset.sort;
  render();
}

// ===== Ініціалізація =====
function init() {
  fillSelects();
  dateInput.value = todayISO();

  form.addEventListener('submit', handleSubmit);
  form.addEventListener('input', handleFormInput);
  listEl.addEventListener('click', handleListClick);
  filterSelect.addEventListener('change', handleFilterChange);
  sortControls.addEventListener('click', handleSortClick);

  render();
}

init();
```

**Результат роботи:** витрати додаються через форму (з перевіркою даних і підсвічуванням помилок), видаляються кнопкою «✕» з підтвердженням, список фільтрується за категорією і сортується кнопками; сума, кількість записів і статистика завжди відповідають даним. Після перезавантаження сторінки додані витрати зникають — збереження даних ми реалізуємо на практичній 14.

## Завдання для самостійного виконання

1. ★ Додайте до форми кнопку `type="reset"` «Очистити». Обробіть подію `reset` форми так, щоб прибиралися повідомлення про помилки і в полі дати знову ставилася сьогоднішня дата. Підказка: після `reset` браузер скидає значення **після** обробника, тому дату встановлюйте через `setTimeout(() => ..., 0)`.
2. ★ Скасування введення клавішею **Escape**: якщо фокус у формі і натиснуто Escape — очистити форму (`keydown` на формі, перевірка `event.key`).
3. ★★ Додайте лічильник символів під полем назви («12 / 50») і обмеження довжини назви 50 символами у валідації. Лічильник оновлюйте за подією `input`.
4. ★★ Підсвічування нової витрати: після додавання елемент списку з новим `id` має кілька секунд мати клас `highlight` (CSS-анімація фону). Підказка: після `render()` знайдіть елемент через ``listEl.querySelector(`[data-id="${id}"]`)``; клас приберіть за подією `animationend`.
5. ★★★ Редагування витрати: подвійний клік (`dblclick`) по назві в списку перетворює її на `input`; Enter зберігає нову назву (незмінне оновлення через `map` і spread), Escape або втрата фокуса — скасовує. Використайте делегування на `ul#list`.

## Контрольні питання

1. Чому `expenses` тепер оголошено через `let`, а не `const`? Чи можна було залишити `const`?
2. Що станеться, якщо в `handleSubmit` не викликати `event.preventDefault()`?
3. Навіщо формі атрибут `novalidate`? Що було б без нього з порожнім полем `required`?
4. Поясніть, як працює видалення: чому обробник стоїть на `ul#list`, а не на кнопках?
5. Навіщо `Number(...)` при зчитуванні `dataset.id`? Що повернула б `findExpense` без перетворення?
6. Чому в обробнику сортування використано `event.target.closest('[data-sort]')`, а не просто `event.target`?
7. Чому статистика рахується для всіх витрат, а сума — лише для відфільтрованих?
8. Які переваги дає єдина функція `render()` порівняно з точковими змінами DOM в кожному обробнику?
9. Як у DevTools побачити, які обробники подій призначено елементу?

## Домашнє завдання

1. Завершіть усі кроки практичної роботи і переконайтеся, що працюють п'ять сценаріїв з кроку 8, видалення, фільтр і сортування.
2. Виконайте завдання ★ 1 і ★ 2.
3. Встановіть розширення **Live Server**, якщо досі відкривали `index.html` подвійним кліком: на наступній практичній ми завантажуватимемо дані з файлу через `fetch`, і без локального сервера це не працюватиме.

## Що здати

- Скриншоти: форма з підсвіченими помилками; список після додавання двох власних витрат; список з увімкненим фільтром і сортуванням «Сума ↓».
- Скриншот панелі **Event Listeners** для `ul#list`.
- Файли `index.html`, `style.css`, `app.js`.
- Відповіді на контрольні питання.
