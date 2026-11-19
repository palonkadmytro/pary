---
title: "Обробка форм ($_GET, $_POST)"
description: "Як влаштовані HTTP-запит і відповідь, методи GET і POST, рядок запиту, суперглобальні масиви PHP. Створюємо наскрізний проєкт «Міні-блог»: спільні header/footer через require, зберігання постів у data/posts.json, список з пошуком ?q= і сортуванням ?sort=, форма нового поста методом POST."
type: practice
pair: 6
topic: 62
---

## Мета роботи

- Зрозуміти структуру HTTP-запиту і відповіді, різницю між методами GET і POST.
- Навчитися отримувати дані з адресного рядка (`$_GET`) і тіла запиту (`$_POST`), визначати метод через `$_SERVER['REQUEST_METHOD']`.
- Дослідити запити у вкладці **Network** інструментів розробника.
- Створити наскрізний проєкт **«Міні-блог»**: структура папок, спільні шапка і підвал (`require`), файл хелперів.
- Зберігати пости у файлі `data/posts.json` (`json_decode` / `json_encode`, `file_get_contents` / `file_put_contents`).
- Реалізувати список постів з пошуком (`?q=`) і сортуванням (`?sort=`) та форму створення поста методом POST.

## Що потрібно

| Що | Навіщо |
|---|---|
| XAMPP (Apache) або `php -S` | Запуск проєкту |
| VS Code + PHP Intelephense | Редактор |
| Браузер з DevTools (вкладка **Network**) | Перегляд HTTP-запитів |
| `practice-05/helpers.php` | Хелпери `e()`, `excerpt()`, `format_date()`, `plural()` переносимо в проєкт |
| `curl` (є у Windows 10+, macOS, Linux) | Надсилання запитів без браузера |

## Короткі теоретичні відомості

### HTTP-запит і відповідь

Коли ви відкриваєте сторінку або надсилаєте форму, браузер формує **HTTP-запит** — звичайний текст певного формату:

```http
GET /mini-blog/index.php?q=php&sort=new HTTP/1.1
Host: localhost
User-Agent: Mozilla/5.0 (...)
Accept: text/html
Accept-Language: uk,en;q=0.8
```

- **Рядок запиту (request line)**: метод (`GET`), шлях з **рядком параметрів** (query string) після `?`, версія протоколу.
- **Заголовки (headers)**: `Host`, `User-Agent`, `Accept`, `Cookie` тощо — пари «ім'я: значення».
- **Тіло (body)** — після порожнього рядка; у GET-запитах його зазвичай немає.

POST-запит, який надсилає форма, має тіло:

```http
POST /mini-blog/create.php HTTP/1.1
Host: localhost
Content-Type: application/x-www-form-urlencoded
Content-Length: 61

title=%D0%9F%D1%80%D0%B8%D0%B2%D1%96%D1%82&body=...&author=Olena
```

Сервер відповідає **HTTP-відповіддю**:

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=UTF-8
Content-Length: 2345

<!doctype html>
<html lang="uk">...
```

| Код | Значення | Коли |
|---|---|---|
| `200 OK` | успіх | звичайна сторінка |
| `302 Found` / `303 See Other` | перенаправлення (заголовок `Location`) | після успішної обробки форми (П7) |
| `400 Bad Request` | некоректний запит | недійсні дані, CSRF-токен (П7) |
| `403 Forbidden` | доступ заборонено | немає прав (П10) |
| `404 Not Found` | ресурс не знайдено | неіснуюча сторінка чи пост |
| `405 Method Not Allowed` | метод не підтримується | GET на сторінку, що приймає лише POST |
| `500 Internal Server Error` | помилка на сервері | фатальна помилка PHP |

### Рядок параметрів і URL-кодування

Параметри в URL записуються як `ключ=значення`, розділені `&`: `index.php?q=php&sort=old`. Символи, що мають спеціальне значення (`&`, `=`, `?`, `#`, пробіл) і всі не-ASCII символи (кирилиця), **кодуються** у вигляді `%XX` — байтів UTF-8 у шістнадцятковому записі. Слово «Привіт» перетворюється на `%D0%9F%D1%80%D0%B8%D0%B2%D1%96%D1%82`, пробіл — на `+` або `%20`.

PHP автоматично **декодує** параметри, тому в `$_GET['q']` ви отримаєте звичайне «Привіт». А щоб самому сформувати посилання з параметрами, використовуйте `http_build_query()`:

```php
$url = 'index.php?' . http_build_query(['q' => 'Привіт світ', 'sort' => 'old']);
// index.php?q=%D0%9F%D1%80%D0%B8%D0%B2%D1%96%D1%82+%D1%81%D0%B2%D1%96%D1%82&sort=old
```

### GET чи POST

| | GET | POST |
|---|---|---|
| Де дані | у URL (рядок параметрів) | у тілі запиту |
| Видно в адресному рядку, історії, логах сервера | так | ні |
| Можна додати в закладки, поділитися посиланням | так | ні |
| Обмеження розміру | практично кілька КБ (довжина URL) | великі обсяги, файли |
| Повтор при оновленні сторінки (F5) | безпечно | браузер попереджає про повторне надсилання |
| Призначення | **отримати** дані, нічого не змінюючи (пошук, фільтр, сторінка) | **змінити** стан на сервері (створити, видалити, увійти) |
| У PHP | `$_GET` | `$_POST` |

Ключове поняття — **ідемпотентність** і **безпечність**: GET-запит не повинен нічого змінювати на сервері. Пошукові роботи та попереднє завантаження сторінок у браузері ходять за GET-посиланнями — уявіть, що посилання `delete.php?id=5` видаляє пост: робот Google «прочитає» всі такі посилання і видалить усе. Тому пошук і сортування — GET, а створення поста — POST.

:::caution
POST **не шифрує** дані — він лише не показує їх в адресному рядку. Будь-хто, хто перехоплює трафік, бачить тіло запиту так само, як URL. Від перехоплення захищає лише HTTPS (П14).
:::

### Суперглобальні масиви

PHP перед запуском скрипту розбирає HTTP-запит і заповнює **суперглобальні масиви** — вони доступні в будь-якому місці коду, навіть усередині функцій:

| Масив | Вміст |
|---|---|
| `$_GET` | параметри з рядка запиту URL |
| `$_POST` | поля форми, надісланої методом POST (`application/x-www-form-urlencoded` або `multipart/form-data`) |
| `$_SERVER` | інформація про запит і сервер: `REQUEST_METHOD`, `REQUEST_URI`, `QUERY_STRING`, `HTTP_USER_AGENT`, `REMOTE_ADDR`… |
| `$_COOKIE` | кукі, надіслані браузером (П10) |
| `$_SESSION` | дані сесії, після `session_start()` (П7, П10) |
| `$_FILES` | завантажені файли |
| `$_REQUEST` | суміш GET, POST (і COOKIE) — **не використовуйте**: незрозуміло, звідки прийшло значення |

Головне про ці дані:

1. **Значення — завжди рядки** (або масиви рядків, якщо ім'я поля закінчується на `[]`). `?page=2` дає `'2'`, а не `2`.
2. **Ключа може не бути**: користувач міг не заповнити поле або відкрити сторінку напряму. Тому читаємо через `??`: `$_GET['q'] ?? ''`.
3. **Усе це контролює клієнт**: будь-яке поле, будь-яке значення, будь-який метод можна підробити. Атрибути `required`, `maxlength`, `type="email"` — лише зручність для чесного користувача.

### HTML-форма

```html
<form method="post" action="create.php">
    <input type="text" name="title">     <!-- name — ключ у $_POST -->
    <textarea name="body"></textarea>
    <button type="submit">Надіслати</button>
</form>
```

| Атрибут | Значення |
|---|---|
| `action` | куди надіслати (порожній або відсутній — на ту саму адресу) |
| `method` | `get` (за замовчуванням) або `post` |
| `enctype` | `application/x-www-form-urlencoded` (за замовчуванням) або `multipart/form-data` (для файлів) |
| `name` у полях | **без `name` поле не надсилається** взагалі |

Поле `<input type="checkbox">` надсилається лише тоді, коли воно позначене. Кілька полів з іменем `tags[]` PHP збирає в масив `$_GET['tags']`.

### Структура «Міні-блогу»

Від цієї пари до кінця модуля ми розвиваємо один проєкт. Сьогодні створимо таку структуру:

```text
mini-blog/
├── assets/
│   └── style.css
├── data/
│   └── posts.json       # пости (до П8, де перейдемо на MySQL)
├── includes/
│   ├── header.php       # <!doctype>, <head>, шапка з меню, відкриття <main>
│   ├── footer.php       # закриття <main>, підвал, </body></html>
│   └── helpers.php      # e(), excerpt(), format_date(), plural(), робота з posts.json
├── create.php           # форма нового поста (POST)
└── index.php            # список постів, пошук ?q=, сортування ?sort=
```

Модель поста: `id` (ціле), `title`, `body`, `author` (рядки), `created_at` (рядок `Y-m-d H:i:s`).

## Хід роботи

### Крок 1. Пісочниця: що отримує сервер

Перш ніж писати проєкт, подивимося на запити «зсередини». Створіть `htdocs/practice-06/echo.php`:

```php title="practice-06/echo.php"
<?php
declare(strict_types=1);

// Ця сторінка показує, що саме сервер отримав від браузера
$method = $_SERVER['REQUEST_METHOD'];
?>
<!doctype html>
<html lang="uk">
<head>
    <meta charset="utf-8">
    <title>Що прийшло на сервер</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 24px auto; padding: 0 16px; }
        form { border: 1px solid #ccc; padding: 12px; margin-bottom: 16px; border-radius: 8px; }
        pre { background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 8px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>Метод запиту: <?= htmlspecialchars($method) ?></h1>

    <form method="get" action="echo.php">
        <strong>GET-форма</strong><br>
        <input name="q" placeholder="Пошук">
        <select name="sort">
            <option value="new">Нові</option>
            <option value="old">Старі</option>
        </select>
        <label><input type="checkbox" name="tags[]" value="php"> php</label>
        <label><input type="checkbox" name="tags[]" value="js"> js</label>
        <button>Надіслати GET</button>
    </form>

    <form method="post" action="echo.php?from=form">
        <strong>POST-форма</strong><br>
        <input name="login" placeholder="Логін">
        <input type="password" name="password" placeholder="Пароль">
        <button>Надіслати POST</button>
    </form>

    <h2>$_GET</h2>
    <pre><?= htmlspecialchars(print_r($_GET, true)) ?></pre>

    <h2>$_POST</h2>
    <pre><?= htmlspecialchars(print_r($_POST, true)) ?></pre>

    <h2>Деякі елементи $_SERVER</h2>
    <pre><?= htmlspecialchars(print_r([
        'REQUEST_METHOD'  => $_SERVER['REQUEST_METHOD'],
        'REQUEST_URI'     => $_SERVER['REQUEST_URI'],
        'QUERY_STRING'    => $_SERVER['QUERY_STRING'] ?? '',
        'SCRIPT_NAME'     => $_SERVER['SCRIPT_NAME'],
        'HTTP_USER_AGENT' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'REMOTE_ADDR'     => $_SERVER['REMOTE_ADDR'],
        'CONTENT_TYPE'    => $_SERVER['CONTENT_TYPE'] ?? '',
    ], true)) ?></pre>
</body>
</html>
```

`print_r($value, true)` повертає рядок замість виведення — тому його можна загорнути в `htmlspecialchars()`.

Виконайте і зафіксуйте у звіті:

1. Відкрийте `http://localhost/practice-06/echo.php` — метод **GET**, масиви порожні.
2. Заповніть GET-форму (введіть кирилицю, позначте обидва чекбокси) і надішліть. Подивіться на адресний рядок: `echo.php?q=%D0%BA...&sort=new&tags%5B%5D=php&tags%5B%5D=js` (`%5B%5D` — це закодовані `[]`). У `$_GET` — масив `tags`.
3. Вручну змініть URL: `echo.php?q=test&page=2&page=3`. Яке значення `page`? (Останнє — `3`.)
4. Надішліть POST-форму. Метод — **POST**, дані в `$_POST`, а параметр `from=form` з атрибута `action` — у `$_GET`. Тобто POST-запит може мати і рядок параметрів.
5. Натисніть **F5** — браузер попередить про повторне надсилання форми. Запам'ятайте це, повернемося на кроці 9.
6. Відкрийте DevTools → **Network**, надішліть POST-форму ще раз і клацніть на запит `echo.php`. На вкладці **Headers** подивіться метод, код статусу, заголовки запиту; на вкладці **Payload** — дані форми. Переконайтеся: пароль видно відкритим текстом.

Тепер надішліть запит без браузера — з терміналу:

```bash
curl "http://localhost/practice-06/echo.php?q=curl"
curl -d "login=hacker&password=123&role=admin" "http://localhost/practice-06/echo.php"
```

Другий запит містить поле `role`, якого немає у формі, — і сервер його прийняв. Висновок: **сервер отримує те, що надіслав клієнт, а не те, що було у вашій формі**.

### Крок 2. Структура проєкту

Створіть папку `htdocs/mini-blog` з підпапками `assets`, `data`, `includes` і відкрийте її у VS Code (**File → Open Folder**).

:::caution[Права на запис (macOS/Linux з XAMPP)]
PHP записуватиме у файл `data/posts.json`. На Windows проблем зазвичай немає. На macOS з XAMPP Apache працює від імені іншого користувача (`daemon`), і запис може завершитися попередженням `Permission denied`. Для навчального проєкту дозвольте запис у папку: `chmod -R a+w data`. З `php -S` сервер працює від вашого імені, і проблеми немає.
:::

### Крок 3. Стилі

Скопіюйте у `assets/style.css` (стилі не є метою роботи):

```css title="assets/style.css"
:root {
  --bg: #f8fafc;
  --card: #ffffff;
  --text: #1e293b;
  --muted: #64748b;
  --accent: #2563eb;
  --border: #e2e8f0;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}
a { color: var(--accent); }

/* Шапка і підвал */
.site-header {
  display: flex; justify-content: space-between; align-items: center;
  gap: 1rem; flex-wrap: wrap;
  padding: 12px 24px;
  background: var(--card);
  border-bottom: 1px solid var(--border);
}
.logo { font-weight: 700; font-size: 1.25rem; color: var(--text); text-decoration: none; }
.menu { display: flex; align-items: center; gap: 1rem; }
.menu a { text-decoration: none; }
.container { max-width: 760px; margin: 0 auto; padding: 24px 16px; }
.site-footer { text-align: center; color: var(--muted); font-size: 0.875rem; padding: 24px 16px; }

/* Список постів */
.post-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
}
.post-card h2 { margin: 0 0 4px; font-size: 1.25rem; }
.meta { color: var(--muted); font-size: 0.875rem; margin: 0 0 8px; }
.empty { color: var(--muted); font-style: italic; }

/* Елементи форм */
input, textarea, select, button {
  font: inherit;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
}
button { background: var(--accent); border-color: var(--accent); color: #fff; cursor: pointer; }
.search { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
.search input { flex: 1 1 200px; }
.form {
  display: flex; flex-direction: column; gap: 12px;
  background: var(--card);
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: 8px;
}
.form label { display: flex; flex-direction: column; gap: 4px; font-weight: 600; }
.form input, .form textarea { width: 100%; font-weight: 400; }
.form button { align-self: flex-start; }

/* Повідомлення */
.flash { padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; }
.flash-success { background: #dcfce7; color: #166534; }
.flash-error { background: #fee2e2; color: #991b1b; }
```

### Крок 4. Файл хелперів

Створіть `includes/helpers.php`. Перша частина — хелпери, які ви написали й протестували на П5 (скопіюйте їх з `practice-05/helpers.php`), друга — нові функції для роботи з файлом постів.

```php title="includes/helpers.php"
<?php
declare(strict_types=1);

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

Розбір нових функцій:

- **`POSTS_FILE`** — константа з абсолютним шляхом. `__DIR__` — це папка `includes`, тому `/../data/posts.json` веде до `mini-blog/data/posts.json` незалежно від того, з якої сторінки підключено хелпери.
- **`load_posts()`**: `file_get_contents()` читає файл цілком у рядок (або повертає `false` при помилці). `json_decode($json, true)` перетворює JSON на PHP: другий аргумент `true` означає «JSON-об'єкти → асоціативні масиви» (без нього вийшли б об'єкти `stdClass`). Прапорець `JSON_THROW_ON_ERROR` змушує функцію кидати виняток `JsonException` при пошкодженому JSON, а не мовчки повертати `null`. Аргумент `flags:` передано **за іменем**, щоб не вказувати проміжний параметр `depth`.
- **`save_posts()`**: `json_encode()` — зворотне перетворення. `JSON_PRETTY_PRINT` — відступи (файл зручно читати), `JSON_UNESCAPED_UNICODE` — кирилиця як є, а не `Пр...`, `JSON_UNESCAPED_SLASHES` — не екранувати `/`. `LOCK_EX` блокує файл на час запису, щоб два одночасні запити не записали дані впереміш.
- **`next_post_id()`**: `max(array_column($posts, 'id')) + 1`. Для порожнього масиву `max([])` кинуло б помилку, тому окрема гілка.

:::note[Обмеження JSON-файлу]
Підхід «прочитати весь файл → змінити масив → записати весь файл» простий, але погано масштабується: тисячі постів читаються при кожному запиті, а два одночасні записи можуть втратити дані одне одного (`LOCK_EX` захищає лише сам запис, а не всю операцію «прочитав-змінив-записав»). Саме ці проблеми розв'язують бази даних — на П8 ми перенесемо пости в MySQL. Структура функцій дозволить зробити це з мінімальними змінами.
:::

### Крок 5. Шапка і підвал

Кожна сторінка блогу має однакові `<head>`, шапку з меню і підвал. Виносимо їх в окремі файли.

```php title="includes/header.php"
<?php
// Шапка сторінки. Очікує змінну $pageTitle; функції — з helpers.php
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
```

```php title="includes/footer.php"
</main>

<footer class="site-footer">
    <p>© <?= date('Y') ?> Міні-блог · навчальний проєкт</p>
</footer>
</body>
</html>
```

Як це працює: сторінка задає змінну `$pageTitle` і виконує `require __DIR__ . '/includes/header.php'`. Підключений файл виконується **в тій самій області видимості**, тому бачить `$pageTitle` і функцію `e()`. Вираз `$pageTitle ?? 'Міні-блог'` — запасний варіант, якщо сторінка забула задати заголовок.

У цих файлах немає `declare(strict_types=1)` — це шаблони, а не логіка. Шлях до стилів `assets/style.css` відносний: він правильний для всіх сторінок у корені `mini-blog`.

### Крок 6. Початкові дані

Створіть `data/posts.json` з трьома постами (ті самі, що в `practice-05/data.php`, але у форматі JSON):

```json title="data/posts.json"
[
    {
        "id": 1,
        "title": "Привіт, PHP!",
        "body": "Сьогодні я написала свій перший PHP-скрипт. Виявилося, що сервер виконує код, а браузер отримує лише готовий HTML.",
        "author": "Олена",
        "created_at": "2026-02-02 09:15:00"
    },
    {
        "id": 2,
        "title": "Масиви в PHP — це все одразу",
        "body": "Масив у PHP поводиться і як список, і як словник. Асоціативні масиви нагадують об'єкти в JavaScript, але копіюються при присвоєнні.",
        "author": "Андрій",
        "created_at": "2026-02-04 18:40:00"
    },
    {
        "id": 3,
        "title": "Чому === краще за ==",
        "body": "Нестроге порівняння приводить типи і дає несподівані результати. Строге порівняння перевіряє і значення, і тип.",
        "author": "Марія",
        "created_at": "2026-02-05 12:00:00"
    }
]
```

Відмінності JSON від PHP-масиву: ключі й рядки — лише в **подвійних** лапках, немає коми після останнього елемента, немає коментарів. Одна зайва кома зробить файл невалідним — і `load_posts()` кине `JsonException` з повідомленням `Syntax error`. Перевірте це: тимчасово поставте кому після останнього `}` і відкрийте `index.php` (наступний крок). Потім виправте.

### Крок 7. Список постів з пошуком і сортуванням

```php title="index.php"
<?php
declare(strict_types=1);

require __DIR__ . '/includes/helpers.php';

// Параметри з адресного рядка (якщо їх немає — типові значення)
$q = trim($_GET['q'] ?? '');
$sort = $_GET['sort'] ?? 'new';

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
    <input type="search" name="q" value="<?= e($q) ?>" placeholder="Пошук постів…">
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

Розберемо:

1. **Параметри з URL.** `$_GET['q'] ?? ''` — якщо параметра немає (перше відкриття сторінки), беремо порожній рядок. `trim()` прибирає випадкові пробіли.
2. **Пошук** — той самий `array_filter` з `mb_stripos`, що й у `filter_posts()` на П5.
3. **Сортування** — `match ($sort)` повертає функцію порівняння. Будь-яке невідоме значення (`?sort=abc`) потрапляє в гілку `default` — отже, сторінка не зламається від «дивного» параметра.
4. **Форма пошуку** має `method="get"`: при надсиланні браузер сам сформує URL `index.php?q=...&sort=...`. Отже, результат пошуку можна додати в закладки або надіслати другові.
5. **Збереження стану форми**: у полі пошуку `value="<?= e($q) ?>"`, у списку — атрибут `selected` для поточного варіанта. Без цього після пошуку форма «скидалася» б.
6. **Виведення**: кожне значення з даних — через `e()`. Для тексту — `nl2br(e(...))`: спочатку екрануємо, потім перетворюємо переноси рядків на `<br>`. Порядок важливий: `e(nl2br(...))` зекранував би й самі теги `<br>`.

Перевірте адреси (для `php -S` замініть початок на `http://localhost:8000/`):

| URL | Очікуваний результат |
|---|---|
| `http://localhost/mini-blog/` | 3 пости, першим «Чому === краще за ==» (найновіший) |
| `.../index.php?sort=old` | першим «Привіт, PHP!» |
| `.../index.php?sort=title` | «Масиви в PHP — це все одразу», «Привіт, PHP!», «Чому === краще за ==» |
| `.../index.php?q=php` | «Результати пошуку «php»: 2 пости» |
| `.../index.php?q=xyz` | «Нічого не знайдено.» |
| `.../index.php?sort=hack` | 3 пости, сортування за замовчуванням |

### Крок 8. Форма нового поста (POST)

```php title="create.php"
<?php
declare(strict_types=1);

require __DIR__ . '/includes/helpers.php';

$message = '';                  // повідомлення для користувача
$messageType = 'success';
$title = $body = $author = '';  // значення полів форми (для GET — порожні)

// Форму відправлено? (при першому відкритті сторінки метод — GET)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $title  = trim($_POST['title'] ?? '');
    $body   = trim($_POST['body'] ?? '');
    $author = trim($_POST['author'] ?? '');

    // Найпростіша перевірка: усі поля заповнені (повноцінна валідація — на П7)
    if ($title !== '' && $body !== '' && $author !== '') {
        $posts = load_posts();
        $posts[] = [
            'id'         => next_post_id($posts),
            'title'      => $title,
            'body'       => $body,
            'author'     => $author,
            'created_at' => date('Y-m-d H:i:s'),
        ];
        save_posts($posts);

        $message = "Пост «{$title}» збережено.";
        $title = $body = '';    // очищаємо форму; ім'я автора залишаємо
    } else {
        $message = 'Заповніть усі поля.';
        $messageType = 'error';
    }
}

$pageTitle = 'Новий пост';
require __DIR__ . '/includes/header.php';
?>

<h1>Новий пост</h1>

<?php if ($message !== ''): ?>
    <div class="flash flash-<?= $messageType ?>"><?= e($message) ?></div>
<?php endif; ?>

<form method="post" action="create.php" class="form">
    <label>Заголовок
        <input type="text" name="title" maxlength="200" required value="<?= e($title) ?>">
    </label>

    <label>Текст
        <textarea name="body" rows="8" required><?= e($body) ?></textarea>
    </label>

    <label>Автор
        <input type="text" name="author" maxlength="100" required value="<?= e($author) ?>">
    </label>

    <button type="submit">Опублікувати</button>
</form>

<?php require __DIR__ . '/includes/footer.php'; ?>
```

Як працює сторінка:

- **Один файл — два режими.** При першому відкритті (`GET`) показуємо порожню форму. Коли користувач натискає «Опублікувати», браузер надсилає `POST` на ту саму адресу (`action="create.php"`), і спрацьовує блок `if ($_SERVER['REQUEST_METHOD'] === 'POST')`.
- **Читання полів**: `trim($_POST['title'] ?? '')` — поле може бути відсутнім, тому `??`.
- **Збереження**: прочитати всі пости → додати новий елемент `$posts[] = [...]` → записати весь масив.
- **Повторне заповнення форми**: якщо поле не заповнене, введені значення повертаються в `value` (через `e()`!), щоб користувачеві не довелося набирати все знову.
- `<textarea>` не має атрибута `value` — вміст пишеться між тегами, і **без пробілів і переносів** навколо `<?= ?>`, інакше вони потраплять у текст.

Створіть 2–3 пости через форму і перевірте, що вони з'явилися на головній і у файлі `data/posts.json` (відкрийте його у VS Code).

### Крок 9. Шукаємо проблеми

Проєкт працює, але має серйозні недоліки. Знайдіть їх самі — кожен буде виправлено на П7.

1. **Повторне надсилання.** Створіть пост і одразу натисніть **F5** → «Продовжити». Відкрийте головну: пост з'явився **двічі**. Браузер повторив останній POST-запит.
2. **HTML-валідація — не захист.** У DevTools (Elements) видаліть у поля заголовка атрибут `required` і `maxlength` або надішліть запит через `curl`:

   ```bash
   curl -d "title=A&body=B&author=C" http://localhost/mini-blog/create.php
   ```

   Пост із заголовком в одну літеру збережено. Так само можна зберегти заголовок на 100 000 символів.
3. **Неочікуваний тип.** Відкрийте `index.php?q[]=1`. Через `strict_types` PHP зупиняється з `TypeError: trim(): Argument #1 ($string) must be of type string, array given`. Зловмисник може викликати помилку на будь-якій сторінці, а повідомлення розкриває шлях до файлу на сервері.
4. **XSS — перевірка, що `e()` працює.** Створіть пост із заголовком `<script>alert('XSS')</script>`. На головній він має відобразитися **як текст**. Тимчасово приберіть `e()` у виведенні заголовка в `index.php` і оновіть сторінку — з'явиться вікно `alert`. Ось чому `e()` — обов'язкова. Поверніть `e()` і видаліть цей пост із `posts.json`.
5. **Чужа форма.** Створіть на робочому столі файл `evil.html` з формою `action="http://localhost/mini-blog/create.php" method="post"` і прихованими полями. Відкрийте його в браузері й надішліть — пост створено з «чужого» сайту. Це основа атаки CSRF.

**Результат роботи:** «Міні-блог» має спільні шапку і підвал, головну сторінку зі списком постів, пошуком і сортуванням (GET) та форму створення поста (POST); пости зберігаються в `data/posts.json`.

## Завдання для самостійного виконання

1. ★ Під формою пошуку виведіть загальну кількість постів у блозі (`plural()`), навіть під час пошуку: «Знайдено 2 пости з 5».
2. ★ Додайте в `index.php` параметр `?author=`: якщо він заданий, показуються лише пости цього автора. Ім'я автора в кожній картці зробіть посиланням `index.php?author=...` (сформуйте URL через `http_build_query`, а значення в атрибуті `href` екрануйте через `e()`).
3. ★★ Додайте параметр `?limit=` (за замовчуванням 10): показувати лише перші N постів (`array_slice`). Перетворіть значення на ціле `(int)` і обмежте діапазоном 1–50 (`max`, `min`). Що відбувається з `?limit=abc` і `?limit=-5`?
4. ★★ Підсвічуйте знайдений фрагмент у заголовках тегом `<mark>` (функція `highlight()` з П5, ★★) — спочатку екранування, потім вставка тегів.
5. ★★★ Під заголовком у шапці виведіть хмару авторів з кількістю постів у кожного (`array_count_values(array_column($posts, 'author'))`), відсортовану за спаданням. Посилання ведуть на фільтр з завдання 2.

## Контрольні питання

1. З яких частин складається HTTP-запит? Де розміщуються дані форми в GET- і POST-запитах?
2. Чому пошук реалізують методом GET, а створення поста — POST? Що таке безпечний (safe) та ідемпотентний метод?
3. Що повертає `$_GET['page']` для URL `index.php?page=2`: число чи рядок? Що буде в `$_GET` для `?tags[]=a&tags[]=b`?
4. Чому не варто використовувати `$_REQUEST`?
5. Як визначити в PHP, яким методом надіслано запит?
6. Навіщо в `json_decode()` другий аргумент `true` і прапорець `JSON_THROW_ON_ERROR`? Що роблять `JSON_PRETTY_PRINT` і `JSON_UNESCAPED_UNICODE`?
7. Чому в шаблоні тексту поста використано `nl2br(e(...))`, а не `e(nl2br(...))`?
8. Як підключений файл `header.php` отримує значення `$pageTitle`?
9. Чому після створення поста натискання F5 створює дублікат?
10. Чи захищають атрибути `required` і `maxlength` сервер від некоректних даних? Як це перевірити?

## Домашнє завдання

1. Виконайте завдання ★ 1 і 2.
2. Додайте в меню `header.php` посилання «Про блог» на нову сторінку `about.php`, що використовує ті самі `header.php` і `footer.php` і показує кількість постів та авторів (дані — з `load_posts()`).
3. Опишіть у звіті (3–5 речень) кожну з п'яти проблем кроку 9: як її відтворити і чим вона небезпечна.

## Що здати

- Папку `mini-blog` (архівом або посиланням на репозиторій) і `practice-06/echo.php`.
- Скриншоти: вкладка Network з POST-запитом (Headers і Payload); головна сторінка з результатом пошуку; файл `posts.json` після створення постів через форму.
- Звіт з відповідями на контрольні питання і описом проблем з кроку 9.
