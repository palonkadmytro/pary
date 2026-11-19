---
title: "Робота зі змінними, типами даних, операторами"
description: "Налаштовуємо робоче середовище для JavaScript, створюємо сторінку-«пісочницю» з виведенням у консоль і на сторінку та розв'язуємо задачі на змінні, типи, перетворення й оператори."
type: practice
pair: 3
topic: 45
---

## Мета роботи

- Налаштувати робоче середовище: VS Code, Live Server, Chrome DevTools.
- Створити сторінку-«пісочницю» `practice-03/`, яка виводить результати і в консоль, і на сторінку.
- Закріпити на практиці оголошення змінних (`const`, `let`), типи даних і оператор `typeof`.
- Навчитися правильно перетворювати рядки на числа та перевіряти результат.
- Розв'язати прикладні задачі з арифметичними, порівняльними та логічними операторами, операторами `??` і `?.`.
- Попрактикуватися з шаблонними рядками та методами рядків.

## Що потрібно

| Програма | Призначення | Де взяти |
|---|---|---|
| **VS Code** | редактор коду | [code.visualstudio.com](https://code.visualstudio.com) |
| **Live Server** (розширення VS Code) | локальний сервер з автоперезавантаженням | вкладка Extensions → пошук «Live Server» (автор Ritwick Dey) |
| **Google Chrome** | браузер з DevTools | [google.com/chrome](https://www.google.com/chrome/) |
| **Prettier** (розширення, бажано) | автоформатування коду | вкладка Extensions |

:::tip[Налаштування VS Code]
Увімкніть форматування при збереженні: `Settings` → пошук «Format On Save» → поставити прапорець. Як форматувальник за замовчуванням оберіть Prettier (`Default Formatter`). Тоді відступи й крапки з комою будуть розставлятися автоматично.
:::

## Короткі теоретичні відомості

- Змінні оголошуємо через `const` (за замовчуванням) або `let` (якщо значення змінюється). Імена — англійською в camelCase.
- Примітивні типи: `number`, `string`, `boolean`, `undefined`, `null`, `bigint`, `symbol`; решта — об'єкти. `typeof` повертає назву типу рядком (увага: `typeof null === 'object'`).
- Значення з `prompt()` і полів форми — **завжди рядки**. Перетворення: `Number(str)` (весь рядок має бути числом), `parseInt`/`parseFloat` (читають число з початку рядка). Перевірка: `Number.isNaN(x)` або `Number.isFinite(x)`.
- `+` з рядком склеює, інші арифметичні оператори перетворюють операнди на числа.
- Порівнюємо лише через `===` / `!==`. Значення за замовчуванням — `??` (реагує лише на `null`/`undefined`), безпечний доступ — `?.`.
- Округлення грошей: `Math.round(x * 100) / 100` (число) або `x.toFixed(2)` (рядок для виведення).

## Хід роботи

### Крок 1. Структура папки та запуск Live Server

1. Створіть папку для курсу (наприклад, `js-course`), а в ній — папку `practice-03`.
2. Відкрийте папку `js-course` у VS Code (`File → Open Folder`).
3. Створіть у `practice-03` два файли:

   ```text
   js-course/
   └── practice-03/
       ├── index.html
       └── script.js
   ```

4. Заповніть `index.html`:

   ```html title="practice-03/index.html"
   <!doctype html>
   <html lang="uk">
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>Практична 3 — змінні, типи, оператори</title>
     <style>
       body {
         font-family: system-ui, sans-serif;
         max-width: 900px;
         margin: 24px auto;
         padding: 0 16px;
         background: #f8fafc;
         color: #0f172a;
       }
       h1 { font-size: 1.5rem; }
       #output {
         background: #0f172a;
         color: #e2e8f0;
         padding: 16px;
         border-radius: 8px;
         font-size: 0.95rem;
         line-height: 1.5;
         white-space: pre-wrap;   /* зберігати переноси рядків */
         min-height: 200px;
       }
     </style>
     <script src="script.js" defer></script>
   </head>
   <body>
     <h1>Практична 3: змінні, типи даних, оператори</h1>
     <p>Результати виводяться тут і в консолі DevTools (F12 → Console).</p>
     <pre id="output"></pre>
   </body>
   </html>
   ```

5. У `script.js` поки один рядок:

   ```js title="practice-03/script.js"
   console.log('Скрипт підключено!');
   ```

6. Клацніть правою кнопкою на `index.html` → **Open with Live Server** (або кнопка **Go Live** у рядку стану). Відкриється браузер за адресою на кшталт `http://127.0.0.1:5500/practice-03/index.html`.
7. Відкрийте DevTools (`F12`) → вкладка **Console**. Має бути повідомлення «Скрипт підключено!».

:::caution[Якщо повідомлення немає]
- Перевірте назву файлу в `src="script.js"` — регістр і розширення мають збігатися.
- Перевірте, чи немає червоних помилок у консолі (наприклад, `404 Not Found` — файл не знайдено).
- Переконайтеся, що зберегли обидва файли (`Ctrl+S`). У VS Code незбережений файл позначено крапкою на вкладці.
:::

### Крок 2. Допоміжні функції для виведення

Щоб бачити результати не лише в консолі, а й на сторінці, напишемо дві невеликі функції. Функції детально розберемо на лекції 4, а поки сприймайте їх як готовий інструмент: `print(...)` друкує рядок, `section(...)` — заголовок розділу.

Замініть вміст `script.js`:

```js title="practice-03/script.js"
'use strict';

// ===== Допоміжні функції виведення =====
const output = document.getElementById('output');

// Друкує повідомлення на сторінку і в консоль
function print(message) {
  output.textContent += message + '\n';
  console.log(message);
}

// Друкує заголовок розділу
function section(title) {
  print('');
  print(`===== ${title} =====`);
}

section('Перевірка');
print('Виведення працює!');
```

Збережіть — Live Server перезавантажить сторінку. У темному блоці й у консолі з'явиться заголовок і рядок «Виведення працює!».

:::note
`'use strict';` вмикає строгий режим: присвоєння неоголошеній змінній стане помилкою, а не «тихим» створенням глобальної змінної. Пишемо його першим рядком кожного скрипта.
:::

### Крок 3. Змінні та оператор typeof

Додайте в кінець `script.js`:

```js title="practice-03/script.js (додати)"
// ===== Завдання 1. Змінні та типи =====
section('1. Змінні та типи');

const studentName = 'Олена';
const course = 2;
const averageMark = 87.5;
const isBudget = true;
let scholarship;          // ще не відомо → undefined
const dormitory = null;   // свідомо «немає»

print(`studentName = ${studentName} → ${typeof studentName}`);
print(`course = ${course} → ${typeof course}`);
print(`averageMark = ${averageMark} → ${typeof averageMark}`);
print(`isBudget = ${isBudget} → ${typeof isBudget}`);
print(`scholarship = ${scholarship} → ${typeof scholarship}`);
print(`dormitory = ${dormitory} → ${typeof dormitory}`);
print(`[1, 2] → ${typeof [1, 2]}, Array.isArray: ${Array.isArray([1, 2])}`);
print(`{ a: 1 } → ${typeof { a: 1 }}`);

scholarship = 2000;       // let дозволяє переприсвоєння
print(`Після присвоєння scholarship = ${scholarship} → ${typeof scholarship}`);
```

Очікуваний результат:

```text
===== 1. Змінні та типи =====
studentName = Олена → string
course = 2 → number
averageMark = 87.5 → number
isBudget = true → boolean
scholarship = undefined → undefined
dormitory = null → object
[1, 2] → object, Array.isArray: true
{ a: 1 } → object
Після присвоєння scholarship = 2000 → number
```

Тепер **навмисно** зробіть помилку — додайте рядок `course = 3;` і збережіть. У консолі з'явиться `TypeError: Assignment to constant variable.` з посиланням на рядок. Клацніть посилання — DevTools відкриє файл на цьому рядку. Видаліть помилковий рядок.

:::tip[Експерименти в консолі]
Консоль DevTools — інтерактивний інтерпретатор. Набирайте вирази просто там: `typeof 42n`, `0.1 + 0.2`, `'5' * '2'`. Стрілка «вгору» повертає попередню команду.
:::

### Крок 4. Перетворення типів

Дані зі сторінки приходять рядками. Змоделюємо це:

```js title="practice-03/script.js (додати)"
// ===== Завдання 2. Перетворення типів =====
section('2. Перетворення типів');

// Так виглядають «сирі» значення з полів форми
const rawPrice = '149.90';
const rawQuantity = '3';
const rawWeight = '2.5кг';
const rawEmpty = '';

print(`Склеювання: ${rawPrice + rawQuantity}`);                   // '149.903'
print(`Множення (неявне перетворення): ${rawPrice * rawQuantity}`);

const price = Number(rawPrice);
const quantity = Number(rawQuantity);
print(`Number: ${price} + ${quantity} = ${price + quantity}`);

print(`Number('2.5кг') = ${Number(rawWeight)}`);         // NaN
print(`parseFloat('2.5кг') = ${parseFloat(rawWeight)}`); // 2.5
print(`Number('') = ${Number(rawEmpty)}`);               // 0 — пастка!
print(`parseFloat('') = ${parseFloat(rawEmpty)}`);       // NaN

// Перевірка коректності
const parsed = Number('abc');
print(`Number('abc') = ${parsed}, isNaN: ${Number.isNaN(parsed)}`);
print(`Number.isFinite(42): ${Number.isFinite(42)}, Number.isFinite(Infinity): ${Number.isFinite(Infinity)}`);

// До рядка і до boolean
print(`String(42) + 1 = ${String(42) + 1}`);
print(`Boolean('0') = ${Boolean('0')}, Boolean(0) = ${Boolean(0)}`);
print(`Boolean('') = ${Boolean('')}, Boolean(' ') = ${Boolean(' ')}`);
print(`!!null = ${!!null}, !![] = ${!![]}`);
```

Зверніть увагу на два рядки:

- `Number('')` дає `0`, а не `NaN`. Тобто порожнє поле «тихо» перетвориться на нуль. Тому перед перетворенням варто перевіряти, що рядок не порожній: `rawEmpty.trim() !== ''`.
- `Number` суворіший за `parseFloat`: для `'2.5кг'` повертає `NaN`. Для даних форми частіше потрібна саме суворість — краще помітити помилку, ніж прийняти «2.5кг» за число.

| Вхід | `Number()` | `parseFloat()` | `parseInt(x, 10)` |
|---|---|---|---|
| `'42'` | 42 | 42 | 42 |
| `'42.7'` | 42.7 | 42.7 | 42 |
| `'42px'` | NaN | 42 | 42 |
| `''` | 0 | NaN | NaN |
| `' 7 '` | 7 | 7 | 7 |
| `'1e3'` | 1000 | 1000 | 1 |

### Крок 5. Арифметика: рахунок у кафе

Задача: студенти замовили каву й десерти. Порахувати суму, чайові 10 %, суму на кожного з урахуванням округлення до копійок.

```js title="practice-03/script.js (додати)"
// ===== Завдання 3. Рахунок у кафе =====
section('3. Рахунок у кафе');

const coffeePrice = 58.5;
const coffeeCount = 4;
const dessertPrice = 74.9;
const dessertCount = 3;
const tipPercent = 10;
const people = 4;

const subtotal = coffeePrice * coffeeCount + dessertPrice * dessertCount;
const tip = subtotal * tipPercent / 100;
const total = subtotal + tip;
// Округлення до копійок: множимо на 100, округлюємо, ділимо
const perPerson = Math.round((total / people) * 100) / 100;

print(`Замовлення: ${subtotal.toFixed(2)} грн`);
print(`Чайові ${tipPercent} %: ${tip.toFixed(2)} грн`);
print(`Разом: ${total.toFixed(2)} грн`);
print(`З кожного (${people} особи): ${perPerson.toFixed(2)} грн`);
print(`Гарний формат: ${total.toLocaleString('uk-UA', { style: 'currency', currency: 'UAH' })}`);

// Пастка точності
print(`0.1 + 0.2 = ${0.1 + 0.2}`);
print(`Порівняння через toFixed: ${(0.1 + 0.2).toFixed(2) === '0.30'}`);
```

Очікуваний результат:

```text
===== 3. Рахунок у кафе =====
Замовлення: 458.70 грн
Чайові 10 %: 45.87 грн
Разом: 504.57 грн
З кожного (4 особи): 126.14 грн
Гарний формат: 504,57 грн
...
```

(Пробіли й символ валюти формує сам браузер за правилами локалі `uk-UA`; Chrome показує «грн», деякі інші середовища — символ «₴».)

:::caution[toFixed повертає рядок]
`(12.5).toFixed(2)` — це рядок `'12.50'`. Якщо далі додати до нього число, отримаєте склеювання: `'12.50' + 1 === '12.501'`. Використовуйте `toFixed` лише для **виведення**, а розрахунки ведіть числами.
:::

### Крок 6. Остача від ділення: перетворення часу

Задача: тривалість відео задана в секундах. Вивести її у форматі `год:хв:сек` з ведучими нулями.

```js title="practice-03/script.js (додати)"
// ===== Завдання 4. Секунди → год:хв:сек =====
section('4. Перетворення часу');

const totalSeconds = 7385;

const hours = Math.floor(totalSeconds / 3600);
const minutes = Math.floor((totalSeconds % 3600) / 60);
const seconds = totalSeconds % 60;

// padStart доповнює рядок зліва до потрібної довжини
const formatted = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

print(`${totalSeconds} с = ${formatted}`);             // 2:03:05
print(`Парне число секунд? ${totalSeconds % 2 === 0}`); // false
```

Розберемо: у годині 3600 секунд, тому `Math.floor(7385 / 3600) = 2` години. Остача `7385 % 3600 = 185` секунд, з них `Math.floor(185 / 60) = 3` хвилини. Загальна остача `7385 % 60 = 5` секунд.

Змініть `totalSeconds` на `59`, `3600`, `86399` і перевірте результат.

### Крок 7. Порівняння та логічні оператори

```js title="practice-03/script.js (додати)"
// ===== Завдання 5. Порівняння та логіка =====
section('5. Порівняння та логіка');

print(`5 == '5': ${5 == '5'}, 5 === '5': ${5 === '5'}`);
print(`null == undefined: ${null == undefined}, null === undefined: ${null === undefined}`);
print(`'10' > '9': ${'10' > '9'} (рядки!), 10 > 9: ${10 > 9}`);
print(`NaN === NaN: ${NaN === NaN}`);

// Умова доступу до іспиту
const attendance = 82;   // відвідування, %
const labsDone = 9;
const labsTotal = 10;
const hasDebt = false;

const canTakeExam = attendance >= 75 && labsDone >= labsTotal * 0.8 && !hasDebt;
print(`Допуск до іспиту: ${canTakeExam}`);

// Значення && і || — не обов'язково boolean
print(`'' || 'Гість' → ${'' || 'Гість'}`);
print(`'Олена' && 'вітаємо' → ${'Олена' && 'вітаємо'}`);
print(`0 && 'не дійде' → ${0 && 'не дійде'}`);
```

Очікувано `canTakeExam` дорівнює `true`. Змініть `hasDebt` на `true` або `attendance` на `70` — результат має стати `false`.

### Крок 8. Оператори ?? і ?.

```js title="practice-03/script.js (додати)"
// ===== Завдання 6. ?? та ?. =====
section('6. Оператори ?? і ?.');

const settings = {
  discount: 0,           // знижка свідомо нульова
  theme: '',             // тема не вибрана (порожній рядок)
  user: null,            // користувач не авторизований
};

print(`discount || 10 = ${settings.discount || 10}`);   // 10 — неправильно!
print(`discount ?? 10 = ${settings.discount ?? 10}`);   // 0 — правильно
print(`theme || 'light' = ${settings.theme || 'light'}`);
print(`theme ?? 'light' = "${settings.theme ?? 'light'}"`);

// Безпечний доступ до вкладених властивостей
print(`user?.name = ${settings.user?.name}`);
print(`user?.name ?? 'Анонім' = ${settings.user?.name ?? 'Анонім'}`);

// А без ?. буде помилка — розкоментуйте рядок і перевірте консоль:
// print(settings.user.name);

// Оператори присвоєння
let limit = null;
limit ??= 500;
let counter = 10;
counter += 5;
counter *= 2;
print(`limit = ${limit}, counter = ${counter}`);       // 500, 30
```

Висновок: `||` підставляє значення за замовчуванням для **будь-якого** falsy (зокрема `0` і `''`), а `??` — лише для `null` і `undefined`.

### Крок 9. Рядки та шаблонні рядки

Задача: з «брудних» даних сформувати охайну картку студента.

```js title="practice-03/script.js (додати)"
// ===== Завдання 7. Рядки =====
section('7. Рядки');

const rawFirstName = '  оЛЕНА ';
const rawLastName = 'коваль';
const groupCode = 'ipz-21';

// Нормалізуємо: прибираємо пробіли, перша літера велика, решта малі
const firstName = rawFirstName.trim()[0].toUpperCase() + rawFirstName.trim().slice(1).toLowerCase();
const lastName = rawLastName[0].toUpperCase() + rawLastName.slice(1).toLowerCase();
const group = groupCode.toUpperCase();
const initials = `${firstName[0]}.${lastName[0]}.`;
const login = `${lastName.toLowerCase()}.${firstName[0].toLowerCase()}`;

print(`ПІБ: ${lastName} ${firstName}`);
print(`Ініціали: ${initials}`);
print(`Група: ${group}, курс: ${group.at(-2)}`);
print(`Логін: ${login}`);
print(`Довжина прізвища: ${lastName.length}`);
print(`Прізвище містить "ва": ${lastName.includes('ва')}`);

// Багаторядковий шаблонний рядок
const card = `
┌───────────────────────────┐
  Студент: ${lastName} ${firstName}
  Група:   ${group}
  Статус:  ${isBudget ? 'бюджет' : 'контракт'}
└───────────────────────────┘`;
print(card);
```

Результат:

```text
ПІБ: Коваль Олена
Ініціали: О.К.
Група: IPZ-21, курс: 2
Логін: коваль.о
...
```

### Крок 10. Введення даних через prompt

Наостанок — задача з введенням від користувача. `prompt()` показує модальне вікно і повертає рядок (або `null`, якщо натиснули «Скасувати»).

```js title="practice-03/script.js (додати)"
// ===== Завдання 8. Конвертер температури =====
section('8. Конвертер температури');

const rawCelsius = prompt('Температура в °C:', '20');

if (rawCelsius === null || rawCelsius.trim() === '') {
  print('Введення скасовано або порожнє');
} else {
  const celsius = Number(rawCelsius.replace(',', '.')); // дозволяємо кому
  if (Number.isNaN(celsius)) {
    print(`"${rawCelsius}" — не число`);
  } else {
    const fahrenheit = celsius * 9 / 5 + 32;
    const kelvin = celsius + 273.15;
    print(`${celsius} °C = ${fahrenheit.toFixed(1)} °F = ${kelvin.toFixed(2)} K`);
  }
}
```

Тут уперше трапляється `if...else` — детально ми розбирали його на лекції 2. Перевірте поведінку для введення `36,6`, `abc`, порожнього рядка й кнопки «Скасувати».

:::note
`prompt()` блокує сторінку і в реальних сайтах майже не використовується — замість нього форми. Але для навчальних вправ він зручний. Коли набридне вводити значення при кожному збереженні, закоментуйте цей блок.
:::

**Результат роботи:** сторінка `practice-03/index.html` виводить на сторінку і в консоль результати восьми завдань; код упорядкований за розділами з коментарями.

## Завдання для самостійного виконання

Розв'язки додавайте в той самий `script.js` окремими розділами `section('С1. ...')`.

1. ★ **Площа і периметр.** Для прямокутника зі сторонами `a = 7.5` і `b = 4` виведіть площу, периметр і довжину діагоналі (теорема Піфагора, `Math.sqrt` або `Math.hypot`), округлену до двох знаків.
2. ★ **Обмін значень.** Є `let x = 'ліво'; let y = 'право';`. Поміняйте значення місцями: а) через третю змінну; б) деструктуруванням `[x, y] = [y, x]`. Виведіть до і після.
3. ★ **Таблиця typeof.** Виведіть результат `typeof` для: `42n`, `Symbol()`, `function () {}`, `new Date()`, `NaN`, `[]`, `null`, `undefined`. Біля кожного напишіть коментар, чи збігся результат з вашим очікуванням.
4. ★★ **Індекс маси тіла.** Через два `prompt` отримайте зріст (см) і вагу (кг), обчисліть ІМТ = вага / (зріст у метрах)², округліть до 1 знака. Через тернарні оператори або `if` виведіть категорію: < 18.5 — недостатня, < 25 — норма, < 30 — надлишкова, інакше — ожиріння. Перевіряйте коректність введення.
5. ★★ **Ціна зі знижкою.** Ціна товару `1299` грн, знижка `15` %, промокод на мінус `100` грн діє, лише якщо ціна після знижки більше `1000`. Виведіть ціну до/після знижки, чи спрацював промокод (логічний вираз) і фінальну ціну у форматі `uk-UA` з валютою.
6. ★★★ **Вік у днях.** Користувач вводить дату народження `YYYY-MM-DD`. Обчисліть повну кількість прожитих днів (`new Date(...)`, різниця в мілісекундах, `Math.floor`) і кількість днів до наступного дня народження. Подумайте, що буде, якщо день народження сьогодні.
7. ★★★ **Пастки перетворення.** Поясніть у коментарях результат кожного виразу, перевірте в консолі: `[] + {}`, `[] == false`, `null + 1`, `undefined + 1`, `'b' + 'a' + +'a' + 'a'`, `true + true + '1'`.

## Контрольні питання

1. Навіщо потрібен Live Server, якщо HTML-файл можна відкрити подвійним клацанням?
2. Чому скрипт підключаємо з атрибутом `defer`? Що станеться без нього, якщо `<script>` стоїть у `<head>`?
3. Що поверне `typeof` для `null`, масиву і функції?
4. Чим відрізняються `Number('12px')` і `parseFloat('12px')`? Що безпечніше для перевірки даних форми?
5. Чому `Number('')` — пастка? Як її уникнути?
6. Як правильно перевірити, що значення — `NaN`?
7. Чому `toFixed` не варто використовувати в проміжних розрахунках?
8. Як за допомогою `%` і `Math.floor` перевести секунди в хвилини й секунди?
9. Коли `a || b` і `a ?? b` дають різні результати?
10. Що поверне `prompt()`, якщо користувач натиснув «Скасувати»?

## Домашнє завдання

1. Завершіть завдання ★ і ★★, які не встигли на парі.
2. **Розрахунок стипендії.** Створіть змінні: середній бал `avg`, чи є академборги `hasDebt`, чи є соціальна пільга `hasBenefit`. Базова стипендія 2000 грн; якщо `avg >= 90` — підвищена (+25 %); при боргах стипендії немає (0); пільга додає 1000 грн незалежно від балу. Виведіть результат шаблонним рядком і перевірте мінімум чотири комбінації вхідних даних (запишіть їх у коментарях).
3. Прочитайте на MDN статтю [Equality comparisons and sameness](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness) (розділ про `===` та `Object.is`) і запишіть одним реченням, чим `Object.is(NaN, NaN)` відрізняється від `NaN === NaN`.

## Що здати

- Папку `practice-03/` (`index.html` і `script.js`) — архівом або посиланням на репозиторій.
- Скриншот сторінки з результатами всіх розділів і відкритою консоллю DevTools.
- Відповіді на контрольні питання (усно під час захисту або письмово).
