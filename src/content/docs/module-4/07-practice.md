---
title: "Обробка форм та безпека введених даних"
description: "Серверна валідація (обов'язкові поля, довжина, формат, filter_var), масив помилок і збереження введених значень old(), екранування виведення e() проти XSS, патерн Post/Redirect/Get і flash-повідомлення, захист від CSRF токеном. Доводимо форму «Міні-блогу» до безпечного стану."
type: practice
pair: 7
topic: 63
---

## Мета роботи

- Зрозуміти принцип «**перевіряй вхід, екрануй вихід**» і різницю між валідацією, нормалізацією та екрануванням.
- Навчитися валідувати дані на сервері: обов'язкові поля, довжина (`mb_strlen`), формат (`preg_match`, `filter_var`), тип значення.
- Показувати помилки біля полів (масив `$errors`) і зберігати введені значення (`old()`).
- Розібратися, як працює атака XSS і чому `htmlspecialchars()` / `e()` її зупиняє.
- Застосувати патерн **PRG (Post/Redirect/Get)** і flash-повідомлення (мінімальне використання `session_start()`).
- Захистити форми від **CSRF** токеном (`random_bytes`, `bin2hex`, `hash_equals`).
- Виправити всі п'ять проблем «Міні-блогу», знайдені на П6.

## Що потрібно

- Проєкт `htdocs/mini-blog` у стані після П6: `index.php` (пошук і сортування), `create.php` (POST-форма), `includes/header.php`, `footer.php`, `helpers.php`, `data/posts.json`.
- Файл `evil.html` і нотатки про проблеми з кроку 9 П6.
- Браузер з DevTools, `curl`.

## Короткі теоретичні відомості

### Перевіряй вхід, екрануй вихід

Усі дані від клієнта — `$_GET`, `$_POST`, `$_COOKIE`, заголовки — **недовірені**. З ними працюють у три етапи:

| Етап | Коли | Що робимо | Приклад |
|---|---|---|---|
| **Нормалізація** | одразу після отримання | приводимо до очікуваного вигляду | `trim()`, `mb_strtolower()` для email, перевірка `is_string()` |
| **Валідація** | перед використанням | перевіряємо, чи значення допустиме; якщо ні — **відхиляємо** з поясненням | обов'язковість, довжина, формат, діапазон |
| **Екранування** | у момент виведення | перетворюємо спецсимволи під конкретний контекст | `e()` для HTML, prepared statements для SQL (П8) |

:::caution[Не «чистимо» вхід замість екранування]
Поширена помилка — «очищати» дані на вході функціями на кшталт `strip_tags()` чи `htmlspecialchars()` перед збереженням. Це псує дані (людина хотіла написати пост про тег `<form>` — і він зник), а захисту не гарантує: ті самі дані можуть знадобитися в іншому контексті (JSON, SQL, атрибут). Правильно — **зберігати дані як є, а екранувати під час виведення**, щоразу під свій контекст.
:::

### Серверна валідація

Валідація в браузері (`required`, `maxlength`, `type="email"`) — це **зручність**: користувач бачить помилку миттєво. Валідація на сервері — **захист**: її неможливо обійти. Тому сервер перевіряє все, навіть якщо в HTML є ті самі обмеження.

Типові правила:

| Правило | Як перевірити в PHP |
|---|---|
| Поле присутнє і є рядком | `is_string($_POST['title'] ?? null)` |
| Обов'язкове | `$value === ''` після `trim()` (не `empty()` — він вважає `'0'` порожнім) |
| Довжина | `mb_strlen($value)` — **символи**, а не байти |
| Формат | `preg_match('/^...$/u', $value)` з модифікатором `u` для UTF-8 |
| Ціле число в діапазоні | `filter_var($v, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]])` |
| Email, URL | `FILTER_VALIDATE_EMAIL`, `FILTER_VALIDATE_URL` |
| Одне з дозволених значень | `in_array($v, ['new', 'old', 'title'], true)` — **білий список** |

Результат валідації зручно збирати в масив `$errors`, де ключ — ім'я поля, значення — повідомлення. Порожній масив означає «помилок немає»:

```php
$errors = [];
if ($title === '') {
    $errors['title'] = 'Введіть заголовок';
}
if ($errors === []) {
    // зберігаємо
}
```

### Функція `filter_var()`

`filter_var($value, $filter, $options)` перевіряє значення і повертає **перетворене значення** (наприклад, `int`) або `false`, якщо перевірка не пройдена. Для булевого фільтра з прапорцем `FILTER_NULL_ON_FAILURE` невдача — це `null`, бо `false` є валідним результатом.

| Фільтр | Приймає | Повертає |
|---|---|---|
| `FILTER_VALIDATE_INT` | `'42'`, `' 42 '`, `'-7'` | `int` або `false` (`'42abc'`, `'007'`, `'4.2'`) |
| `FILTER_VALIDATE_FLOAT` | `'3.14'`, з опцією `decimal => ','` — `'3,14'` | `float` або `false` |
| `FILTER_VALIDATE_EMAIL` | `'olena@example.com'` | рядок або `false` |
| `FILTER_VALIDATE_URL` | `'https://example.com/a'` | рядок або `false` |
| `FILTER_VALIDATE_BOOLEAN` | `'1'`, `'true'`, `'on'`, `'yes'` / `'0'`, `'false'`, `'off'`, `'no'` | `true` / `false` (або `null`) |
| `FILTER_VALIDATE_IP` | `'192.168.0.1'` | рядок або `false` |

### XSS — міжсайтовий скриптинг

**XSS (Cross-Site Scripting)** — атака, за якої зловмисник змушує ваш сайт вивести його JavaScript-код іншим користувачам. Скрипт виконується в контексті вашого сайту: може читати вміст сторінки, надсилати запити від імені користувача, підміняти форми, красти незахищені кукі.

- **Збережений (stored) XSS**: код потрапляє в сховище (наш `posts.json`, пізніше БД) і показується всім, хто відкриє сторінку. Найнебезпечніший.
- **Відбитий (reflected) XSS**: код приходить у параметрі запиту і одразу виводиться у відповідь: `index.php?q=<script>...</script>`. Жертві надсилають підготовлене посилання.

Захист — **екранування під контекст** виведення:

| Контекст | Приклад | Захист |
|---|---|---|
| Текст між тегами | `<h2><?= e($title) ?></h2>` | `e()` |
| Значення атрибута в лапках | `value="<?= e($title) ?>"` | `e()` (тому `ENT_QUOTES`) |
| URL у `href` | `href="?<?= e(http_build_query([...])) ?>"` | `http_build_query` / `urlencode` + `e()`; перевірка схеми для зовнішніх URL |
| Усередині `<script>` | `const data = <?= json_encode($x, JSON_HEX_TAG) ?>;` | `json_encode` з `JSON_HEX_*` — **не** `e()` |
| Атрибут без лапок, `onclick`, `style` | — | **не вставляйте** туди користувацькі дані |

Детально про різновиди XSS, DOM XSS і заголовки безпеки (Content-Security-Policy) — на лекції 13.

### Патерн Post/Redirect/Get (PRG)

Проблема з П6: після POST-запиту сервер повертає сторінку (`200 OK`), і браузер вважає цей POST останньою дією. F5 повторює його — і пост дублюється.

Рішення — після **успішної** обробки POST відповідати не сторінкою, а **перенаправленням**:

```text
Браузер                                  Сервер
  │  POST /create.php (title=...)          │
  │ ─────────────────────────────────────► │ перевірка → збереження
  │  302 Found, Location: index.php        │
  │ ◄───────────────────────────────────── │
  │  GET /index.php                        │
  │ ─────────────────────────────────────► │
  │  200 OK (список постів)                │
  │ ◄───────────────────────────────────── │
  │  F5 → повторює лише GET /index.php — безпечно
```

У PHP перенаправлення — це заголовок `Location` і негайне завершення скрипту:

```php
header('Location: index.php'); // PHP автоматично встановить код 302
exit;                          // ОБОВ'ЯЗКОВО: інакше скрипт продовжить виконання
```

Якщо ж валідація **не пройшла**, перенаправлення не робимо: показуємо ту саму форму з помилками й введеними значеннями (відповідь на POST-запит). Повторне надсилання такої форми нешкідливе — вона знову не пройде перевірку.

:::caution[headers already sent]
Заголовки HTTP надсилаються **перед** тілом відповіді. Якщо до виклику `header()` скрипт уже щось вивів (навіть пробіл перед `<?php`, BOM чи `echo`), PHP видасть `Warning: Cannot modify header information - headers already sent`, і перенаправлення не спрацює. Тому вся обробка форми — **на початку файлу**, до `require header.php`.
:::

### Flash-повідомлення і мінімум про сесії

Після перенаправлення сторінка `index.php` — це новий, незалежний запит (share-nothing). Як їй дізнатися, що треба показати «Пост опубліковано»? Потрібне місце, де дані переживуть між двома запитами одного користувача. Це **сесія (session)**:

- `session_start()` створює (або відновлює) сесію: браузер отримує кукі `PHPSESSID` з випадковим ідентифікатором, а дані зберігаються **на сервері** в масиві `$_SESSION`.
- Записали `$_SESSION['flash'] = ...` у `create.php` → прочитали в наступному запиті в `header.php`.

**Flash-повідомлення** — повідомлення, яке записується в сесію, показується **рівно один раз** і одразу видаляється. Сьогодні ми використовуємо сесію лише для flash і CSRF-токена; як влаштовані сесії і кукі, їхня безпека, вхід користувачів — тема П10.

`session_start()`, як і `header()`, надсилає заголовок (`Set-Cookie`), тому викликається до будь-якого виведення — ми розмістимо його на початку `helpers.php`.

### CSRF — підробка міжсайтового запиту

**CSRF (Cross-Site Request Forgery)**: користувач відкриває сторінку зловмисника, а вона непомітно надсилає форму на **ваш** сайт. Браузер додає до запиту кукі вашого сайту — тож для сервера це виглядає як дія самого користувача (опублікувати пост, видалити, змінити пароль). Ви відтворили це на П6 файлом `evil.html`.

Захист — **CSRF-токен**:

1. Сервер генерує випадковий секрет і зберігає в сесії: `bin2hex(random_bytes(32))` — 64 шістнадцяткові символи з криптографічно стійкого генератора.
2. Кожна POST-форма містить приховане поле з цим токеном.
3. При обробці POST сервер порівнює токен з форми з токеном у сесії. Не збігся або відсутній — запит відхиляється (`400 Bad Request`).

Сторінка зловмисника не може дізнатися токен: вона не має доступу до вмісту ваших сторінок (політика того самого джерела, same-origin policy). Порівнювати токени слід функцією **`hash_equals()`**: вона витрачає однаковий час незалежно від того, на якому символі рядки розходяться, і не дозволяє «підбирати» токен за часом відповіді (timing attack).

Додатково сучасні браузери обмежують надсилання кукі з чужих сайтів (атрибут кукі `SameSite`, П10), але токен залишається основним і надійним захистом.

## Хід роботи

### Крок 1. Пісочниця: `filter_var()`

Створіть `htdocs/practice-07/filters.php`, щоб побачити поведінку фільтрів на власні очі:

```php title="practice-07/filters.php"
<?php
declare(strict_types=1);

// Кожен рядок: опис, вхідне значення, фільтр, опції
$cases = [
    ['ціле число',                 '42',                     FILTER_VALIDATE_INT,     []],
    ['ціле з пробілами',           ' 42 ',                   FILTER_VALIDATE_INT,     []],
    ['число з літерами',           '42abc',                  FILTER_VALIDATE_INT,     []],
    ['ведучі нулі',                '007',                    FILTER_VALIDATE_INT,     []],
    ['id ≥ 1: значення -5',        '-5',                     FILTER_VALIDATE_INT,     ['options' => ['min_range' => 1]]],
    ['оцінка 1–100: значення 150', '150',                    FILTER_VALIDATE_INT,     ['options' => ['min_range' => 1, 'max_range' => 100]]],
    ['дробове з крапкою',          '3.14',                   FILTER_VALIDATE_FLOAT,   []],
    ['дробове з комою',            '3,14',                   FILTER_VALIDATE_FLOAT,   []],
    ['дробове з комою (decimal)',  '3,14',                   FILTER_VALIDATE_FLOAT,   ['options' => ['decimal' => ',']]],
    ['email',                      'olena@example.com',      FILTER_VALIDATE_EMAIL,   []],
    ['email без домену',           'olena@',                 FILTER_VALIDATE_EMAIL,   []],
    ['URL',                        'https://example.com/a?b=1', FILTER_VALIDATE_URL,  []],
    ['URL без схеми',              'example.com',            FILTER_VALIDATE_URL,     []],
    ['URL зі схемою javascript:',  'javascript://example.com/%0Aalert(1)', FILTER_VALIDATE_URL, []],
    ['boolean «yes»',              'yes',                    FILTER_VALIDATE_BOOLEAN, ['flags' => FILTER_NULL_ON_FAILURE]],
    ['boolean «off»',              'off',                    FILTER_VALIDATE_BOOLEAN, ['flags' => FILTER_NULL_ON_FAILURE]],
    ['boolean «maybe»',            'maybe',                  FILTER_VALIDATE_BOOLEAN, ['flags' => FILTER_NULL_ON_FAILURE]],
    ['IP-адреса',                  '192.168.0.300',          FILTER_VALIDATE_IP,      []],
];
?>
<!doctype html>
<html lang="uk">
<head>
    <meta charset="utf-8">
    <title>filter_var</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 900px; margin: 24px auto; padding: 0 16px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border-bottom: 1px solid #ddd; padding: 6px 10px; text-align: left; }
        .fail { color: #b91c1c; }
    </style>
</head>
<body>
    <h1>Перевірка даних через filter_var()</h1>
    <table>
        <tr><th>Випадок</th><th>Вхід</th><th>Результат</th></tr>
        <?php foreach ($cases as [$label, $input, $filter, $options]): ?>
            <?php
                $result = filter_var($input, $filter, $options);
                // false — «не пройшло» (крім булевого фільтра, де false — це валідне «ні»), null — «не розпізнано»
                $failed = $result === null || ($result === false && $filter !== FILTER_VALIDATE_BOOLEAN);
            ?>
            <tr class="<?= $failed ? 'fail' : '' ?>">
                <td><?= htmlspecialchars($label) ?></td>
                <td><code><?= htmlspecialchars($input) ?></code></td>
                <td><code><?= htmlspecialchars(var_export($result, true)) ?></code></td>
            </tr>
        <?php endforeach; ?>
    </table>
</body>
</html>
```

Конструкція `foreach ($cases as [$label, $input, $filter, $options])` одразу **деструктуризує** кожен рядок масиву на чотири змінні.

Відкрийте сторінку і порівняйте з таблицею в теоретичних відомостях. Зверніть увагу:

- `' 42 '` проходить (пробіли по краях допускаються), а `'007'` і `'42abc'` — ні;
- `'3,14'` — не число, доки не вказано `decimal => ','`;
- `FILTER_VALIDATE_URL` пропустив адресу зі схемою `javascript:`! Тому для посилань від користувачів додатково перевіряють схему: `str_starts_with($url, 'https://') || str_starts_with($url, 'http://')`.

Саме `FILTER_VALIDATE_INT` з `min_range => 1` ми використаємо для параметра `?id=` у наступних парах.

### Крок 2. Хелпери: `old()`, `redirect()`, `flash()`, `get_flash()`

Відкрийте `mini-blog/includes/helpers.php`. На самому початку файлу, одразу після `declare(strict_types=1);`, запустіть сесію:

```php title="includes/helpers.php (початок)" {4-8}
<?php
declare(strict_types=1);

// Сесія потрібна для flash-повідомлень і CSRF-токена.
// Детально про сесії та кукі — на практичній 10.
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Файл з постами (до П8, де перейдемо на MySQL)
const POSTS_FILE = __DIR__ . '/../data/posts.json';
```

Перевірка `session_status()` захищає від повторного виклику `session_start()` (який дав би попередження), якщо хелпери колись підключать двічі.

Після блоку «Виведення» (функції `e()`, `excerpt()`, `format_date()`, `plural()`) додайте новий блок:

```php title="includes/helpers.php (новий блок)"
// ================== Запит і відповідь ==================

/**
 * Значення поля з останнього POST-запиту (обрізане trim) або $default.
 * Потрібне, щоб після помилки валідації форма не очищалася.
 */
function old(string $key, string $default = ''): string
{
    $value = $_POST[$key] ?? null;
    return is_string($value) ? trim($value) : $default;   // масив чи відсутнє поле → $default
}

/**
 * Перенаправлення на іншу сторінку з негайним завершенням скрипту.
 */
function redirect(string $url): never
{
    header('Location: ' . $url);
    exit;
}

/**
 * Записати flash-повідомлення: його покаже header.php на НАСТУПНІЙ сторінці.
 */
function flash(string $message, string $type = 'success'): void
{
    $_SESSION['flash'] = ['message' => $message, 'type' => $type];
}

/**
 * Прочитати й одразу видалити flash-повідомлення (показується рівно один раз).
 */
function get_flash(): ?array
{
    $flash = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return $flash;
}

```

- **`old()`** повертає значення поля з поточного POST-запиту. `is_string()` відсікає два випадки: поле відсутнє (`null`) і поле-масив (`title[]=x`), — тоді повертається `$default`. Отже, `TypeError` з П6 більше неможливий. Другий параметр `$default` знадобиться у формі редагування (П9): `old('title', $post['title'])` — при першому відкритті форми показується збережене значення, після невдалої спроби — введене.
- **`redirect()`** має тип повернення `never`: функція завершує скрипт, тому код після виклику ніколи не виконається — і Intelephense, і PHP це знають.
- **`flash()`** записує повідомлення і його тип (`success` або `error` — це частина CSS-класу).
- **`get_flash()`** читає і **одразу видаляє** повідомлення — тому воно покажеться лише один раз.

### Крок 3. CSRF-хелпери

Додайте ще один блок (після «Запит і відповідь»):

```php title="includes/helpers.php (новий блок)"
// ================== CSRF-захист ==================

/**
 * Секретний токен поточної сесії (створюється при першому зверненні).
 */
function csrf_token(): string
{
    return $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
}

/**
 * Приховане поле з токеном — вставляється в кожну POST-форму.
 */
function csrf_field(): string
{
    return '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">';
}

/**
 * Чи збігається токен з форми з токеном сесії.
 */
function csrf_verify(): bool
{
    $token = $_POST['csrf'] ?? null;
    return is_string($token) && hash_equals(csrf_token(), $token);
}

```

- `??=` — «присвоїти, якщо ще немає»: токен створюється один раз на сесію і повертається при кожному наступному виклику.
- `csrf_field()` повертає готовий HTML прихованого поля; токен екрановано через `e()` за звичкою (хоча він складається лише з `0-9a-f`).
- `csrf_verify()` спочатку перевіряє, що токен — рядок (а не масив чи `null`), і лише потім порівнює через `hash_equals()`. Порядок аргументів у `hash_equals(відомий, наданий)` — спочатку значення із сесії.

### Крок 4. Показ flash-повідомлення в шапці

Оновіть `includes/header.php`: на початку прочитайте flash, а одразу після відкриття `<main>` — виведіть його.

```php title="includes/header.php" {3,23-25}
<?php
// Шапка сторінки. Очікує змінну $pageTitle; функції — з helpers.php
$flash = get_flash();
?>
<!doctype html>
<html lang="uk">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= e($pageTitle ?? 'Міні-блог') ?> — Міні-блог</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
<header class="site-header">
    <a class="logo" href="index.php">📝 Міні-блог</a>
    <nav class="menu">
        <a href="index.php">Усі пости</a>
        <a href="create.php">+ Новий пост</a>
    </nav>
</header>

<main class="container">
<?php if ($flash !== null): ?>
    <div class="flash flash-<?= e($flash['type']) ?>"><?= e($flash['message']) ?></div>
<?php endif; ?>
```

Тепер будь-яка сторінка може записати `flash('...')` і перенаправити користувача — повідомлення з'явиться вгорі наступної сторінки. Тип теж екрановано: він потрапляє в атрибут `class`.

Додайте в кінець `assets/style.css` стилі помилок форми:

```css title="assets/style.css (додати в кінець)"
/* Помилки валідації (П7) */
.error { color: #b91c1c; font-size: 0.875rem; margin: -8px 0 0; }
.is-invalid { border-color: #dc2626; background: #fef2f2; }
```

### Крок 5. `create.php`: обробка POST

Перепишіть PHP-частину `create.php` (усе, що до `$pageTitle`):

```php title="create.php (обробка форми)"
<?php
declare(strict_types=1);

require __DIR__ . '/includes/helpers.php';

$errors = [];   // ключ — назва поля, значення — текст помилки

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 1. CSRF: форма має прийти з нашого сайту
    if (!csrf_verify()) {
        http_response_code(400);
        exit('Недійсний CSRF-токен. Оновіть сторінку і спробуйте ще раз.');
    }

    // 2. Отримуємо значення (old() робить trim і відкидає не-рядки)
    $title  = old('title');
    $body   = old('body');
    $author = old('author');

    // 3. Валідація на сервері
    if ($title === '') {
        $errors['title'] = 'Введіть заголовок';
    } elseif (mb_strlen($title) < 3 || mb_strlen($title) > 200) {
        $errors['title'] = 'Заголовок має містити від 3 до 200 символів';
    }

    if ($body === '') {
        $errors['body'] = 'Введіть текст поста';
    } elseif (mb_strlen($body) < 10) {
        $errors['body'] = 'Текст — щонайменше 10 символів';
    } elseif (mb_strlen($body) > 10000) {
        $errors['body'] = 'Текст — не довше 10 000 символів';
    }

    if ($author === '') {
        $errors['author'] = "Вкажіть ім'я автора";
    } elseif (mb_strlen($author) > 100) {
        $errors['author'] = "Ім'я — не довше 100 символів";
    } elseif (!preg_match('/^\p{L}[\p{L}\s\'’-]*$/u', $author)) {
        $errors['author'] = "Ім'я може містити лише літери, пробіли, апостроф і дефіс";
    }

    // 4. Немає помилок — зберігаємо і перенаправляємо (Post/Redirect/Get)
    if ($errors === []) {
        $posts = load_posts();
        $posts[] = [
            'id'         => next_post_id($posts),
            'title'      => $title,
            'body'       => $body,
            'author'     => $author,
            'created_at' => date('Y-m-d H:i:s'),
        ];
        save_posts($posts);

        flash('Пост опубліковано');
        redirect('index.php');
    }
    // Є помилки — нижче знову показуємо форму з повідомленнями і введеними значеннями
}

```

Порядок дій має значення:

1. **CSRF — першим.** Якщо запит підроблений, немає сенсу навіть читати поля. `exit()` з рядком виводить його і завершує скрипт. Код `400` повідомляє браузеру і журналам сервера, що запит некоректний.
2. **Нормалізація**: `old()` робить `trim()` і гарантує рядок.
3. **Валідація** — по кожному полю ланцюжок `if / elseif`: для поля показуємо лише першу помилку. Довжину рахуємо `mb_strlen()`. Межі (200 і 100 символів) збігаються з атрибутами `maxlength` у формі — правила клієнта і сервера мають бути однаковими.
4. **Регулярний вираз для імені** `'/^\p{L}[\p{L}\s\'’-]*$/u'`: `\p{L}` — будь-яка літера Unicode (українська, латинська…), далі — літери, пробільні символи, апостроф (звичайний `'` або типографський `’`, як у «Мар’яна») і дефіс. Перший символ — обов'язково літера. Модифікатор `u` вмикає UTF-8; без нього `\p{L}` не працює з кирилицею.
5. **Успіх — PRG**: зберегли, записали flash, перенаправили. `redirect()` завершує скрипт — HTML форми нижче вже не виконується.
6. **Невдача** — виконання просто продовжується вниз до шаблону, де `$errors` уже заповнений.

:::note[Чому дані зберігаємо без екранування]
У `posts.json` записуємо `$title` як є — навіть якщо там `<script>`. Це не помилка: дані безпечні, доки ми екрануємо їх при виведенні. Файл — це сховище, а не HTML.
:::

### Крок 6. `create.php`: форма з помилками

Шаблонна частина `create.php`:

```php title="create.php (шаблон)"
$pageTitle = 'Новий пост';
require __DIR__ . '/includes/header.php';
?>

<h1>Новий пост</h1>

<?php if ($errors !== []): ?>
    <div class="flash flash-error">Пост не збережено: виправте помилки у формі.</div>
<?php endif; ?>

<form method="post" action="create.php" class="form" novalidate>
    <?= csrf_field() ?>

    <label>Заголовок
        <input type="text" name="title" maxlength="200" value="<?= e(old('title')) ?>"
               class="<?= isset($errors['title']) ? 'is-invalid' : '' ?>">
    </label>
    <?php if (isset($errors['title'])): ?><p class="error"><?= e($errors['title']) ?></p><?php endif; ?>

    <label>Текст
        <textarea name="body" rows="8"
                  class="<?= isset($errors['body']) ? 'is-invalid' : '' ?>"><?= e(old('body')) ?></textarea>
    </label>
    <?php if (isset($errors['body'])): ?><p class="error"><?= e($errors['body']) ?></p><?php endif; ?>

    <label>Автор
        <input type="text" name="author" maxlength="100" value="<?= e(old('author')) ?>"
               class="<?= isset($errors['author']) ? 'is-invalid' : '' ?>">
    </label>
    <?php if (isset($errors['author'])): ?><p class="error"><?= e($errors['author']) ?></p><?php endif; ?>

    <button type="submit">Опублікувати</button>
</form>

<?php require __DIR__ . '/includes/footer.php'; ?>
```

- `<?= csrf_field() ?>` — приховане поле з токеном. Його **не** екрануємо через `e()` — це наш власний HTML.
- `value="<?= e(old('title')) ?>"` — після помилки поле зберігає введене значення; `e()` обов'язкове, бо `old()` повертає **дані користувача**. Без нього значення `"><script>alert(1)</script>` «вирвалося» б з атрибута.
- Клас `is-invalid` підсвічує поле з помилкою, під ним — текст помилки.
- Атрибут `novalidate` у формі вимикає перевірку браузера: так ми бачимо саме **серверну** валідацію. У реальному проєкті його можна прибрати, щоб користувач отримував миттєві підказки, — сервер однаково перевірить усе.

### Крок 7. Безпечні параметри в `index.php`

У `index.php` виправимо проблему `?q[]=1` і явно обмежимо параметри. Замініть два рядки читання параметрів на такий блок:

```php title="index.php (читання параметрів)"
// Параметри з адресного рядка. Перевіряємо тип (?q[]=1 дає масив!) і обмежуємо довжину
$q = is_string($_GET['q'] ?? null) ? mb_substr(trim($_GET['q']), 0, 100) : '';
$sort = $_GET['sort'] ?? 'new';
if (!in_array($sort, ['new', 'old', 'title'], true)) {
    $sort = 'new';                            // білий список: невідоме значення → типове
}
```

І додайте `maxlength="100"` до поля пошуку. Білий список для `$sort` формально дублює гілку `default` у `match`, але робить намір явним: далі в коді (у тому числі в атрибутах `selected`) `$sort` гарантовано є одним з трьох відомих рядків. На П8 цей принцип стане критичним: ім'я стовпця для `ORDER BY` можна взяти **лише** з білого списку.

Повний код `index.php` — у розділі «Стан проєкту» нижче.

### Крок 8. Перевірка

Пройдіть сценарії і позначте результат у звіті:

| № | Дія | Очікуваний результат |
|---|---|---|
| 1 | Надіслати порожню форму | 3 повідомлення про помилки, червоні поля, загальне повідомлення вгорі |
| 2 | Заголовок «Ок», текст «коротко», автор «Оля» | помилки для заголовка і тексту; поля зберегли введені значення |
| 3 | Автор `Олег_2006` | «Ім'я може містити лише літери…»; `Мар’яна Кос-Вовк` — проходить |
| 4 | Заголовок `"><script>alert(1)</script>` з порожнім текстом | помилка тексту, у полі заголовка видно введений рядок, `alert` **не** з'являється |
| 5 | Коректна форма | перенаправлення на головну, зелене «Пост опубліковано», новий пост першим |
| 6 | Після п. 5 натиснути F5 | сторінка оновлюється без попередження, дубліката **немає**, flash зник |
| 7 | DevTools → Network при надсиланні | запит `create.php` — **302**, далі `index.php` — **200** |
| 8 | DevTools → Elements: змінити значення поля `csrf` і надіслати | «Недійсний CSRF-токен», статус 400 |
| 9 | Відкрити `evil.html` з П6 і надіслати | 400, пост не створено |
| 10 | `curl -d "title=Тест&body=Текст поста&author=Оля" http://localhost/mini-blog/create.php` | 400 — немає ні сесії, ні токена |
| 11 | `index.php?q[]=1&sort[]=x` | список постів без помилок |
| 12 | `index.php?q=<script>alert(1)</script>` | текст запиту показано як є, `alert` не з'являється (відбитий XSS неможливий) |

Для сценарію 9 нагадаємо вміст `evil.html`:

```html title="evil.html (на робочому столі, НЕ в htdocs)"
<!doctype html>
<html lang="uk">
<head><meta charset="utf-8"><title>Вітаємо!</title></head>
<body>
    <h1>Ви виграли смартфон!</h1>
    <form method="post" action="http://localhost/mini-blog/create.php">
        <input type="hidden" name="title" value="Дешеві годинники тут">
        <input type="hidden" name="body" value="Спам, опублікований без відома користувача.">
        <input type="hidden" name="author" value="Спамер">
        <button>Забрати приз</button>
    </form>
</body>
</html>
```

:::tip[Подивіться на сесію]
DevTools → **Application** → **Cookies** → `http://localhost`: там кукі `PHPSESSID`. Видаліть її і надішліть уже відкриту форму — отримаєте 400: разом із сесією зник і токен. Сам файл сесії лежить на сервері (у XAMPP — `C:\xampp\tmp\sess_...`) і містить серіалізовані `flash` і `csrf`.
:::

## Стан проєкту після практичної 7

Структура:

```text
mini-blog/
├── assets/
│   └── style.css        # + стилі .error, .is-invalid
├── data/
│   └── posts.json       # пости (до П8)
├── includes/
│   ├── header.php       # + виведення flash-повідомлення
│   ├── footer.php       # без змін
│   └── helpers.php      # session_start(); e(), excerpt(), format_date(), plural();
│                        # old(), redirect(), flash(), get_flash();
│                        # csrf_token(), csrf_field(), csrf_verify();
│                        # load_posts(), save_posts(), next_post_id()
├── create.php           # валідація, $errors, old(), CSRF, PRG + flash
└── index.php            # безпечні ?q= і ?sort=, пошук, сортування
```

Звірте свої файли з повними лістингами. З цього стану починається П8, де пости переїдуть з `posts.json` у MySQL.

```php title="includes/helpers.php"
<?php
declare(strict_types=1);

// Сесія потрібна для flash-повідомлень і CSRF-токена.
// Детально про сесії та кукі — на практичній 10.
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Файл з постами (до П8, де перейдемо на MySQL)
const POSTS_FILE = __DIR__ . '/../data/posts.json';

// ================== Виведення ==================

/**
 * Екранує рядок для безпечного виведення в HTML.
 * Використовуйте для КОЖНОГО значення, яке потрапляє в розмітку.
 */
function e(?string $value): string
{
    return htmlspecialchars($value ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/**
 * Короткий уривок тексту: не довший за $length символів, без розрізання слів.
 */
function excerpt(string $text, int $length = 150): string
{
    $text = trim($text);
    if (mb_strlen($text) <= $length) {
        return $text;
    }

    // Беремо на 1 символ більше, щоб дізнатися, чи межа не припала на кінець слова
    $cut = mb_substr($text, 0, $length + 1);
    $lastSpace = mb_strrpos($cut, ' ');

    $cut = $lastSpace !== false
        ? mb_substr($cut, 0, $lastSpace)      // обрізаємо по останньому пробілу
        : mb_substr($text, 0, $length);       // одне дуже довге слово — ріжемо як є

    return rtrim($cut, ' .,;:!?') . '…';
}

/**
 * Дата українською: '2026-02-13 10:20:00' → '13 лютого 2026, 10:20'.
 */
function format_date(string $datetime): string
{
    $timestamp = strtotime($datetime);
    if ($timestamp === false) {
        return $datetime;                     // не вдалося розібрати — повертаємо як є
    }

    $months = [
        1 => 'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
        'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня',
    ];
    $month = $months[(int) date('n', $timestamp)];

    return date('j', $timestamp) . " {$month} " . date('Y, H:i', $timestamp);
}

/**
 * Число зі словом у правильній формі: 1 пост, 3 пости, 5 постів.
 */
function plural(int $n, string $one, string $few, string $many): string
{
    $mod10 = abs($n) % 10;
    $mod100 = abs($n) % 100;

    $form = match (true) {
        $mod10 === 1 && $mod100 !== 11                         => $one,
        $mod10 >= 2 && $mod10 <= 4 && ($mod100 < 12 || $mod100 > 14) => $few,
        default                                                => $many,
    };

    return "{$n} {$form}";
}

// ================== Запит і відповідь ==================

/**
 * Значення поля з останнього POST-запиту (обрізане trim) або $default.
 * Потрібне, щоб після помилки валідації форма не очищалася.
 */
function old(string $key, string $default = ''): string
{
    $value = $_POST[$key] ?? null;
    return is_string($value) ? trim($value) : $default;   // масив чи відсутнє поле → $default
}

/**
 * Перенаправлення на іншу сторінку з негайним завершенням скрипту.
 */
function redirect(string $url): never
{
    header('Location: ' . $url);
    exit;
}

/**
 * Записати flash-повідомлення: його покаже header.php на НАСТУПНІЙ сторінці.
 */
function flash(string $message, string $type = 'success'): void
{
    $_SESSION['flash'] = ['message' => $message, 'type' => $type];
}

/**
 * Прочитати й одразу видалити flash-повідомлення (показується рівно один раз).
 */
function get_flash(): ?array
{
    $flash = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return $flash;
}

// ================== CSRF-захист ==================

/**
 * Секретний токен поточної сесії (створюється при першому зверненні).
 */
function csrf_token(): string
{
    return $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
}

/**
 * Приховане поле з токеном — вставляється в кожну POST-форму.
 */
function csrf_field(): string
{
    return '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">';
}

/**
 * Чи збігається токен з форми з токеном сесії.
 */
function csrf_verify(): bool
{
    $token = $_POST['csrf'] ?? null;
    return is_string($token) && hash_equals(csrf_token(), $token);
}

// ================== Сховище постів: data/posts.json (до П8) ==================

/**
 * Усі пости з JSON-файлу (порожній масив, якщо файлу ще немає).
 */
function load_posts(): array
{
    if (!is_file(POSTS_FILE)) {
        return [];
    }

    $json = file_get_contents(POSTS_FILE);
    if ($json === false || trim($json) === '') {
        return [];
    }

    return json_decode($json, true, flags: JSON_THROW_ON_ERROR);
}

/**
 * Записати масив постів у JSON-файл.
 */
function save_posts(array $posts): void
{
    $json = json_encode($posts, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    file_put_contents(POSTS_FILE, $json, LOCK_EX);
}

/**
 * Наступний вільний id: найбільший наявний + 1.
 */
function next_post_id(array $posts): int
{
    return $posts === [] ? 1 : max(array_column($posts, 'id')) + 1;
}
```

```php title="create.php"
<?php
declare(strict_types=1);

require __DIR__ . '/includes/helpers.php';

$errors = [];   // ключ — назва поля, значення — текст помилки

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 1. CSRF: форма має прийти з нашого сайту
    if (!csrf_verify()) {
        http_response_code(400);
        exit('Недійсний CSRF-токен. Оновіть сторінку і спробуйте ще раз.');
    }

    // 2. Отримуємо значення (old() робить trim і відкидає не-рядки)
    $title  = old('title');
    $body   = old('body');
    $author = old('author');

    // 3. Валідація на сервері
    if ($title === '') {
        $errors['title'] = 'Введіть заголовок';
    } elseif (mb_strlen($title) < 3 || mb_strlen($title) > 200) {
        $errors['title'] = 'Заголовок має містити від 3 до 200 символів';
    }

    if ($body === '') {
        $errors['body'] = 'Введіть текст поста';
    } elseif (mb_strlen($body) < 10) {
        $errors['body'] = 'Текст — щонайменше 10 символів';
    } elseif (mb_strlen($body) > 10000) {
        $errors['body'] = 'Текст — не довше 10 000 символів';
    }

    if ($author === '') {
        $errors['author'] = "Вкажіть ім'я автора";
    } elseif (mb_strlen($author) > 100) {
        $errors['author'] = "Ім'я — не довше 100 символів";
    } elseif (!preg_match('/^\p{L}[\p{L}\s\'’-]*$/u', $author)) {
        $errors['author'] = "Ім'я може містити лише літери, пробіли, апостроф і дефіс";
    }

    // 4. Немає помилок — зберігаємо і перенаправляємо (Post/Redirect/Get)
    if ($errors === []) {
        $posts = load_posts();
        $posts[] = [
            'id'         => next_post_id($posts),
            'title'      => $title,
            'body'       => $body,
            'author'     => $author,
            'created_at' => date('Y-m-d H:i:s'),
        ];
        save_posts($posts);

        flash('Пост опубліковано');
        redirect('index.php');
    }
    // Є помилки — нижче знову показуємо форму з повідомленнями і введеними значеннями
}

$pageTitle = 'Новий пост';
require __DIR__ . '/includes/header.php';
?>

<h1>Новий пост</h1>

<?php if ($errors !== []): ?>
    <div class="flash flash-error">Пост не збережено: виправте помилки у формі.</div>
<?php endif; ?>

<form method="post" action="create.php" class="form" novalidate>
    <?= csrf_field() ?>

    <label>Заголовок
        <input type="text" name="title" maxlength="200" value="<?= e(old('title')) ?>"
               class="<?= isset($errors['title']) ? 'is-invalid' : '' ?>">
    </label>
    <?php if (isset($errors['title'])): ?><p class="error"><?= e($errors['title']) ?></p><?php endif; ?>

    <label>Текст
        <textarea name="body" rows="8"
                  class="<?= isset($errors['body']) ? 'is-invalid' : '' ?>"><?= e(old('body')) ?></textarea>
    </label>
    <?php if (isset($errors['body'])): ?><p class="error"><?= e($errors['body']) ?></p><?php endif; ?>

    <label>Автор
        <input type="text" name="author" maxlength="100" value="<?= e(old('author')) ?>"
               class="<?= isset($errors['author']) ? 'is-invalid' : '' ?>">
    </label>
    <?php if (isset($errors['author'])): ?><p class="error"><?= e($errors['author']) ?></p><?php endif; ?>

    <button type="submit">Опублікувати</button>
</form>

<?php require __DIR__ . '/includes/footer.php'; ?>
```

```php title="index.php"
<?php
declare(strict_types=1);

require __DIR__ . '/includes/helpers.php';

// Параметри з адресного рядка. Перевіряємо тип (?q[]=1 дає масив!) і обмежуємо довжину
$q = is_string($_GET['q'] ?? null) ? mb_substr(trim($_GET['q']), 0, 100) : '';
$sort = $_GET['sort'] ?? 'new';
if (!in_array($sort, ['new', 'old', 'title'], true)) {
    $sort = 'new';                            // білий список: невідоме значення → типове
}

$posts = load_posts();

// Пошук у заголовку і тексті без урахування регістру
if ($q !== '') {
    $posts = array_values(array_filter(
        $posts,
        fn(array $post): bool => mb_stripos($post['title'], $q) !== false
            || mb_stripos($post['body'], $q) !== false
    ));
}

// Сортування: match повертає функцію порівняння для usort
usort($posts, match ($sort) {
    'old'   => fn(array $a, array $b): int => [$a['created_at'], $a['id']] <=> [$b['created_at'], $b['id']],
    'title' => fn(array $a, array $b): int => mb_strtolower($a['title']) <=> mb_strtolower($b['title']),
    default => fn(array $a, array $b): int => [$b['created_at'], $b['id']] <=> [$a['created_at'], $a['id']],
});

$pageTitle = 'Усі пости';
require __DIR__ . '/includes/header.php';
?>

<form class="search" method="get" action="index.php">
    <input type="search" name="q" value="<?= e($q) ?>" placeholder="Пошук постів…" maxlength="100">
    <select name="sort">
        <option value="new" <?= $sort === 'new' ? 'selected' : '' ?>>Спочатку нові</option>
        <option value="old" <?= $sort === 'old' ? 'selected' : '' ?>>Спочатку старі</option>
        <option value="title" <?= $sort === 'title' ? 'selected' : '' ?>>За назвою</option>
    </select>
    <button type="submit">Знайти</button>
</form>

<?php if ($q !== ''): ?>
    <p>
        Результати пошуку «<?= e($q) ?>»: <?= plural(count($posts), 'пост', 'пости', 'постів') ?>.
        <a href="index.php">Скинути</a>
    </p>
<?php endif; ?>

<?php if ($posts === []): ?>
    <p class="empty">
        <?php if ($q !== ''): ?>
            Нічого не знайдено.
        <?php else: ?>
            Постів поки немає. <a href="create.php">Напишіть перший!</a>
        <?php endif; ?>
    </p>
<?php endif; ?>

<?php foreach ($posts as $post): ?>
    <article class="post-card">
        <h2><?= e($post['title']) ?></h2>
        <p class="meta"><?= e($post['author']) ?> · <?= e(format_date($post['created_at'])) ?></p>
        <p><?= nl2br(e(excerpt($post['body'], 200))) ?></p>
    </article>
<?php endforeach; ?>

<?php require __DIR__ . '/includes/footer.php'; ?>
```

`includes/header.php` — у кроці 4, `includes/footer.php` — без змін з П6.

## Завдання для самостійного виконання

1. ★ Додайте лічильник символів під полем заголовка: «0 / 200» (на сервері — у шаблоні `mb_strlen(old('title'))`, а «живе» оновлення — кількома рядками JavaScript). Перевірте, що серверне обмеження працює навіть з вимкненим JS.
2. ★ Заборонні слова: якщо заголовок або текст містить слово зі списку `['спам', 'казино']` (без урахування регістру, `mb_stripos`), показуйте помилку «Текст містить заборонені слова».
3. ★★ Необов'язкове поле «Посилання на джерело» (`source`): якщо заповнене — має бути валідним URL (`FILTER_VALIDATE_URL`) зі схемою `http` або `https`. Збережіть його в пості й виведіть у `index.php` як посилання `<a href="..." rel="nofollow noopener" target="_blank">` (з `e()`). Перевірте, що `javascript://example.com/%0Aalert(1)` відхиляється.
4. ★★ Захист від дублікатів: якщо останній пост має такий самий заголовок і автора і створений менш ніж 60 секунд тому — помилка «Схоже, цей пост уже опубліковано».
5. ★★★ Перенесіть валідацію в окрему функцію `validate_post_input(array $data): array` у новому файлі `includes/validation.php`, що повертає масив помилок, і напишіть для неї 8–10 автотестів у стилі `tests.php` з П5 (порожні поля, межі 2/3 і 200/201 символів, ім'я з цифрами, ім'я з апострофом).

## Контрольні питання

1. Чим відрізняються нормалізація, валідація та екранування? На якому етапі застосовують кожну?
2. Чому не можна покладатися на атрибути `required` і `maxlength`? Наведіть два способи їх обійти.
3. Чому для перевірки обов'язкового поля використано `$value === ''`, а не `empty($value)`?
4. Що повертає `filter_var('007', FILTER_VALIDATE_INT)` і `filter_var(' 42 ', FILTER_VALIDATE_INT)`? Чому `FILTER_VALIDATE_URL` недостатньо для посилань від користувачів?
5. Поясніть різницю між збереженим і відбитим XSS. Як `e()` захищає від обох у нашому проєкті?
6. Чому значення в атрибуті `value="..."` теж потрібно екранувати? Яку роль відіграє `ENT_QUOTES`?
7. Опишіть патерн PRG. Що станеться, якщо після `header('Location: ...')` не викликати `exit`?
8. Чому обробку форми розміщують до `require header.php`? Що означає помилка *headers already sent*?
9. Як працює flash-повідомлення? Чому воно показується лише один раз?
10. Як CSRF-токен захищає від `evil.html`? Навіщо порівнювати токени через `hash_equals()`, а не `===`?

## Домашнє завдання

1. Виконайте завдання ★ 1 і 2.
2. Створіть сторінку `contact.php` «Написати автору» з полями «Ім'я», «Email», «Повідомлення» (10–1000 символів): серверна валідація (email — `FILTER_VALIDATE_EMAIL`), збереження значень через `old()`, CSRF, а після успіху — PRG на головну з flash «Дякуємо, повідомлення надіслано». Повідомлення дописуйте у файл `data/messages.json`.
3. Додайте посилання на `contact.php` у меню `header.php`.

## Що здати

- Папку `mini-blog` у стані після П7 (і `contact.php` з домашнього завдання) та `practice-07/filters.php`.
- Заповнену таблицю сценаріїв з кроку 8 (результат кожного сценарію) і скриншоти сценаріїв 1, 5, 7 і 9.
- Відповіді на контрольні питання.
