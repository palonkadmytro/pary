---
title: "Робота з Fetch API та JSON"
description: "Формат JSON, методи JSON.parse і JSON.stringify, перші мережеві запити через fetch: завантажуємо початкові витрати з файлу data/expenses.json і курси валют НБУ, обробляємо помилки та показуємо стан завантаження."
type: practice
pair: 11
topic: 53
---

## Мета роботи

- Засвоїти синтаксис JSON і відмінності JSON від об'єктів JavaScript.
- Навчитися перетворювати дані методами `JSON.stringify` і `JSON.parse` та обробляти помилки розбору.
- Зрозуміти базову модель HTTP-запиту і відповіді, коди стану, роль CORS.
- Отримати перше уявлення про проміси (Promise) і ланцюжки `then` / `catch` / `finally`.
- Виконувати GET-запити за допомогою `fetch`, перевіряти `response.ok`, обробляти мережеві помилки.
- Перевести «Трекер витрат» на завантаження даних з `data/expenses.json` і показати загальну суму в доларах та євро за курсом НБУ.

## Що потрібно

- VS Code + **Live Server** (обов'язково — див. крок 2), Chrome з DevTools (вкладки **Console** і **Network**).
- Проєкт `expense-tracker/` у стані після практичної 10: стан `expenses` / `currentFilter` / `currentSort`, функція `render()`, обробники форми, списку, фільтра й сортування, функція `init()`.
- Доступ до інтернету (API Національного банку України).

## Короткі теоретичні відомості

### JSON

**JSON** (JavaScript Object Notation) — текстовий формат обміну даними. Його синтаксис запозичено з літералів об'єктів JavaScript, але правила суворіші:

| | Об'єкт JavaScript | JSON |
|---|---|---|
| Ключі | можна без лапок: `{ id: 1 }` | **лише в подвійних лапках**: `{ "id": 1 }` |
| Рядки | `'...'`, `"..."`, `` `...` `` | лише `"..."` |
| Типи значень | будь-які: функції, `undefined`, `Date`, `Map`, `NaN`... | рядок, число, `true`/`false`, `null`, об'єкт, масив |
| Кома після останнього елемента | дозволена | **заборонена** |
| Коментарі | є | **немає** |

Два методи глобального об'єкта `JSON`:

```js
const expense = { id: 1, title: 'Кава', amount: 60, tags: ['ранок'] };

// Об'єкт → рядок (серіалізація)
JSON.stringify(expense);
// '{"id":1,"title":"Кава","amount":60,"tags":["ранок"]}'

JSON.stringify(expense, null, 2); // з відступами по 2 пробіли — для людей і файлів

// Рядок → об'єкт (десеріалізація, розбір)
const copy = JSON.parse('{"id":1,"title":"Кава","amount":60}');
copy.title; // 'Кава'
```

Що втрачається при `JSON.stringify`:

- властивості зі значенням `undefined` і функції — **пропускаються**;
- `NaN` і `Infinity` перетворюються на `null`;
- `Date` стає рядком (`"2026-02-03T00:00:00.000Z"`), а після `parse` залишається рядком, а не датою.

Тому в нашій моделі дата зберігається як рядок `'YYYY-MM-DD'` — він однаково виглядає і в JS, і в JSON.

### HTTP-запит і відповідь

Коли браузер звертається до сервера, він надсилає **запит** (request): метод (`GET`, `POST`, `PUT`, `DELETE`...), адресу (URL), заголовки (headers) і, можливо, тіло (body). Сервер повертає **відповідь** (response): код стану (status code), заголовки і тіло.

| Код | Значення | Приклад |
|---|---|---|
| `200 OK` | успіх | файл знайдено, дані повернуто |
| `201 Created` | ресурс створено | після `POST` |
| `304 Not Modified` | можна взяти з кешу | повторне завантаження файлу |
| `400 Bad Request` | неправильний запит | невалідні параметри |
| `401` / `403` | не автентифіковано / заборонено | потрібен вхід або немає прав |
| `404 Not Found` | ресурс не знайдено | помилка в шляху до файлу |
| `500` / `503` | помилка сервера / сервіс недоступний | збій на боці сервера |

Коди 2xx — успіх, 3xx — перенаправлення, 4xx — помилка клієнта, 5xx — помилка сервера.

**CORS** (Cross-Origin Resource Sharing). Скрипт зі сторінки `http://127.0.0.1:5500` може без обмежень читати відповіді лише з того самого **джерела** (origin: протокол + домен + порт). Щоб прочитати відповідь іншого сайту (наприклад, `bank.gov.ua`), сервер має явно дозволити це заголовком `Access-Control-Allow-Origin`. API НБУ такий дозвіл дає, тому ми можемо звертатися до нього прямо з браузера. Багато інших API — ні, і тоді в консолі з'являється помилка CORS.

### Проміс — коротко

Запит до мережі триває невідомий час — від мілісекунд до хвилин. Блокувати сторінку на цей час не можна, тому `fetch` не повертає дані одразу. Він повертає **проміс** (Promise) — об'єкт-«обіцянку» отримати результат пізніше.

Проміс перебуває в одному з трьох станів:

```text
                      ┌──► fulfilled (виконано) ── результат ──► .then(fn)
 pending (очікування) ┤
                      └──► rejected (відхилено) ── помилка ────► .catch(fn)
                                         обидва випадки ───────► .finally(fn)
```

```js
fetch('data/expenses.json')
  .then((response) => response.json()) // then повертає НОВИЙ проміс — можна продовжувати ланцюжок
  .then((data) => console.log(data))   // сюди прийде результат попереднього then
  .catch((error) => console.error(error)) // сюди «провалиться» помилка з будь-якого кроку вище
  .finally(() => console.log('Готово'));  // виконається в будь-якому разі
```

Ключові правила ланцюжка:

1. Те, що **повертає** колбек `then`, стає результатом для наступного `then`. Якщо повернути проміс — наступний `then` дочекається його.
2. Якщо в колбеку виникає помилка (або ми робимо `throw`), ланцюжок перескакує до найближчого `catch`.
3. Код після ланцюжка виконується **одразу**, не чекаючи відповіді.

Детально проміси, `async`/`await` і цикл подій ми розберемо на лекції 12, а на практичній 13 перепишемо сьогоднішній код у сучасному стилі `async`/`await`. Сьогодні достатньо цих трьох правил.

### Як працює `fetch`

```js
fetch(url)                       // 1. проміс об'єкта Response (лише заголовки!)
  .then((response) => {
    response.ok;                 // true для кодів 200–299
    response.status;             // 200, 404, 500...
    response.headers.get('Content-Type');
    return response.json();      // 2. ще один проміс: читання тіла і JSON.parse
  });
```

:::danger[fetch не вважає 404 і 500 помилкою]
Проміс `fetch` відхиляється **лише** при мережевій помилці (немає інтернету, DNS, CORS, обрив з'єднання). Відповідь `404 Not Found` чи `500` — це успішно отримана відповідь, і `then` виконається! Тому завжди перевіряйте `response.ok` і самі генеруйте помилку: `if (!response.ok) throw new Error(...)`.
:::

## Хід роботи

### Крок 1. JSON у консолі

Відкрийте трекер, у консолі виконайте:

```js
const json = JSON.stringify(expenses, null, 2);
console.log(json);          // гарно відформатований текст
typeof json;                // 'string'

const restored = JSON.parse(json);
restored[0].title;          // назва першої витрати
restored === expenses;      // false — це нові об'єкти (глибока копія)

JSON.stringify({ a: undefined, f() {}, n: NaN, d: new Date(2026, 1, 3) });
// '{"n":null,"d":"2026-02-02T22:00:00.000Z"}' (для часового поясу Києва)
// a і f зникли, NaN став null, дата стала рядком у UTC
```

Тепер навмисно зламайте JSON:

```js
JSON.parse("{ 'title': 'Кава' }");  // SyntaxError: одинарні лапки
JSON.parse('{ "title": "Кава", }'); // SyntaxError: кома в кінці
JSON.parse('');                      // SyntaxError: порожній рядок
```

`JSON.parse` **кидає виняток** при некоректних даних. Якщо дані прийшли ззовні (файл, сервер, сховище), розбір обгортають у `try...catch`:

```js
function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn('Некоректний JSON:', error.message);
    return null;
  }
}
safeParse('{ bad json }'); // null і попередження в консолі
```

### Крок 2. Файл з початковими даними

Створіть у проєкті папку `data` і файл `data/expenses.json`. Ми переносимо сюди масив з `app.js` і додаємо дві витрати:

```json title="data/expenses.json"
[
  { "id": 1, "title": "Продукти в АТБ", "amount": 845.5, "category": "Їжа", "date": "2026-02-03" },
  { "id": 2, "title": "Проїзний на місяць", "amount": 480, "category": "Транспорт", "date": "2026-02-01" },
  { "id": 3, "title": "Кіно «Дюна»", "amount": 250, "category": "Розваги", "date": "2026-02-07" },
  { "id": 4, "title": "Курс англійської", "amount": 1200, "category": "Навчання", "date": "2026-02-05" },
  { "id": 5, "title": "Інтернет", "amount": 300, "category": "Комунальні", "date": "2026-02-10" },
  { "id": 6, "title": "Кава з друзями", "amount": 160, "category": "Їжа", "date": "2026-02-08" },
  { "id": 7, "title": "Таксі додому", "amount": 210, "category": "Транспорт", "date": "2026-02-12" },
  { "id": 8, "title": "Електроенергія", "amount": 640.8, "category": "Комунальні", "date": "2026-02-14" }
]
```

Структура проєкту:

```text
expense-tracker/
├── data/
│   └── expenses.json
├── index.html
├── style.css
└── app.js
```

:::caution[Відкривайте проєкт лише через Live Server]
Якщо відкрити `index.html` подвійним кліком, адреса починатиметься з `file:///`. З такої сторінки браузер з міркувань безпеки **не дозволяє** `fetch` до локальних файлів — у консолі буде помилка `Failed to fetch` або повідомлення про CORS. Live Server запускає локальний вебсервер (`http://127.0.0.1:5500`), і запити працюють так само, як на справжньому сайті.
:::

### Крок 3. Перший запит з консолі

Переконайтеся, що сторінку відкрито через Live Server, і виконайте в консолі:

```js
fetch('data/expenses.json')
  .then((response) => {
    console.log('Статус:', response.status, response.ok);
    console.log('Тип:', response.headers.get('Content-Type'));
    return response.json();
  })
  .then((data) => console.table(data));

console.log('Цей рядок виведеться ПЕРШИМ');
```

Зверніть увагу на порядок виведення: рядок після `fetch` з'являється раніше за статус — запит виконується асинхронно.

Відкрийте вкладку **Network**, перезавантажте сторінку і виконайте запит знову. Клацніть рядок `expenses.json`:

- **Headers** — метод `GET`, адреса, код стану `200`, заголовки відповіді;
- **Response** — сирий текст відповіді;
- **Preview** — розібраний JSON у вигляді дерева;
- **Timing** — скільки часу зайняв запит.

Спробуйте запит до неіснуючого файлу:

```js
fetch('data/nope.json').then((r) => console.log(r.status, r.ok)); // 404 false — і жодної помилки!
```

### Крок 4. Розмітка для стану і курсів

Додайте в `index.html` абзац для повідомлень про стан — першим елементом усередині `main.container`, перед карткою форми:

```html title="index.html" {2}
<main class="container">
  <p id="status" class="status" role="status" aria-live="polite"></p>

  <!-- Форма додавання витрати -->
  <section class="card">
```

Атрибути `role="status"` і `aria-live="polite"` змушують програми екранного доступу зачитувати зміну тексту.

У картці зі списком одразу після `div.toolbar` (перед `section#stats`) додайте блок курсів:

```html title="index.html"
<div class="rates-panel">
  <div id="rates" class="rates"></div>
</div>
```

Обгортка `div.rates-panel` знадобиться на практичній 13 — туди ми додамо кнопку оновлення курсів.

Стилі в кінець `style.css`:

```css title="style.css"
/* ===== Рядок стану і курси валют (П11) ===== */
.status {
  margin: 0;
  padding: 10px 14px;
  border-radius: 8px;
}

.status:empty {
  display: none; /* порожній рядок стану не займає місця */
}

.status--loading { background: #e0f2fe; color: #075985; }
.status--error   { background: var(--color-danger-bg); color: var(--color-danger); }
.status--success { background: #dcfce7; color: #166534; }
.status--info    { background: var(--color-surface); color: var(--color-text); }

.rates-panel {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.rates__sums {
  margin: 0;
  font-weight: 600;
}

.rates__info {
  margin: 2px 0 0;
  font-size: 0.8rem;
  color: var(--color-muted);
}
```

### Крок 5. Підготовка `app.js`

На початку файлу додайте адреси і замініть масив витрат порожнім — тепер дані приходять з мережі:

```js title="app.js" {7-8,11,14}
// ===== Константи =====
const CATEGORIES = ['Їжа', 'Транспорт', 'Розваги', 'Навчання', 'Комунальні', 'Інше'];

// Витрата від цієї суми вважається «великою» і підсвічується, грн
const BIG_EXPENSE = 500;

const DATA_URL = 'data/expenses.json';
const RATES_URL = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json';

// ===== Стан застосунку =====
let expenses = []; // дані завантажимо з data/expenses.json
let currentFilter = 'all';
let currentSort = 'date-desc';
let rates = null; // { USD: number, EUR: number, date: string }
```

Додайте нові елементи DOM:

```js title="app.js (додайте в розділ «Елементи DOM»)"
const ratesEl = document.getElementById('rates');
const statusEl = document.getElementById('status');
```

Розширте `formatMoney` параметром валюти зі значенням за замовчуванням — старі виклики `formatMoney(amount)` продовжать працювати:

```js title="app.js"
// 1234.5 → '1 234,50 грн'; formatMoney(10, 'USD') → '10,00 USD'
function formatMoney(amount, currency = 'UAH') {
  return amount.toLocaleString('uk-UA', { style: 'currency', currency });
}
```

`formatMoney(90.04, 'USD')` поверне «90,04 USD», `formatMoney(81.2, 'EUR')` — «81,20 EUR».

І функцію для повідомлень про стан (у розділі «Допоміжні функції»):

```js title="app.js"
// Повідомлення про стан: type — 'loading' | 'error' | 'success' | 'info'
function setStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = message ? `status status--${type}` : 'status';
}
```

Виклик `setStatus('')` ховає повідомлення (порожній абзац має `display: none`).

### Крок 6. Завантаження витрат

Створіть розділ «Мережа» (після допоміжних функцій) з функцією завантаження. Функція **повертає проміс** — тож той, хто її викликає, сам вирішить, що робити з результатом.

```js title="app.js"
// ===== Мережа =====
function loadInitialExpenses() {
  return fetch(DATA_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data)) {
        throw new Error('файл даних має містити масив');
      }
      return data;
    });
}
```

Що тут відбувається:

1. `fetch` повертає проміс відповіді.
2. Перший `then` перевіряє код стану. Для 404/500 ми **самі** кидаємо помилку — ланцюжок перейде до `catch`. Інакше повертаємо проміс `response.json()`.
3. Другий `then` отримує вже розібрані дані і перевіряє їхню форму: дані ззовні не можна приймати на віру.

Тепер змініть `init()`: після реєстрації обробників показуємо порожній інтерфейс зі станом «Завантаження…», а коли дані прийдуть — перемальовуємо.

```js title="app.js" {11-23}
function init() {
  fillSelects();
  dateInput.value = todayISO();

  form.addEventListener('submit', handleSubmit);
  form.addEventListener('input', handleFormInput);
  listEl.addEventListener('click', handleListClick);
  filterSelect.addEventListener('change', handleFilterChange);
  sortControls.addEventListener('click', handleSortClick);

  render();
  setStatus('Завантаження даних…', 'loading');

  loadInitialExpenses()
    .then((data) => {
      expenses = data;
      setStatus('');
    })
    .catch((error) => {
      console.error(error);
      setStatus(`Не вдалося завантажити витрати: ${error.message}`, 'error');
    })
    .finally(() => render());
}
```

Збережіть і перевірте: на сторінці 8 витрат, «Разом: 4 086,30 грн · записів: 8». Додавання, видалення, фільтр і сортування працюють як раніше — їм байдуже, звідки взялися дані.

:::tip[Побачити стан «Завантаження…»]
Локальний файл завантажується за мілісекунди. Щоб побачити повідомлення, у вкладці **Network** виберіть у списку тротлінгу (throttling) **Slow 4G** або **3G** і перезавантажте сторінку. Не забудьте потім повернути **No throttling**.
:::

### Крок 7. Перевіряємо обробку помилок

Змоделюйте три типи збоїв і запишіть, яке повідомлення бачить користувач і що виводиться в консоль:

| Експеримент | Як відтворити | Очікуване повідомлення |
|---|---|---|
| Файл не знайдено | змініть `DATA_URL` на `'data/expenses2.json'` | «Не вдалося завантажити витрати: HTTP 404 Not Found» |
| Пошкоджений JSON | додайте кому після останнього `}` у `expenses.json` | «...: Unexpected token ']' ...» (текст `SyntaxError` залежить від браузера) |
| Немає мережі | завантажте сторінку, увімкніть Network → **Offline** і виконайте в консолі `loadInitialExpenses().catch(console.error)` | `TypeError: Failed to fetch` |
| Не масив | замініть вміст файлу на `{ "items": [] }` | «...: файл даних має містити масив» |

Після експериментів поверніть усе як було.

:::note
Усі чотири типи помилок обробляє **один** `catch` у кінці ланцюжка: помилка, кинута на будь-якому кроці, «провалюється» вниз до нього. Це головна перевага ланцюжків промісів над вкладеними колбеками.
:::

### Крок 8. API курсів валют НБУ

Відкрийте в новій вкладці браузера адресу:

```text
https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json
```

Ви побачите масив об'єктів (Chrome може запропонувати галочку **Pretty-print** для зручного перегляду):

```json
[
  { "r030": 36, "txt": "Австралійський долар", "rate": 27.0866, "cc": "AUD", "exchangedate": "13.02.2026" },
  { "r030": 840, "txt": "Долар США", "rate": 41.2345, "cc": "USD", "exchangedate": "13.02.2026" },
  { "r030": 978, "txt": "Євро", "rate": 44.8765, "cc": "EUR", "exchangedate": "13.02.2026" }
]
```

(Значення курсів у прикладі умовні.) Поля, що нас цікавлять: `cc` — літерний код валюти, `rate` — скільки гривень коштує одиниця валюти, `exchangedate` — дата курсу у форматі `ДД.ММ.РРРР`.

Знайти потрібні валюти в масиві — завдання для `find`. Розбір відповіді винесемо в окрему чисту функцію, а завантаження — у функцію, що повертає проміс:

```js title="app.js (розділ «Мережа»)"
// З масиву НБУ дістаємо лише потрібні курси
function parseRates(data) {
  const usd = data.find((item) => item.cc === 'USD');
  const eur = data.find((item) => item.cc === 'EUR');
  if (!usd || !eur) throw new Error('у відповіді НБУ немає USD або EUR');
  return { USD: usd.rate, EUR: eur.rate, date: usd.exchangedate };
}

function loadRates() {
  return fetch(RATES_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(parseRates);
}
```

`.then(parseRates)` — це те саме, що `.then((data) => parseRates(data))`. Якщо `parseRates` кине помилку, вона так само потрапить у `catch`.

Перевірте в консолі:

```js
loadRates().then(console.log);
// { USD: 41.2345, EUR: 44.8765, date: '13.02.2026' }
```

### Крок 9. Показ суми у валютах

Додайте функцію рендерингу курсів (поруч з іншими `render...`):

```js title="app.js"
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
```

Сума в гривнях ділиться на курс: якщо 1 USD = 41,23 грн, то 4 086,30 грн ≈ 99,11 USD. Додайте виклик у `render()` — тоді сума у валютах перераховуватиметься при кожній зміні даних і фільтра:

```js title="app.js" {6}
function render() {
  const visible = getVisibleExpenses();
  renderList(visible);
  renderTotal(visible);
  renderStats(expenses);
  renderRates(getTotal(visible));
  updateSortButtons();
}
```

### Крок 10. Два незалежні запити в `init`

Додайте в кінець `init()` завантаження курсів:

```js title="app.js (кінець функції init)"
  loadRates()
    .then((value) => {
      rates = value;
    })
    .catch((error) => {
      console.error(error);
      setStatus(`Курси валют недоступні: ${error.message}`, 'error');
    })
    .finally(() => render());
```

Перезавантажте сторінку з відкритою вкладкою **Network**. Обидва запити (`expenses.json` і `exchange?json`) стартують майже одночасно — ми не чекаємо завершення першого, щоб почати другий. Курси НБУ відображаються під загальною сумою; при виборі фільтра сума у валютах змінюється разом із сумою в гривнях.

Перевірте обробку помилки курсів: змініть у `RATES_URL` домен на `bank.gov.ua.invalid` — у консолі з'явиться `TypeError: Failed to fetch`, під сумою — «Курси валют: немає даних», а в рядку стану — повідомлення про помилку. Поверніть правильну адресу.

:::caution[Прихована проблема: два запити пишуть в один рядок стану]
Запити завершуються в непередбачуваному порядку. Якщо курси впадуть з помилкою **раніше**, ніж завантажаться витрати, то обробник витрат викличе `setStatus('')` і зітре повідомлення про помилку курсів. Крім того, `render()` викликається двічі. На практичній 13 ми розв'яжемо це правильно: дочекаємося **обох** результатів через `Promise.all` / `Promise.allSettled` і покажемо підсумковий стан один раз.
:::

**Результат роботи:** витрати завантажуються з `data/expenses.json`, під загальною сумою відображається її еквівалент у USD і EUR за поточним курсом НБУ з датою курсу. Під час завантаження видно повідомлення про стан, а при збоях — зрозуміле повідомлення про помилку замість «зламаної» сторінки.

## Завдання для самостійного виконання

1. ★ Додайте до блоку курсів польський злотий (`PLN`). Оновіть `parseRates` і `renderRates`.
2. ★ Виведіть у консоль за допомогою `JSON.stringify(expenses, ['title', 'amount'], 2)` лише назви і суми витрат. Поясніть, що робить другий аргумент (replacer) у вигляді масиву.
3. ★★ НБУ дозволяє отримати курс на певну дату: `...exchange?valcode=USD&date=20260201&json`. Додайте на сторінку `input type="date"` і кнопку «Показати курс»: за кліком виконується запит і виводиться курс USD на вибрану дату. Не забудьте перевірку `response.ok` і порожньої відповіді (масив `[]`).
4. ★★ Створіть файл `data/categories.json` з масивом категорій і їхніми кольорами (`[{ "name": "Їжа", "color": "#f97316" }, ...]`). Завантажте його через `fetch` і розфарбуйте смужки статистики відповідними кольорами.
5. ★★★ Знайдіть інше публічне API з підтримкою CORS (наприклад, `https://jsonplaceholder.typicode.com/todos?_limit=5`) і виведіть дані на окремій сторінці `practice-11/index.html` зі станами «Завантаження», «Помилка» і «Порожньо». Дослідіть у Network заголовок `Access-Control-Allow-Origin`.

## Контрольні питання

1. Назвіть п'ять відмінностей синтаксису JSON від літерала об'єкта JavaScript.
2. Що станеться з властивостями `undefined`, функціями і датами при `JSON.stringify`?
3. Чому `JSON.parse` для зовнішніх даних обгортають у `try...catch`?
4. Що таке проміс? Назвіть його стани.
5. Що повертає колбек `then` і як це використовується в ланцюжку?
6. У яких випадках проміс `fetch` відхиляється, а в яких — ні? Навіщо перевіряти `response.ok`?
7. Чому `fetch` до локального файлу не працює зі сторінки, відкритої через `file:///`?
8. Що таке CORS і чому ми можемо звертатися до API НБУ прямо з браузера?
9. Які проблеми виникають, коли два незалежні запити змінюють один і той самий рядок стану?

## Домашнє завдання

1. Завершіть кроки 1–10; перевірте всі експерименти з кроку 7 і заповніть таблицю власними спостереженнями (точний текст повідомлень у вашому браузері).
2. Виконайте завдання ★ 1.
3. Прочитайте на MDN статтю [Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) (розділи «Chaining» і «Error handling») — це підготовка до лекції 12.

## Що здати

- Скриншот трекера з даними з `expenses.json` і блоком курсів НБУ.
- Скриншот вкладки **Network** з двома запитами і відкритою вкладкою **Preview** для відповіді НБУ.
- Заповнену таблицю експериментів з кроку 7.
- Файли проєкту (`index.html`, `style.css`, `app.js`, `data/expenses.json`).
- Відповіді на контрольні питання.
