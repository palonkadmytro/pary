---
title: "Основи роботи з MySQL"
description: "Знайомимося з реляційними базами даних, MySQL/MariaDB і phpMyAdmin, пишемо перші SQL-запити, підключаємося з PHP через PDO і переводимо «Міні-блог» з JSON-файлу на базу даних."
type: practice
pair: 8
topic: 64
---

## Мета роботи

- Зрозуміти реляційну модель даних: таблиці, рядки, стовпці, первинний ключ.
- Запустити сервер MySQL/MariaDB, навчитися працювати з ним через phpMyAdmin і консольний клієнт `mysql`.
- Створити базу даних `mini_blog` з кодуванням `utf8mb4` і таблицю `posts`.
- Опанувати базові SQL-запити: `CREATE`, `INSERT`, `SELECT`, `WHERE`, `LIKE`, `ORDER BY`, `LIMIT`, а також `UPDATE` і `DELETE`.
- Підключитися до бази з PHP через **PDO** (PHP Data Objects) і виконувати **підготовлені запити** (prepared statements).
- Перенести пости «Міні-блогу» з `data/posts.json` у таблицю і переписати `index.php` та `create.php` на роботу з БД.

## Що потрібно

| Програма | Призначення | Примітка |
|---|---|---|
| **XAMPP** (Apache + MariaDB + phpMyAdmin) | Вебсервер, СУБД і вебінтерфейс до неї | Основний варіант для Windows |
| **Homebrew** `php`, `mysql` (macOS, альтернатива) | PHP 8.2+ і MySQL без XAMPP | Сервер — `php -S localhost:8000` |
| **VS Code** + PHP Intelephense | Редактор | Те саме, що й раніше |
| Проєкт **`htdocs/mini-blog/`** | Наскрізний проєкт | У стані після практичної 7 |

### Стартовий стан проєкту

Починаємо з результату практичної 7. Проєкт виглядає так:

```text
mini-blog/
├── assets/
│   └── style.css
├── data/
│   └── posts.json        ← пости зберігаються тут (масив об'єктів)
├── includes/
│   ├── header.php        ← <!doctype>, <head>, меню, виведення flash-повідомлення
│   ├── footer.php
│   └── helpers.php       ← e(), redirect(), old(), flash(), CSRF, session_start()
├── create.php            ← форма нового поста: валідація, CSRF, PRG
└── index.php             ← список постів, пошук ?q=, сортування ?sort=
```

Кожна сторінка починається з `require __DIR__ . '/includes/helpers.php';`, задає `$pageTitle` і підключає `includes/header.php`. Нижче — функції з `helpers.php`, на які ми спиратимемося далі. Якщо у вашій версії назви чи сигнатури трохи інші — або приведіть їх до цих, або підставляйте свої назви в код цієї та наступних пар.

```php title="includes/helpers.php (стан після П7, скорочено)"
<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start(); // поки що лише для flash і CSRF; детально — у П10
}

// Екранування для виведення в HTML
function e(?string $value): string
{
    return htmlspecialchars($value ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

// Перенаправлення з негайним завершенням скрипта
function redirect(string $url): never
{
    header('Location: ' . $url);
    exit;
}

// Попереднє значення поля форми (після невдалої валідації)
function old(string $key, string $default = ''): string
{
    return isset($_POST[$key]) ? trim((string) $_POST[$key]) : $default;
}

// Записати flash-повідомлення (покаже header.php на наступній сторінці)
function flash(string $message, string $type = 'success'): void
{
    $_SESSION['flash'] = ['message' => $message, 'type' => $type];
}

// Прочитати й видалити flash-повідомлення
function get_flash(): ?array
{
    $flash = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return $flash;
}

function csrf_token(): string
{
    return $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">';
}

function csrf_verify(): bool
{
    return is_string($_POST['csrf'] ?? null)
        && hash_equals(csrf_token(), $_POST['csrf']);
}
```

## Короткі теоретичні відомості

### Чому не JSON-файл

Файл `posts.json` добре підходив для старту, але має принципові обмеження:

| Проблема | JSON-файл | База даних |
|---|---|---|
| Одночасний запис двома користувачами | Один запис може «затерти» інший (race condition) | СУБД блокує рядки, транзакції |
| Пошук і сортування | Читаємо **весь** файл у пам'ять і фільтруємо в PHP | `WHERE`, `ORDER BY`, індекси — на боці сервера БД |
| Обсяг | Тисячі постів — повільно, мільйони — неможливо | Мільйони рядків — звична ситуація |
| Зв'язки (пост → коментарі → автор) | Доводиться вручну шукати по масивах | Зовнішні ключі, `JOIN` |
| Цілісність | Будь-яке значення будь-якого типу | Типи стовпців, `NOT NULL`, `UNIQUE` |

### Реляційна модель

**Реляційна база даних** (relational database) зберігає дані у **таблицях** (tables, у теорії — «відношення», relations).

- **Стовпець** (column, поле) — одна характеристика сутності з певним **типом даних**: `title VARCHAR(200)`.
- **Рядок** (row, запис) — один екземпляр сутності: один конкретний пост.
- **Первинний ключ** (primary key, PK) — стовпець, що однозначно ідентифікує рядок. Зазвичай це ціле число `id` з `AUTO_INCREMENT`: СУБД сама видає наступний номер.
- **Схема** (schema) — опис таблиць, їхніх стовпців і обмежень.

```text
Таблиця posts
┌────┬──────────────────────┬──────────────────┬─────────┬─────────────────────┐
│ id │ title                │ body             │ author  │ created_at          │
├────┼──────────────────────┼──────────────────┼─────────┼─────────────────────┤
│  1 │ Привіт, світе        │ Перший пост...   │ Олена   │ 2026-02-10 09:15:00 │
│  2 │ Масиви в PHP         │ Сьогодні про...  │ Андрій  │ 2026-02-12 18:40:00 │
└────┴──────────────────────┴──────────────────┴─────────┴─────────────────────┘
  ▲ первинний ключ                                 ▲ кожен рядок — один пост
```

**СУБД** (система управління базами даних, DBMS) — окрема програма-сервер. **MySQL** — найпоширеніша відкрита реляційна СУБД для вебу; **MariaDB** — її форк, сумісний на рівні SQL і протоколу. У XAMPP встановлено саме MariaDB, але кнопка в панелі називається «MySQL» — для наших задач різниці немає.

Схема роботи: браузер → Apache з PHP → (TCP, порт 3306) → сервер MySQL. PHP є **клієнтом** бази даних так само, як phpMyAdmin чи консоль `mysql`.

### Мова SQL

**SQL** (Structured Query Language) — декларативна мова: ви описуєте, *що* хочете отримати, а не *як* це шукати. Команди поділяють на групи:

| Група | Призначення | Команди |
|---|---|---|
| DDL (Data Definition Language) | Структура | `CREATE`, `ALTER`, `DROP` |
| DML (Data Manipulation Language) | Дані | `INSERT`, `SELECT`, `UPDATE`, `DELETE` |
| DCL (Data Control Language) | Права | `GRANT`, `REVOKE` |

Загальний вигляд запиту на вибірку — порядок частин суворий:

```sql
SELECT стовпці
FROM таблиця
WHERE умова
ORDER BY стовпець ASC|DESC
LIMIT кількість OFFSET зсув;
```

Ключові слова SQL нечутливі до регістру, але їх прийнято писати великими літерами. Рядкові значення беруться в **одинарні** лапки: `'Олена'`. Імена таблиць і стовпців за потреби — у зворотні апострофи: `` `posts` ``.

### Кодування: тільки utf8mb4

Історично в MySQL «`utf8`» — це урізаний UTF-8 до 3 байтів на символ (зараз називається `utf8mb3`), він не вміщає емодзі та деякі ієрогліфи. Повноцінний UTF-8 називається **`utf8mb4`**. Правило: база, таблиці і з'єднання — завжди `utf8mb4`. **Порівняння** (collation) `utf8mb4_unicode_ci` визначає, як сортуються та порівнюються рядки; суфікс `_ci` (case-insensitive) означає, що пошук `LIKE '%php%'` знайде і «PHP».

### PDO і підготовлені запити

У PHP є два розширення для MySQL: `mysqli` (лише MySQL) і **PDO** (єдиний інтерфейс до MySQL, PostgreSQL, SQLite тощо). У курсі використовуємо PDO.

Ключова ідея **підготовленого запиту** (prepared statement): текст SQL і дані передаються серверу **окремо**.

```php
// ❌ НІКОЛИ так: дані склеюються з SQL — це SQL-ін'єкція
$pdo->query("SELECT * FROM posts WHERE title LIKE '%$q%'");

// ✅ Так: у SQL — заповнювач, значення передається окремо
$stmt = $pdo->prepare('SELECT * FROM posts WHERE title LIKE :q');
$stmt->execute(['q' => "%$q%"]);
```

Якщо користувач введе в пошук `' OR 1=1 --`, у першому варіанті це стане частиною SQL-команди, а в другому — просто рядком, який шукатимуть у заголовках. Детально про атаки — у лекції 13, а поки правило одне: **жодних змінних усередині рядка SQL**.

## Хід роботи

### Крок 1. Запуск MySQL і phpMyAdmin

**Windows (XAMPP).** Відкрийте XAMPP Control Panel і натисніть **Start** навпроти **Apache** та **MySQL**. Обидва модулі мають підсвітитися зеленим. Відкрийте в браузері `http://localhost/phpmyadmin`.

**macOS.** Варіант з XAMPP — так само через `manager-osx`. Варіант з Homebrew:

```bash
brew install mysql
brew services start mysql      # запустити сервер і додати в автозапуск
mysql -u root                  # перевірка: відкриється консоль mysql>
```

Якщо працюєте без XAMPP, phpMyAdmin можна не ставити — усі запити цієї роботи виконуються і в консолі `mysql`, і в будь-якому GUI-клієнті (наприклад, DBeaver або розширення бази даних для VS Code).

:::caution[Порт 3306 зайнятий]
Якщо MySQL у XAMPP не стартує і в журналі є `Port 3306 in use`, на комп'ютері вже працює інший сервер MySQL (наприклад, встановлений разом з іншою програмою). Або зупиніть його в «Службах» Windows, або змініть порт у `my.ini` (XAMPP → Config) на `3307` — тоді не забудьте вказати цей порт у `config.php` на кроці 5.
:::

У XAMPP за замовчуванням користувач **`root` без пароля**. Для локальної розробки це прийнятно, на сервері — ніколи (див. П14).

### Крок 2. Створення бази даних

У phpMyAdmin відкрийте вкладку **SQL** (на головній сторінці, не всередині якоїсь бази) і виконайте:

```sql title="SQL"
CREATE DATABASE IF NOT EXISTS mini_blog
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Ліворуч у списку з'явиться `mini_blog`. Клацніть на неї — усі подальші запити у вкладці SQL виконуватимуться в цій базі. У консолі `mysql` те саме робить команда `USE mini_blog;`.

`IF NOT EXISTS` робить запит безпечним для повторного запуску: якщо база вже є, помилки не буде.

### Крок 3. Створення таблиці `posts`

```sql title="SQL"
CREATE TABLE posts (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  title      VARCHAR(200)  NOT NULL,
  body       TEXT          NOT NULL,
  author     VARCHAR(100)  NOT NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Розберемо:

| Фрагмент | Значення |
|---|---|
| `INT UNSIGNED` | Ціле число без знака (0 … ~4,29 млрд) — для `id` від'ємні не потрібні |
| `AUTO_INCREMENT` | Сервер сам присвоює наступний номер при `INSERT` |
| `VARCHAR(200)` | Рядок змінної довжини, до 200 **символів** (не байтів) |
| `TEXT` | Довгий текст (до 64 КБ) — для тіла поста |
| `NOT NULL` | Значення обов'язкове |
| `DEFAULT CURRENT_TIMESTAMP` | Якщо дату не передали — підставиться поточна |
| `ENGINE=InnoDB` | Рушій зберігання з підтримкою транзакцій і зовнішніх ключів (стандарт) |

Переконайтеся, що структура правильна: у phpMyAdmin — вкладка **Структура** таблиці, у консолі — `DESCRIBE posts;`.

:::note
Обмеження довжини `VARCHAR(200)` має збігатися з валідацією в `create.php` з П7 (максимальна довжина заголовка). Якщо у вас інше число — узгодьте: перевірка в PHP дає зрозуміле повідомлення користувачеві, а обмеження в БД — останній рубіж захисту.
:::

### Крок 4. Перші запити: INSERT і SELECT

Додамо кілька тестових постів. Зверніть увагу: `id` і `created_at` не передаємо — їх заповнить сервер.

```sql title="SQL"
INSERT INTO posts (title, body, author) VALUES
  ('Перший пост у базі', 'Тепер пости зберігаються в MySQL!', 'Адмін'),
  ('Що таке SQL', 'SQL — мова запитів до реляційних баз даних.', 'Олена'),
  ('PHP і бази даних', 'Для роботи з БД використовуємо PDO.', 'Андрій');
```

Тепер потренуйтеся з вибіркою. Виконуйте запити по одному й дивіться на результат:

```sql title="SQL"
-- 1. Усі стовпці всіх рядків
SELECT * FROM posts;

-- 2. Лише потрібні стовпці (так і варто писати в коді)
SELECT id, title, author FROM posts;

-- 3. Фільтр: пости конкретного автора
SELECT id, title FROM posts WHERE author = 'Олена';

-- 4. Пошук підрядка: % — будь-яка кількість будь-яких символів
SELECT id, title FROM posts WHERE title LIKE '%php%';

-- 5. Кілька умов
SELECT id, title FROM posts
WHERE author = 'Андрій' OR body LIKE '%SQL%';

-- 6. Сортування: нові спочатку
SELECT id, title, created_at FROM posts ORDER BY created_at DESC;

-- 7. Обмеження кількості: два останні пости
SELECT id, title FROM posts ORDER BY id DESC LIMIT 2;

-- 8. Агрегатна функція: скільки всього постів
SELECT COUNT(*) AS total FROM posts;
```

Запит 4 знайде «PHP і бази даних», хоча шукали `php` малими літерами, — це завдяки порівнянню `_ci`.

### Крок 5. UPDATE і DELETE — обережно з WHERE

```sql title="SQL"
-- Змінити заголовок поста з id = 3
UPDATE posts SET title = 'PHP + MySQL = ❤' WHERE id = 3;

-- Видалити пост з id = 3
DELETE FROM posts WHERE id = 3;
```

:::danger[UPDATE і DELETE без WHERE]
`DELETE FROM posts;` без `WHERE` видалить **усі** рядки, а `UPDATE posts SET title = 'x';` змінить **усі** заголовки. Відмінити це неможливо. Звичка: спершу напишіть `SELECT ... WHERE ...`, переконайтеся, що вибралися саме потрібні рядки, а потім замініть `SELECT` на `DELETE`.
:::

Помітили емодзі в заголовку? Він зберігся правильно саме тому, що таблиця в `utf8mb4`.

Наостанок очистимо таблицю від тестових даних і скинемо лічильник `AUTO_INCREMENT` — далі імпортуємо справжні пости:

```sql title="SQL"
TRUNCATE TABLE posts;
```

### Крок 6. Налаштування підключення: `config.php`

Параметри підключення винесемо в окремий файл у корені проєкту. Файл **повертає масив** — так його зручно підключати через `require` будь-де.

```php title="config.php"
<?php
declare(strict_types=1);

// Налаштування проєкту. У П14 паролі переїдуть у config.local.php
return [
    'db' => [
        'host'    => '127.0.0.1',
        'port'    => 3306,
        'name'    => 'mini_blog',
        'user'    => 'root',
        'pass'    => '',          // у XAMPP за замовчуванням пароль порожній
        'charset' => 'utf8mb4',
    ],
];
```

:::tip[`127.0.0.1` чи `localhost`]
Для MySQL ім'я `localhost` означає «підключатися через Unix-сокет», а `127.0.0.1` — «через TCP». На macOS з Homebrew/XAMPP сокет може лежати не там, де його шукає PHP, і ви отримаєте `No such file or directory`. Варіант `127.0.0.1` працює однаково скрізь.
:::

### Крок 7. Підключення через PDO: `includes/db.php`

```php title="includes/db.php"
<?php
declare(strict_types=1);

/**
 * Повертає єдиний екземпляр PDO на весь запит.
 * static-змінна зберігає з'єднання між викликами функції.
 */
function db(): PDO
{
    static $pdo = null;

    if ($pdo === null) {
        $config = (require __DIR__ . '/../config.php')['db'];

        // DSN (Data Source Name) — рядок з адресою і параметрами сервера
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['name'],
            $config['charset'],
        );

        $pdo = new PDO($dsn, $config['user'], $config['pass'], [
            // помилки SQL кидають PDOException, а не мовчки повертають false
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            // fetch() повертає асоціативний масив ['title' => ...]
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            // справжні підготовлені запити на сервері, а не емуляція в PHP
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }

    return $pdo;
}
```

Чому саме ці опції:

| Опція | Без неї | З нею |
|---|---|---|
| `ERRMODE_EXCEPTION` | Помилка в SQL → `false`, яке легко не помітити | Виняток з текстом помилки і номером рядка |
| `FETCH_ASSOC` | Кожен рядок містить дані двічі: `[0 => ..., 'title' => ...]` | Лише `['title' => ...]` |
| `EMULATE_PREPARES => false` | PDO сам підставляє значення в SQL (екрануючи) | Сервер отримує SQL і дані окремо; числа повертаються як `int` |

Функція `db()` створює з'єднання **ліниво** — лише при першому виклику — і повторно використовує його. Відкривати нове з'єднання на кожен запит — дорого.

### Крок 8. Перевірка з'єднання

Створіть тимчасовий файл:

```php title="test-db.php"
<?php
declare(strict_types=1);

require __DIR__ . '/includes/db.php';

try {
    $version = db()->query('SELECT VERSION()')->fetchColumn();
    echo "З'єднання встановлено. Версія сервера: {$version}";
} catch (PDOException $ex) {
    echo 'Помилка підключення: ' . $ex->getMessage();
}
```

Відкрийте `http://localhost/mini-blog/test-db.php` (або `http://localhost:8000/test-db.php` для вбудованого сервера, запущеного з папки проєкту командою `php -S localhost:8000`). Має з'явитися щось на кшталт `Версія сервера: 10.4.32-MariaDB`.

Типові помилки на цьому кроці:

| Повідомлення | Причина | Що робити |
|---|---|---|
| `SQLSTATE[HY000] [2002] Connection refused` | MySQL не запущено або інший порт | Запустіть MySQL, перевірте `port` |
| `SQLSTATE[HY000] [1045] Access denied for user 'root'` | Неправильний логін/пароль | Перевірте `user`/`pass` (у Homebrew-версії може бути заданий пароль) |
| `SQLSTATE[HY000] [1049] Unknown database 'mini_blog'` | Бази немає або назва з помилкою | Поверніться до кроку 2 |
| `could not find driver` | Не ввімкнено розширення `pdo_mysql` | У `php.ini` розкоментуйте `extension=pdo_mysql`, перезапустіть Apache |

:::caution
`$ex->getMessage()` на екран виводимо лише під час розробки: у повідомленні може бути ім'я користувача БД і хост. У П14 ми вимкнемо показ помилок на продакшні. Після перевірки **видаліть `test-db.php`**.
:::

### Крок 9. Імпорт постів з `posts.json`

Напишемо одноразовий скрипт, що переносить пости з файлу в таблицю. Він запускається з терміналу (CLI), а не з браузера.

```php title="import.php"
<?php
declare(strict_types=1);

// Одноразовий імпорт data/posts.json → таблиця posts
// Запуск: php import.php   (з папки mini-blog)

if (PHP_SAPI !== 'cli') {
    exit('Запускайте цей скрипт з командного рядка');
}

require __DIR__ . '/includes/db.php';

$json  = file_get_contents(__DIR__ . '/data/posts.json');
$posts = json_decode($json, true, flags: JSON_THROW_ON_ERROR);

$pdo = db();

if ((int) $pdo->query('SELECT COUNT(*) FROM posts')->fetchColumn() > 0) {
    exit("Таблиця posts не порожня — імпорт скасовано.\n");
}

// Запит готуємо ОДИН раз, а виконуємо для кожного поста
$stmt = $pdo->prepare(
    'INSERT INTO posts (title, body, author, created_at)
     VALUES (:title, :body, :author, :created_at)'
);

$count = 0;
foreach ($posts as $post) {
    $stmt->execute([
        'title'      => mb_substr(trim($post['title'] ?? ''), 0, 200),
        'body'       => trim($post['body'] ?? ''),
        'author'     => mb_substr(trim($post['author'] ?? 'Анонім'), 0, 100),
        // будь-який розпізнаваний формат дати → формат DATETIME
        'created_at' => date('Y-m-d H:i:s', strtotime($post['created_at'] ?? 'now') ?: time()),
    ]);
    $count++;
}

echo "Імпортовано постів: {$count}\n";
```

```bash
cd C:\xampp\htdocs\mini-blog        # macOS: cd /Applications/XAMPP/htdocs/mini-blog
php import.php
# Імпортовано постів: 5
```

:::tip[Команда `php` не знайдена на Windows]
PHP із XAMPP лежить у `C:\xampp\php\php.exe`. Або додайте `C:\xampp\php` до змінної середовища `Path`, або запускайте з повним шляхом: `C:\xampp\php\php.exe import.php`.
:::

Зверніть увагу на дві речі:

1. `prepare()` викликається **один раз** поза циклом, а `execute()` — багато разів з різними даними. Сервер розбирає SQL лише раз — це і безпечно, і швидше.
2. Перевірка на непорожню таблицю захищає від подвійного імпорту, якщо скрипт випадково запустять двічі.

Перевірте в phpMyAdmin: `SELECT * FROM posts;` — мають бути ваші пости з JSON. Імена ключів (`title`, `body`, `author`, `created_at`) мають відповідати тим, що ви використовували в П6–П7; якщо у вас, наприклад, `text` замість `body` — виправте в скрипті.

### Крок 10. `index.php` на базі даних

Тепер найцікавіше — список постів читаємо з таблиці. Пошук за `?q=` шукає підрядок у заголовку й тексті, сортування `?sort=` перемикає порядок.

```php title="index.php" {4,9-14,16-29}
<?php
declare(strict_types=1);
require __DIR__ . '/includes/helpers.php';
require __DIR__ . '/includes/db.php';

$q    = trim((string) ($_GET['q'] ?? ''));
$sort = (string) ($_GET['sort'] ?? 'new');

// Ім'я стовпця не можна передати через заповнювач — тому білий список
$orderBy = match ($sort) {
    'old'   => 'created_at ASC',
    'title' => 'title ASC',
    default => 'created_at DESC',
};

$sql    = 'SELECT id, title, body, author, created_at FROM posts';
$params = [];

if ($q !== '') {
    $sql .= ' WHERE title LIKE :q OR body LIKE :q2';
    $params['q']  = '%' . $q . '%';
    $params['q2'] = '%' . $q . '%';
}

$sql .= " ORDER BY {$orderBy}";

$stmt = db()->prepare($sql);
$stmt->execute($params);
$posts = $stmt->fetchAll();

$pageTitle = 'Міні-блог';
require __DIR__ . '/includes/header.php';
?>

<form class="search" method="get" action="index.php">
    <input type="search" name="q" value="<?= e($q) ?>" placeholder="Пошук постів…">
    <select name="sort">
        <option value="new"   <?= $sort === 'new'   ? 'selected' : '' ?>>Спочатку нові</option>
        <option value="old"   <?= $sort === 'old'   ? 'selected' : '' ?>>Спочатку старі</option>
        <option value="title" <?= $sort === 'title' ? 'selected' : '' ?>>За назвою</option>
    </select>
    <button type="submit">Знайти</button>
</form>

<?php if ($q !== ''): ?>
    <p>Результати пошуку «<?= e($q) ?>»: <?= count($posts) ?></p>
<?php endif; ?>

<?php if ($posts === []): ?>
    <p class="empty">Постів поки немає.</p>
<?php endif; ?>

<?php foreach ($posts as $post): ?>
    <article class="post-card">
        <h2><?= e($post['title']) ?></h2>
        <p class="meta">
            <?= e($post['author']) ?> ·
            <?= e(date('d.m.Y H:i', strtotime($post['created_at']))) ?>
        </p>
        <p><?= e(mb_strimwidth($post['body'], 0, 200, '…')) ?></p>
    </article>
<?php endforeach; ?>

<?php require __DIR__ . '/includes/footer.php'; ?>
```

Що тут важливо:

- **Значення** (рядок пошуку) передаються через іменовані заповнювачі `:q`, `:q2`. Ми використали два різні імена, бо з `ATTR_EMULATE_PREPARES => false` MySQL не дозволяє повторювати той самий іменований заповнювач у запиті (`SQLSTATE[HY093]: Invalid parameter number`).
- **Частини структури SQL** — імена стовпців, `ASC`/`DESC` — заповнювачами передати неможливо. Тому користувацьке значення `sort` ми ніколи не вставляємо в SQL, а через `match` перетворюємо на одне з **заздалегідь відомих** значень. Що б не прийшло в `?sort=`, у запит потрапить лише один із трьох рядків.
- Вихід як і раніше екрануємо через `e()` — дані з БД так само небезпечні, як і дані з форми: туди їх колись записав користувач.

Перевірте: `index.php`, `index.php?q=php`, `index.php?sort=title`, а також спробуйте зловмисне `index.php?q=' OR 1=1 --` — запит відпрацює без помилок і просто нічого не знайде.

### Крок 11. `create.php`: INSERT замість запису у файл

У `create.php` валідація, CSRF і PRG з П7 залишаються без змін. Замінюємо лише блок збереження — замість читання/запису `posts.json` виконуємо `INSERT`:

```php title="create.php" {4,31-38}
<?php
declare(strict_types=1);
require __DIR__ . '/includes/helpers.php';
require __DIR__ . '/includes/db.php';

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_verify()) {
        http_response_code(400);
        exit('Недійсний CSRF-токен. Оновіть сторінку і спробуйте ще раз.');
    }

    $title  = old('title');
    $body   = old('body');
    $author = old('author');

    // Валідація — як у П7 (тут скорочено; залиште свою повну версію)
    if ($title === '') {
        $errors['title'] = 'Введіть заголовок';
    } elseif (mb_strlen($title) > 200) {
        $errors['title'] = 'Заголовок — не довше 200 символів';
    }
    if (mb_strlen($body) < 10) {
        $errors['body'] = 'Текст — щонайменше 10 символів';
    }
    if ($author === '' || mb_strlen($author) > 100) {
        $errors['author'] = "Вкажіть ім'я автора (до 100 символів)";
    }

    if ($errors === []) {
        $stmt = db()->prepare(
            'INSERT INTO posts (title, body, author) VALUES (:title, :body, :author)'
        );
        $stmt->execute(['title' => $title, 'body' => $body, 'author' => $author]);

        flash('Пост опубліковано');
        redirect('index.php'); // PRG: після POST — перенаправлення
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
        <textarea name="body" rows="8"><?= e(old('body')) ?></textarea>
    </label>
    <?php if (isset($errors['body'])): ?><p class="error"><?= e($errors['body']) ?></p><?php endif; ?>

    <label>Автор
        <input type="text" name="author" maxlength="100" value="<?= e(old('author')) ?>">
    </label>
    <?php if (isset($errors['author'])): ?><p class="error"><?= e($errors['author']) ?></p><?php endif; ?>

    <button type="submit">Опублікувати</button>
</form>

<?php require __DIR__ . '/includes/footer.php'; ?>
```

`created_at` ми не передаємо — його заповнить `DEFAULT CURRENT_TIMESTAMP`. Створіть пост через форму й переконайтеся, що він з'явився і на сторінці, і в phpMyAdmin.

Папку `data/` поки не видаляйте — вона знадобиться для перевірки імпорту, якщо доведеться повторити. Але відтепер `posts.json` більше ніхто не змінює.

**Результат роботи:** «Міні-блог» зберігає пости в таблиці `posts` бази `mini_blog`. `index.php` вибирає пости з БД із пошуком і сортуванням, `create.php` додає їх через підготовлений `INSERT`. Підключення налаштовано в `config.php` і `includes/db.php`.

## Завдання для самостійного виконання

1. ★ Виведіть над списком загальну кількість постів у базі («Усього постів: 7») — окремим запитом `SELECT COUNT(*)` і методом `fetchColumn()`.
2. ★ Додайте до `?sort=` варіант `author` — сортування за автором, а в межах одного автора — від нових до старих (`ORDER BY author ASC, created_at DESC`).
3. ★★ Додайте параметр `?author=Олена`, що показує лише пости цього автора. Він має працювати разом з пошуком `?q=` (умови через `AND`). Посилання на ім'я автора в картці поста має вести на такий фільтр.
4. ★★ Обмежте вибірку 10 постами (`LIMIT 10`). Поміркуйте: чому `LIMIT` теж краще передавати через заповнювач з `PDO::PARAM_INT` (`bindValue(':limit', 10, PDO::PARAM_INT)`), а не дописувати в рядок? Повноцінну пагінацію зробимо в П9.
5. ★★★ Знак `%` і `_` у рядку пошуку — спецсимволи `LIKE`. Пошук `100%` зараз знайде все, що починається з «100». Напишіть функцію `like_escape(string $s): string`, що екранує `\`, `%` і `_` зворотною косою рискою, і використайте її в `index.php`.

## Контрольні питання

1. Які недоліки зберігання даних у JSON-файлі порівняно з реляційною БД?
2. Що таке первинний ключ і навіщо `AUTO_INCREMENT`?
3. Чим відрізняються кодування `utf8` (`utf8mb3`) і `utf8mb4` у MySQL? Що означає суфікс `_ci` у назві порівняння?
4. Назвіть групи команд SQL і наведіть по одному прикладу для DDL і DML.
5. У якому порядку записуються частини `SELECT`: `ORDER BY`, `WHERE`, `LIMIT`, `FROM`?
6. Чим небезпечні `UPDATE` і `DELETE` без `WHERE`? Як убезпечити себе?
7. Що таке DSN? З яких частин він складається для MySQL?
8. Навіщо опції `PDO::ERRMODE_EXCEPTION` і `PDO::FETCH_ASSOC`?
9. Чому значення в SQL передаються через заповнювачі, а ім'я стовпця для `ORDER BY` — через білий список?
10. Чим відрізняються `prepare()` + `execute()` від `query()`? Коли допустимо використовувати `query()`?

## Домашнє завдання

1. Додайте в таблицю `posts` через форму щонайменше 5 постів на різні теми, щоб було на чому тестувати пошук і (у П9) пагінацію.
2. У phpMyAdmin відкрийте вкладку **Експорт** і збережіть дамп бази у файл `mini_blog.sql`. Подивіться, які SQL-команди там згенеровано.
3. Напишіть у звіті 3 SQL-запити до таблиці `posts` (на ваш вибір, з `WHERE`, `ORDER BY`, `LIMIT`) і результат кожного.

## Що здати

- Скриншот phpMyAdmin зі структурою таблиці `posts` (вкладка «Структура»).
- Скриншот головної сторінки блогу з постами з БД і результатом пошуку.
- Файли `config.php`, `includes/db.php`, `import.php`, `index.php`, `create.php`.
- Відповіді на контрольні питання.
