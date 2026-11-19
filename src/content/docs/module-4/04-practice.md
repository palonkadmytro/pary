---
title: "Основи PHP: змінні, масиви, оператори"
description: "Перші PHP-сторінки: досліджуємо типи і приведення, будуємо електронний журнал групи з багатовимірного масиву (середні бали, шкала ECTS через match, статистика) і рахуємо кошик інтернет-магазину з промокодом і доставкою."
type: practice
pair: 4
topic: 60
---

## Мета роботи

- Закріпити роботу зі змінними, константами і типами даних PHP; на практиці побачити приведення типів і різницю між `==` та `===`.
- Навчитися створювати індексовані, асоціативні та багатовимірні масиви й обробляти їх циклом `foreach`.
- Використати арифметичні оператори, оператори порівняння, `??`, тернарний оператор і вираз `match`.
- Навчитися вбудовувати PHP у HTML з альтернативним синтаксисом керуючих конструкцій.
- Створити три сторінки в папці `practice-04`: дослідження типів, журнал групи і кошик.

## Що потрібно

| Програма | Призначення |
|---|---|
| **XAMPP** з PHP 8.2+ (запущений Apache) або PHP через Homebrew | Виконання PHP-скриптів |
| **VS Code** + PHP Intelephense | Редактор з підказками |
| Браузер з DevTools | Перегляд результату і коду сторінки (`Ctrl+U`) |

Матеріал лекцій 1–2: синтаксис PHP-файлу, типи, рядки, масиви, оператори, `match`, `foreach`.

## Короткі теоретичні відомості

PHP-файл може містити HTML і вставки коду. Типова структура сторінки — **спочатку логіка, потім шаблон**:

```php
<?php
declare(strict_types=1);

// 1. Дані та обчислення — тут немає жодного HTML
$items = ['PHP', 'MySQL'];
$count = count($items);
?>
<!-- 2. Шаблон — тут лише виведення, без складних обчислень -->
<p>Технологій: <?= $count ?></p>
```

Такий поділ — перший крок до архітектури, яку ми згодом використаємо в «Міні-блозі»: обчислення окремо, відображення окремо.

Нагадування щодо ключових конструкцій:

| Задача | Конструкція |
|---|---|
| Значення з типовим запасним варіантом | `$x = $arr['key'] ?? 'default';` |
| Вибір значення за умовою | `$a > $b ? 'так' : 'ні'` |
| Вибір значення з багатьох варіантів | `match (true) { $x >= 90 => 'A', default => 'F' }` |
| Перебір масиву | `foreach ($arr as $key => $value)` |
| Цикл у шаблоні | `<?php foreach (...): ?> ... <?php endforeach; ?>` |
| Умова в шаблоні | `<?php if (...): ?> ... <?php else: ?> ... <?php endif; ?>` |
| Форматування числа | `number_format($n, 2, ',', ' ')` → `1 234,50` |

## Хід роботи

### Крок 1. Підготовка папки і перевірка середовища

1. Запустіть Apache в XAMPP Control Panel.
2. Створіть папку `C:\xampp\htdocs\practice-04` (на macOS — `/Applications/XAMPP/htdocs/practice-04` або будь-яку папку, якщо використовуєте `php -S`).
3. Відкрийте папку у VS Code: **File → Open Folder**.
4. Створіть файл `check.php`:

   ```php title="check.php"
   <?php
   declare(strict_types=1);

   echo 'PHP ' . PHP_VERSION . ' працює! ';
   echo 'Сьогодні ' . date('d.m.Y H:i');
   ```

5. Відкрийте `http://localhost/practice-04/check.php`. Якщо використовуєте вбудований сервер:

   ```bash
   cd /шлях/до/practice-04
   php -S localhost:8000
   # далі відкрийте http://localhost:8000/check.php
   ```

Очікуваний результат: рядок на кшталт «PHP 8.4.3 працює! Сьогодні 13.02.2026 10:20». Якщо час відрізняється на кілька годин — у `php.ini` не встановлено `date.timezone = Europe/Kyiv` (див. лекцію 1).

### Крок 2. Спільні стилі

Щоб сторінки виглядали охайно, створіть простий CSS-файл. Він не є метою роботи, тому просто скопіюйте його:

```css title="style.css"
* { box-sizing: border-box; }
body {
  font-family: system-ui, sans-serif;
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px;
  color: #1e293b;
  background: #f8fafc;
  line-height: 1.5;
}
h1 { margin-top: 0; }
nav { display: flex; gap: 16px; margin-bottom: 24px; }
nav a { color: #2563eb; }
table { width: 100%; border-collapse: collapse; background: #fff; margin-bottom: 24px; }
th, td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
th { background: #f1f5f9; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
.badge { display: inline-block; min-width: 32px; padding: 2px 8px; border-radius: 6px; text-align: center; font-weight: 600; }
.grade-A, .grade-B { background: #dcfce7; color: #166534; }
.grade-C, .grade-D, .grade-E { background: #fef9c3; color: #854d0e; }
.grade-FX, .grade-F { background: #fee2e2; color: #991b1b; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
pre { background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 8px; overflow-x: auto; }
```

### Крок 3. Дослідження типів і приведення

Створіть файл `types.php`. Ми зберемо в масив набір виразів, обчислимо їх і виведемо тип та значення кожного.

```php title="types.php"
<?php
declare(strict_types=1);

// Ключ — вираз у вигляді тексту, значення — результат обчислення цього виразу
$experiments = [
    "'5' + 3"           => '5' + 3,
    "'5' . 3"           => '5' . 3,
    '10 / 4'            => 10 / 4,
    '10 / 5'            => 10 / 5,
    'intdiv(10, 4)'     => intdiv(10, 4),
    '10 % 4'            => 10 % 4,
    '2 ** 10'           => 2 ** 10,
    '0.1 + 0.2 == 0.3'  => 0.1 + 0.2 == 0.3,
    '(int) "42abc"'     => (int) '42abc',
    '(bool) "0"'        => (bool) '0',
    '(bool) "false"'    => (bool) 'false',
    '(bool) []'         => (bool) [],
    "1 == '1'"          => 1 == '1',
    "1 === '1'"         => 1 === '1',
    "'abc' == 0"        => 'abc' == 0,
    "null ?? 'типове'"  => null ?? 'типове',
    "'' ?: 'порожньо'"  => '' ?: 'порожньо',
    '5 <=> 3'           => 5 <=> 3,
    "strlen('Київ')"    => strlen('Київ'),
    "mb_strlen('Київ')" => mb_strlen('Київ'),
];
?>
<!doctype html>
<html lang="uk">
<head>
    <meta charset="utf-8">
    <title>Типи і приведення</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <nav>
        <a href="types.php">Типи</a>
        <a href="index.php">Журнал</a>
        <a href="cart.php">Кошик</a>
    </nav>

    <h1>Типи і приведення типів</h1>

    <table>
        <tr>
            <th>Вираз</th>
            <th>Тип результату</th>
            <th>Значення (var_export)</th>
        </tr>
        <?php foreach ($experiments as $expression => $result): ?>
            <tr>
                <td><code><?= htmlspecialchars($expression) ?></code></td>
                <td><?= get_debug_type($result) ?></td>
                <td><code><?= htmlspecialchars(var_export($result, true)) ?></code></td>
            </tr>
        <?php endforeach; ?>
    </table>
</body>
</html>
```

Пояснення:

- Ключі масиву — **рядки** з текстом виразу (щоб показати його на сторінці), значення — **результат**, який PHP обчислив під час створення масиву.
- `get_debug_type()` повертає назву типу (`int`, `float`, `string`, `bool`, `null`).
- `var_export($result, true)` — з другим аргументом `true` не виводить, а **повертає** рядкове представлення значення (наприклад, `false` замість порожнього рядка, який дав би `echo false`).
- `htmlspecialchars()` перетворює `<`, `>`, `&`, `"` на HTML-сутності. Для виразу `5 <=> 3` це важливо: інакше браузер сприйняв би `<=` як початок тегу. Детально про екранування — на П6–П7.

:::note
Intelephense підкреслить деякі рядки (наприклад, `'abc' == 0`) з попередженням — він «розуміє», що порівняння підозріле. Це нормально: тут ми робимо це навмисно.
:::

Відкрийте `http://localhost/practice-04/types.php`. **Перед тим як подивитися результат**, для кожного виразу запишіть у звіт своє передбачення, а потім порівняйте. Особливу увагу зверніть на рядки `(bool) "0"`, `'abc' == 0`, `0.1 + 0.2 == 0.3`, `strlen('Київ')`.

Спробуйте додати в масив вираз `'яблука' + 5` і оновіть сторінку. Ви побачите `Fatal error: Uncaught TypeError: Unsupported operand types: string + int`. Прочитайте повідомлення (тип, текст, файл, рядок) і видаліть цей рядок.

### Крок 4. Дані журналу: константи і багатовимірний масив

Створіть `index.php` — електронний журнал групи. Почнемо з даних:

```php title="index.php (частина 1 — дані)"
<?php
declare(strict_types=1);

// Константи — значення, що не змінюються під час роботи скрипту
const GROUP = 'КН-21';
const SUBJECT = 'Backend-розробка на PHP';
const PASS_SCORE = 60;

// Масив студентів: кожен студент — асоціативний масив з ім'ям і масивом балів за 4 роботи
$students = [
    ['name' => 'Іваненко Олена',  'scores' => [92, 88, 95, 90]],
    ['name' => 'Петренко Андрій', 'scores' => [75, 68, 80, 72]],
    ['name' => 'Коваль Марія',    'scores' => [55, 62, 48, 60]],
    ['name' => 'Шевчук Дмитро',   'scores' => [85, 91, 78, 88]],
    ['name' => 'Бондар Ірина',    'scores' => [64, 70, 66, 59]],
];
```

Це **багатовимірний масив**: індексований масив (список студентів), елементи якого — асоціативні масиви, а поле `scores` — знову індексований масив. До балу Марії за третю роботу звертаємося так: `$students[2]['scores'][2]` (48).

### Крок 5. Обчислення: середній бал і шкала ECTS

Під даними додайте обробку. Для кожного студента рахуємо середній, мінімальний і максимальний бал, оцінку за шкалою ECTS і статус «зараховано».

```php title="index.php (частина 2 — обчислення)"
// Результуючий масив рядків таблиці
$rows = [];

foreach ($students as $student) {
    $scores = $student['scores'];
    $average = round(array_sum($scores) / count($scores), 1);

    // Шкала ECTS: match(true) перевіряє умови згори вниз і повертає першу, що справдилась
    $grade = match (true) {
        $average >= 90 => 'A',
        $average >= 82 => 'B',
        $average >= 74 => 'C',
        $average >= 64 => 'D',
        $average >= 60 => 'E',
        $average >= 35 => 'FX',
        default        => 'F',
    };

    $rows[] = [
        'name'    => $student['name'],
        'scores'  => $scores,
        'average' => $average,
        'min'     => min($scores),
        'max'     => max($scores),
        'grade'   => $grade,
        'passed'  => $average >= PASS_SCORE,
    ];
}
```

Чому ми не змінюємо `$students` безпосередньо, а створюємо новий масив `$rows`? Можна було б написати `foreach ($students as &$student)`, але цикл за посиланням — джерело помилок (лекція 2). Новий масив — простіше і передбачуваніше: вихідні дані лишаються незмінними.

Перевірте проміжний результат: тимчасово додайте в кінець PHP-блоку

```php
echo '<pre>';
print_r($rows);
echo '</pre>';
```

Ви маєте побачити, наприклад, для Олени: `[average] => 91.3`, `[grade] => A`, `[passed] => 1` (`print_r` виводить `true` як `1`, а `false` — як порожній рядок; `var_dump` показав би `bool(true)`). Після перевірки видаліть налагоджувальне виведення.

### Крок 6. Статистика групи

Продовжимо PHP-блок: порахуємо середній бал групи, кількість тих, хто склав, найкращого студента і розподіл оцінок.

```php title="index.php (частина 3 — статистика)"
$averages = array_column($rows, 'average');          // [91.3, 73.8, 56.3, 85.5, 64.8]
$groupAverage = round(array_sum($averages) / count($averages), 1);

$passedCount = 0;
$best = null;            // найкращий студент (поки не знайдено)
$distribution = [];      // скільки яких оцінок: ['A' => 1, 'D' => 2, ...]

foreach ($rows as $row) {
    if ($row['passed']) {
        $passedCount++;
    }

    // Якщо найкращого ще немає або поточний кращий — запам'ятовуємо
    if ($best === null || $row['average'] > $best['average']) {
        $best = $row;
    }

    // ?? 0 — якщо такої оцінки ще не було, починаємо з нуля
    $distribution[$row['grade']] = ($distribution[$row['grade']] ?? 0) + 1;
}

ksort($distribution);    // відсортувати за ключем: A, B, D, FX

$failedCount = count($rows) - $passedCount;
$passedPercent = round($passedCount / count($rows) * 100);
$today = date('d.m.Y');
?>
```

Ключові моменти:

- `array_column($rows, 'average')` витягує одне поле з усіх записів — дуже часта операція.
- Вираз `($distribution[$key] ?? 0) + 1` — ідіома «лічильника»: без `??` перше звернення до відсутнього ключа дало б `Warning: Undefined array key`.
- Закриваючий тег `?>` наприкінці — бо далі йде HTML-шаблон.

### Крок 7. Шаблон журналу

Після `?>` додайте HTML-частину:

```php title="index.php (частина 4 — шаблон)"
<!doctype html>
<html lang="uk">
<head>
    <meta charset="utf-8">
    <title>Журнал <?= GROUP ?></title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <nav>
        <a href="types.php">Типи</a>
        <a href="index.php">Журнал</a>
        <a href="cart.php">Кошик</a>
    </nav>

    <h1>Журнал групи <?= GROUP ?></h1>
    <p>Дисципліна: <strong><?= mb_strtoupper(SUBJECT) ?></strong>. Станом на <?= $today ?>.</p>

    <table>
        <tr>
            <th>№</th>
            <th>Студент</th>
            <th>Бали</th>
            <th class="num">Мін.</th>
            <th class="num">Макс.</th>
            <th class="num">Середній</th>
            <th>ECTS</th>
            <th>Статус</th>
        </tr>
        <?php foreach ($rows as $i => $row): ?>
            <tr>
                <td><?= $i + 1 ?></td>
                <td><?= htmlspecialchars($row['name']) ?></td>
                <td><?= implode(', ', $row['scores']) ?></td>
                <td class="num"><?= $row['min'] ?></td>
                <td class="num"><?= $row['max'] ?></td>
                <td class="num"><?= number_format($row['average'], 1, ',', ' ') ?></td>
                <td><span class="badge grade-<?= $row['grade'] ?>"><?= $row['grade'] ?></span></td>
                <td><?= $row['passed'] ? 'зараховано' : 'не зараховано' ?></td>
            </tr>
        <?php endforeach; ?>
    </table>

    <div class="card">
        <h2>Статистика</h2>
        <ul>
            <li>Середній бал групи: <strong><?= number_format($groupAverage, 1, ',', ' ') ?></strong></li>
            <li>Склали: <?= $passedCount ?> з <?= count($rows) ?> (<?= $passedPercent ?>%)</li>
            <?php if ($failedCount > 0): ?>
                <li>Не склали: <?= $failedCount ?> — потрібне перескладання</li>
            <?php endif; ?>
            <li>Найкращий результат: <?= htmlspecialchars($best['name']) ?> (<?= $best['average'] ?>)</li>
        </ul>

        <h3>Розподіл оцінок</h3>
        <ul>
            <?php foreach ($distribution as $grade => $count): ?>
                <li><span class="badge grade-<?= $grade ?>"><?= $grade ?></span> — <?= $count ?></li>
            <?php endforeach; ?>
        </ul>
    </div>
</body>
</html>
```

Очікуваний результат (`http://localhost/practice-04/`):

| Студент | Середній | ECTS | Статус |
|---|---|---|---|
| Іваненко Олена | 91,3 | A | зараховано |
| Петренко Андрій | 73,8 | D | зараховано |
| Коваль Марія | 56,3 | FX | не зараховано |
| Шевчук Дмитро | 85,5 | B | зараховано |
| Бондар Ірина | 64,8 | D | зараховано |

Статистика: середній бал групи 74,3; склали 4 з 5 (80%); найкращий результат — Іваненко Олена (91.3); розподіл: A — 1, B — 1, D — 2, FX — 1.

:::tip[Навіщо htmlspecialchars для наших же даних?]
Поки імена записано в коді, небезпеки немає. Але вже за кілька пар дані надходитимуть з форм і бази даних, і звичка **екранувати все, що виводиться в HTML**, має бути автоматичною. Числа (`$row['min']`) і значення, які ми самі обрали з фіксованого набору (`$row['grade']`), екранувати не обов'язково.
:::

Відкрийте код сторінки (`Ctrl+U`) і переконайтеся, що браузер отримав лише HTML — жодного PHP.

### Крок 8. Кошик інтернет-магазину

Створіть `cart.php`. Тут потренуємо арифметику, `match`, `min()` і форматування грошей.

```php title="cart.php"
<?php
declare(strict_types=1);

const FREE_DELIVERY_FROM = 1500;   // безкоштовна доставка від цієї суми
const DELIVERY_PRICE = 89;
const MAX_DISCOUNT = 2000;         // знижка не більша за 2000 грн

$products = [
    ['title' => 'Ноутбук 15"',      'price' => 32999.00, 'qty' => 1],
    ['title' => 'Миша бездротова',  'price' => 649.50,   'qty' => 2],
    ['title' => 'Кабель USB-C',     'price' => 199.00,   'qty' => 3],
];

// Користувач міг ввести промокод з пробілами і малими літерами — нормалізуємо
$promoCode = strtoupper(trim('  student '));   // 'STUDENT'

// 1. Сума за кожним рядком і загальна сума
$subtotal = 0.0;
foreach ($products as $i => $product) {
    $lineTotal = $product['price'] * $product['qty'];
    $products[$i]['total'] = $lineTotal;     // додаємо поле до елемента за індексом
    $subtotal += $lineTotal;
}

$itemsCount = array_sum(array_column($products, 'qty'));

// 2. Знижка за промокодом
$discountRate = match ($promoCode) {
    'STUDENT' => 0.10,
    'WELCOME' => 0.05,
    default   => 0.0,
};
$discount = min(round($subtotal * $discountRate, 2), MAX_DISCOUNT);

// 3. Доставка: безкоштовна, якщо сума після знижки досягла порогу
$afterDiscount = $subtotal - $discount;
$delivery = $afterDiscount >= FREE_DELIVERY_FROM ? 0 : DELIVERY_PRICE;

$total = $afterDiscount + $delivery;

// Скільки бракує до безкоштовної доставки (0, якщо вже досягнуто)
$toFreeDelivery = max(0, FREE_DELIVERY_FROM - $afterDiscount);

// Форматування гривень: 31405.5 → «31 405,50 грн»
$uah = fn(float|int $amount): string => number_format($amount, 2, ',', ' ') . ' грн';
?>
<!doctype html>
<html lang="uk">
<head>
    <meta charset="utf-8">
    <title>Кошик</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <nav>
        <a href="types.php">Типи</a>
        <a href="index.php">Журнал</a>
        <a href="cart.php">Кошик</a>
    </nav>

    <h1>Кошик (<?= $itemsCount ?> шт.)</h1>

    <table>
        <tr>
            <th>Товар</th>
            <th class="num">Ціна</th>
            <th class="num">К-сть</th>
            <th class="num">Сума</th>
        </tr>
        <?php foreach ($products as $product): ?>
            <tr>
                <td><?= htmlspecialchars($product['title']) ?></td>
                <td class="num"><?= $uah($product['price']) ?></td>
                <td class="num"><?= $product['qty'] ?></td>
                <td class="num"><?= $uah($product['total']) ?></td>
            </tr>
        <?php endforeach; ?>
    </table>

    <div class="card">
        <p>Сума товарів: <?= $uah($subtotal) ?></p>
        <?php if ($discount > 0): ?>
            <p>Знижка за промокодом <strong><?= htmlspecialchars($promoCode) ?></strong>
               (<?= $discountRate * 100 ?>%, але не більше <?= $uah(MAX_DISCOUNT) ?>): −<?= $uah($discount) ?></p>
        <?php endif; ?>
        <p>Доставка: <?= $delivery === 0 ? 'безкоштовно' : $uah($delivery) ?></p>
        <?php if ($toFreeDelivery > 0): ?>
            <p>Додайте товарів ще на <?= $uah($toFreeDelivery) ?> — і доставка буде безкоштовною.</p>
        <?php endif; ?>
        <h2>До сплати: <?= $uah($total) ?></h2>
    </div>
</body>
</html>
```

Розбір:

- `$products[$i]['total'] = ...` — змінюємо елемент вихідного масиву **за індексом**, а не через посилання. Це безпечна альтернатива `foreach (... as &$product)`.
- `match ($promoCode)` порівнює строго (`===`): `'student'` малими літерами не підійшов би — тому спочатку `strtoupper(trim(...))`.
- `min(..., MAX_DISCOUNT)` обмежує знижку зверху, `max(0, ...)` не дає вийти в мінус.
- `$uah` — стрілкова функція, збережена у змінній. Детально про функції — на наступній парі; тут вона просто позбавляє нас повторювати `number_format(..., 2, ',', ' ') . ' грн'` вісім разів.
- `$delivery === 0` — строге порівняння з `int`; саме тому константа `DELIVERY_PRICE` — ціле число, а в тернарному операторі ми повертаємо `0`, а не `0.0`.

Очікуваний результат:

| | Сума |
|---|---|
| Сума товарів | 34 895,00 грн |
| Знижка STUDENT (10%, але не більше 2 000,00 грн) | −2 000,00 грн |
| Доставка | безкоштовно |
| **До сплати** | **32 895,00 грн** |

Поекспериментуйте: замініть промокод на `'welcome'` (знижка 5% = 1 744,75 грн), на `'ABC'` (без знижки), а кількість ноутбуків — на `0`. Перевірте, що з'являється повідомлення про доставку і сума рахується правильно (649,50 × 2 + 199 × 3 = 1 896,00 грн, зі знижкою STUDENT — 1 706,40 грн, доставка безкоштовна; з `'ABC'` і лише одним кабелем — доставка 89 грн).

### Крок 9. Перевірка помилок

Навчимося читати помилки — це знадобиться на кожній парі. По черзі внесіть у `cart.php` такі «поломки», оновіть сторінку, прочитайте повідомлення і виправте:

| Поломка | Очікуване повідомлення |
|---|---|
| Видалити `;` після `const DELIVERY_PRICE = 89` | `Parse error: syntax error, unexpected token "const"` (рядок — **наступний**) |
| Замінити `$product['title']` на `$product['name']` у шаблоні | `Warning: Undefined array key "name"`, а потім `TypeError: htmlspecialchars(): Argument #1 ($string) must be of type string, null given` — через `strict_types` значення `null` у вбудовану функцію не пропускається |
| Замінити промокод на `'STUDENT'` і прибрати `default` з `match` | нічого — збіг є; тепер поставте `'ABC'` → `UnhandledMatchError` |
| Написати `'Сума: ' + $subtotal` в `echo` | `TypeError: Unsupported operand types: string + float` |

## Завдання для самостійного виконання

1. ★ Додайте до журналу ще двох студентів (один — з оцінкою F, тобто середнім нижче 35). Переконайтеся, що вся статистика перерахувалася автоматично, без змін у шаблоні.
2. ★ У кошику додайте промокод `BLACKFRIDAY` зі знижкою 25% і поле `'weight'` (кг) для кожного товару. Виведіть загальну вагу замовлення; якщо вона перевищує 10 кг, доставка коштує 250 грн незалежно від суми.
3. ★★ У журналі додайте стовпець «Відхилення від середнього групи» (наприклад, `+17,0` або `−18,0`) — знак виводьте явно, додатні значення зеленим, від'ємні червоним (класи CSS). Під таблицею виведіть список студентів, у яких хоча б одна робота нижче за `PASS_SCORE` (використайте `min()`).
4. ★★ Відсортуйте рядки журналу за середнім балом від найвищого до найнижчого. Підказка: `usort($rows, fn($a, $b) => $b['average'] <=> $a['average']);` — розберіться, чому саме `$b <=> $a`, а не навпаки.
5. ★★★ Створіть `calendar.php`, що виводить календар поточного місяця таблицею (пн–нд). Знадобляться `date('t')` (кількість днів у місяці), `date('N', mktime(0, 0, 0, $month, 1, $year))` (день тижня першого числа, 1 = пн), цикл і оператор `%`. Сьогоднішню дату виділіть.

## Контрольні питання

1. Чому в `types.php` вираз `(bool) "0"` дає `false`, а `(bool) "false"` — `true`?
2. Чим відрізняються `echo false`, `print_r(false)`, `var_dump(false)` і `var_export(false, true)`?
3. Як звернутися до балу третього студента за другу роботу в масиві `$students`?
4. Навіщо у виразі `$distribution[$grade] = ($distribution[$grade] ?? 0) + 1` використано `??`? Що станеться без нього?
5. Чому в `match (true)` у журналі умови йдуть від більшого балу до меншого? Що буде, якщо переставити гілку `>= 60` на початок?
6. Чому промокод перед `match` перетворено через `strtoupper(trim(...))`?
7. Чому ми змінювали масив товарів через `$products[$i]['total']`, а не через `foreach` за посиланням?
8. На якому рядку PHP повідомляє про пропущену крапку з комою і чому?

## Домашнє завдання

1. Завершіть кроки, які не встигли на парі, і виконайте хоча б одне завдання ★★.
2. Створіть `practice-04/weather.php`: масив температур за тиждень (`'Пн' => 3.5, ...`). Виведіть таблицю, середню, мінімальну і максимальну температуру та для кожного дня оцінку через `match (true)`: «мороз» (< 0), «холодно» (< 10), «тепло» (< 20), «спекотно».
3. Додайте посилання на `weather.php` у навігацію всіх сторінок.

## Що здати

- Папку `practice-04` (архівом або посиланням на репозиторій): `types.php`, `index.php`, `cart.php`, `style.css`, `weather.php`.
- Скриншоти журналу і кошика.
- Звіт: таблиця з кроку 3 «вираз — моє передбачення — фактичний результат» і пояснення для виразів, де передбачення не справдилося; відповіді на контрольні питання.
