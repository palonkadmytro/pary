---
title: "Робота з сесіями та кукі"
description: "Розбираємо, як HTTP «пам'ятає» користувача через кукі й сесії, і додаємо в «Міні-блог» реєстрацію, вхід і вихід, захист сторінок, права автора на пости, а також кукі для теми оформлення і запам'ятовування email."
type: practice
pair: 10
topic: 66
---

## Мета роботи

- Зрозуміти, як працюють кукі (cookies) і сесії (sessions) на рівні HTTP-заголовків.
- Навчитися безпечно налаштовувати кукі: `Expires`/`Max-Age`, `Path`, `Secure`, `HttpOnly`, `SameSite`.
- Реалізувати реєстрацію з `password_hash()`, вхід з `password_verify()` і `session_regenerate_id()`, вихід.
- Розмежувати **автентифікацію** (хто ви?) і **авторизацію** (що вам дозволено?): створювати пости можуть лише користувачі, що увійшли, а редагувати й видаляти — лише автор поста.
- Використати кукі для налаштувань: тема оформлення і «запам'ятати email».

## Що потрібно

- Проєкт `mini-blog` у стані після П9: таблиці `users`, `posts` (з `user_id`), `comments`; файли `includes/posts.php`, `post.php`, `edit.php`, `delete.php`, пагінація в `index.php`.
- Браузер з DevTools (вкладка **Application → Cookies** у Chrome/Edge або **Storage** у Firefox) — щоб бачити кукі.

## Короткі теоретичні відомості

### HTTP не має стану

Протокол HTTP — **без стану** (stateless): кожен запит обробляється незалежно, сервер «не пам'ятає», що цей самий браузер секунду тому ввів пароль. Щоб пов'язати запити між собою, браузер має щоразу надсилати якийсь ідентифікатор. Для цього існують кукі.

### Кукі

**Кукі** (cookie) — невелика пара «ім'я=значення», яку сервер просить браузер зберегти, а браузер потім автоматично додає до кожного запиту на цей сайт.

```text
1. Відповідь сервера:
   HTTP/1.1 200 OK
   Set-Cookie: theme=dark; Expires=Sat, 13 Nov 2027 10:00:00 GMT; Path=/; HttpOnly; SameSite=Lax

2. Кожен наступний запит браузера:
   GET /mini-blog/index.php HTTP/1.1
   Cookie: theme=dark; MINIBLOGSESS=k3j9f8...
```

У PHP кукі встановлюють функцією `setcookie()`, а читають з масиву `$_COOKIE`. Атрибути:

| Атрибут | Значення | Порада |
|---|---|---|
| `Expires` / `Max-Age` | Коли кукі «помре». Без нього — **сеансова** кукі, зникає при закритті браузера | Для налаштувань — місяці; для сесії — без терміну |
| `Path` | Для яких шляхів сайту надсилати | Зазвичай `/` |
| `Domain` | Для яких доменів (і піддоменів) | Зазвичай не вказувати — тоді лише поточний домен |
| `Secure` | Надсилати лише через HTTPS | Обов'язково на продакшні |
| `HttpOnly` | Кукі **недоступна з JavaScript** (`document.cookie`) | Завжди для сесій — захист від крадіжки через XSS |
| `SameSite` | Чи надсилати кукі при запитах з інших сайтів: `Strict`, `Lax`, `None` | `Lax` — розумний типовий вибір; захищає від більшості CSRF-атак |

Важливі властивості кукі:

- Розмір — до ~4 КБ на кукі.
- Кукі зберігаються **у браузері користувача** — він може переглянути й змінити будь-яку з них. Тому в кукі **ніколи** не зберігають права доступу, ціни, `is_admin=1` тощо.
- Встановлена кукі з'являється в `$_COOKIE` лише **з наступного** запиту.
- `setcookie()` відправляє HTTP-заголовок, тому викликається **до будь-якого виведення** (навіть пробілу перед `<?php`). Інакше — попередження `Cannot modify header information - headers already sent`.

### Сесії

**Сесія** — механізм зберігання даних **на сервері**, прив'язаних до конкретного браузера. Браузер отримує лише випадковий **ідентифікатор сесії** (session ID) у кукі, а самі дані (`$_SESSION`) лежать на сервері — за замовчуванням у файлі в тимчасовій папці.

```text
 Браузер                                Сервер
 ┌────────────────────────┐            ┌──────────────────────────────────┐
 │ Cookie:                │  запит ──► │ session_start()                  │
 │ MINIBLOGSESS=k3j9f8... │            │ читає файл sess_k3j9f8...        │
 └────────────────────────┘            │ $_SESSION = ['user' => [...],    │
                                       │              'csrf' => '...']    │
                                       └──────────────────────────────────┘
```

| | Кукі | Сесія |
|---|---|---|
| Де зберігаються дані | У браузері | На сервері |
| Хто може змінити | Користувач | Лише ваш код |
| Обсяг | ~4 КБ | Практично необмежений |
| Що зберігати | Налаштування інтерфейсу, мова, тема | Хто увійшов, кошик, CSRF-токен, flash |

Життєвий цикл сесії в PHP:

1. `session_start()` — якщо браузер надіслав кукі з ID, PHP завантажує відповідні дані в `$_SESSION`; якщо ні — створює новий ID і відправляє `Set-Cookie`.
2. Код читає і змінює `$_SESSION` як звичайний масив.
3. Наприкінці скрипта PHP автоматично зберігає `$_SESSION` на сервер.

### Атаки на сесію

- **Крадіжка ID** (session hijacking): хто знає ID сесії, той «є» користувачем. Захист — `HttpOnly` (недоступна для JS), `Secure` (не передається відкритим текстом), HTTPS.
- **Фіксація сесії** (session fixation): зловмисник заздалегідь «підсовує» жертві відомий йому ID (наприклад, через посилання), жертва входить — і зловмисник уже має сесію з її правами. Захист — **змінювати ID при вході**: `session_regenerate_id(true)`, а також `session.use_strict_mode=1` (PHP не приймає ID, які сам не створював).

### Паролі

Пароль **ніколи** не зберігають у відкритому вигляді і не «шифрують» — його **хешують** спеціальною повільною функцією з сіллю (salt):

```php
$hash = password_hash('secret123', PASSWORD_DEFAULT);
// $2y$12$Q9v7... (60 символів: алгоритм, вартість, сіль і хеш — усе в одному рядку)

password_verify('secret123', $hash); // true
password_verify('Secret123', $hash); // false
```

- `PASSWORD_DEFAULT` зараз означає bcrypt; сіль генерується автоматично і зберігається в самому хеші — окремий стовпець для неї не потрібен.
- `md5()`, `sha1()`, `hash('sha256', ...)` для паролів **не підходять**: вони надто швидкі, і перебір мільярдів варіантів на відеокарті займає хвилини.
- Детальніше — у лекції 13.

### Автентифікація й авторизація

- **Автентифікація** (authentication) — перевірка, *хто* ви: вхід за email і паролем.
- **Авторизація** (authorization) — перевірка, *що* вам дозволено: «редагувати пост може лише його автор».

Типова помилка — перевіряти лише першу: сховати кнопку «Редагувати» від чужих постів, але не перевіряти права в самому `edit.php`. Тоді будь-хто, хто увійшов, відредагує чужий пост, просто змінивши `id` в адресі (це вразливість IDOR — Insecure Direct Object Reference).

## Хід роботи

### Крок 1. Безпечні налаштування сесії

У П7 ми викликали `session_start()` без налаштувань. Замінимо цей блок на початку `includes/helpers.php`:

```php title="includes/helpers.php (початок файлу)"
<?php
declare(strict_types=1);

// Чи прийшов запит через HTTPS
function is_https(): bool
{
    return ($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off';
}

if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.use_strict_mode', '1');   // не приймати «чужі» ID сесій
    ini_set('session.use_only_cookies', '1');  // ID — лише з кукі, не з URL

    session_name('MINIBLOGSESS');              // своє ім'я замість PHPSESSID
    session_set_cookie_params([
        'lifetime' => 0,          // сеансова кукі: до закриття браузера
        'path'     => '/',
        'secure'   => is_https(), // на локальному http — false, на хостингу з HTTPS — true
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

// ...далі e(), redirect(), old(), flash(), get_flash(), CSRF, abort() — без змін
```

І в самому кінці `helpers.php` підключимо файл з функціями автентифікації (створимо його на наступному кроці), щоб вони були доступні на кожній сторінці, у тому числі в `header.php`:

```php title="includes/helpers.php (кінець файлу)"
require_once __DIR__ . '/auth.php';
```

:::caution[`require` проти `require_once` для `db.php`]
Тепер `db.php` підключається вже з `helpers.php` (через `auth.php`). Якщо на якійсь сторінці у вас ще залишився рядок `require __DIR__ . '/includes/db.php';` без `_once`, PHP спробує оголосити функцію `db()` вдруге — `Fatal error: Cannot redeclare db()`. Пройдіться по файлах і замініть такі рядки на `require_once` (або підключайте `includes/posts.php`, як у П9).
:::

Відкрийте блог, у DevTools → **Application → Cookies** → `http://localhost`. Має бути кукі `MINIBLOGSESS` з позначкою **HttpOnly** і `SameSite=Lax`. Спробуйте в консолі `document.cookie` — сесійної кукі там не видно.

### Крок 2. Функції автентифікації: `includes/auth.php`

```php title="includes/auth.php"
<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

// Користувач, що увійшов, або null
function current_user(): ?array
{
    return $_SESSION['user'] ?? null;
}

// Позначити користувача як такого, що увійшов
function login_user(array $user): void
{
    // Новий ID сесії — захист від фіксації сесії
    session_regenerate_id(true);

    // У сесії — лише потрібний мінімум, ЖОДНИХ паролів і хешів
    $_SESSION['user'] = [
        'id'    => (int) $user['id'],
        'name'  => $user['name'],
        'email' => $user['email'],
    ];
}

function logout_user(): void
{
    unset($_SESSION['user']);
    session_regenerate_id(true);
}

// Вимагати вхід: інакше — на сторінку входу
function require_login(): array
{
    $user = current_user();
    if ($user === null) {
        flash('Увійдіть, щоб продовжити', 'error');
        redirect('login.php');
    }
    return $user;
}

// Чи може поточний користувач керувати постом (редагувати/видаляти)
function can_manage_post(array $post): bool
{
    $user = current_user();
    return $user !== null
        && $post['user_id'] !== null
        && (int) $post['user_id'] === $user['id'];
}

// Перевірка прав з відповіддю 403
function require_owner(array $post): void
{
    if (!can_manage_post($post)) {
        abort(403, 'Редагувати й видаляти пост може лише його автор');
    }
}
```

`session_regenerate_id(true)` створює новий ID, переносить у нього дані сесії, а старий файл сесії видаляє (`true`). CSRF-токен і flash при цьому зберігаються.

### Крок 3. Реєстрація: `register.php`

```php title="register.php"
<?php
declare(strict_types=1);
require __DIR__ . '/includes/helpers.php';

if (current_user() !== null) {
    redirect('index.php'); // уже увійшли
}

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_verify()) {
        abort(400, 'Недійсний CSRF-токен');
    }

    $name     = old('name');
    $email    = mb_strtolower(old('email'));
    $password = (string) ($_POST['password'] ?? '');   // пароль НЕ обрізаємо trim()
    $confirm  = (string) ($_POST['password_confirm'] ?? '');

    if ($name === '' || mb_strlen($name) > 100) {
        $errors['name'] = "Вкажіть ім'я (до 100 символів)";
    }
    if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
        $errors['email'] = 'Некоректний email';
    }
    if (mb_strlen($password) < 8) {
        $errors['password'] = 'Пароль — щонайменше 8 символів';
    } elseif ($password !== $confirm) {
        $errors['password_confirm'] = 'Паролі не збігаються';
    }

    if ($errors === []) {
        try {
            $stmt = db()->prepare(
                'INSERT INTO users (name, email, password_hash) VALUES (:name, :email, :hash)'
            );
            $stmt->execute([
                'name'  => $name,
                'email' => $email,
                'hash'  => password_hash($password, PASSWORD_DEFAULT),
            ]);

            login_user(['id' => db()->lastInsertId(), 'name' => $name, 'email' => $email]);
            flash("Вітаємо, {$name}! Реєстрація успішна.");
            redirect('index.php');
        } catch (PDOException $ex) {
            // 1062 — дублікат унікального ключа (email уже зайнятий)
            if (($ex->errorInfo[1] ?? null) === 1062) {
                $errors['email'] = 'Користувач з таким email уже існує';
            } else {
                throw $ex;
            }
        }
    }
}

$pageTitle = 'Реєстрація';
require __DIR__ . '/includes/header.php';
?>

<h1>Реєстрація</h1>

<form method="post" action="register.php" class="form" novalidate>
    <?= csrf_field() ?>

    <label>Ім'я
        <input type="text" name="name" maxlength="100" value="<?= e(old('name')) ?>" autocomplete="name">
    </label>
    <?php if (isset($errors['name'])): ?><p class="error"><?= e($errors['name']) ?></p><?php endif; ?>

    <label>Email
        <input type="email" name="email" value="<?= e(old('email')) ?>" autocomplete="email">
    </label>
    <?php if (isset($errors['email'])): ?><p class="error"><?= e($errors['email']) ?></p><?php endif; ?>

    <label>Пароль
        <input type="password" name="password" autocomplete="new-password">
    </label>
    <?php if (isset($errors['password'])): ?><p class="error"><?= e($errors['password']) ?></p><?php endif; ?>

    <label>Повторіть пароль
        <input type="password" name="password_confirm" autocomplete="new-password">
    </label>
    <?php if (isset($errors['password_confirm'])): ?><p class="error"><?= e($errors['password_confirm']) ?></p><?php endif; ?>

    <button type="submit">Зареєструватися</button>
    <p>Уже маєте акаунт? <a href="login.php">Увійти</a></p>
</form>

<?php require __DIR__ . '/includes/footer.php'; ?>
```

На що звернути увагу:

- **Поле пароля не заповнюємо `old()`** після помилки: пароль не повинен повертатися в HTML-сторінку.
- **Унікальність email** гарантує `UNIQUE`-індекс у БД, а не попередній `SELECT`. Між перевіркою «email вільний» і `INSERT` інший запит може встигнути зареєструвати той самий email (race condition), а обмеження БД спрацює завжди. Тому ловимо `PDOException` з кодом MySQL `1062`.
- Email переводимо в нижній регістр, щоб `Olena@Mail.com` і `olena@mail.com` не стали двома акаунтами.

Зареєструйтеся і подивіться в phpMyAdmin на таблицю `users`: у стовпці `password_hash` — рядок на кшталт `$2y$12$...`, пароля там немає.

### Крок 4. Вхід: `login.php` і кукі «запам'ятати email»

```php title="login.php"
<?php
declare(strict_types=1);
require __DIR__ . '/includes/helpers.php';

if (current_user() !== null) {
    redirect('index.php');
}

$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_verify()) {
        abort(400, 'Недійсний CSRF-токен');
    }

    $email    = mb_strtolower(old('email'));
    $password = (string) ($_POST['password'] ?? '');

    $stmt = db()->prepare('SELECT id, name, email, password_hash FROM users WHERE email = :email');
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if ($user !== false && password_verify($password, $user['password_hash'])) {
        // Якщо алгоритм або вартість хешування змінилися — оновлюємо хеш
        if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
            db()->prepare('UPDATE users SET password_hash = :h WHERE id = :id')
                ->execute(['h' => password_hash($password, PASSWORD_DEFAULT), 'id' => $user['id']]);
        }

        // Кукі «запам'ятати email» на 30 днів або видалення кукі
        $cookieOptions = [
            'path'     => '/',
            'secure'   => is_https(),
            'httponly' => true,
            'samesite' => 'Lax',
        ];
        if (isset($_POST['remember'])) {
            setcookie('remember_email', $email, $cookieOptions + ['expires' => time() + 60 * 60 * 24 * 30]);
        } else {
            setcookie('remember_email', '', $cookieOptions + ['expires' => time() - 3600]);
        }

        login_user($user);
        flash("Вітаємо, {$user['name']}!");
        redirect('index.php');
    }

    // Однакове повідомлення для «немає такого email» і «неправильний пароль»
    $error = 'Неправильний email або пароль';
}

$rememberedEmail = (string) ($_COOKIE['remember_email'] ?? '');

$pageTitle = 'Вхід';
require __DIR__ . '/includes/header.php';
?>

<h1>Вхід</h1>

<?php if ($error !== null): ?>
    <p class="error"><?= e($error) ?></p>
<?php endif; ?>

<form method="post" action="login.php" class="form">
    <?= csrf_field() ?>

    <label>Email
        <input type="email" name="email" value="<?= e(old('email', $rememberedEmail)) ?>" autocomplete="email" required>
    </label>

    <label>Пароль
        <input type="password" name="password" autocomplete="current-password" required>
    </label>

    <label class="checkbox">
        <input type="checkbox" name="remember" <?= $rememberedEmail !== '' ? 'checked' : '' ?>>
        Запам'ятати email
    </label>

    <button type="submit">Увійти</button>
    <p>Немає акаунта? <a href="register.php">Зареєструватися</a></p>
</form>

<?php require __DIR__ . '/includes/footer.php'; ?>
```

Пояснення:

- **Одне повідомлення на обидві помилки.** Якщо писати «email не знайдено» і «неправильний пароль» окремо, зловмисник зможе перевіряти, хто зареєстрований на сайті (user enumeration).
- **`setcookie` з масивом опцій** (PHP 7.3+) — єдиний спосіб задати `SameSite`. Щоб **видалити** кукі, встановлюємо її з датою в минулому і тими самими `path`/`domain`.
- **`$cookieOptions + [...]`** — оператор `+` для масивів додає ключі з правого масиву, яких немає в лівому.
- У кукі зберігаємо лише email для зручності, **а не** «залогіненість». Кукі `logged_in=1` або `user_id=5` — грубі помилки: користувач змінить значення в DevTools і стане ким завгодно.

:::caution[`headers already sent`]
`setcookie()`, `header()`, `session_start()` і `session_regenerate_id()` змінюють заголовки відповіді, тому мають викликатися **до** виведення HTML. Саме тому вся обробка форми розміщена вгорі файлу, а `header.php` підключається після неї. Частий прихований винуватець — порожній рядок або BOM перед `<?php` в одному з підключених файлів.
:::

### Крок 5. Вихід: `logout.php`

Вихід змінює стан, тому це теж `POST` з CSRF-токеном (інакше будь-який сайт може «розлогінити» користувача картинкою `<img src=".../logout.php">`).

```php title="logout.php"
<?php
declare(strict_types=1);
require __DIR__ . '/includes/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !csrf_verify()) {
    abort(400, 'Некоректний запит');
}

logout_user();
flash('Ви вийшли з акаунта');
redirect('index.php');
```

:::note[Повне знищення сесії]
Ми видаляємо з сесії лише ключ `user` і змінюємо ID — так зберігається механізм flash. Якщо потрібно знищити сесію повністю (наприклад, «вийти на всіх пристроях»), роблять так: `$_SESSION = [];`, видаляють кукі сесії через `setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => '/'])` і викликають `session_destroy()`.
:::

### Крок 6. Шапка сайту: меню користувача і тема

Перепишемо `includes/header.php`. Тепер він показує ім'я користувача і кнопку виходу (або посилання «Увійти» / «Реєстрація»), перемикач теми, а також flash-повідомлення, як і раніше.

```php title="includes/header.php"
<?php
// Очікує змінну $pageTitle. Функції — з helpers.php і auth.php
$currentUser = current_user();
$theme = ($_COOKIE['theme'] ?? '') === 'dark' ? 'dark' : 'light'; // білий список
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
<body class="theme-<?= $theme ?>">
<header class="site-header">
    <a class="logo" href="index.php">📝 Міні-блог</a>

    <nav class="menu">
        <?php if ($currentUser !== null): ?>
            <a href="create.php">+ Новий пост</a>
            <span class="user">👤 <?= e($currentUser['name']) ?></span>
            <form method="post" action="logout.php" class="inline">
                <?= csrf_field() ?>
                <button type="submit" class="link">Вийти</button>
            </form>
        <?php else: ?>
            <a href="login.php">Увійти</a>
            <a href="register.php">Реєстрація</a>
        <?php endif; ?>

        <form method="post" action="theme.php" class="inline">
            <?= csrf_field() ?>
            <input type="hidden" name="theme" value="<?= $theme === 'dark' ? 'light' : 'dark' ?>">
            <input type="hidden" name="back" value="<?= e($_SERVER['REQUEST_URI'] ?? '') ?>">
            <button type="submit" class="link" title="Змінити тему">
                <?= $theme === 'dark' ? '☀️' : '🌙' ?>
            </button>
        </form>
    </nav>
</header>

<main class="container">
<?php if ($flash !== null): ?>
    <div class="flash flash-<?= e($flash['type']) ?>"><?= e($flash['message']) ?></div>
<?php endif; ?>
```

`footer.php` залишається з П7 (закриває `</main>`, `</body>`, `</html>`).

Значення `$theme` ми не виводимо з кукі напряму, а перетворюємо на одне з двох відомих значень. Кукі може змінити користувач — `theme="><script>...` не повинно потрапити в атрибут `class`.

### Крок 7. Перемикання теми: `theme.php`

```php title="theme.php"
<?php
declare(strict_types=1);
require __DIR__ . '/includes/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !csrf_verify()) {
    abort(400, 'Некоректний запит');
}

$theme = ($_POST['theme'] ?? '') === 'dark' ? 'dark' : 'light';

setcookie('theme', $theme, [
    'expires'  => time() + 60 * 60 * 24 * 365, // рік
    'path'     => '/',
    'secure'   => is_https(),
    'httponly' => true,      // JS тема не потрібна — тож і доступ не даємо
    'samesite' => 'Lax',
]);

// Повертаємося на ту саму сторінку, але лише в межах НАШОГО сайту
$back = (string) ($_POST['back'] ?? '');
$isLocal = str_starts_with($back, '/')
    && !str_starts_with($back, '//')
    && !str_contains($back, '\\');

redirect($isLocal ? $back : 'index.php');
```

Перевірка `$back` захищає від **відкритого перенаправлення** (open redirect): без неї зловмисник міг би підставити `back=https://evil.example` і використовувати ваш сайт як «трамплін» для фішингових посилань. Адреси на кшталт `//evil.example` і `/\evil.example` браузер теж трактує як інший домен — тому їх відкидаємо.

Стилі теми — у `assets/style.css`:

```css title="assets/style.css (додати)"
body.theme-dark { background: #0f172a; color: #e2e8f0; }
body.theme-dark a { color: #93c5fd; }
body.theme-dark .post-card,
body.theme-dark .comment { background: #1e293b; border-color: #334155; }
body.theme-dark input,
body.theme-dark textarea,
body.theme-dark select { background: #1e293b; color: #e2e8f0; border-color: #475569; }

.site-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
.menu { display: flex; align-items: center; gap: 1rem; }
form.inline { display: inline; margin: 0; }
button.link { background: none; border: none; padding: 0; color: inherit; cursor: pointer; font: inherit; text-decoration: underline; }
```

### Крок 8. Автор — користувач: оновлюємо запити

Тепер автор поста — це запис у `users`, а старі пости мають лише рядок `author`. Ім'я для виведення отримаємо через `LEFT JOIN` і `COALESCE` (перше не-`NULL` значення зі списку).

Оновіть `find_post()` в `includes/posts.php`:

```php title="includes/posts.php (функція find_post)"
function find_post(int $id): ?array
{
    $stmt = db()->prepare(
        "SELECT p.id, p.user_id, p.title, p.body, p.created_at,
                COALESCE(u.name, p.author, 'Анонім') AS author_name
         FROM posts p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE p.id = :id"
    );
    $stmt->execute(['id' => $id]);

    return $stmt->fetch() ?: null;
}
```

У `index.php` змініть основний запит вибірки:

```php title="index.php (основний запит)" {2,5}
$stmt = db()->prepare(
    "SELECT p.id, p.title, p.body, p.created_at, COALESCE(u.name, p.author, 'Анонім') AS author_name,
            COUNT(c.id) AS comments_count
     FROM posts p
     LEFT JOIN users u ON u.id = p.user_id
     LEFT JOIN comments c ON c.post_id = p.id
     {$where}
     GROUP BY p.id, u.name
     ORDER BY {$orderBy}
     LIMIT :limit OFFSET :offset"
);
```

І в шаблонах `index.php` та `post.php` замініть `$post['author'] ?? 'Анонім'` на `$post['author_name']`.

### Крок 9. Захист сторінок: `create.php`, `edit.php`, `delete.php`

**`create.php`** — тепер лише для тих, хто увійшов, а поле «Автор» з форми прибираємо: автор — поточний користувач.

```php title="create.php"
<?php
declare(strict_types=1);
require __DIR__ . '/includes/helpers.php';
require __DIR__ . '/includes/posts.php';

$user = require_login();
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_verify()) {
        abort(400, 'Недійсний CSRF-токен');
    }
    $errors = validate_post(old('title'), old('body'));

    if ($errors === []) {
        $stmt = db()->prepare(
            'INSERT INTO posts (user_id, title, body) VALUES (:user_id, :title, :body)'
        );
        $stmt->execute([
            'user_id' => $user['id'],   // з СЕСІЇ, а не з форми!
            'title'   => old('title'),
            'body'    => old('body'),
        ]);
        $newId = (int) db()->lastInsertId();

        flash('Пост опубліковано');
        redirect("post.php?id={$newId}");
    }
}

$pageTitle = 'Новий пост';
require __DIR__ . '/includes/header.php';
?>

<h1>Новий пост</h1>

<form method="post" action="create.php" class="form" novalidate>
    <?= csrf_field() ?>

    <label>Заголовок
        <input type="text" name="title" maxlength="200" value="<?= e(old('title')) ?>">
    </label>
    <?php if (isset($errors['title'])): ?><p class="error"><?= e($errors['title']) ?></p><?php endif; ?>

    <label>Текст
        <textarea name="body" rows="10"><?= e(old('body')) ?></textarea>
    </label>
    <?php if (isset($errors['body'])): ?><p class="error"><?= e($errors['body']) ?></p><?php endif; ?>

    <button type="submit">Опублікувати</button>
</form>

<?php require __DIR__ . '/includes/footer.php'; ?>
```

:::danger[`user_id` — тільки з сесії]
Ніколи не додавайте у форму `<input type="hidden" name="user_id">`. Приховане поле користувач змінить у DevTools за секунду і опублікує пост від імені іншої людини. Усе, що визначає «хто я і що мені можна», береться лише з сесії на сервері.
:::

**`edit.php` і `delete.php`** — дописуємо по два рядки одразу після отримання поста:

```php title="edit.php (початок)" {8-9}
<?php
declare(strict_types=1);
require __DIR__ . '/includes/helpers.php';
require __DIR__ . '/includes/posts.php';

$id = request_id($_GET) ?? abort(404, 'Пост не знайдено');
$post = find_post_or_404($id);
require_login();
require_owner($post);
// ...далі без змін
```

```php title="delete.php (фрагмент)" {3-4}
$id = request_id($_POST) ?? abort(404, 'Пост не знайдено');
$post = find_post_or_404($id);
require_login();
require_owner($post);
```

**`post.php`** — кнопки «Редагувати» / «Видалити» показуємо лише автору, а ім'я коментатора підставляємо з профілю:

```php title="post.php (фрагменти шаблону)"
<?php if (can_manage_post($post)): ?>
    <div class="post-actions">
        <a href="edit.php?id=<?= $post['id'] ?>">Редагувати</a>
        <form method="post" action="delete.php"
              onsubmit="return confirm('Видалити пост разом з коментарями?')">
            <?= csrf_field() ?>
            <input type="hidden" name="id" value="<?= $post['id'] ?>">
            <button type="submit" class="danger">Видалити</button>
        </form>
    </div>
<?php endif; ?>

<!-- ... у формі коментаря: -->
<input type="text" name="author" maxlength="100"
       value="<?= e(old('author', current_user()['name'] ?? '')) ?>">
```

Приховування кнопок — це лише зручність інтерфейсу. Справжній захист — у `require_owner()` всередині `edit.php` і `delete.php`.

### Крок 10. Старі пости і перевірка

Пости, імпортовані з JSON, мають `user_id = NULL`, тому ні редагувати, ні видаляти їх ніхто не може. Призначте їх своєму акаунту (підставте свій `id` з таблиці `users`):

```sql title="SQL"
UPDATE posts SET user_id = 1 WHERE user_id IS NULL;
```

Перевірте сценарії, використовуючи **два браузери** (або звичайне й приватне вікно) — у них різні кукі, тож це два різні користувачі:

| Сценарій | Очікуваний результат |
|---|---|
| Гість відкриває `create.php` | Перенаправлення на `login.php`, flash «Увійдіть, щоб продовжити» |
| Реєстрація з уже зайнятим email | «Користувач з таким email уже існує» |
| Вхід з неправильним паролем | «Неправильний email або пароль» |
| Вхід з «Запам'ятати email», вихід, знову `login.php` | Email уже заповнено; у DevTools є кукі `remember_email` |
| Користувач Б відкриває `edit.php?id=` поста користувача А | «Помилка 403» |
| Перемикач теми | Тема змінилася і зберігається після перезапуску браузера |
| Порівняти значення `MINIBLOGSESS` до і після входу | Значення **різні** — спрацював `session_regenerate_id` |

**Результат роботи:** у «Міні-блозі» є реєстрація, вхід і вихід. Сесія налаштована безпечно, паролі зберігаються як хеші. Пости прив'язані до користувачів, створення доступне лише після входу, редагування й видалення — лише автору. Кукі зберігають тему оформлення і (за бажанням) email для входу.

## Завдання для самостійного виконання

1. ★ Додайте сторінку `profile.php` (лише для тих, хто увійшов): ім'я, email, дата реєстрації і кількість постів користувача.
2. ★ На сторінці поста біля імені автора показуйте позначку «(ви)», якщо пост належить поточному користувачу.
3. ★★ **Тайм-аут неактивності.** Зберігайте в сесії час останнього запиту `$_SESSION['last_activity']`. Якщо минуло понад 30 хвилин — виконуйте `logout_user()` і показуйте flash «Сесія завершилася через неактивність».
4. ★★ Додайте на `profile.php` форму зміни пароля: поточний пароль (перевірка `password_verify`), новий, підтвердження. Після зміни викличте `session_regenerate_id(true)`.
5. ★★★ **Обмеження спроб входу.** Створіть таблицю `login_attempts(email, ip, attempted_at)`. Після 5 невдалих спроб для одного email або IP за 15 хвилин відмовляйте у вході з повідомленням «Забагато спроб, спробуйте пізніше». Поясніть у звіті, чому лічильник у `$_SESSION` для цього не годиться.

## Контрольні питання

1. Чому HTTP називають протоколом без стану? Як кукі розв'язують цю проблему?
2. Що означають атрибути кукі `HttpOnly`, `Secure` і `SameSite=Lax`? Від яких атак захищає кожен?
3. Чим сесія відрізняється від кукі? Що саме зберігається в браузері при використанні сесії?
4. Чому в кукі не можна зберігати `user_id` для визначення, хто увійшов?
5. Що таке фіксація сесії і як її запобігають `session_regenerate_id()` та `session.use_strict_mode`?
6. Чому для паролів використовують `password_hash()`, а не `md5()` чи `sha1()`? Де зберігається сіль?
7. Навіщо `password_needs_rehash()`?
8. Чому при невдалому вході показують одне повідомлення «Неправильний email або пароль»?
9. Чим автентифікація відрізняється від авторизації? Наведіть приклад кожної з «Міні-блогу».
10. Чому вихід (`logout.php`) і перемикання теми реалізовані через `POST`? Що таке open redirect і як ми від нього захистилися?

## Домашнє завдання

1. Зареєструйте двох користувачів і створіть від кожного по 2–3 пости. Переконайтеся, що користувачі не можуть редагувати пости одне одного (зробіть скриншот сторінки 403).
2. Відкрийте DevTools → **Network**, увійдіть у блог і знайдіть у відповіді на запит до `login.php` заголовки `Set-Cookie`. Перепишіть їх у звіт і поясніть кожен атрибут.
3. Знайдіть, де PHP зберігає файли сесій (`echo session_save_path();` або `phpinfo()`), відкрийте файл своєї сесії в текстовому редакторі й опишіть у звіті, що в ньому записано.

## Що здати

- Файли `includes/auth.php`, `includes/header.php`, `register.php`, `login.php`, `logout.php`, `theme.php`, `create.php`.
- Скриншот таблиці `users` з хешами паролів.
- Скриншот DevTools з кукі `MINIBLOGSESS`, `theme`, `remember_email` і їхніми атрибутами.
- Скриншоти сценаріїв з таблиці кроку 10 (щонайменше: 403 для чужого поста і перенаправлення гостя на вхід).
- Відповіді на контрольні питання.
