---
title: "Робота з локальним сховищем"
description: "Підсумкова практична модуля: зберігаємо витрати, фільтр і тему в localStorage, кешуємо курси НБУ на годину, тримаємо чернетку форми в sessionStorage, обробляємо пошкоджені дані, експортуємо та імпортуємо витрати у JSON-файл. Фінальна версія «Трекера витрат»."
type: practice
pair: 14
topic: 56
---

## Мета роботи

- Опанувати Web Storage API: `localStorage` і `sessionStorage`, методи `setItem`, `getItem`, `removeItem`, `clear`.
- Зберігати структуровані дані через `JSON.stringify` / `JSON.parse` і захищатися від пошкоджених даних.
- Розрізняти «нічого не збережено» (`null`) і «збережено порожній список» (`[]`).
- Реалізувати кешування відповіді API з міткою часу і терміном придатності (TTL).
- Зберігати налаштування інтерфейсу: вибраний фільтр і тему.
- Експортувати дані у файл (`Blob`, `URL.createObjectURL`) та імпортувати їх (`input type="file"`, `file.text()`).
- Завершити наскрізний проєкт «Трекер витрат».

## Що потрібно

- VS Code + Live Server, Chrome з DevTools (вкладка **Application**).
- Проєкт `expense-tracker/` у стані після практичної 13: `fetchJSON`, `loadInitialExpenses`, `loadRates` на `async` / `await`, `init()` з `Promise.allSettled`, кнопка «Оновити курси», `NETWORK_DELAY = 0`.

## Короткі теоретичні відомості

### Де браузер може зберігати дані

| Сховище | Обсяг | Скільки живе | Доступ | Типове застосування |
|---|---|---|---|---|
| `localStorage` | ≈ 5 МБ на джерело | доки користувач або код не видалить | усі вкладки того самого джерела | налаштування, невеликі дані застосунку |
| `sessionStorage` | ≈ 5 МБ | доки відкрита **вкладка** (переживає перезавантаження) | лише ця вкладка | чернетки форм, тимчасовий стан |
| Cookies | ≈ 4 КБ на cookie | до дати закінчення | надсилаються **на сервер** з кожним запитом | сесії, автентифікація |
| IndexedDB | сотні МБ і більше | доки не видалять | асинхронний API, усі вкладки | великі обсяги, файли, офлайн-застосунки |

**Джерело** (origin) — протокол + домен + порт. Дані `http://127.0.0.1:5500` і `http://localhost:5500` — це **різні** сховища, бо домени різні. Сайти не мають доступу до сховищ одне одного.

### API Web Storage

```js
localStorage.setItem('theme', 'dark');   // записати
localStorage.getItem('theme');           // 'dark'
localStorage.getItem('nothing');         // null — ключа немає
localStorage.removeItem('theme');        // видалити один ключ
localStorage.clear();                    // видалити ВСЕ для цього джерела
localStorage.length;                     // кількість ключів
localStorage.key(0);                     // ім'я ключа за індексом
```

`sessionStorage` має точно такий самий набір методів.

Ключові обмеження:

1. **Лише рядки.** `setItem('n', 5)` збереже `'5'`, а `setItem('obj', { a: 1 })` — рядок `'[object Object]'`. Структуровані дані зберігають через `JSON.stringify` і читають через `JSON.parse`.
2. **Синхронний API.** Читання і запис блокують потік, тому великі обсяги тут не зберігають.
3. **Може кинути виняток.** `setItem` кидає `QuotaExceededError` при переповненні; у деяких режимах браузера (заборона cookies і даних сайтів) навіть звернення до `localStorage` кидає `SecurityError`.
4. **Не для секретів.** Будь-який скрипт на сторінці (зокрема шкідливий, якщо є XSS-вразливість) може прочитати сховище. Паролі й токени доступу тут не зберігають.
5. **Дані можуть бути будь-якими.** Користувач може змінити їх у DevTools, стара версія застосунку могла записати інший формат. Прочитане зі сховища — це **зовнішні дані**, їх треба перевіряти так само, як відповідь сервера.

### Ключі з префіксом і версією

Ми використаємо ключі виду `expense-tracker:v1`. Префікс не дає конфліктувати з іншими застосунками на тому самому джерелі (на `127.0.0.1:5500` у вас відкриваються всі навчальні проєкти!), а версія `v1` дозволить у майбутньому змінити формат даних: нова версія застосунку читатиме ключ `v2`, а дані з `v1` за потреби перетворить.

### Подія `storage`

Коли одна вкладка змінює `localStorage`, **інші** вкладки того самого джерела отримують подію `storage` на `window` з полями `key`, `oldValue`, `newValue`. Це дозволяє синхронізувати відкриті вкладки (завдання ★★★).

## Хід роботи

### Крок 1. Знайомство зі сховищем у DevTools

Відкрийте трекер і DevTools → **Application** → **Storage** → **Local Storage** → `http://127.0.0.1:5500`. Поки що там порожньо (або є ключі інших проєктів). Виконайте в консолі і спостерігайте за таблицею:

```js
localStorage.setItem('test', 'привіт');
localStorage.setItem('number', 42);
typeof localStorage.getItem('number');   // 'string'!

localStorage.setItem('object', { a: 1 });
localStorage.getItem('object');          // '[object Object]' — дані втрачено

localStorage.setItem('json', JSON.stringify({ a: 1, list: [1, 2] }));
JSON.parse(localStorage.getItem('json')).list; // [1, 2]

sessionStorage.setItem('tab', 'лише ця вкладка');
```

Відкрийте сторінку в **новій вкладці**: ключі `localStorage` на місці, а `sessionStorage` — порожній. Перезавантажте першу вкладку — її `sessionStorage` зберігся. Приберіть тестові ключі: правою кнопкою по таблиці → **Clear** або `localStorage.removeItem('test')` тощо.

:::caution[Не викликайте localStorage.clear() у коді застосунку]
`clear()` видаляє **всі** ключі джерела — зокрема дані інших ваших проєктів на `127.0.0.1:5500`. Видаляйте лише власні ключі через `removeItem`.
:::

### Крок 2. Ключі сховища і безпечні обгортки

У розділ констант додайте ключі і термін придатності кешу курсів:

```js title="app.js (розділ «Константи», після RATES_URL)"
// Ключі сховища (префікс застосунку + версія формату даних)
const STORAGE_KEY = 'expense-tracker:v1';
const FILTER_KEY = 'expense-tracker:filter';
const THEME_KEY = 'expense-tracker:theme';
const RATES_KEY = 'expense-tracker:rates';
const DRAFT_KEY = 'expense-tracker:draft';

const RATES_TTL = 60 * 60 * 1000; // курси вважаємо свіжими 1 годину
```

`NETWORK_DELAY` залишається з практичної 13 (зі значенням 0).

Створіть новий розділ «Сховище» після допоміжних функцій. Почнемо з двох обгорток, що ізолюють решту коду від винятків сховища:

```js title="app.js (розділ «Сховище»)"
function readStorage(key, storage = localStorage) {
  try {
    return storage.getItem(key);
  } catch {
    return null; // сховище може бути недоступне (заборона cookies, особливі режими)
  }
}

function writeStorage(key, value, storage = localStorage) {
  try {
    storage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Не вдалося записати «${key}»:`, error);
    return false;
  }
}
```

Другий параметр зі значенням за замовчуванням `storage = localStorage` дозволить використати ті самі функції для `sessionStorage` (крок 10). `catch` без змінної (`catch { ... }`) — сучасний синтаксис ES2019 для випадків, коли об'єкт помилки не потрібен.

### Крок 3. Перевірка структури даних

Дані зі сховища і з файлів імпорту можуть бути будь-якими, тому напишемо перевірку однієї витрати і цілого списку:

```js title="app.js (розділ «Сховище»)"
function isValidExpense(item) {
  return (
    item !== null &&
    typeof item === 'object' &&
    Number.isFinite(item.id) &&
    typeof item.title === 'string' &&
    item.title.trim() !== '' &&
    Number.isFinite(item.amount) &&
    item.amount > 0 &&
    CATEGORIES.includes(item.category) &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.date)
  );
}

function isValidExpenseList(data) {
  return Array.isArray(data) && data.every(isValidExpense);
}
```

Перевірка `item !== null` потрібна, бо `typeof null === 'object'`. Регулярний вираз `/^\d{4}-\d{2}-\d{2}$/` перевіряє формат `YYYY-MM-DD`.

Тепер ту саму перевірку застосуємо і до `data/expenses.json` — замініть `loadInitialExpenses`:

```js title="app.js (розділ «Мережа»)" {3}
async function loadInitialExpenses() {
  const data = await fetchJSON(DATA_URL);
  if (!isValidExpenseList(data)) {
    throw new Error('файл даних має містити масив витрат');
  }
  return data;
}
```

Перевірте в консолі:

```js
isValidExpense({ id: 1, title: 'Кава', amount: 60, category: 'Їжа', date: '2026-02-03' }); // true
isValidExpense({ id: 1, title: 'Кава', amount: -5, category: 'Їжа', date: '2026-02-03' }); // false
isValidExpense({ id: '1', title: 'Кава', amount: 60, category: 'Їжа', date: '03.02.2026' }); // false
isValidExpenseList([]); // true — порожній список коректний
```

### Крок 4. Збереження витрат: єдина точка зміни стану

Функція збереження:

```js title="app.js (розділ «Сховище»)"
function saveExpenses() {
  const ok = writeStorage(STORAGE_KEY, JSON.stringify(expenses));
  if (!ok) setStatus('Не вдалося зберегти дані в браузері', 'error');
}
```

Зберігати треба після **кожної** зміни масиву. Щоб не забути виклик у жодному місці, зробимо одну функцію, через яку проходять усі зміни, і перепишемо `addExpense` / `deleteExpense`:

```js title="app.js (розділ «Зміна даних», замініть повністю)"
function setExpenses(next) {
  expenses = next;
  saveExpenses();
  render();
}

function addExpense(data) {
  setExpenses([...expenses, { id: Date.now(), ...data }]);
}

function deleteExpense(id) {
  setExpenses(expenses.filter((expense) => expense.id !== id));
}
```

Тепер будь-яка зміна — додавання, видалення, імпорт (крок 12) — автоматично і зберігається, і перемальовується.

Заодно додамо короткі повідомлення про результат дій. У `handleSubmit` після `resetForm()`:

```js title="app.js (у функції handleSubmit)"
  addExpense(data);
  resetForm();
  setStatus(`Додано: «${data.title}»`, 'success');
```

У `handleListClick` після `deleteExpense(id)`:

```js title="app.js (у функції handleListClick)"
  if (confirm(`Видалити «${expense.title}» (${formatMoney(expense.amount)})?`)) {
    deleteExpense(id);
    setStatus(`Видалено: «${expense.title}»`, 'info');
  }
```

Додайте витрату і подивіться на вкладку **Application**: з'явився ключ `expense-tracker:v1` з масивом у вигляді JSON-рядка (клацніть по ньому — унизу буде розгорнуте дерево).

### Крок 5. Відновлення витрат при запуску

Читання зі сховища повертає три можливі результати, і їх важливо розрізняти:

| Що в сховищі | Що повертає функція | Що робимо |
|---|---|---|
| ключа немає (перший запуск) | `null` | завантажуємо `data/expenses.json` |
| коректний масив (у тому числі `[]`) | масив | використовуємо його |
| пошкоджені дані | `null` + ключ видаляється | завантажуємо `data/expenses.json` |

```js title="app.js (розділ «Сховище»)"
// null — у сховищі нічого немає (або дані пошкоджені); масив — збережені витрати
function loadSavedExpenses() {
  const raw = readStorage(STORAGE_KEY);
  if (raw === null) return null;

  try {
    const data = JSON.parse(raw);
    if (!isValidExpenseList(data)) throw new Error('неправильна структура даних');
    return data;
  } catch (error) {
    console.warn('Дані у сховищі пошкоджені, їх буде скинуто:', error);
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
```

:::danger[Типова помилка: «якщо порожньо — беремо з файлу»]
Спокусливо написати `if (!saved || saved.length === 0) { /* завантажити expenses.json */ }`. Але якщо користувач свідомо видалив усі витрати, у сховищі лежить `[]` — і після перезавантаження «видалені» стартові витрати повернуться. Порожній список — теж дані користувача. Тому `loadSavedExpenses` повертає `null` лише тоді, коли даних немає взагалі, а в `init()` ми використовуємо оператор `??`, що спрацьовує тільки для `null` і `undefined`.
:::

У `init()` замініть запуск завантаження:

```js title="app.js (у функції init)" {1,3}
  const saved = loadSavedExpenses();
  const [expensesResult, ratesResult] = await Promise.allSettled([
    saved ?? loadInitialExpenses(),
    loadRates(), // на кроці 9 замінимо на getRates()
  ]);
```

`Promise.allSettled` приймає не лише проміси: звичайне значення (наш масив) вважається вже виконаним промісом. Якщо витрати є в сховищі, запит до `expenses.json` **не виконується зовсім** — перевірте у вкладці Network.

Перевірте сценарій: додайте дві витрати, видаліть одну зі стартових, перезавантажте сторінку (F5) — зміни на місці. Закрийте вкладку, відкрийте знову — теж на місці. Видаліть ключ `expense-tracker:v1` в Application і перезавантажте — повернулися стартові 8 витрат з файлу.

### Крок 6. Експеримент: пошкоджені дані

У вкладці **Application** двічі клацніть по значенню ключа `expense-tracker:v1` і зіпсуйте JSON (наприклад, зітріть останню `]`). Перезавантажте сторінку:

- у консолі — попередження «Дані у сховищі пошкоджені, їх буде скинуто» з `SyntaxError`;
- ключ видалено, завантажено стартові дані з файлу;
- застосунок працює, а не показує білу сторінку.

Повторіть з коректним JSON, але неправильною структурою, наприклад `[{"id":1,"title":"Кава"}]` (немає суми і дати) — результат той самий, бо спрацьовує `isValidExpenseList`.

### Крок 7. Збереження фільтра

```js title="app.js (розділ «Сховище»)"
function loadFilter() {
  const saved = readStorage(FILTER_KEY);
  return saved === 'all' || CATEGORIES.includes(saved) ? saved : 'all';
}
```

Збережене значення теж перевіряємо: якщо там щось стороннє, повертаємо `'all'`. Оновіть обробник фільтра:

```js title="app.js (розділ «Обробники подій»)" {3}
function handleFilterChange() {
  currentFilter = filterSelect.value;
  writeStorage(FILTER_KEY, currentFilter);
  render();
}
```

А в `init()` одразу після `fillSelects()` (опції фільтра вже мають існувати, інакше присвоєння `value` не спрацює):

```js title="app.js (у функції init)"
  currentFilter = loadFilter();
  filterSelect.value = currentFilter;
```

Виберіть «Транспорт», перезавантажте сторінку — фільтр збережено.

### Крок 8. Світла і темна тема

У шапку `index.html` (після підзаголовка) додайте панель кнопок — тут також одразу розмістимо кнопки експорту й імпорту для кроків 11–12:

```html title="index.html (у header.header)"
<div class="header__actions">
  <button type="button" id="theme-toggle" class="btn btn--light">🌙 Темна тема</button>
  <button type="button" id="export" class="btn btn--light">⬇ Експорт JSON</button>
  <label class="btn btn--light">
    ⬆ Імпорт JSON
    <input type="file" id="import" accept=".json,application/json" hidden>
  </label>
</div>
```

Поле вибору файлу приховане атрибутом `hidden`, а клік по `label`, що його містить, відкриває діалог вибору файлу — так ми отримуємо гарну кнопку замість стандартного поля.

Оскільки всі кольори в `style.css` задано **CSS-змінними** (практична 7), темна тема — це лише перевизначення змінних для `body.dark`. Додайте в кінець `style.css`:

```css title="style.css"
/* ===== Кнопки в шапці (П14) ===== */
.header__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}

.btn--light {
  color: #ffffff;
  background: rgb(255 255 255 / 0.15);
}

.btn--light:hover {
  background: rgb(255 255 255 / 0.3);
}

/* ===== Темна тема (П14): перевизначаємо лише змінні ===== */
body.dark {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-text: #e2e8f0;
  --color-muted: #94a3b8;
  --color-border: #334155;
  --color-primary: #3b82f6;
  --color-primary-hover: #60a5fa;
  --color-danger: #f87171;
  --color-danger-bg: #450a0a;
  --color-accent-bg: #422006;
}

body.dark .header {
  background: #1e3a8a;
}

```

Посилання на нові елементи в розділ «Елементи DOM»:

```js title="app.js"
const themeToggle = document.getElementById('theme-toggle');
const exportBtn = document.getElementById('export');
const importInput = document.getElementById('import');
```

Функції теми — в розділ «Сховище»:

```js title="app.js (розділ «Сховище»)"
function loadTheme() {
  const saved = readStorage(THEME_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark', isDark);
  themeToggle.textContent = isDark ? '☀️ Світла тема' : '🌙 Темна тема';
}
```

Якщо користувач ще не обирав тему, беремо системне налаштування через медіазапит `prefers-color-scheme` — ту саму умову, що й у CSS, але з JavaScript.

Обробник — у розділ «Обробники подій»:

```js title="app.js"
function handleThemeToggle() {
  const nextTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
  applyTheme(nextTheme);
  writeStorage(THEME_KEY, nextTheme);
}
```

У `init()` після `fillSelects()` додайте `applyTheme(loadTheme());`, а серед реєстрації обробників — `themeToggle.addEventListener('click', handleThemeToggle);`.

:::note[Миготіння теми]
Скрипт з `defer` виконується після розбору HTML, тому при темній темі сторінка на мить може з'явитися світлою. У реальних проєктах це розв'язують маленьким синхронним скриптом у `<head>`, який лише встановлює клас теми, ще до відображення сторінки. Для навчального проєкту це не критично.
:::

### Крок 9. Кеш курсів валют на годину

Курси НБУ змінюються раз на день, тож запитувати їх при кожному перезавантаженні сторінки немає сенсу. Зберігатимемо їх разом із міткою часу і вважатимемо свіжими протягом `RATES_TTL` (1 година):

```js title="app.js (розділ «Сховище»)"
function loadRatesCache() {
  const raw = readStorage(RATES_KEY);
  if (raw === null) return null;

  try {
    const { savedAt, rates: cached } = JSON.parse(raw);
    const isFresh = Date.now() - savedAt < RATES_TTL;
    const isValid = Number.isFinite(cached?.USD) && Number.isFinite(cached?.EUR);
    return isFresh && isValid ? cached : null;
  } catch {
    return null;
  }
}

function saveRatesCache(value) {
  writeStorage(RATES_KEY, JSON.stringify({ savedAt: Date.now(), rates: value }));
}
```

У сховищі запис виглядає так: `{"savedAt":1771000000000,"rates":{"USD":41.23,"EUR":44.87,"date":"13.02.2026"}}`. `Date.now()` — поточний час у мілісекундах, тож різниця `Date.now() - savedAt` — вік кешу. Оператор `?.` захищає від запису без поля `rates`.

Функція, що поєднує кеш і мережу, — у розділ «Мережа» після `loadRates`:

```js title="app.js (розділ «Мережа»)"
// Курси з кешу (якщо свіжі) або з мережі; force — завжди з мережі
async function getRates({ force = false } = {}) {
  if (!force) {
    const cached = loadRatesCache();
    if (cached) return cached;
  }
  const fresh = await loadRates();
  saveRatesCache(fresh);
  return fresh;
}
```

Параметр — об'єкт з деструктуризацією і значенням за замовчуванням: можна викликати і `getRates()`, і `getRates({ force: true })`.

Замініть у `init()` `loadRates()` на `getRates()`, а в `handleRefreshRates` — на `getRates({ force: true })` (кнопка «Оновити» має завжди звертатися до мережі):

```js title="app.js (у функції handleRefreshRates)"
    rates = await getRates({ force: true });
```

Перевірте у вкладці **Network**: перше завантаження сторінки — запит до `bank.gov.ua`; наступні перезавантаження — запиту немає, курси показуються миттєво. Клік «Оновити курси» — запит виконується і мітка часу в кеші оновлюється. Щоб перевірити закінчення терміну, тимчасово встановіть `RATES_TTL = 10 * 1000` (10 секунд).

### Крок 10. sessionStorage: чернетка форми

Користувач почав вводити витрату, випадково натиснув F5 — і все введене зникло. Збережемо чернетку форми в `sessionStorage`: вона переживе перезавантаження, але не «прилипне» назавжди — після закриття вкладки зникне.

```js title="app.js (розділ «Сховище»)"
function saveDraft() {
  const draft = {
    title: titleInput.value,
    amount: amountInput.value,
    category: categorySelect.value,
    date: dateInput.value,
  };
  writeStorage(DRAFT_KEY, JSON.stringify(draft), sessionStorage);
}

function restoreDraft() {
  const raw = readStorage(DRAFT_KEY, sessionStorage);
  if (raw === null) return;

  try {
    const draft = JSON.parse(raw);
    titleInput.value = draft.title ?? '';
    amountInput.value = draft.amount ?? '';
    if (CATEGORIES.includes(draft.category)) categorySelect.value = draft.category;
    if (draft.date) dateInput.value = draft.date;
  } catch {
    sessionStorage.removeItem(DRAFT_KEY);
  }
}
```

Зберігаємо чернетку при кожній зміні полів — у вже наявному делегованому обробнику `input` форми:

```js title="app.js (розділ «Обробники подій»)" {5}
function handleFormInput(event) {
  if (event.target.classList.contains('is-invalid')) {
    showFieldError(event.target);
  }
  saveDraft();
}
```

Після успішного додавання чернетку видаляємо — у `resetForm`:

```js title="app.js (розділ «Форма»)" {5}
function resetForm() {
  form.reset();
  showErrors({});
  dateInput.value = todayISO();
  sessionStorage.removeItem(DRAFT_KEY);
  titleInput.focus();
}
```

І відновлюємо в `init()` після встановлення сьогоднішньої дати (щоб дата з чернетки мала пріоритет): `restoreDraft();`.

Перевірте: введіть назву і суму, перезавантажте сторінку — значення на місці. Відкрийте сторінку в новій вкладці — там форма порожня: `sessionStorage` у кожної вкладки свій.

| | `localStorage` | `sessionStorage` |
|---|---|---|
| Витрати, фільтр, тема, кеш курсів | ✓ мають жити між сеансами | ✗ |
| Чернетка форми | ✗ «вічна» чернетка заважала б | ✓ переживає F5, зникає з вкладкою |

### Крок 11. Експорт витрат у файл

Дані в `localStorage` прив'язані до браузера: очищення даних сайту — і все втрачено. Дамо користувачеві змогу зберегти резервну копію у файл.

```js title="app.js (розділ «Обробники подій»)"
function handleExport() {
  const json = JSON.stringify(expenses, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `expenses-${todayISO()}.json`;
  document.body.append(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}
```

Як це працює:

1. `JSON.stringify(expenses, null, 2)` — гарно відформатований текст.
2. `Blob` (Binary Large Object) — «файл у пам'яті» з вмістом і MIME-типом.
3. `URL.createObjectURL(blob)` створює тимчасову адресу виду `blob:http://127.0.0.1:5500/...`, що вказує на цей вміст.
4. Тимчасове посилання з атрибутом `download` і програмний `click()` запускають завантаження файлу з указаною назвою.
5. `URL.revokeObjectURL(url)` звільняє пам'ять, коли адреса більше не потрібна.

Зареєструйте обробник у `init()`: `exportBtn.addEventListener('click', handleExport);`. Натисніть «Експорт JSON» — у папці завантажень з'явиться файл `expenses-2026-…json`. Відкрийте його в VS Code.

### Крок 12. Імпорт витрат з файлу

```js title="app.js (розділ «Обробники подій»)"
async function handleImport() {
  const [file] = importInput.files;
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!isValidExpenseList(data)) {
      throw new Error('файл не містить коректного списку витрат');
    }
    if (!confirm(`Замінити поточні витрати (${expenses.length}) на витрати з файлу (${data.length})?`)) {
      return;
    }
    setExpenses(data);
    setStatus(`Імпортовано витрат: ${data.length}`, 'success');
  } catch (error) {
    const reason = error instanceof SyntaxError ? 'файл не є коректним JSON' : error.message;
    setStatus(`Помилка імпорту: ${reason}`, 'error');
  } finally {
    importInput.value = ''; // щоб можна було вибрати той самий файл ще раз
  }
}
```

Ключові моменти:

- `importInput.files` — колекція вибраних файлів; деструктуризація `const [file] = ...` бере перший.
- `file.text()` — сучасний метод, що повертає **проміс** з текстом файлу (старіший спосіб — `FileReader` з подією `load`).
- Помилки трьох видів (не JSON, неправильна структура, відмова користувача) обробляються в одному місці. `error instanceof SyntaxError` відрізняє помилку розбору JSON.
- `return` усередині `try` все одно виконує `finally`. Очищення `importInput.value` потрібне, бо інакше повторний вибір **того самого** файлу не згенерує подію `change`.
- Імпорт проходить через `setExpenses` — дані одразу зберігаються і перемальовуються.

Зареєструйте: `importInput.addEventListener('change', handleImport);`. Перевірте: експортуйте витрати, видаліть кілька, імпортуйте файл назад — витрати відновлено. Спробуйте імпортувати будь-який інший файл (наприклад, `style.css`) — «Помилка імпорту: файл не є коректним JSON».

### Крок 13. Підсумкова перевірка

| № | Сценарій | Очікуваний результат |
|---|---|---|
| 1 | Перший запуск (сховище порожнє) | 8 витрат з `expenses.json`, курси з НБУ |
| 2 | Додати витрату, F5 | витрата на місці, повідомлення «Додано» перед F5 |
| 3 | Видалити всі витрати, F5 | «Витрат поки немає» (не повертаються стартові!) |
| 4 | Фільтр «Їжа» + темна тема, закрити й відкрити вкладку | фільтр і тема збережені |
| 5 | Повторне завантаження протягом години | запиту до НБУ немає (Network) |
| 6 | «Оновити курси» | запит до НБУ, повідомлення «Курси валют оновлено» |
| 7 | Пошкодити `expense-tracker:v1`, F5 | попередження в консолі, стартові дані |
| 8 | Почати вводити витрату, F5 | чернетка відновлена; у новій вкладці — порожня форма |
| 9 | Експорт → видалити витрати → імпорт | витрати відновлено |
| 10 | Імпорт некоректного файлу | повідомлення про помилку, дані не змінилися |

### Крок 14. Фінальна версія проєкту

Повний `index.html` після всіх практичних модуля:

```html title="index.html"
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
    <div class="header__actions">
      <button type="button" id="theme-toggle" class="btn btn--light">🌙 Темна тема</button>
      <button type="button" id="export" class="btn btn--light">⬇ Експорт JSON</button>
      <label class="btn btn--light">
        ⬆ Імпорт JSON
        <input type="file" id="import" accept=".json,application/json" hidden>
      </label>
    </div>
  </header>

  <main class="container">
    <p id="status" class="status" role="status" aria-live="polite"></p>

    <!-- Форма додавання витрати -->
    <section class="card">
      <h2>Нова витрата</h2>
      <form id="expense-form" class="form" novalidate>
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
        <div class="sort" id="sort" role="group" aria-label="Сортування">
          <button type="button" class="btn btn--ghost" data-sort="date-desc">Дата ↓</button>
          <button type="button" class="btn btn--ghost" data-sort="date-asc">Дата ↑</button>
          <button type="button" class="btn btn--ghost" data-sort="amount-desc">Сума ↓</button>
          <button type="button" class="btn btn--ghost" data-sort="amount-asc">Сума ↑</button>
        </div>
        <p id="total" class="total">Разом: 0,00 грн</p>
      </div>

      <div class="rates-panel">
        <div id="rates" class="rates"></div>
        <button type="button" id="refresh-rates" class="btn btn--ghost">↻ Оновити курси</button>
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

До `style.css` за модуль додано блоки стилів з практичних 8, 10, 11, 13 і 14 (у кінці файлу, кожен з коментарем-заголовком). Структура проєкту:

```text
expense-tracker/
├── data/
│   └── expenses.json
├── index.html
├── style.css
└── app.js
```

Фінальний `app.js`:

```js title="app.js"
'use strict';

// ===== Константи =====
const CATEGORIES = ['Їжа', 'Транспорт', 'Розваги', 'Навчання', 'Комунальні', 'Інше'];

// Витрата від цієї суми вважається «великою» і підсвічується, грн
const BIG_EXPENSE = 500;

const DATA_URL = 'data/expenses.json';
const RATES_URL = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json';

// Ключі сховища (префікс застосунку + версія формату даних)
const STORAGE_KEY = 'expense-tracker:v1';
const FILTER_KEY = 'expense-tracker:filter';
const THEME_KEY = 'expense-tracker:theme';
const RATES_KEY = 'expense-tracker:rates';
const DRAFT_KEY = 'expense-tracker:draft';

const RATES_TTL = 60 * 60 * 1000; // курси вважаємо свіжими 1 годину
const NETWORK_DELAY = 0; // штучна затримка мережі, мс (для експериментів)

// ===== Стан застосунку =====
let expenses = [];
let currentFilter = 'all';
let currentSort = 'date-desc';
let rates = null; // { USD: number, EUR: number, date: string }

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
const ratesEl = document.getElementById('rates');
const statusEl = document.getElementById('status');
const refreshRatesBtn = document.getElementById('refresh-rates');
const themeToggle = document.getElementById('theme-toggle');
const exportBtn = document.getElementById('export');
const importInput = document.getElementById('import');

const formFields = [titleInput, amountInput, categorySelect, dateInput];

// ===== Допоміжні функції =====
// 1234.5 → '1 234,50 грн'; formatMoney(10, 'USD') → '10,00 USD'
function formatMoney(amount, currency = 'UAH') {
  return amount.toLocaleString('uk-UA', { style: 'currency', currency });
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

// Проміс, що виконується через ms мілісекунд
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Повідомлення про стан: type — 'loading' | 'error' | 'success' | 'info'
function setStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = message ? `status status--${type}` : 'status';
}

// ===== Сховище =====
function readStorage(key, storage = localStorage) {
  try {
    return storage.getItem(key);
  } catch {
    return null; // сховище може бути недоступне (заборона cookies, особливі режими)
  }
}

function writeStorage(key, value, storage = localStorage) {
  try {
    storage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Не вдалося записати «${key}»:`, error);
    return false;
  }
}

function isValidExpense(item) {
  return (
    item !== null &&
    typeof item === 'object' &&
    Number.isFinite(item.id) &&
    typeof item.title === 'string' &&
    item.title.trim() !== '' &&
    Number.isFinite(item.amount) &&
    item.amount > 0 &&
    CATEGORIES.includes(item.category) &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.date)
  );
}

function isValidExpenseList(data) {
  return Array.isArray(data) && data.every(isValidExpense);
}

// null — у сховищі нічого немає (або дані пошкоджені); масив — збережені витрати
function loadSavedExpenses() {
  const raw = readStorage(STORAGE_KEY);
  if (raw === null) return null;

  try {
    const data = JSON.parse(raw);
    if (!isValidExpenseList(data)) throw new Error('неправильна структура даних');
    return data;
  } catch (error) {
    console.warn('Дані у сховищі пошкоджені, їх буде скинуто:', error);
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function saveExpenses() {
  const ok = writeStorage(STORAGE_KEY, JSON.stringify(expenses));
  if (!ok) setStatus('Не вдалося зберегти дані в браузері', 'error');
}

function loadFilter() {
  const saved = readStorage(FILTER_KEY);
  return saved === 'all' || CATEGORIES.includes(saved) ? saved : 'all';
}

function loadTheme() {
  const saved = readStorage(THEME_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark', isDark);
  themeToggle.textContent = isDark ? '☀️ Світла тема' : '🌙 Темна тема';
}

function loadRatesCache() {
  const raw = readStorage(RATES_KEY);
  if (raw === null) return null;

  try {
    const { savedAt, rates: cached } = JSON.parse(raw);
    const isFresh = Date.now() - savedAt < RATES_TTL;
    const isValid = Number.isFinite(cached?.USD) && Number.isFinite(cached?.EUR);
    return isFresh && isValid ? cached : null;
  } catch {
    return null;
  }
}

function saveRatesCache(value) {
  writeStorage(RATES_KEY, JSON.stringify({ savedAt: Date.now(), rates: value }));
}

function saveDraft() {
  const draft = {
    title: titleInput.value,
    amount: amountInput.value,
    category: categorySelect.value,
    date: dateInput.value,
  };
  writeStorage(DRAFT_KEY, JSON.stringify(draft), sessionStorage);
}

function restoreDraft() {
  const raw = readStorage(DRAFT_KEY, sessionStorage);
  if (raw === null) return;

  try {
    const draft = JSON.parse(raw);
    titleInput.value = draft.title ?? '';
    amountInput.value = draft.amount ?? '';
    if (CATEGORIES.includes(draft.category)) categorySelect.value = draft.category;
    if (draft.date) dateInput.value = draft.date;
  } catch {
    sessionStorage.removeItem(DRAFT_KEY);
  }
}

// ===== Мережа =====
async function fetchJSON(url) {
  await delay(NETWORK_DELAY);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function loadInitialExpenses() {
  const data = await fetchJSON(DATA_URL);
  if (!isValidExpenseList(data)) {
    throw new Error('файл даних має містити масив витрат');
  }
  return data;
}

// З масиву НБУ дістаємо лише потрібні курси
function parseRates(data) {
  const usd = data.find((item) => item.cc === 'USD');
  const eur = data.find((item) => item.cc === 'EUR');
  if (!usd || !eur) throw new Error('у відповіді НБУ немає USD або EUR');
  return { USD: usd.rate, EUR: eur.rate, date: usd.exchangedate };
}

async function loadRates() {
  const data = await fetchJSON(RATES_URL);
  return parseRates(data);
}

// Курси з кешу (якщо свіжі) або з мережі; force — завжди з мережі
async function getRates({ force = false } = {}) {
  if (!force) {
    const cached = loadRatesCache();
    if (cached) return cached;
  }
  const fresh = await loadRates();
  saveRatesCache(fresh);
  return fresh;
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
function setExpenses(next) {
  expenses = next;
  saveExpenses();
  render();
}

function addExpense(data) {
  setExpenses([...expenses, { id: Date.now(), ...data }]);
}

function deleteExpense(id) {
  setExpenses(expenses.filter((expense) => expense.id !== id));
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

function renderRates(totalUah) {
  if (!rates) {
    ratesEl.textContent = 'Курси валют: немає даних';
    return;
  }

  const sums = document.createElement('p');
  sums.className = 'rates__sums';
  sums.textContent =
    `≈ ${formatMoney(totalUah / rates.USD, 'USD')} · ` +
    `≈ ${formatMoney(totalUah / rates.EUR, 'EUR')}`;

  const info = document.createElement('p');
  info.className = 'rates__info';
  info.textContent =
    `Курс НБУ на ${rates.date}: 1 USD = ${rates.USD.toFixed(2)} грн, ` +
    `1 EUR = ${rates.EUR.toFixed(2)} грн`;

  ratesEl.replaceChildren(sums, info);
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
  renderRates(getTotal(visible));
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
  sessionStorage.removeItem(DRAFT_KEY);
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
  setStatus(`Додано: «${data.title}»`, 'success');
}

function handleFormInput(event) {
  if (event.target.classList.contains('is-invalid')) {
    showFieldError(event.target);
  }
  saveDraft();
}

function handleListClick(event) {
  const button = event.target.closest('button.delete');
  if (!button) return;

  const id = Number(button.closest('li.expense').dataset.id);
  const expense = findExpense(id);
  if (!expense) return;

  if (confirm(`Видалити «${expense.title}» (${formatMoney(expense.amount)})?`)) {
    deleteExpense(id);
    setStatus(`Видалено: «${expense.title}»`, 'info');
  }
}

function handleFilterChange() {
  currentFilter = filterSelect.value;
  writeStorage(FILTER_KEY, currentFilter);
  render();
}

function handleSortClick(event) {
  const button = event.target.closest('[data-sort]');
  if (!button) return;
  currentSort = button.dataset.sort;
  render();
}

function handleThemeToggle() {
  const nextTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
  applyTheme(nextTheme);
  writeStorage(THEME_KEY, nextTheme);
}

async function handleRefreshRates() {
  refreshRatesBtn.disabled = true;
  ratesEl.textContent = 'Оновлення курсів…';
  try {
    rates = await getRates({ force: true });
    setStatus('Курси валют оновлено', 'success');
  } catch (error) {
    console.error(error);
    setStatus(`Не вдалося оновити курси: ${error.message}`, 'error');
  } finally {
    refreshRatesBtn.disabled = false;
    render();
  }
}

function handleExport() {
  const json = JSON.stringify(expenses, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `expenses-${todayISO()}.json`;
  document.body.append(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

async function handleImport() {
  const [file] = importInput.files;
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!isValidExpenseList(data)) {
      throw new Error('файл не містить коректного списку витрат');
    }
    if (!confirm(`Замінити поточні витрати (${expenses.length}) на витрати з файлу (${data.length})?`)) {
      return;
    }
    setExpenses(data);
    setStatus(`Імпортовано витрат: ${data.length}`, 'success');
  } catch (error) {
    const reason = error instanceof SyntaxError ? 'файл не є коректним JSON' : error.message;
    setStatus(`Помилка імпорту: ${reason}`, 'error');
  } finally {
    importInput.value = ''; // щоб можна було вибрати той самий файл ще раз
  }
}

// ===== Ініціалізація =====
async function init() {
  fillSelects();
  applyTheme(loadTheme());

  currentFilter = loadFilter();
  filterSelect.value = currentFilter;
  dateInput.value = todayISO();
  restoreDraft();

  form.addEventListener('submit', handleSubmit);
  form.addEventListener('input', handleFormInput);
  listEl.addEventListener('click', handleListClick);
  filterSelect.addEventListener('change', handleFilterChange);
  sortControls.addEventListener('click', handleSortClick);
  themeToggle.addEventListener('click', handleThemeToggle);
  refreshRatesBtn.addEventListener('click', handleRefreshRates);
  exportBtn.addEventListener('click', handleExport);
  importInput.addEventListener('change', handleImport);

  render();
  setStatus('Завантаження…', 'loading');

  const saved = loadSavedExpenses();
  const [expensesResult, ratesResult] = await Promise.allSettled([
    saved ?? loadInitialExpenses(),
    getRates(),
  ]);

  const problems = [];

  if (expensesResult.status === 'fulfilled') {
    expenses = expensesResult.value;
  } else {
    console.error(expensesResult.reason);
    problems.push(`Не вдалося завантажити витрати: ${expensesResult.reason.message}.`);
  }

  if (ratesResult.status === 'fulfilled') {
    rates = ratesResult.value;
  } else {
    console.error(ratesResult.reason);
    problems.push(`Курси валют недоступні: ${ratesResult.reason.message}.`);
  }

  setStatus(problems.join(' '), problems.length > 0 ? 'error' : 'info');
  render();
}

init();
```

**Результат роботи:** «Трекер витрат» — завершений застосунок без фреймворків: додавання з валідацією, видалення, фільтр, сортування, статистика, суми у валютах за курсом НБУ з кешуванням, збереження всіх даних і налаштувань між сеансами, чернетка форми, експорт та імпорт. Дані користувача не губляться ні після перезавантаження, ні при пошкодженні сховища.

## Завдання для самостійного виконання

1. ★ Збережіть у `localStorage` також вибране сортування (`currentSort`) з перевіркою допустимих значень при читанні.
2. ★ Додайте кнопку «Скинути дані», яка після підтвердження видаляє **лише** ключі трекера (усі, що починаються з `expense-tracker:`) і перезавантажує сторінку (`location.reload()`). Підказка: перебір ключів через `Object.keys(localStorage)`.
3. ★★ Покажіть у підвалі сторінки, скільки місця займають дані трекера: сума довжин рядків-значень його ключів, переведена в кілобайти. Чому це наближена оцінка?
4. ★★ Імпорт у режимі «додати»: замість заміни запропонуйте об'єднати списки, пропустивши витрати з `id`, які вже є (використайте `Set` з наявних `id`). Виведіть «Додано 5, пропущено 3 дублікати».
5. ★★★ Синхронізація вкладок: обробіть подію `storage` на `window`. Якщо в іншій вкладці змінився ключ `STORAGE_KEY`, перечитайте витрати й перемалюйте; якщо `THEME_KEY` — застосуйте тему. Перевірте з двома відкритими вкладками.
6. ★★★ Міграція формату: уявіть, що у версії `v2` витрата отримує поле `currency` (за замовчуванням `'UAH'`). Напишіть функцію `migrate()`, яка при запуску переносить дані з ключа `expense-tracker:v1` у `expense-tracker:v2`, додаючи поле, і видаляє старий ключ.

## Контрольні питання

1. Чим `localStorage` відрізняється від `sessionStorage`? Наведіть приклад даних для кожного.
2. Чому в `localStorage` не можна напряму зберегти об'єкт? Що буде, якщо спробувати?
3. Що повертає `getItem` для неіснуючого ключа? Чому важливо відрізняти `null` від порожнього масиву?
4. Які винятки можуть виникнути під час роботи зі сховищем і як ми від них захистилися?
5. Чому дані зі сховища треба перевіряти так само, як відповідь сервера?
6. Навіщо ключам префікс `expense-tracker:` і версія `v1`?
7. Як працює кешування курсів? Що таке TTL і де він перевіряється?
8. Як реалізовано темну тему і чому CSS-змінні роблять це простим?
9. Опишіть кроки експорту даних у файл. Навіщо `URL.revokeObjectURL`?
10. Чому після імпорту потрібно очищати `importInput.value`?

## Домашнє завдання

1. Пройдіть усі 10 сценаріїв з кроку 13 і позначте результати у звіті.
2. Виконайте завдання ★ 1.
3. Підготуйте проєкт до захисту: приберіть зайві `console.log`, перевірте відступи, завантажте проєкт на GitHub і (за бажанням) опублікуйте через GitHub Pages — `fetch` до `data/expenses.json` там працюватиме, бо сторінку віддає вебсервер.

## Що здати

- Посилання на репозиторій (або архів) фінальної версії `expense-tracker/` з усіма файлами.
- Скриншоти: трекер у світлій і темній темі; вкладка **Application** з ключами `expense-tracker:*` у Local Storage і Session Storage; вкладка **Network** при повторному завантаженні без запиту до НБУ.
- Експортований файл `expenses-….json`.
- Таблицю сценаріїв з кроку 13 з позначками і відповіді на контрольні питання.
