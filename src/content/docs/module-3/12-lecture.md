---
title: "Проміси, async/await"
description: "Асинхронність у JavaScript: цикл подій, черги завдань і мікрозавдань, створення промісів і ланцюжки then/catch/finally, Promise.all/allSettled/race/any, async/await, обробка помилок і скасування запитів через AbortController."
type: lecture
pair: 12
topic: 54
---

## Мета заняття

- Зрозуміти, чому JavaScript у браузері асинхронний і як працює цикл подій (event loop) з чергами завдань і мікрозавдань.
- Розібратися з промісом як об'єктом: стани, створення через `new Promise`, `resolve` / `reject`.
- Впевнено будувати ланцюжки `then` / `catch` / `finally` і розуміти, як у них передаються значення та помилки.
- Знати комбінатори `Promise.all`, `Promise.allSettled`, `Promise.race`, `Promise.any` і обирати потрібний.
- Писати асинхронний код у стилі `async` / `await` з обробкою помилок `try` / `catch` / `finally`.
- Розрізняти послідовне і паралельне виконання асинхронних операцій.
- Скасовувати запити та обмежувати час очікування за допомогою `AbortController`.

## План лекції

1. Синхронний і асинхронний код. Колбеки.
2. Цикл подій: стек викликів, черга завдань, черга мікрозавдань.
3. Проміс: стани і створення.
4. Ланцюжки промісів і обробка помилок.
5. Комбінатори промісів.
6. `async` / `await`.
7. Послідовне і паралельне виконання.
8. Скасування і таймаути: `AbortController`.
9. Типові помилки.

## 1. Синхронний і асинхронний код

**Синхронний** код виконується інструкція за інструкцією: наступна починається лише після завершення попередньої. Поки виконується довга операція, все інше чекає.

```js
console.log('1');
for (let i = 0; i < 3e9; i++) {} // кілька секунд «важкої» роботи
console.log('2'); // з'явиться лише після циклу; весь цей час сторінка «висить»
```

JavaScript у браузері виконується в **одному потоці** (main thread), який також відповідає за малювання сторінки й обробку кліків. Якби мережевий запит виконувався синхронно, інтерфейс зависав би на весь час очікування відповіді. Тому всі тривалі операції — таймери, мережа, читання файлів, доступ до камери — **асинхронні**: ми запускаємо операцію, а результат отримуємо пізніше, не блокуючи потік.

### Колбеки та їхні проблеми

Історично перший спосіб отримати асинхронний результат — передати **колбек** (callback):

```js
setTimeout(() => console.log('Минула секунда'), 1000);
button.addEventListener('click', () => console.log('Клік'));
```

Для однієї операції це зручно. Але коли операції залежать одна від одної, виникає «піраміда приреченості» (callback hell):

```js
getUser(id, (error, user) => {
  if (error) return showError(error);
  getOrders(user, (error, orders) => {
    if (error) return showError(error);
    getDetails(orders[0], (error, details) => {
      if (error) return showError(error);
      render(details); // глибина вкладення зростає з кожним кроком
    });
  });
});
```

Проблеми: код росте вправо, обробку помилок треба повторювати на кожному рівні, складно виконати кілька операцій паралельно і дочекатися всіх. **Проміси** (ES2015) і **async/await** (ES2017) розв'язують саме ці проблеми.

## 2. Цикл подій

Щоб передбачати порядок виконання асинхронного коду, треба розуміти, як браузер планує роботу.

```text
 ┌──────────────────┐     запуск таймера,      ┌───────────────────────┐
 │  Стек викликів   │ ───── запиту, події ───► │ Web API браузера      │
 │  (call stack)    │                          │ (таймери, мережа, DOM)│
 └──────────────────┘                          └───────────┬───────────┘
          ▲                                                │ операція завершилась
          │                                                ▼
          │        ┌───────────────────────────────────────────────────────┐
          │        │ Черга мікрозавдань (microtasks): колбеки промісів,    │
          ├────────┤ queueMicrotask — виконуються ВСІ, одразу після стеку  │
          │        └───────────────────────────────────────────────────────┘
          │        ┌───────────────────────────────────────────────────────┐
          └────────┤ Черга завдань (tasks, macrotasks): setTimeout, події, │
                   │ завершення fetch — по ОДНОМУ завданню за оберт циклу  │
                   └───────────────────────────────────────────────────────┘
```

Алгоритм одного «оберту» циклу подій:

1. Виконати весь синхронний код, доки стек викликів не спорожніє.
2. Виконати **всі** мікрозавдання (включно з тими, що додалися під час виконання).
3. За потреби перемалювати сторінку.
4. Взяти **одне** завдання з черги завдань і повернутися до кроку 1.

### Класична задача на порядок виконання

```js
console.log('1: синхронний код');

setTimeout(() => console.log('2: setTimeout (завдання)'), 0);

Promise.resolve().then(() => console.log('3: then (мікрозавдання)'));

queueMicrotask(() => console.log('4: queueMicrotask'));

console.log('5: синхронний код');
```

Результат:

```text
1: синхронний код
5: синхронний код
3: then (мікрозавдання)
4: queueMicrotask
2: setTimeout (завдання)
```

Навіть `setTimeout(..., 0)` не виконається «негайно»: він потрапить у чергу завдань і чекатиме, доки завершиться синхронний код і **всі** мікрозавдання. Колбеки промісів мають пріоритет над таймерами.

:::note
Затримка в `setTimeout(fn, ms)` — це **мінімальний** час до постановки в чергу, а не гарантований час виконання. Якщо потік зайнятий, колбек виконається пізніше. У неактивних вкладках браузери додатково сповільнюють таймери.
:::

## 3. Проміс: стани і створення

**Проміс** (Promise) — об'єкт, що представляє результат асинхронної операції, який буде відомий у майбутньому.

| Стан | Опис | Перехід |
|---|---|---|
| `pending` | очікування, результату ще немає | початковий стан |
| `fulfilled` | операцію виконано, є значення | через `resolve(value)` |
| `rejected` | операція завершилася помилкою | через `reject(error)` або `throw` |

Стани `fulfilled` і `rejected` разом називають **settled** (завершений). Проміс змінює стан **лише один раз**: повторні виклики `resolve` чи `reject` ігноруються.

### Створення промісу

Зазвичай ми отримуємо готові проміси (від `fetch`, `response.json()`, `file.text()`). Але іноді треба «загорнути» в проміс API на колбеках. Для цього є конструктор:

```js
const promise = new Promise((resolve, reject) => {
  // функція-виконавець (executor) запускається одразу, синхронно
  const success = Math.random() > 0.5;
  setTimeout(() => {
    if (success) {
      resolve('Дані отримано');                 // fulfilled
    } else {
      reject(new Error('Сервер не відповідає')); // rejected
    }
  }, 1000);
});

promise
  .then((value) => console.log('Успіх:', value))
  .catch((error) => console.log('Помилка:', error.message));
```

Найкорисніший приклад — **промісифікація** таймера. Функція `delay` знадобиться на практичній для імітації повільної мережі:

```js
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

delay(1000).then(() => console.log('Минула секунда'));
```

Ще приклад — завантаження зображення:

```js
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Не вдалося завантажити ${src}`));
    img.src = src;
  });
}
```

:::tip[Відхиляйте проміси об'єктами Error]
`reject('щось пішло не так')` технічно працює, але рядок не має стеку викликів і властивості `message`. Завжди передавайте `new Error(...)` — так само, як для `throw`.
:::

### Готові проміси

```js
Promise.resolve(42);                 // одразу fulfilled зі значенням 42
Promise.reject(new Error('Помилка')); // одразу rejected
```

## 4. Ланцюжки промісів і обробка помилок

Методи `then`, `catch`, `finally` **завжди повертають новий проміс**. Його результат залежить від того, що зробив колбек:

| Колбек у `then` / `catch`... | Новий проміс... |
|---|---|
| повернув значення `x` | виконується зі значенням `x` |
| повернув проміс `p` | «чекає» на `p` і переймає його результат |
| нічого не повернув | виконується зі значенням `undefined` |
| кинув помилку (`throw`) | відхиляється з цією помилкою |

```js
fetch('data/expenses.json')
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();        // повертаємо проміс — наступний then його дочекається
  })
  .then((expenses) => expenses.length) // повертаємо значення
  .then((count) => console.log(`Витрат: ${count}`))
  .catch((error) => console.error('Збій:', error.message))
  .finally(() => console.log('Запит завершено'));
```

### Як «подорожують» помилки

Помилка, що виникла в будь-якому `then`, пропускає всі наступні `then` і потрапляє в найближчий `catch`. Після `catch` ланцюжок **продовжується** як успішний — `catch` «перехоплює» помилку.

```js
Promise.resolve(1)
  .then((x) => { throw new Error('Збій на кроці 2'); })
  .then((x) => console.log('Цей крок буде пропущено'))
  .catch((error) => {
    console.log('Перехоплено:', error.message);
    return 'значення за замовчуванням';  // відновлення після помилки
  })
  .then((value) => console.log('Продовжуємо з:', value));
```

`finally` не отримує аргументів і не змінює результат ланцюжка — він для «прибирання»: сховати індикатор завантаження, розблокувати кнопку.

### Необроблені відхилення

Якщо відхилений проміс ніхто не обробив, у консолі з'явиться `Uncaught (in promise) Error: ...`. Глобально такі випадки можна відстежувати:

```js
window.addEventListener('unhandledrejection', (event) => {
  console.error('Необроблена помилка промісу:', event.reason);
});
```

Це засіб діагностики, а не заміна `catch`: кожен ланцюжок має закінчуватися обробкою помилок.

## 5. Комбінатори промісів

Часто треба запустити кілька операцій одночасно і скомбінувати результати.

| Метод | Чекає | Виконується, коли... | Відхиляється, коли... | Результат |
|---|---|---|---|---|
| `Promise.all(arr)` | усіх | **усі** виконано | **перший** відхилено (fail-fast) | масив значень у порядку вхідного масиву |
| `Promise.allSettled(arr)` | усіх | усі завершено (будь-як) | ніколи | масив `{ status, value }` / `{ status, reason }` |
| `Promise.race(arr)` | першого | перший завершився успішно | перший завершився помилкою | значення / помилка першого |
| `Promise.any(arr)` | першого успішного | перший виконано | **усі** відхилено | значення першого успішного або `AggregateError` |

### Promise.all

```js
Promise.all([
  fetch('data/expenses.json').then((r) => r.json()),
  fetch('data/categories.json').then((r) => r.json()),
])
  .then(([expenses, categories]) => {
    // деструктуризація: порядок відповідає порядку в масиві, а не часу завершення
    console.log(expenses.length, categories.length);
  })
  .catch((error) => console.error('Хоча б один запит не вдався:', error));
```

`Promise.all` підходить, коли результати **потрібні всі разом** і без будь-якого з них продовжувати немає сенсу.

### Promise.allSettled

```js
Promise.allSettled([loadExpenses(), loadRates()]).then((results) => {
  for (const result of results) {
    if (result.status === 'fulfilled') {
      console.log('Успіх:', result.value);
    } else {
      console.log('Помилка:', result.reason.message);
    }
  }
});
```

`allSettled` підходить, коли операції **незалежні**: якщо курси валют не завантажилися, витрати все одно треба показати.

### Promise.race: таймаут

```js
function timeout(ms) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Перевищено час очікування ${ms} мс`)), ms),
  );
}

Promise.race([fetch(url), timeout(5000)])
  .then((response) => console.log('Встигли:', response.status))
  .catch((error) => console.error(error.message));
```

Недолік: запит після таймауту продовжує виконуватися у фоні. Справжнє скасування дає `AbortController` (розділ 8).

### Promise.any

```js
// Беремо дані з першого дзеркала, яке відповість успішно
Promise.any([
  fetch('https://mirror1.example.com/data.json'),
  fetch('https://mirror2.example.com/data.json'),
]).then((response) => response.json());
```

## 6. async / await

Ланцюжки промісів кращі за колбеки, але довгі ланцюжки з розгалуженнями все одно читаються важко. Синтаксис **`async` / `await`** (ES2017) дозволяє писати асинхронний код так, ніби він синхронний.

### Правила

1. Функція, оголошена з `async`, **завжди повертає проміс**. Повернене значення стає результатом промісу, кинута помилка — причиною відхилення.
2. Усередині `async`-функції оператор `await promise` **призупиняє** виконання цієї функції, доки проміс не завершиться, і повертає його значення (або кидає його помилку).
3. Поки функція «чекає», потік **не блокується**: виконуються інші обробники, сторінка реагує.

```js
async function getAnswer() {
  return 42;
}
getAnswer();                         // Promise {<fulfilled>: 42}
getAnswer().then(console.log);       // 42

async function fail() {
  throw new Error('Помилка');
}
fail().catch((e) => console.log(e.message)); // 'Помилка'
```

### Той самий код у двох стилях

```js
// Ланцюжок промісів
function loadExpenses() {
  return fetch('data/expenses.json')
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    });
}

// async / await
async function loadExpenses() {
  const response = await fetch('data/expenses.json');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json(); // повертати проміс з async-функції можна без await
}
```

### Обробка помилок: try / catch / finally

Відхилений проміс під `await` поводиться як `throw` — його ловить звичайний `try...catch`:

```js
async function init() {
  showLoader();
  try {
    const expenses = await loadExpenses();
    render(expenses);
  } catch (error) {
    showError(`Не вдалося завантажити: ${error.message}`);
  } finally {
    hideLoader(); // виконається і при успіху, і при помилці
  }
}
```

:::caution[return await усередині try]
Усередині `try` пишіть `return await promise`, а не `return promise`. Без `await` функція поверне проміс одразу, і якщо він відхилиться пізніше, `catch` цієї функції помилку **не перехопить**. Поза `try` різниці немає.
:::

### Де можна використовувати await

- Усередині `async`-функцій (оголошень, виразів, стрілкових: `async () => {}`, методів).
- На верхньому рівні **модулів** (`<script type="module">`) — top-level await.
- У звичайному скрипті на верхньому рівні — **ні** (`SyntaxError`). Тому код ініціалізації загортають у `async function init() { ... }`.

Обробник події теж може бути асинхронним:

```js
button.addEventListener('click', async () => {
  button.disabled = true;
  try {
    const data = await loadData();
    render(data);
  } finally {
    button.disabled = false;
  }
});
```

### Власні класи помилок

Щоб розрізняти типи збоїв, створюють класи-нащадки `Error`:

```js
class HttpError extends Error {
  constructor(response) {
    super(`HTTP ${response.status} ${response.statusText}`);
    this.name = 'HttpError';
    this.status = response.status;
  }
}

try {
  const response = await fetch(url);
  if (!response.ok) throw new HttpError(response);
} catch (error) {
  if (error instanceof HttpError && error.status === 404) {
    console.log('Ресурс не знайдено');
  } else {
    throw error; // невідомі помилки прокидаємо далі
  }
}
```

## 7. Послідовне і паралельне виконання

Найпоширеніша помилка з `await` — випадково зробити незалежні операції послідовними.

```js
// ПОСЛІДОВНО: другий запит стартує лише після завершення першого
const expenses = await loadExpenses(); // 1 с
const rates = await loadRates();       // 1 с
// разом ≈ 2 с

// ПАРАЛЕЛЬНО: обидва запити стартують одразу
const [expenses2, rates2] = await Promise.all([loadExpenses(), loadRates()]);
// разом ≈ 1 с (час найдовшого)
```

```text
Послідовно:  [── expenses ──][── rates ──]           ≈ 2 с
Паралельно:  [── expenses ──]
             [── rates ─────]                         ≈ 1 с
```

Правило: якщо операції **не залежать** одна від одної — запускайте їх разом через `Promise.all` / `allSettled`. Якщо друга операція потребує результату першої (спочатку отримати користувача, потім його замовлення) — послідовно.

### await у циклах

```js
// Послідовно, по одному — коли важливий порядок або треба не перевантажити сервер
for (const id of ids) {
  const item = await loadItem(id);
  console.log(item);
}

// Паралельно — усі запити одразу
const items = await Promise.all(ids.map((id) => loadItem(id)));
```

:::danger[await у forEach не працює так, як очікується]
```js
ids.forEach(async (id) => {
  await loadItem(id);
});
console.log('Готово'); // виведеться ДО завершення будь-якого запиту!
```
`forEach` не чекає на проміси, які повертає колбек. Використовуйте `for...of` (послідовно) або `Promise.all` + `map` (паралельно).
:::

## 8. Скасування і таймаути: AbortController

`fetch` сам по собі може чекати відповіді дуже довго. Щоб скасувати запит (користувач пішов зі сторінки, ввів новий пошуковий запит, минув час очікування), використовують **`AbortController`**:

```js
const controller = new AbortController();

fetch(url, { signal: controller.signal })
  .then((response) => response.json())
  .then(console.log)
  .catch((error) => {
    if (error.name === 'AbortError') {
      console.log('Запит скасовано');
    } else {
      console.error(error);
    }
  });

// Пізніше, наприклад за кліком «Скасувати»:
controller.abort();
```

Таймаут для запиту:

```js
async function fetchWithTimeout(url, ms = 5000) {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timerId); // прибираємо таймер, якщо відповідь прийшла раніше
  }
}
```

У сучасних браузерах є й скорочений варіант: `fetch(url, { signal: AbortSignal.timeout(5000) })` — тоді помилка матиме ім'я `'TimeoutError'`.

Той самий `signal` можна передати і в `addEventListener` (лекція 9) — `AbortController` є універсальним механізмом скасування у вебплатформі.

## 9. Типові помилки

| Помилка | Що відбувається | Як правильно |
|---|---|---|
| Забутий `return` у `then` | наступний `then` отримує `undefined`, а не дані | `return response.json()` |
| Вкладені `then` замість ланцюжка | «піраміда» як із колбеками | повертати проміс і продовжувати ланцюжок на тому ж рівні |
| Немає `catch` | `Uncaught (in promise)`, користувач не бачить повідомлення | завершувати ланцюжок `catch` або використовувати `try...catch` |
| Немає перевірки `response.ok` | 404/500 обробляються як успіх, `json()` падає на HTML-сторінці помилки | `if (!response.ok) throw ...` |
| Забутий `await` | у змінній проміс замість даних: `data.length` → `undefined` | `const data = await load()` |
| `await` поза `async`-функцією у звичайному скрипті | `SyntaxError` | обгорнути в `async function` |
| Послідовні `await` для незалежних операцій | сторінка завантажується вдвічі довше | `Promise.all` |
| `await` у `forEach` | код після циклу не чекає | `for...of` або `Promise.all(map)` |
| `Promise.all` для незалежних даних | одна помилка «вбиває» всі результати | `Promise.allSettled` |
| Спроба отримати результат синхронно | `let data; fetch(...).then(d => data = d); console.log(data)` — `undefined` | працювати з даними всередині `then` або після `await` |

## Підсумки

- JavaScript у браузері однопотоковий; тривалі операції асинхронні, щоб не блокувати інтерфейс.
- Цикл подій виконує синхронний код, потім **усі** мікрозавдання (колбеки промісів), потім одне завдання з черги (таймери, події).
- Проміс має стани `pending` → `fulfilled` / `rejected` і змінює стан лише раз. `new Promise((resolve, reject) => ...)` загортає API на колбеках.
- `then` / `catch` / `finally` повертають нові проміси; помилка «провалюється» до найближчого `catch`.
- `Promise.all` — усі або нічого; `allSettled` — усі результати незалежно від успіху; `race` — перший завершений; `any` — перший успішний.
- `async`-функція завжди повертає проміс; `await` призупиняє її, не блокуючи потік; помилки обробляються `try` / `catch` / `finally`.
- Незалежні операції запускайте паралельно; для скасування і таймаутів використовуйте `AbortController`.

## Контрольні питання

1. Чому в браузері мережеві запити не можуть бути синхронними?
2. Опишіть алгоритм одного оберту циклу подій. Чим черга мікрозавдань відрізняється від черги завдань?
3. У якому порядку виведуться повідомлення: `console.log`, `setTimeout(..., 0)`, `Promise.resolve().then(...)`? Чому?
4. Назвіть стани промісу. Що станеться, якщо в виконавці викликати `resolve` двічі?
5. Що повертає `then`? Що отримає наступний `then`, якщо колбек нічого не повернув?
6. Чим `Promise.all` відрізняється від `Promise.allSettled`? Наведіть ситуацію для кожного.
7. Що повертає `async`-функція? Що відбувається з потоком виконання під час `await`?
8. Як обробити помилку відхиленого промісу в стилі `async` / `await`?
9. Чому два послідовні `await` для незалежних запитів — погана практика? Як переписати?
10. Як скасувати `fetch`-запит і як відрізнити скасування від інших помилок?

## Домашнє завдання

1. Не запускаючи код, запишіть порядок виведення, потім перевірте в консолі і поясніть розбіжності (якщо є):

   ```js
   console.log('A');
   setTimeout(() => console.log('B'), 0);
   Promise.resolve()
     .then(() => console.log('C'))
     .then(() => console.log('D'));
   (async () => {
     console.log('E');
     await null;
     console.log('F');
   })();
   console.log('G');
   ```

2. Напишіть функцію `delay(ms)` і з її допомогою — `async`-функцію `countdown(n)`, що виводить у консоль числа від `n` до 1 з інтервалом в секунду, а потім «Старт!».
3. Перепишіть функції `loadInitialExpenses` і `loadRates` зі свого «Трекера витрат» у стилі `async` / `await` (поки що в окремому файлі або в коментарі) — на практичній 13 ми виконаємо цей рефакторинг у проєкті.
