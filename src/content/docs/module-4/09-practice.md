---
title: "Робота з MySQL: створення таблиць, виконання запитів"
description: "Проєктуємо схему «Міні-блогу» з таблицями users, posts і comments, вивчаємо типи даних, ключі, індекси та JOIN, реалізуємо повний CRUD постів, коментарі й пагінацію через PDO."
type: practice
pair: 9
topic: 65
---

## Мета роботи

- Розібратися з типами даних MySQL, обмеженнями (`NOT NULL`, `UNIQUE`, `DEFAULT`), первинними і зовнішніми ключами, індексами.
- Спроєктувати схему «Міні-блогу»: таблиці `users`, `posts`, `comments` і зв'язки між ними; оформити її у файлі `schema.sql`.
- Навчитися об'єднувати таблиці (`JOIN`) і рахувати агрегати (`COUNT`, `GROUP BY`).
- Реалізувати повний CRUD постів (створення, перегляд, редагування, видалення) через PDO.
- Додати сторінку поста з коментарями та пагінацію списку (`LIMIT`/`OFFSET`).

## Що потрібно

- Запущені Apache і MySQL (XAMPP) або `php -S` + MySQL з Homebrew.
- phpMyAdmin або інший SQL-клієнт.
- Проєкт `mini-blog` у стані після П8: таблиця `posts` у базі `mini_blog`, `config.php`, `includes/db.php` з функцією `db()`, `index.php` і `create.php` працюють з БД.

## Короткі теоретичні відомості

### Типи даних MySQL

| Категорія | Тип | Діапазон / розмір | Коли використовувати |
|---|---|---|---|
| Цілі | `TINYINT` | −128…127 (або 0…255 з `UNSIGNED`) | Прапорці, невеликі коди. `BOOLEAN` — це синонім `TINYINT(1)` |
| | `INT` | ≈ ±2,1 млрд (0…4,29 млрд з `UNSIGNED`) | Ідентифікатори, лічильники |
| | `BIGINT` | ±9,2·10¹⁸ | Дуже великі таблиці, мітки часу в мс |
| Дробові | `DECIMAL(10,2)` | Точне значення | **Гроші**, будь-що, де важлива точність |
| | `FLOAT`, `DOUBLE` | Наближене значення | Наукові величини, координати |
| Рядки | `CHAR(n)` | Фіксована довжина n | Коди однакової довжини: `CHAR(2)` для коду країни |
| | `VARCHAR(n)` | Змінна довжина до n символів | Імена, заголовки, email |
| | `TEXT` | До 64 КБ | Довгі тексти: тіло поста, коментар |
| Дата/час | `DATE` | `2026-03-01` | Дата народження |
| | `DATETIME` | `2026-03-01 14:30:00` | Момент події «як записали» |
| | `TIMESTAMP` | 1970…2038, зберігається в UTC | Службові мітки; конвертується з часовим поясом сесії |
| Перелік | `ENUM('draft','published')` | Одне значення зі списку | Статуси (але додати нове значення = `ALTER TABLE`) |

:::caution[Типова помилка: ціни у FLOAT]
`FLOAT` зберігає числа наближено у двійковому вигляді: `0.1 + 0.2` там не дорівнює `0.3`. Для грошей — лише `DECIMAL`.
:::

### Ключі та обмеження

- **Первинний ключ** (`PRIMARY KEY`) — унікальний і не `NULL`; у таблиці один.
- **Унікальний ключ** (`UNIQUE`) — значення не повторюються, наприклад `email` користувача. Спроба вставити дублікат дає помилку `SQLSTATE[23000]: Integrity constraint violation: 1062 Duplicate entry`.
- **Зовнішній ключ** (`FOREIGN KEY`, FK) — стовпець, що посилається на первинний ключ іншої таблиці. СУБД гарантує **посилальну цілісність** (referential integrity): не можна створити коментар до неіснуючого поста.

Що робити з дочірніми рядками, коли батьківський рядок видаляють, визначає дія `ON DELETE`:

| Дія | Поведінка | У «Міні-блозі» |
|---|---|---|
| `RESTRICT` / `NO ACTION` (за замовчуванням) | Заборонити видалення, поки є дочірні рядки | — |
| `CASCADE` | Видалити дочірні рядки разом з батьківським | Видалили пост → видалилися його коментарі |
| `SET NULL` | Записати `NULL` у зовнішній ключ | Видалили користувача → його пости лишаються «без автора» |

### Зв'язки між таблицями

- **Один-до-багатьох** (1:N): один пост — багато коментарів. Зовнішній ключ `post_id` лежить у таблиці на боці «багатьох» — `comments`.
- **Багато-до-багатьох** (M:N): пости і теги. Потрібна проміжна таблиця `post_tag(post_id, tag_id)` з двома зовнішніми ключами (це завдання ★★★).
- **Один-до-одного** (1:1): користувач і його профіль. Трапляється рідко.

```text
 users                 posts                     comments
┌──────────────┐      ┌──────────────────┐      ┌────────────────┐
│ id  PK       │◄──┐  │ id  PK           │◄──┐  │ id  PK         │
│ name         │   └──│ user_id FK NULL  │   └──│ post_id FK     │
│ email UNIQUE │      │ title            │      │ author         │
│ password_hash│      │ body             │      │ body           │
│ created_at   │      │ author (старе)   │      │ created_at     │
└──────────────┘      │ created_at       │      └────────────────┘
                      └──────────────────┘
      1 ────────── N        1 ──────────── N
```

Такий поділ — результат **нормалізації** (normalization): кожен факт зберігається в одному місці. Ім'я користувача лежить лише в `users`; якщо він його змінить, оновлення в одному рядку відобразиться в усіх його постах.

### Індекси

**Індекс** (index) — допоміжна структура (зазвичай B-дерево), що дозволяє знаходити рядки без перебору всієї таблиці, як предметний покажчик у кінці книжки.

- Первинний ключ і `UNIQUE` автоматично мають індекс. InnoDB також автоматично індексує стовпці зовнішніх ключів.
- Індекс варто додавати на стовпці, які часто стоять у `WHERE`, `JOIN ... ON`, `ORDER BY` — у нас це `posts.created_at`.
- Індекси не безкоштовні: вони займають місце і сповільнюють `INSERT`/`UPDATE`. Індексувати «все підряд» не треба.
- `LIKE '%слово%'` (з `%` на початку) індекс **не використовує** — для повнотекстового пошуку існує `FULLTEXT`.

### JOIN і агрегати

```sql
-- INNER JOIN: лише ті пари, для яких є відповідність в обох таблицях
SELECT p.title, c.body
FROM posts p
INNER JOIN comments c ON c.post_id = p.id;

-- LEFT JOIN: усі рядки лівої таблиці; якщо пари немає — NULL у стовпцях правої
SELECT p.title, COUNT(c.id) AS comments_count
FROM posts p
LEFT JOIN comments c ON c.post_id = p.id
GROUP BY p.id;
```

`GROUP BY p.id` згортає всі рядки одного поста в один, а `COUNT(c.id)` рахує непорожні `c.id` у групі. Для поста без коментарів `LEFT JOIN` дасть один рядок з `c.id = NULL`, і `COUNT(c.id)` поверне 0. А от `COUNT(*)` повернув би 1 — це класична помилка.

### Пагінація

Сторінка `N` при `K` записах на сторінці: `LIMIT K OFFSET (N − 1) · K`. Щоб намалювати перемикач сторінок, потрібна ще загальна кількість записів (окремий `SELECT COUNT(*)` з тими самими умовами `WHERE`): `сторінок = ceil(всього / K)`.

## Хід роботи

### Крок 1. Файл схеми `schema.sql`

Опишемо всю структуру бази в одному файлі в корені проєкту. Він знадобиться для розгортання з нуля (наприклад, на хостингу в П14) і як документація.

```sql title="schema.sql"
-- Схема бази даних «Міні-блогу»
-- Увага: скрипт ВИДАЛЯЄ існуючі таблиці! Для нової (порожньої) бази.
-- CREATE DATABASE тут немає навмисно: на хостингу базу створюють у панелі керування.

SET NAMES utf8mb4;

DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE posts (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NULL,               -- автор-користувач (з П10)
  title      VARCHAR(200) NOT NULL,
  body       TEXT         NOT NULL,
  author     VARCHAR(100) NULL,               -- ім'я автора рядком (старі пости)
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_posts_created_at (created_at),
  CONSTRAINT fk_posts_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE comments (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id    INT UNSIGNED NOT NULL,
  author     VARCHAR(100) NOT NULL,
  body       TEXT         NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id)
    REFERENCES posts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Зверніть увагу на порядок: `DROP` — від дочірніх таблиць до батьківських (інакше зовнішній ключ не дасть видалити `posts`), `CREATE` — навпаки.

Чому `password_hash VARCHAR(255)`: функція `password_hash()` зараз повертає 60 символів (bcrypt), але документація PHP радить залишати запас до 255 — алгоритм за замовчуванням з часом може змінитися.

### Крок 2. Міграція існуючої бази

У вас уже є таблиця `posts` з даними, тому `schema.sql` запускати **не будемо** — він видалить пости. Натомість змінимо структуру командою `ALTER TABLE`. У phpMyAdmin виберіть базу `mini_blog` → вкладка SQL:

```sql title="SQL — міграція з П8"
-- 1. Нові таблиці
CREATE TABLE users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Зміни в posts
ALTER TABLE posts
  MODIFY author VARCHAR(100) NULL,
  ADD COLUMN user_id INT UNSIGNED NULL AFTER id,
  ADD KEY idx_posts_created_at (created_at),
  ADD CONSTRAINT fk_posts_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE SET NULL;

-- 3. Коментарі
CREATE TABLE comments (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id    INT UNSIGNED NOT NULL,
  author     VARCHAR(100) NOT NULL,
  body       TEXT         NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id)
    REFERENCES posts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Після виконання результат має збігатися зі структурою з `schema.sql`. Перевірте в phpMyAdmin: таблиця `posts` → **Структура** → **Перегляд зв'язків** (Relation view) — там видно зовнішній ключ на `users`.

:::caution[Помилка `errno: 150 "Foreign key constraint is incorrectly formed"`]
Найчастіші причини: типи стовпців не збігаються точно (`INT` проти `INT UNSIGNED`), таблиця не InnoDB або батьківська таблиця ще не створена. Стовпець FK і стовпець, на який він посилається, мають бути **одного типу і знаковості**.
:::

### Крок 3. Тестові коментарі та вправи з JOIN

Додамо кілька коментарів. Підставте `id` своїх постів (подивіться їх у `SELECT id, title FROM posts;`):

```sql title="SQL"
INSERT INTO comments (post_id, author, body) VALUES
  (1, 'Марія', 'Чудовий перший пост!'),
  (1, 'Іван',  'Чекаю на продовження.'),
  (2, 'Олена', 'Дякую, дуже зрозуміло пояснено.');
```

Перевірте цілісність: спробуйте додати коментар до неіснуючого поста:

```sql title="SQL"
INSERT INTO comments (post_id, author, body) VALUES (9999, 'Хтось', 'Тест');
-- #1452 - Cannot add or update a child row: a foreign key constraint fails
```

Тепер вправи:

```sql title="SQL"
-- 1. Коментарі разом із заголовком поста
SELECT c.author, c.body, p.title
FROM comments c
INNER JOIN posts p ON p.id = c.post_id
ORDER BY c.created_at DESC;

-- 2. Кількість коментарів у кожного поста (і в постів без коментарів!)
SELECT p.id, p.title, COUNT(c.id) AS comments_count
FROM posts p
LEFT JOIN comments c ON c.post_id = p.id
GROUP BY p.id, p.title
ORDER BY comments_count DESC;

-- 3. Лише пости, які мають понад 1 коментар (HAVING — умова для груп)
SELECT p.title, COUNT(c.id) AS comments_count
FROM posts p
JOIN comments c ON c.post_id = p.id
GROUP BY p.id, p.title
HAVING comments_count > 1;

-- 4. Друга сторінка по 2 пости
SELECT id, title FROM posts ORDER BY created_at DESC LIMIT 2 OFFSET 2;
```

Порівняйте результат запиту 2 з `INNER JOIN` замість `LEFT JOIN` — пости без коментарів зникнуть зі списку.

:::note[`WHERE` проти `HAVING`]
`WHERE` фільтрує **рядки до** групування, `HAVING` — **групи після** нього. Умову з `COUNT()` можна написати лише в `HAVING`.
:::

### Крок 4. Спільні функції для постів: `includes/posts.php`

Пошук поста за `id` і валідація знадобляться на кількох сторінках. Винесемо їх в окремий файл. А в `helpers.php` додамо функцію `abort()` для відповідей з кодом помилки.

```php title="includes/helpers.php (додати в кінець)"
// Завершити запит з HTTP-кодом помилки
function abort(int $code, string $message = ''): never
{
    http_response_code($code);
    $pageTitle = "Помилка {$code}";
    require __DIR__ . '/header.php';
    echo '<h1>' . e($pageTitle) . '</h1><p>' . e($message) . '</p>';
    require __DIR__ . '/footer.php';
    exit;
}
```

```php title="includes/posts.php"
<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

// Пошук поста за id; null, якщо такого немає
function find_post(int $id): ?array
{
    $stmt = db()->prepare(
        'SELECT id, user_id, title, body, author, created_at FROM posts WHERE id = :id'
    );
    $stmt->execute(['id' => $id]);

    return $stmt->fetch() ?: null; // fetch() повертає false, якщо рядка немає
}

// Те саме, але з відповіддю 404, якщо поста немає
function find_post_or_404(int $id): array
{
    return find_post($id) ?? abort(404, 'Пост не знайдено');
}

// Валідація даних поста; повертає масив помилок (порожній — усе гаразд)
function validate_post(string $title, string $body): array
{
    $errors = [];

    if ($title === '') {
        $errors['title'] = 'Введіть заголовок';
    } elseif (mb_strlen($title) > 200) {
        $errors['title'] = 'Заголовок — не довше 200 символів';
    }

    if (mb_strlen($body) < 10) {
        $errors['body'] = 'Текст — щонайменше 10 символів';
    }

    return $errors;
}

// id з параметра запиту: додатне ціле число або null
function request_id(array $source, string $key = 'id'): ?int
{
    $id = filter_var($source[$key] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    return $id === false ? null : $id;
}
```

Кілька деталей:

- `require_once` замість `require`: файл `db.php` може вже бути підключений іншою сторінкою, а повторне оголошення функції `db()` — фатальна помилка.
- `$stmt->fetch() ?: null` — «Елвіс-оператор»: якщо `fetch()` повернув `false`, результатом буде `null`.
- `find_post($id) ?? abort(...)` — оскільки `abort()` має тип `never`, вираз коректний: або повертається пост, або виконання завершується.
- `request_id()` використовує `filter_var` з П7: рядок `"5abc"` чи `"-1"` не пройде.

Ім'я автора (`author`) для валідації не перевіряємо в `validate_post()` — у П10 воно зникне з форми, бо автором стане користувач, що увійшов. Поки перевіряємо його окремо в `create.php`.

### Крок 5. Список постів з лічильником коментарів і пагінацією

Перепишемо `index.php`: `LEFT JOIN` з коментарями, `COUNT`, `GROUP BY`, `LIMIT`/`OFFSET`, а кожна картка тепер веде на сторінку поста.

```php title="index.php"
<?php
declare(strict_types=1);
require __DIR__ . '/includes/helpers.php';
require __DIR__ . '/includes/posts.php';

const PER_PAGE = 5;

$q    = trim((string) ($_GET['q'] ?? ''));
$sort = (string) ($_GET['sort'] ?? 'new');
$page = max(1, (int) ($_GET['page'] ?? 1));

$orderBy = match ($sort) {
    'old'   => 'p.created_at ASC',
    'title' => 'p.title ASC',
    default => 'p.created_at DESC',
};

// Умова пошуку — однакова для підрахунку і для вибірки
$where  = '';
$params = [];
if ($q !== '') {
    $where = 'WHERE p.title LIKE :q OR p.body LIKE :q2';
    $params = ['q' => "%{$q}%", 'q2' => "%{$q}%"];
}

// 1. Скільки всього постів підходить під умову
$countStmt = db()->prepare("SELECT COUNT(*) FROM posts p {$where}");
$countStmt->execute($params);
$total = (int) $countStmt->fetchColumn();

$pages = max(1, (int) ceil($total / PER_PAGE));
$page  = min($page, $pages);              // ?page=999 → остання сторінка
$offset = ($page - 1) * PER_PAGE;

// 2. Пости поточної сторінки з кількістю коментарів
$stmt = db()->prepare(
    "SELECT p.id, p.title, p.body, p.author, p.created_at,
            COUNT(c.id) AS comments_count
     FROM posts p
     LEFT JOIN comments c ON c.post_id = p.id
     {$where}
     GROUP BY p.id
     ORDER BY {$orderBy}
     LIMIT :limit OFFSET :offset"
);
foreach ($params as $name => $value) {
    $stmt->bindValue($name, $value);
}
// LIMIT/OFFSET мають бути саме цілими числами
$stmt->bindValue('limit', PER_PAGE, PDO::PARAM_INT);
$stmt->bindValue('offset', $offset, PDO::PARAM_INT);
$stmt->execute();
$posts = $stmt->fetchAll();

// Посилання на сторінку зі збереженням пошуку і сортування
function page_url(int $n, string $q, string $sort): string
{
    return 'index.php?' . http_build_query(['q' => $q, 'sort' => $sort, 'page' => $n]);
}

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

<p class="meta">Знайдено постів: <?= $total ?></p>

<?php foreach ($posts as $post): ?>
    <article class="post-card">
        <h2><a href="post.php?id=<?= $post['id'] ?>"><?= e($post['title']) ?></a></h2>
        <p class="meta">
            <?= e($post['author'] ?? 'Анонім') ?> ·
            <?= e(date('d.m.Y H:i', strtotime($post['created_at']))) ?> ·
            💬 <?= $post['comments_count'] ?>
        </p>
        <p><?= e(mb_strimwidth($post['body'], 0, 200, '…')) ?></p>
    </article>
<?php endforeach; ?>

<?php if ($pages > 1): ?>
    <nav class="pagination">
        <?php for ($i = 1; $i <= $pages; $i++): ?>
            <?php if ($i === $page): ?>
                <span class="current"><?= $i ?></span>
            <?php else: ?>
                <a href="<?= e(page_url($i, $q, $sort)) ?>"><?= $i ?></a>
            <?php endif; ?>
        <?php endfor; ?>
    </nav>
<?php endif; ?>

<?php require __DIR__ . '/includes/footer.php'; ?>
```

Ключові моменти:

- **Чому `bindValue` з `PDO::PARAM_INT`.** `execute($array)` передає всі значення як рядки. Для `WHERE` це не проблема, але при справжніх підготовлених запитах MySQL відмовиться приймати рядок `'5'` у `LIMIT`. Тому `LIMIT` і `OFFSET` прив'язуємо явно як цілі.
- **`$post['id']` і `$post['comments_count']` без `e()`.** Завдяки `ATTR_EMULATE_PREPARES => false` PDO повертає цілі числа як `int`, тож HTML-ін'єкції тут бути не може. Але якщо сумніваєтеся — `e()` не завадить.
- **`http_build_query`** правильно кодує параметри URL (пробіли, кирилицю), а результат ми ще й екрануємо `e()`, бо вставляємо його в атрибут `href` (там є `&`).
- **`GROUP BY p.id`** при вибірці `p.title`, `p.body` тощо: MySQL 8 розуміє, що всі стовпці `posts` однозначно визначаються первинним ключем. У MariaDB з XAMPP режим `ONLY_FULL_GROUP_BY` за замовчуванням вимкнений. Якщо ваш сервер видає помилку `isn't in GROUP BY` — перелічіть усі стовпці: `GROUP BY p.id, p.title, p.body, p.author, p.created_at`.

Додайте стилі пагінації в `assets/style.css`:

```css title="assets/style.css (додати)"
.pagination { display: flex; gap: .5rem; margin: 2rem 0; }
.pagination a, .pagination .current {
  padding: .3rem .7rem; border: 1px solid #cbd5e1; border-radius: 6px; text-decoration: none;
}
.pagination .current { background: #1e293b; color: #fff; border-color: #1e293b; }
```

### Крок 6. Сторінка поста з коментарями: `post.php`

Сторінка показує пост, його коментарі (окремий запит), форму нового коментаря і кнопки «Редагувати» / «Видалити».

```php title="post.php"
<?php
declare(strict_types=1);
require __DIR__ . '/includes/helpers.php';
require __DIR__ . '/includes/posts.php';

$id = request_id($_GET) ?? abort(404, 'Пост не знайдено');
$post = find_post_or_404($id);

$errors = [];

// Додавання коментаря
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_verify()) {
        abort(400, 'Недійсний CSRF-токен');
    }

    $author = old('author');
    $body   = old('body');

    if ($author === '' || mb_strlen($author) > 100) {
        $errors['author'] = "Вкажіть ім'я (до 100 символів)";
    }
    if ($body === '' || mb_strlen($body) > 2000) {
        $errors['body'] = 'Коментар — від 1 до 2000 символів';
    }

    if ($errors === []) {
        $stmt = db()->prepare(
            'INSERT INTO comments (post_id, author, body) VALUES (:post_id, :author, :body)'
        );
        $stmt->execute(['post_id' => $id, 'author' => $author, 'body' => $body]);

        flash('Коментар додано');
        redirect("post.php?id={$id}#comments"); // PRG
    }
}

$stmt = db()->prepare(
    'SELECT author, body, created_at FROM comments
     WHERE post_id = :id ORDER BY created_at ASC'
);
$stmt->execute(['id' => $id]);
$comments = $stmt->fetchAll();

$pageTitle = $post['title'];
require __DIR__ . '/includes/header.php';
?>

<article class="post">
    <h1><?= e($post['title']) ?></h1>
    <p class="meta">
        <?= e($post['author'] ?? 'Анонім') ?> ·
        <?= e(date('d.m.Y H:i', strtotime($post['created_at']))) ?>
    </p>
    <!-- nl2br після e(): спершу екрануємо, потім перетворюємо переноси на <br> -->
    <div class="post-body"><?= nl2br(e($post['body'])) ?></div>

    <div class="post-actions">
        <a href="edit.php?id=<?= $post['id'] ?>">Редагувати</a>
        <form method="post" action="delete.php"
              onsubmit="return confirm('Видалити пост разом з коментарями?')">
            <?= csrf_field() ?>
            <input type="hidden" name="id" value="<?= $post['id'] ?>">
            <button type="submit" class="danger">Видалити</button>
        </form>
    </div>
</article>

<section id="comments">
    <h2>Коментарі (<?= count($comments) ?>)</h2>

    <?php foreach ($comments as $comment): ?>
        <div class="comment">
            <p class="meta">
                <strong><?= e($comment['author']) ?></strong> ·
                <?= e(date('d.m.Y H:i', strtotime($comment['created_at']))) ?>
            </p>
            <p><?= nl2br(e($comment['body'])) ?></p>
        </div>
    <?php endforeach; ?>

    <h3>Залишити коментар</h3>
    <form method="post" action="post.php?id=<?= $post['id'] ?>#comments" class="form">
        <?= csrf_field() ?>
        <label>Ім'я
            <input type="text" name="author" maxlength="100" value="<?= e(old('author')) ?>">
        </label>
        <?php if (isset($errors['author'])): ?><p class="error"><?= e($errors['author']) ?></p><?php endif; ?>

        <label>Коментар
            <textarea name="body" rows="4"><?= e(old('body')) ?></textarea>
        </label>
        <?php if (isset($errors['body'])): ?><p class="error"><?= e($errors['body']) ?></p><?php endif; ?>

        <button type="submit">Надіслати</button>
    </form>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
```

:::tip[Порядок `nl2br(e(...))`]
Якщо зробити навпаки — `e(nl2br(...))`, — то теги `<br />` теж заекрануються і на сторінці з'явиться текст `&lt;br /&gt;`. Правило: спочатку екрануємо дані користувача, потім додаємо **власну** розмітку.
:::

Чому видалення — це форма з `POST`, а не посилання `delete.php?id=5`? GET-запити не повинні змінювати дані: їх кешують, попередньо завантажують браузери, за ними ходять пошукові роботи, і їх легко підсунути жертві в `<img src="...">`. Будь-яка зміна стану — лише `POST` (і з CSRF-токеном).

### Крок 7. Створення поста з переходом на нього: `lastInsertId()`

У `create.php` змінимо лише дві речі: валідацію через `validate_post()` і перенаправлення на щойно створений пост.

```php title="create.php (фрагмент обробки POST)" {12,20-23}
<?php
declare(strict_types=1);
require __DIR__ . '/includes/helpers.php';
require __DIR__ . '/includes/posts.php';

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_verify()) {
        abort(400, 'Недійсний CSRF-токен');
    }
    $errors = validate_post(old('title'), old('body'));
    if (old('author') === '' || mb_strlen(old('author')) > 100) {
        $errors['author'] = "Вкажіть ім'я автора (до 100 символів)";
    }

    if ($errors === []) {
        $stmt = db()->prepare('INSERT INTO posts (title, body, author) VALUES (:title, :body, :author)');
        $stmt->execute(['title' => old('title'), 'body' => old('body'), 'author' => old('author')]);
        $newId = (int) db()->lastInsertId();

        flash('Пост опубліковано');
        redirect("post.php?id={$newId}");
    }
}
// ...далі — форма без змін (як у П8)
```

`lastInsertId()` повертає `id`, який `AUTO_INCREMENT` видав останньому `INSERT` **у цьому з'єднанні**, тож навіть при одночасній роботі багатьох користувачів кожен отримає свій `id`. Метод повертає рядок, тому приводимо до `int`.

### Крок 8. Редагування: `edit.php`

Форма та сама, що й у `create.php`, але поля заповнені поточними значеннями з БД. Тут знадобиться другий параметр `old()` — значення за замовчуванням.

```php title="edit.php"
<?php
declare(strict_types=1);
require __DIR__ . '/includes/helpers.php';
require __DIR__ . '/includes/posts.php';

$id = request_id($_GET) ?? abort(404, 'Пост не знайдено');
$post = find_post_or_404($id);

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_verify()) {
        abort(400, 'Недійсний CSRF-токен');
    }

    $title = old('title');
    $body  = old('body');
    $errors = validate_post($title, $body);

    if ($errors === []) {
        $stmt = db()->prepare('UPDATE posts SET title = :title, body = :body WHERE id = :id');
        $stmt->execute(['title' => $title, 'body' => $body, 'id' => $id]);

        flash('Зміни збережено');
        redirect("post.php?id={$id}");
    }
}

$pageTitle = 'Редагування: ' . $post['title'];
require __DIR__ . '/includes/header.php';
?>

<h1>Редагування поста</h1>

<form method="post" action="edit.php?id=<?= $id ?>" class="form" novalidate>
    <?= csrf_field() ?>

    <label>Заголовок
        <!-- при першому відкритті — значення з БД, після помилки — те, що ввів користувач -->
        <input type="text" name="title" maxlength="200" value="<?= e(old('title', $post['title'])) ?>">
    </label>
    <?php if (isset($errors['title'])): ?><p class="error"><?= e($errors['title']) ?></p><?php endif; ?>

    <label>Текст
        <textarea name="body" rows="10"><?= e(old('body', $post['body'])) ?></textarea>
    </label>
    <?php if (isset($errors['body'])): ?><p class="error"><?= e($errors['body']) ?></p><?php endif; ?>

    <button type="submit">Зберегти</button>
    <a href="post.php?id=<?= $id ?>">Скасувати</a>
</form>

<?php require __DIR__ . '/includes/footer.php'; ?>
```

Метод `$stmt->rowCount()` після `UPDATE` повертає кількість **змінених** рядків. Якщо користувач натиснув «Зберегти», нічого не змінивши, він поверне 0 — це не помилка. Тому для перевірки існування поста ми використали окремий `find_post_or_404()` на початку.

### Крок 9. Видалення: `delete.php`

```php title="delete.php"
<?php
declare(strict_types=1);
require __DIR__ . '/includes/helpers.php';
require __DIR__ . '/includes/posts.php';

// Сторінка приймає лише POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    abort(405, 'Метод не дозволено');
}
if (!csrf_verify()) {
    abort(400, 'Недійсний CSRF-токен');
}

$id = request_id($_POST) ?? abort(404, 'Пост не знайдено');
find_post_or_404($id);

$stmt = db()->prepare('DELETE FROM posts WHERE id = :id');
$stmt->execute(['id' => $id]);
// коментарі видалить сама СУБД завдяки ON DELETE CASCADE

flash('Пост видалено');
redirect('index.php');
```

Перевірте: видаліть пост з коментарями, а потім у phpMyAdmin виконайте `SELECT * FROM comments;` — коментарів цього поста не залишилось. Відкрийте `delete.php` напряму в адресному рядку — має бути «Помилка 405».

### Крок 10. Перевірка повного CRUD

Пройдіть сценарій від початку до кінця:

| Дія | Очікуваний результат |
|---|---|
| Створити пост | Перенаправлення на `post.php?id=N`, flash «Пост опубліковано» |
| Додати 2 коментарі | Коментарі під постом, у списку лічильник 💬 2 |
| Відправити порожній коментар | Повідомлення про помилку, введене ім'я збереглося |
| Редагувати пост, очистити заголовок | Помилка валідації, текст не втрачено |
| Відкрити `post.php?id=99999` і `post.php?id=abc` | Сторінка «Помилка 404» |
| Створити 6+ постів | З'являється пагінація, пошук зберігається при перемиканні сторінок |
| Видалити пост | Flash «Пост видалено», коментарі зникли з БД |

**Результат роботи:** у базі три пов'язані таблиці, схема описана в `schema.sql`. Блог підтримує повний CRUD постів, коментарі, лічильник коментарів у списку і пагінацію. Усі запити — підготовлені, усі зміни даних — лише через `POST` з CSRF-токеном.

## Завдання для самостійного виконання

1. ★ Додайте на `post.php` посилання «← До списку» і виведіть дату останнього коментаря у списку постів (`MAX(c.created_at)`).
2. ★ Додайте на головну блок «Найобговорюваніші»: 3 пости з найбільшою кількістю коментарів (`ORDER BY comments_count DESC LIMIT 3`).
3. ★★ Покращте пагінацію: посилання «← Попередня» / «Наступна →», які не показуються на першій/останній сторінці.
4. ★★ Додайте можливість видалити коментар (кнопка-форма біля коментаря, окремий `delete-comment.php`, `POST` + CSRF, перенаправлення назад на пост).
5. ★★★ **Теги і транзакція.** Створіть таблиці `tags(id, name UNIQUE)` і `post_tag(post_id, tag_id, PRIMARY KEY(post_id, tag_id))` з FK `ON DELETE CASCADE`. У `create.php` додайте поле «Теги через кому». Збереження поста і його тегів виконайте в **транзакції**, щоб при помилці не залишилось поста без тегів або «осиротілих» зв'язків:

   ```php
   $pdo = db();
   try {
       $pdo->beginTransaction();
       // INSERT INTO posts ... → $postId = (int) $pdo->lastInsertId();
       // для кожного тегу: INSERT IGNORE INTO tags (name) VALUES (:name),
       //   потім SELECT id FROM tags WHERE name = :name,
       //   потім INSERT INTO post_tag (post_id, tag_id) VALUES (...)
       $pdo->commit();
   } catch (Throwable $ex) {
       $pdo->rollBack(); // скасувати всі зміни транзакції
       throw $ex;
   }
   ```

   Виведіть теги на сторінці поста (`JOIN` через `post_tag`) і зробіть фільтр `index.php?tag=php`.

## Контрольні питання

1. Чим відрізняються `CHAR`, `VARCHAR` і `TEXT`? Який тип обрати для email, а який — для тексту поста?
2. Чому для грошових сум використовують `DECIMAL`, а не `FLOAT`?
3. Що таке зовнішній ключ? Що означають `ON DELETE CASCADE` і `ON DELETE SET NULL`? Де ми їх використали і чому саме так?
4. У якій таблиці розміщується зовнішній ключ при зв'язку «один-до-багатьох»? Як реалізується зв'язок «багато-до-багатьох»?
5. Що таке індекс? Коли його варто створювати, а коли він шкодить?
6. Чим відрізняються `INNER JOIN` і `LEFT JOIN`? Чому для лічильника коментарів потрібен саме `LEFT JOIN` і `COUNT(c.id)`, а не `COUNT(*)`?
7. Чим відрізняються `WHERE` і `HAVING`?
8. Як обчислити `OFFSET` для сторінки `N`? Навіщо окремий запит `COUNT(*)`?
9. Навіщо прив'язувати `LIMIT` через `bindValue(..., PDO::PARAM_INT)`?
10. Чому видалення реалізоване через форму `POST`, а не посилання з GET-параметром?

## Домашнє завдання

1. Намалюйте (на папері або в draw.io) ER-діаграму бази `mini_blog`: таблиці, стовпці, типи, ключі, зв'язки зі значками 1 і N.
2. Напишіть SQL-запит, що виводить авторів (`posts.author`) і кількість їхніх постів, відсортованих за спаданням кількості. Додайте його текст і результат у звіт.
3. Спробуйте на практиці «помилку `COUNT(*)`»: замініть у `index.php` `COUNT(c.id)` на `COUNT(*)` і поясніть у звіті, що змінилося для постів без коментарів. Поверніть правильний варіант.

## Що здати

- Файл `schema.sql`.
- Скриншот «Перегляду зв'язків» таблиці `comments` або `posts` у phpMyAdmin.
- Скриншоти: список з пагінацією і лічильниками коментарів, сторінка поста з коментарями, форма редагування з помилкою валідації.
- Файли `includes/posts.php`, `index.php`, `post.php`, `create.php`, `edit.php`, `delete.php`.
- Відповіді на контрольні питання.
