---
title: "Умовні конструкції, цикли, функції"
description: "Розв'язуємо задачі на розгалуження, цикли та функції: шкала оцінювання, switch, FizzBuzz, таблиця множення, прості числа, валідація пароля, колбеки, замикання, рекурсія і гра «Вгадай число»."
type: practice
pair: 5
topic: 47
---

## Мета роботи

- Закріпити використання `if...else if...else`, тернарного оператора і `switch`.
- Відпрацювати цикли `for`, `while`, `for...of`, а також `break` і `continue` на типових алгоритмах.
- Навчитися оформлювати розв'язки як **функції** з параметрами і `return`, а не як набір розрізнених рядків.
- Написати простий механізм автоматичної перевірки результатів функцій (`check`).
- Попрактикуватися з параметрами за замовчуванням, rest-параметрами, колбеками, замиканнями та рекурсією.

## Що потрібно

- VS Code з розширенням Live Server, Chrome з DevTools.
- Папка `js-course/` з практичної 3 (з неї скопіюємо заготовку сторінки).
- Конспект лекцій 2 і 4.

## Короткі теоретичні відомості

- `if...else if` виконує **першу** гілку з істинною умовою — порядок важливий. Для дій — `if`, для вибору значення — тернарний оператор.
- `switch` порівнює строго (`===`) і «провалюється» без `break`. Кілька `case` поспіль об'єднують варіанти.
- Цикли: `for` — коли потрібен лічильник, `while` — коли кількість повторень невідома, `for...of` — перебір значень масиву чи рядка. `break` завершує цикл, `continue` — поточну ітерацію.
- Функція, що **обчислює**, повертає результат через `return`; виведення робить окремий код. Параметри за замовчуванням — `function f(a, b = 10)`, rest — `function f(...items)`.
- Колбек — функція, передана як аргумент. Замикання — функція, що пам'ятає змінні місця свого створення.
- Рекурсія — виклик функцією самої себе; обов'язковий базовий випадок.

## Хід роботи

### Крок 1. Заготовка проєкту

1. У папці `js-course` створіть папку `practice-05` з файлами `index.html` і `script.js`.
2. Скопіюйте `index.html` з `practice-03` і змініть лише заголовки:

   ```html title="practice-05/index.html" {6,14}
   <!doctype html>
   <html lang="uk">
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>Практична 5 — умови, цикли, функції</title>
     <style>
       body { font-family: system-ui, sans-serif; max-width: 900px; margin: 24px auto; padding: 0 16px; background: #f8fafc; color: #0f172a; }
       #output { background: #0f172a; color: #e2e8f0; padding: 16px; border-radius: 8px; line-height: 1.5; white-space: pre-wrap; min-height: 200px; }
     </style>
     <script src="script.js" defer></script>
   </head>
   <body>
     <h1>Практична 5: умови, цикли, функції</h1>
     <pre id="output"></pre>
   </body>
   </html>
   ```

3. У `script.js` додайте допоміжні функції. Тепер, після лекції 4, ви розумієте, як вони влаштовані. Нова функція `check` порівнює фактичний результат з очікуваним і друкує позначку — так ми автоматично перевірятимемо свої функції.

   ```js title="practice-05/script.js"
   'use strict';

   // ===== Допоміжні функції =====
   const output = document.getElementById('output');

   function print(message = '') {
     output.textContent += message + '\n';
     console.log(message);
   }

   function section(title) {
     print();
     print(`===== ${title} =====`);
   }

   // Порівнює результат з очікуваним і друкує ✔ або ✘
   function check(label, actual, expected) {
     const ok = actual === expected;
     print(`${ok ? '✔' : '✘'} ${label} → ${actual}${ok ? '' : ` (очікувалось ${expected})`}`);
   }
   ```

4. Запустіть Live Server і відкрийте консоль. Поки сторінка порожня — так і має бути.

:::note
`check` порівнює через `===`, тому підходить для примітивів (чисел, рядків, boolean). Масиви й об'єкти так порівнювати не можна — два різні масиви з однаковим вмістом не рівні. Для них ми порівнюватимемо рядкове представлення: `String([1, 2])` → `'1,2'`.
:::

### Крок 2. Розгалуження: шкала оцінювання

Задача: перевести бал за 100-бальною шкалою в оцінку ECTS і національну шкалу.

| Бал | ECTS | Національна |
|---|---|---|
| 90–100 | A | відмінно |
| 82–89 | B | добре |
| 74–81 | C | добре |
| 64–73 | D | задовільно |
| 60–63 | E | задовільно |
| 0–59 | FX/F | незадовільно |

```js title="practice-05/script.js (додати)"
// ===== Завдання 1. Шкала оцінювання =====
function getEctsGrade(score) {
  // Ранній вихід для некоректних даних
  if (typeof score !== 'number' || Number.isNaN(score) || score < 0 || score > 100) {
    return null;
  }
  if (score >= 90) return 'A';
  if (score >= 82) return 'B';
  if (score >= 74) return 'C';
  if (score >= 64) return 'D';
  if (score >= 60) return 'E';
  if (score >= 35) return 'FX';
  return 'F';
}

function getNationalGrade(ects) {
  switch (ects) {
    case 'A':
      return 'відмінно';
    case 'B':
    case 'C':
      return 'добре';
    case 'D':
    case 'E':
      return 'задовільно';
    case 'FX':
    case 'F':
      return 'незадовільно';
    default:
      return 'невідомо';
  }
}

section('1. Шкала оцінювання');
check('95', getEctsGrade(95), 'A');
check('82 (межа)', getEctsGrade(82), 'B');
check('81.9', getEctsGrade(81.9), 'C');
check('60', getEctsGrade(60), 'E');
check('40', getEctsGrade(40), 'FX');
check('-5', getEctsGrade(-5), null);
check('"90" (рядок)', getEctsGrade('90'), null);
check('національна для C', getNationalGrade('C'), 'добре');

// Таблиця для групи
const scores = [97, 85, 73, 61, 58, 30];
for (const score of scores) {
  const ects = getEctsGrade(score);
  print(`${String(score).padStart(3)} → ${ects.padEnd(2)} (${getNationalGrade(ects)})`);
}
```

Зверніть увагу:

- Усередині `switch` ми використовуємо `return` замість `break` — він і так завершує функцію.
- Перевірки йдуть від найбільшого порогу до найменшого. Спробуйте переставити `if (score >= 60)` першим — тести покажуть ✘.
- Рядок `'90'` відхиляється: функція чекає саме число. Перетворення типів — відповідальність коду, що читає введення.

### Крок 3. Тернарний оператор і логічні умови

Задача: функція визначає вартість квитка в кінотеатр.

- базова ціна 180 грн; у вівторок — 120 грн (день знижок);
- діти до 12 років і пенсіонери від 65 — знижка 50 %;
- студенти з квитком — знижка 30 % (не поєднується з віковою, береться більша).

```js title="practice-05/script.js (додати)"
// ===== Завдання 2. Квиток у кіно =====
function getTicketPrice(age, isStudent = false, weekday = 1) {
  const basePrice = weekday === 2 ? 120 : 180;   // 2 — вівторок
  const isAgeDiscount = age < 12 || age >= 65;

  let discount = 0;
  if (isAgeDiscount) {
    discount = 50;
  } else if (isStudent) {
    discount = 30;
  }

  // Спочатку множимо, потім ділимо: 180 * 0.7 дало б 125.99999999999999
  return (basePrice * (100 - discount)) / 100;
}

section('2. Квиток у кіно');
check('дорослий, пн', getTicketPrice(30), 180);
check('дорослий, вт', getTicketPrice(30, false, 2), 120);
check('студент, пн', getTicketPrice(19, true), 126);
check('дитина-студент?', getTicketPrice(10, true), 90);
check('пенсіонер, вт', getTicketPrice(70, false, 2), 60);

const age = 19;
print(`Вам ${age}: ${age >= 18 ? 'можна на фільм 18+' : 'фільм 18+ недоступний'}`);
```

### Крок 4. Цикли: FizzBuzz і таблиця множення

```js title="practice-05/script.js (додати)"
// ===== Завдання 3. FizzBuzz =====
function fizzBuzz(n) {
  if (n % 15 === 0) return 'FizzBuzz';
  if (n % 3 === 0) return 'Fizz';
  if (n % 5 === 0) return 'Buzz';
  return String(n);
}

section('3. FizzBuzz');
check('3', fizzBuzz(3), 'Fizz');
check('10', fizzBuzz(10), 'Buzz');
check('30', fizzBuzz(30), 'FizzBuzz');
check('7', fizzBuzz(7), '7');

let line = '';
for (let i = 1; i <= 20; i++) {
  line += fizzBuzz(i) + ' ';
}
print(line);

// ===== Завдання 4. Таблиця множення =====
function multiplicationTable(size = 9) {
  let table = '';
  for (let row = 1; row <= size; row++) {
    let rowText = '';
    for (let col = 1; col <= size; col++) {
      rowText += String(row * col).padStart(4); // вирівнювання стовпців
    }
    table += rowText + '\n';
  }
  return table;
}

section('4. Таблиця множення');
print(multiplicationTable(9));
```

Ми відокремили логіку від виведення: `fizzBuzz` повертає рядок для одного числа, а цикл збирає результат. Тепер `fizzBuzz` легко перевірити тестами.

На сторінці має з'явитися рівна таблиця 9 × 9 завдяки `padStart(4)` і моноширинному шрифту блоку `<pre>`.

### Крок 5. break і continue: прості числа

**Просте число** — натуральне число більше 1, що ділиться лише на 1 і на себе. Перевіряти дільники достатньо до квадратного кореня з числа: якщо `n = a × b` і `a > √n`, то `b < √n` — такий дільник ми вже знайшли б.

```js title="practice-05/script.js (додати)"
// ===== Завдання 5. Прості числа =====
function isPrime(n) {
  if (!Number.isInteger(n) || n < 2) return false;
  for (let d = 2; d * d <= n; d++) {
    if (n % d === 0) return false;   // знайшли дільник — далі перевіряти не треба
  }
  return true;
}

function primesUpTo(limit) {
  const primes = [];
  for (let n = 2; n <= limit; n++) {
    if (!isPrime(n)) continue;       // пропускаємо складені
    primes.push(n);
  }
  return primes;
}

section('5. Прості числа');
check('isPrime(2)', isPrime(2), true);
check('isPrime(1)', isPrime(1), false);
check('isPrime(97)', isPrime(97), true);
check('isPrime(91)', isPrime(91), false);  // 7 × 13
check('прості до 20', String(primesUpTo(20)), '2,3,5,7,11,13,17,19');
print(`Простих чисел до 100: ${primesUpTo(100).length}`); // 25

// Перше просте число, більше за 1000 — while + break
let candidate = 1001;
while (true) {
  if (isPrime(candidate)) break;
  candidate++;
}
print(`Перше просте після 1000: ${candidate}`); // 1009
```

:::caution[while (true)]
Цикл `while (true)` безпечний лише тоді, коли **гарантовано** спрацює `break`. Тут це так: простих чисел нескінченно багато. Якщо не впевнені — додайте обмеження кількості ітерацій.
:::

### Крок 6. Параметри за замовчуванням і rest

```js title="practice-05/script.js (додати)"
// ===== Завдання 6. Статистика оцінок =====
function average(...numbers) {
  if (numbers.length === 0) return 0;
  let sum = 0;
  for (const n of numbers) {
    sum += n;
  }
  return sum / numbers.length;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function describeMarks(name, ...marks) {
  const avg = round(average(...marks), 1);
  const best = Math.max(...marks);
  const worst = Math.min(...marks);
  return `${name}: оцінок ${marks.length}, середня ${avg}, найкраща ${best}, найгірша ${worst}`;
}

section('6. Rest-параметри');
check('average()', average(), 0);
check('average(2, 4, 9)', average(2, 4, 9), 5);
check('round(3.14159)', round(3.14159), 3.14);
check('round(3.14159, 0)', round(3.14159, 0), 3);
print(describeMarks('Олена', 90, 85, 77, 100));
print(describeMarks('Тарас', 64, 70));
```

Зверніть увагу на два різні використання `...`: у **оголошенні** `function average(...numbers)` — це rest (збирає аргументи в масив), а у **виклику** `average(...marks)` — spread (розгортає масив в аргументи).

### Крок 7. Перебір рядка: валідація пароля

Задача: функція перевіряє пароль і повертає **масив повідомлень про помилки** (порожній, якщо пароль надійний).

Вимоги: довжина ≥ 8, принаймні одна цифра, одна велика й одна мала латинська літера, без пробілів.

```js title="practice-05/script.js (додати)"
// ===== Завдання 7. Валідація пароля =====
function validatePassword(password) {
  const errors = [];

  if (password.length < 8) {
    errors.push('щонайменше 8 символів');
  }

  let hasDigit = false;
  let hasUpper = false;
  let hasLower = false;
  let hasSpace = false;

  for (const char of password) {
    if (char >= '0' && char <= '9') hasDigit = true;
    else if (char >= 'A' && char <= 'Z') hasUpper = true;
    else if (char >= 'a' && char <= 'z') hasLower = true;
    else if (char === ' ') hasSpace = true;
  }

  if (!hasDigit) errors.push('потрібна цифра');
  if (!hasUpper) errors.push('потрібна велика літера');
  if (!hasLower) errors.push('потрібна мала літера');
  if (hasSpace) errors.push('пробіли заборонені');

  return errors;
}

section('7. Валідація пароля');
const passwords = ['qwerty', 'Qwerty123', 'my pass 1A', 'ABCDEFGH1', 'Str0ngPass'];
for (const pwd of passwords) {
  const errors = validatePassword(pwd);
  const verdict = errors.length === 0 ? 'надійний' : errors.join(', ');
  print(`"${pwd}": ${verdict}`);
}
check('Str0ngPass', validatePassword('Str0ngPass').length, 0);
```

Очікуваний результат:

```text
"qwerty": щонайменше 8 символів, потрібна цифра, потрібна велика літера
"Qwerty123": надійний
"my pass 1A": пробіли заборонені
"ABCDEFGH1": потрібна мала літера
"Str0ngPass": надійний
```

Тут використано **прапорці** (flags) — змінні-boolean, які встановлюються в `true`, щойно знайдено потрібний символ. Порівняння символів `char >= 'A' && char <= 'Z'` працює, бо латинські літери мають послідовні коди Unicode.

### Крок 8. Колбеки та функції вищого порядку

```js title="practice-05/script.js (додати)"
// ===== Завдання 8. Колбеки =====
// Власні аналоги методів масивів
function mapArray(items, transform) {
  const result = [];
  for (const item of items) {
    result.push(transform(item));
  }
  return result;
}

function filterArray(items, predicate) {
  const result = [];
  for (const item of items) {
    if (predicate(item)) result.push(item);
  }
  return result;
}

section('8. Колбеки');
const prices = [120, 45.5, 999, 300, 15];

const withVat = mapArray(prices, (p) => round(p * 1.2));
const cheap = filterArray(prices, (p) => p < 100);
const evens = filterArray([10, 11, 12, 13], (n) => n % 2 === 0);

check('з ПДВ', String(withVat), '144,54.6,1198.8,360,18');
check('дешевші за 100', String(cheap), '45.5,15');
check('парні', String(evens), '10,12');

// Передаємо іменовану функцію — без дужок!
check('прості серед 1..12', String(filterArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], isPrime)), '2,3,5,7,11');

// Колбек із затримкою
setTimeout(() => print('(повідомлення з setTimeout через 1 с)'), 1000);
```

Зверніть увагу: повідомлення з `setTimeout` з'явиться **останнім**, навіть після розділів, що йдуть нижче в коді. `setTimeout` не зупиняє програму — він «записує» колбек на майбутнє. Детально про це — на лекції 12.

### Крок 9. Замикання: лічильник і гаманець

```js title="practice-05/script.js (додати)"
// ===== Завдання 9. Замикання =====
function createWallet(initial = 0) {
  let balance = initial;            // приватний стан

  function deposit(amount) {
    if (amount <= 0) return false;
    balance += amount;
    return true;
  }

  function withdraw(amount) {
    if (amount <= 0 || amount > balance) return false;
    balance -= amount;
    return true;
  }

  function getBalance() {
    return balance;
  }

  // Повертаємо об'єкт із трьома функціями — усі вони «бачать» balance
  return { deposit, withdraw, getBalance };
}

section('9. Замикання');
const wallet = createWallet(500);
check('поповнення 200', wallet.deposit(200), true);
check('зняття 1000 (забагато)', wallet.withdraw(1000), false);
check('зняття 150', wallet.withdraw(150), true);
check('баланс', wallet.getBalance(), 550);
print(`Прямий доступ wallet.balance: ${wallet.balance}`); // undefined — змінна прихована

const other = createWallet();
check('другий гаманець незалежний', other.getBalance(), 0);
```

`balance` неможливо змінити ззовні інакше, ніж через `deposit` і `withdraw`, які перевіряють коректність суми. Це і є інкапсуляція (encapsulation) на основі замикань.

### Крок 10. Рекурсія

```js title="practice-05/script.js (додати)"
// ===== Завдання 10. Рекурсія =====
function factorial(n) {
  if (n <= 1) return 1;               // базовий випадок
  return n * factorial(n - 1);
}

// Сума цифр числа: 1234 → 1 + 2 + 3 + 4 = 10
function sumDigits(n) {
  if (n < 10) return n;
  return (n % 10) + sumDigits(Math.floor(n / 10));
}

// Рядок задом наперед
function reverse(str) {
  if (str.length <= 1) return str;
  return reverse(str.slice(1)) + str[0];
}

section('10. Рекурсія');
check('5!', factorial(5), 120);
check('0!', factorial(0), 1);
check('sumDigits(1234)', sumDigits(1234), 10);
check('reverse("Київ")', reverse('Київ'), 'вїиК');
check('паліндром "радар"', reverse('радар') === 'радар', true);
```

Поставте точку зупинки на рядку `return n * factorial(n - 1);` у вкладці **Sources**, перезавантажте сторінку і подивіться на панель **Call Stack** — там буде кілька вкладених викликів `factorial`.

### Крок 11. Гра «Вгадай число»

Підсумкове завдання поєднує все: цикл `while` з невідомою кількістю ітерацій, умови, функції та `prompt`.

```js title="practice-05/script.js (додати)"
// ===== Завдання 11. Гра «Вгадай число» =====
function randomInt(min, max) {
  // Ціле випадкове від min до max включно
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function playGuessGame(min = 1, max = 100, maxAttempts = 7) {
  const secret = randomInt(min, max);
  let attempts = 0;

  while (attempts < maxAttempts) {
    const raw = prompt(`Вгадайте число від ${min} до ${max}. Спроба ${attempts + 1} з ${maxAttempts}`);

    if (raw === null) {
      return `Гру перервано. Було загадано ${secret}.`;
    }

    const guess = Number(raw);
    if (raw.trim() === '' || !Number.isInteger(guess)) {
      alert('Введіть ціле число');
      continue;                       // невдалу спробу не рахуємо
    }

    attempts++;

    if (guess === secret) {
      return `Вітаємо! Число ${secret} вгадано за ${attempts} спроб.`;
    }
    alert(guess < secret ? 'Загадане число більше' : 'Загадане число менше');
  }

  return `Спроби закінчилися. Було загадано ${secret}.`;
}

section('11. Вгадай число');
// Розкоментуйте, щоб зіграти:
// print(playGuessGame());
```

Розкоментуйте останній рядок і зіграйте. Подумайте: чому 7 спроб завжди достатньо для діапазону 1–100, якщо щоразу називати середину інтервалу? (Підказка: 2⁷ = 128.)

**Результат роботи:** сторінка `practice-05` виводить результати одинадцяти завдань, усі перевірки `check` позначені ✔, гра працює через діалогові вікна.

## Завдання для самостійного виконання

Кожне завдання оформіть як функцію з `return` і перевірте мінімум трьома викликами `check`.

1. ★ `isLeapYear(year)` — чи є рік високосним (ділиться на 4, але не на 100, або ділиться на 400). Перевірте 2024, 1900, 2000, 2025.
2. ★ `getSeason(month)` через `switch` з груповими `case`; для некоректного місяця — `'невідомо'`.
3. ★ `sumRange(from, to)` — сума цілих чисел від `from` до `to` включно (цикл `for`). Що повертати, якщо `from > to`?
4. ★★ `countVowels(str)` — кількість голосних українських літер (`аеєиіїоуюя`) у рядку без урахування регістру. Підказка: `'аеєиіїоуюя'.includes(char)`.
5. ★★ `formatList(...items)` — повертає рядок «a, b і c» (для одного елемента — просто «a», для двох — «a і b», для нуля — порожній рядок).
6. ★★ `createCounter(start = 0, step = 1)` — замикання з методами `next()`, `reset()` і `value()`.
7. ★★★ `fibonacci(n)` — n-те число Фібоначчі двома способами: рекурсивно і циклом. Виміряйте час для `n = 30` через `console.time('fib')` / `console.timeEnd('fib')` і поясніть різницю.
8. ★★★ `drawDiamond(size)` — повертає рядок з ромбом із символів `*` висотою `2 × size − 1` рядків (вкладені цикли, `repeat`).

## Контрольні питання

1. Чому в функції `getEctsGrade` перевірки йдуть від більшого порогу до меншого?
2. Чому в `switch` усередині функції можна писати `return` замість `break`?
3. Навіщо відокремлювати обчислення (`fizzBuzz(n)`) від виведення? Як це допомагає тестуванню?
4. Чому для перевірки простоти достатньо шукати дільники до `√n`?
5. Коли безпечно використовувати `while (true)`?
6. Чим `...` в оголошенні функції відрізняється від `...` у виклику?
7. Що таке прапорець у циклі? Наведіть приклад з цієї роботи.
8. Чому повідомлення з `setTimeout` з'явилося після результатів наступних розділів?
9. Як замикання в `createWallet` захищає баланс від некоректної зміни?
10. Що станеться з `factorial`, якщо прибрати базовий випадок?

## Домашнє завдання

1. Завершіть усі завдання ★ і щонайменше два ★★.
2. Напишіть функцію `calcDelivery(weightKg, distanceKm, isExpress = false)`: 50 грн базово + 10 грн за кожен повний або неповний кілограм понад 1 кг (`Math.ceil`) + 2 грн за км; експрес-доставка множить вартість на 1.5; посилки понад 30 кг не приймаються (повертайте `null`). Покрийте функцію п'ятьма перевірками `check`, зокрема граничними значеннями (1 кг, 30 кг, 30.1 кг).

## Що здати

- Папку `practice-05/` (`index.html`, `script.js`) архівом або посиланням на репозиторій.
- Скриншот сторінки, на якому видно результати перевірок (усі ✔).
- На захисті — пояснити роботу однієї з функцій ★★/★★★ і відповісти на контрольні питання.
