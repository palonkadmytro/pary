---
title: "Робота з промісами та async/await"
description: "Переписуємо мережеву частину «Трекера витрат» на async/await: спільна функція fetchJSON, try/catch/finally, паралельне завантаження через Promise.all і Promise.allSettled, імітація повільної мережі та кнопка «Оновити курси»."
type: practice
pair: 13
topic: 55
---

## Мета роботи

- Закріпити теорію лекції 12: проміси, `async` / `await`, обробка помилок через `try` / `catch` / `finally`.
- Виконати рефакторинг коду з ланцюжків `then` на `async` / `await` без зміни поведінки.
- Прибрати дублювання, винісши запит і перевірку відповіді в спільну функцію `fetchJSON`.
- На практиці виміряти різницю між послідовним і паралельним виконанням запитів.
- Обрати правильний комбінатор: `Promise.all` чи `Promise.allSettled`.
- Реалізувати асинхронний обробник кнопки з блокуванням на час запиту.

## Що потрібно

- VS Code + Live Server, Chrome з DevTools (**Console**, **Network**).
- Проєкт `expense-tracker/` у стані після практичної 11: `data/expenses.json`, функції `loadInitialExpenses`, `parseRates`, `loadRates` на ланцюжках `then`, `renderRates`, `setStatus`, два незалежні ланцюжки в `init()`.
- Конспект лекції 12 «Проміси, async/await».

## Короткі теоретичні відомості

### Що змінюється при переході на async/await

| Ланцюжок промісів | async / await |
|---|---|
| `fetch(url).then((r) => ...)` | `const r = await fetch(url);` |
| `return value` у `then` | `return value` з `async`-функції |
| `throw` у `then` → `catch` | `throw` → `catch` блоку `try` |
| `.catch((error) => ...)` | `try { ... } catch (error) { ... }` |
| `.finally(() => ...)` | `finally { ... }` |
| функція повертає проміс з `return fetch(...)...` | `async`-функція **завжди** повертає проміс |

Важливо: перехід на `async` / `await` — це **зміна синтаксису, а не поведінки**. Код усередині залишається асинхронним, сторінка під час `await` не блокується, а функції, що викликають наші `async`-функції, отримують проміси, як і раніше.

### Послідовно чи паралельно

```js
// Послідовно: другий запит чекає на перший — час ≈ t1 + t2
const a = await loadA();
const b = await loadB();

// Паралельно: обидва запити стартують одразу — час ≈ max(t1, t2)
const [a2, b2] = await Promise.all([loadA(), loadB()]);
```

### all чи allSettled

| | `Promise.all` | `Promise.allSettled` |
|---|---|---|
| Результат при успіху всіх | масив значень | масив `{ status: 'fulfilled', value }` |
| Якщо один упав | **весь** проміс відхиляється першою помилкою; інші результати втрачаються | нічого не відхиляється; для невдалого — `{ status: 'rejected', reason }` |
| Коли використовувати | результати потрібні лише всі разом | операції незалежні, часткового результату достатньо |

Для трекера витрати й курси **незалежні**: якщо НБУ недоступний, витрати все одно треба показати. Сьогодні ми переконаємося в цьому експериментально.

## Хід роботи

### Крок 1. Імітація повільної мережі: `delay`

Локальний файл завантажується за мілісекунди, тож різницю між послідовним і паралельним завантаженням не видно. Додамо штучну затримку. У розділ констант:

```js title="app.js (розділ «Константи»)"
const NETWORK_DELAY = 1500; // штучна затримка мережі, мс (для експериментів)
```

У розділ допоміжних функцій — промісифікований таймер з лекції 12:

```js title="app.js (розділ «Допоміжні функції»)"
// Проміс, що виконується через ms мілісекунд
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

Перевірте в консолі, що `await` на верхньому рівні **консолі** працює (на відміну від звичайного скрипта):

```js
console.time('delay');
await delay(1000);
console.timeEnd('delay'); // delay: 1001.2 ms
```

### Крок 2. Спільна функція `fetchJSON`

Зараз `loadInitialExpenses` і `loadRates` містять однаковий фрагмент: виконати `fetch`, перевірити `response.ok`, розібрати JSON. Винесемо його в одну `async`-функцію на початку розділу «Мережа»:

```js title="app.js (розділ «Мережа»)"
// Запит + перевірка статусу + розбір JSON
async function fetchJSON(url) {
  await delay(NETWORK_DELAY);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  return response.json();
}
```

Порівняйте з ланцюжком з практичної 11: код читається зверху вниз, як синхронний, і не має вкладених колбеків. `return response.json()` повертає проміс — `async`-функція «розпакує» його, тож той, хто зробить `await fetchJSON(...)`, отримає вже готові дані.

### Крок 3. Рефакторинг `loadInitialExpenses` і `loadRates`

Замініть обидві функції. `parseRates` залишається без змін — вона синхронна і чиста.

```js title="app.js (розділ «Мережа»)"
async function loadInitialExpenses() {
  const data = await fetchJSON(DATA_URL);
  if (!Array.isArray(data)) {
    throw new Error('файл даних має містити масив');
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
```

Код `init()` поки не чіпайте і перезавантажте сторінку: вона має працювати **так само**, як наприкінці практичної 11 (лише на 1,5 с повільніше). Чому старі ланцюжки `loadInitialExpenses().then(...)` досі працюють? Тому що `async`-функція повертає проміс — для коду, що її викликає, нічого не змінилося.

Перевірте в консолі:

```js
loadRates();                 // Promise {<pending>}
await loadRates();           // { USD: ..., EUR: ..., date: '...' }
await fetchJSON('data/nope.json'); // Uncaught Error: HTTP 404 Not Found
```

### Крок 4. `init` на async/await: спочатку послідовно

Перепишемо `init()` як `async`-функцію з одним блоком `try` / `catch` / `finally`. Спершу — «наївна» послідовна версія; заодно виміряємо час через `console.time`.

```js title="app.js" {1,12-25}
async function init() {
  fillSelects();
  dateInput.value = todayISO();

  form.addEventListener('submit', handleSubmit);
  form.addEventListener('input', handleFormInput);
  listEl.addEventListener('click', handleListClick);
  filterSelect.addEventListener('change', handleFilterChange);
  sortControls.addEventListener('click', handleSortClick);

  render();
  setStatus('Завантаження…', 'loading');
  console.time('Завантаження');

  try {
    expenses = await loadInitialExpenses();
    rates = await loadRates();
    setStatus('');
  } catch (error) {
    console.error(error);
    setStatus(`Помилка завантаження: ${error.message}`, 'error');
  } finally {
    console.timeEnd('Завантаження');
    render();
  }
}
```

Перезавантажте сторінку і подивіться:

1. У консолі — `Завантаження: ≈ 3000 ms` (дві затримки по 1,5 с одна за одною плюс час запитів).
2. У вкладці **Network** запит до `bank.gov.ua` стартує лише **після** завершення `expenses.json` (колонка **Waterfall**: смужки йдуть «сходинками»).

:::note[Виклик init() не змінюється]
Останній рядок файлу `init();` залишається таким самим. Він запускає асинхронну функцію і не чекає на неї — для звичайного (не модульного) скрипта це правильно: `await` на верхньому рівні тут недоступний, а чекати нам і не потрібно.
:::

### Крок 5. Паралельно: `Promise.all`

Запити не залежать один від одного, тож запустимо їх одночасно. Замініть вміст блоку `try`:

```js title="app.js (блок try у функції init)"
  try {
    const [loadedExpenses, loadedRates] = await Promise.all([
      loadInitialExpenses(),
      loadRates(),
    ]);
    expenses = loadedExpenses;
    rates = loadedRates;
    setStatus('');
  } catch (error) {
```

Обидві функції **викликаються одразу** (запити стартують), а `await Promise.all(...)` чекає, доки завершаться обидва. Результати приходять у тому порядку, у якому проміси перелічено в масиві, — незалежно від того, який запит завершився першим.

Перезавантажте сторінку: тепер `Завантаження: ≈ 1500 ms`, а у **Waterfall** обидві смужки починаються одночасно. Запишіть обидва виміри — вони знадобляться у звіті.

### Крок 6. Експеримент: що, якщо курси недоступні?

Тимчасово зіпсуйте адресу курсів:

```js
const RATES_URL = 'https://bank.gov.ua.invalid/NBUStatService/v1/statdirectory/exchange?json';
```

Перезавантажте сторінку. Домену не існує, тож `fetch` відхилиться з `TypeError: Failed to fetch`, `loadRates` відхилиться, і `Promise.all` **відхилиться повністю**: у статусі — «Помилка завантаження: Failed to fetch», а список витрат порожній, хоча файл `expenses.json` завантажився успішно! Це поведінка fail-fast: одна помилка «вбиває» всі результати.

Для незалежних даних це неприйнятно. Замінимо `Promise.all` на `Promise.allSettled` і обробимо кожен результат окремо. Блок `try` / `catch` тепер не потрібен: `allSettled` ніколи не відхиляється. Остаточна версія `init()`:

```js title="app.js"
async function init() {
  fillSelects();
  dateInput.value = todayISO();

  form.addEventListener('submit', handleSubmit);
  form.addEventListener('input', handleFormInput);
  listEl.addEventListener('click', handleListClick);
  filterSelect.addEventListener('change', handleFilterChange);
  sortControls.addEventListener('click', handleSortClick);

  render();
  setStatus('Завантаження…', 'loading');

  const [expensesResult, ratesResult] = await Promise.allSettled([
    loadInitialExpenses(),
    loadRates(),
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
```

Перезавантажте сторінку з досі зіпсованою адресою: витрати на місці, під сумою — «Курси валют: немає даних», у рядку стану — «Курси валют недоступні: Failed to fetch.». Поверніть правильну адресу `RATES_URL`.

Зверніть увагу, що ми розв'язали й проблему з практичної 11: тепер рядок стану встановлюється **один раз**, коли відомі обидва результати, а `render()` викликається один раз після завантаження. Якщо збою немає, `setStatus('', ...)` ховає повідомлення «Завантаження…».

:::tip[Перевірте всі комбінації]
| Витрати | Курси | Очікуваний результат |
|---|---|---|
| ✓ | ✓ | список, сума у валютах, рядок стану прихований |
| ✓ | ✗ | список, «Курси валют: немає даних», повідомлення про курси |
| ✗ | ✓ | порожній список, курси для 0 грн, повідомлення про витрати |
| ✗ | ✗ | обидва повідомлення в одному рядку стану |

Зламати витрати можна, змінивши `DATA_URL` на неіснуючий файл.
:::

### Крок 7. Кнопка «Оновити курси»

Курси змінюються щодня, і користувач має змогу оновити їх без перезавантаження сторінки. У `index.html` додайте кнопку в `div.rates-panel` поруч із `div#rates`:

```html title="index.html" {3}
<div class="rates-panel">
  <div id="rates" class="rates"></div>
  <button type="button" id="refresh-rates" class="btn btn--ghost">↻ Оновити курси</button>
</div>
```

Стиль для заблокованої кнопки — в кінець `style.css`:

```css title="style.css"
/* ===== Заблокована кнопка (П13) ===== */
.btn:disabled {
  opacity: 0.6;
  cursor: progress;
}
```

У розділ «Елементи DOM» додайте посилання:

```js title="app.js"
const refreshRatesBtn = document.getElementById('refresh-rates');
```

Асинхронний обробник — у розділ «Обробники подій»:

```js title="app.js"
async function handleRefreshRates() {
  refreshRatesBtn.disabled = true;          // захист від повторних кліків
  ratesEl.textContent = 'Оновлення курсів…';
  try {
    rates = await loadRates();
    setStatus('Курси валют оновлено', 'success');
  } catch (error) {
    console.error(error);
    setStatus(`Не вдалося оновити курси: ${error.message}`, 'error');
  } finally {
    refreshRatesBtn.disabled = false;       // розблоковуємо за будь-якого результату
    render();
  }
}
```

І реєстрацію в `init()` поруч з іншими обробниками:

```js title="app.js (у функції init)"
refreshRatesBtn.addEventListener('click', handleRefreshRates);
```

Розберіть роль кожного блоку:

- `try` — «щасливий шлях»: отримали курси, повідомили про успіх;
- `catch` — запит не вдався; старі курси (якщо були) **залишаються** в змінній `rates`, бо присвоєння `rates = await ...` не виконалося;
- `finally` — виконується завжди: розблокувати кнопку і перемалювати інтерфейс. Без `finally` після помилки кнопка залишилася б заблокованою назавжди.

Перевірте: клацніть «Оновити курси» — кнопка на 1,5 с стає напівпрозорою, замість курсів — «Оновлення курсів…», потім з'являються курси і зелене повідомлення. Швидкі повторні кліки під час завантаження ігноруються.

Тепер увімкніть у **Network** режим **Offline** (сторінку не перезавантажуйте) і натисніть кнопку: «Не вдалося оновити курси: Failed to fetch», кнопка знову активна, а під сумою — **попередні** курси. Вимкніть Offline.

### Крок 8. Порядок виконання: перевірка розуміння

Додайте тимчасово в кінець файлу (після `init();`) рядок і перезавантажте сторінку:

```js
console.log('Кінець app.js');
```

і в `init()` одразу після `await Promise.allSettled(...)`:

```js
console.log('Дані отримано');
```

У консолі спочатку з'явиться «Кінець app.js», а лише потім — «Дані отримано». `init()` виконалася синхронно до першого `await` (заповнила списки, призначила обробники, показала «Завантаження…»), повернула проміс і «відпустила» потік; решта функції продовжилася, коли запити завершилися. Видаліть обидва тимчасові рядки.

### Крок 9. Повертаємо нормальну швидкість

Після експериментів встановіть `NETWORK_DELAY = 0`. Функцію `delay` і константу не видаляйте — вони стануть у пригоді для перевірки станів завантаження в майбутньому.

**Результат роботи:** уся мережева частина трекера написана на `async` / `await`; спільна `fetchJSON` прибрала дублювання; витрати і курси завантажуються паралельно, а збій одного джерела не заважає показати інше; кнопка «Оновити курси» блокується на час запиту і коректно обробляє помилки.

## Завдання для самостійного виконання

1. ★ Виведіть у рядку стану після успішного завантаження час, який воно зайняло: «Дані завантажено за 0,34 с». Використайте `performance.now()` до і після `await Promise.allSettled(...)`. Повідомлення має зникати через 3 секунди (`setTimeout`).
2. ★ Під час оновлення курсів змінюйте текст кнопки на «Оновлення…», а після завершення повертайте початковий. Підказка: збережіть початковий текст у змінну перед `try`.
3. ★★ Напишіть функцію `retry(fn, attempts = 3, pause = 1000)`, яка викликає асинхронну функцію `fn` і при помилці повторює виклик до `attempts` разів з паузою `await delay(pause)` між спробами; після останньої невдалої спроби — кидає помилку. Використайте її для курсів: `retry(loadRates)`. Перевірте з режимом Offline, вимкнувши його між спробами.
4. ★★ Додайте під курсами рядок «Оновлено: 14:05:32» з часом останнього успішного завантаження курсів (`new Date().toLocaleTimeString('uk-UA')`).
5. ★★★ Таймаут і скасування. Розширте `fetchJSON(url, { timeout = 8000 } = {})`: створіть `AbortController`, передайте `signal` у `fetch`, запустіть `setTimeout(() => controller.abort(), timeout)` і приберіть таймер у `finally`. Помилку з `error.name === 'AbortError'` перетворіть на зрозуміле `Error('Перевищено час очікування (8 с)')`. Перевірте з `NETWORK_DELAY = 0` і тротлінгом **Slow 4G**, встановивши `timeout: 500` для курсів. Додатково: кнопка «Скасувати» поруч з «Оновити курси», яка викликає `abort()` для поточного запиту.

## Контрольні питання

1. Чому після переписування `loadRates` на `async` старий код `loadRates().then(...)` продовжував працювати?
2. Що повертає `fetchJSON`, якщо в ній написано `return response.json()` без `await`?
3. Чому послідовна версія `init` завантажувалася вдвічі довше? Як це побачити у вкладці Network?
4. Що відбувається з результатом `Promise.all`, якщо один із промісів відхилено? Чому для трекера це погано?
5. Чим відрізняються елементи масиву, який повертає `Promise.allSettled`, для успішних і невдалих промісів?
6. Навіщо в `handleRefreshRates` блок `finally`? Що станеться без нього після помилки?
7. Чому після невдалого оновлення курсів на екрані залишаються попередні курси?
8. Чому `await` не можна написати на верхньому рівні `app.js`, але можна в консолі DevTools?
9. У якому порядку виведуться «Кінець app.js» і «Дані отримано» і чому?

## Домашнє завдання

1. Завершіть кроки 1–9 і переконайтеся, що працюють усі чотири комбінації з таблиці кроку 6.
2. Виконайте завдання ★ 1 або ★ 2 (на вибір).
3. Подумайте і запишіть (3–5 речень): які дані трекера варто зберігати між перезавантаженнями сторінки, а які — ні? На практичній 14 ми підключимо `localStorage`.

## Що здати

- Скриншоти консолі з вимірами часу послідовного і паралельного завантаження та відповідні скриншоти **Waterfall** у вкладці Network.
- Скриншот трекера з недоступними курсами (витрати показано, у рядку стану — повідомлення про помилку курсів).
- Файли `index.html`, `style.css`, `app.js`.
- Відповіді на контрольні питання.
