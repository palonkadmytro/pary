---
title: "Реалізація простого REST API"
description: "Вивчаємо принципи REST і HTTP-коди статусів, створюємо класи Database і PostRepository та пишемо JSON API постів «Міні-блогу» з підтримкою GET, POST, PUT, PATCH і DELETE, авторизацією через сесію та CORS; тестуємо через curl, Thunder Client і fetch."
type: practice
pair: 12
topic: 68
---

## Мета роботи

- Зрозуміти принципи архітектурного стилю REST: ресурси, URI, HTTP-методи, коди статусів, відсутність стану.
- Застосувати ООП з лекції 11: створити класи `App\Database` і `App\PostRepository` з автозавантаженням через `spl_autoload_register`.
- Реалізувати `api/posts.php` — JSON API для постів: список з пошуком і пагінацією, один пост, створення, повне й часткове оновлення, видалення.
- Навчитися читати JSON-тіло запиту з `php://input`, правильно формувати відповіді (`Content-Type`, коди статусів, `json_encode`).
- Захистити змінювальні операції: автентифікація через сесію, перевірка прав автора.
- Протестувати API через `curl`, Thunder Client/Postman і `fetch` зі сторінки, розібратися з CORS.

## Що потрібно

- Проєкт `mini-blog` у стані після П10: користувачі, вхід через сесію, `includes/auth.php` з `current_user()` і `can_manage_post()`, `includes/posts.php` з `validate_post()` і `request_id()`.
- `curl` (вбудований у Windows 10+, macOS і Linux).
- Розширення VS Code **Thunder Client** або програма **Postman** (одне на вибір).
- Конспект лекції 11 (класи, простори імен, автозавантаження).

## Короткі теоретичні відомості

### Що таке API і REST

**API** (Application Programming Interface) вебзастосунку — набір адрес, за якими інша програма (мобільний застосунок, React-фронтенд, інший сервер) може отримувати й змінювати дані. На відміну від звичайних сторінок, API повертає не HTML, а дані — найчастіше у форматі **JSON**.

**REST** (Representational State Transfer) — архітектурний стиль побудови API поверх HTTP. Основні ідеї:

1. **Ресурси** (resources) — усе, з чим працює API, є ресурсом з власною адресою (URI): `/api/posts` — колекція постів, `/api/posts/5` — конкретний пост.
2. **Дії задаються HTTP-методами**, а не назвами в адресі: не `/api/deletePost?id=5`, а `DELETE /api/posts/5`.
3. **Представлення** (representation): клієнт отримує не сам ресурс, а його представлення — JSON-документ.
4. **Відсутність стану** (statelessness) між запитами на рівні протоколу: кожен запит містить усе потрібне для його обробки (зокрема дані автентифікації — кукі або токен).
5. **Коди статусів** HTTP повідомляють результат: успіх, помилку клієнта, помилку сервера.

Без налаштування переписування URL (mod_rewrite) адреса `/api/posts/5` у PHP не працює «з коробки», тому в нашому проєкті ідентифікатор передаватиметься параметром: `/api/posts.php?id=5`. Принципи REST від цього не змінюються.

### HTTP-методи

| Метод | Дія | Приклад | Безпечний | Ідемпотентний |
|---|---|---|---|---|
| `GET` | Отримати | `GET /api/posts.php?id=5` | Так | Так |
| `POST` | Створити новий ресурс у колекції | `POST /api/posts.php` | Ні | Ні |
| `PUT` | Замінити ресурс **повністю** | `PUT /api/posts.php?id=5` | Ні | Так |
| `PATCH` | Змінити **частину** ресурсу | `PATCH /api/posts.php?id=5` | Ні | Зазвичай так |
| `DELETE` | Видалити | `DELETE /api/posts.php?id=5` | Ні | Так |
| `OPTIONS` | Дізнатися можливості (CORS preflight) | `OPTIONS /api/posts.php` | Так | Так |

- **Безпечний** (safe) метод не змінює дані на сервері.
- **Ідемпотентний** (idempotent) — повторення того самого запиту дає той самий стан сервера. Два однакові `DELETE` — пост видалено (другий поверне 404, але стан той самий). Два однакові `POST` — два пости.

### Коди статусів

| Код | Назва | Коли повертаємо |
|---|---|---|
| **200** | OK | Успішний `GET`, `PUT`, `PATCH` |
| **201** | Created | Успішний `POST`; заголовок `Location` — адреса нового ресурсу |
| **204** | No Content | Успішний `DELETE` (тіла відповіді немає) |
| **400** | Bad Request | Некоректний JSON, неправильний параметр |
| **401** | Unauthorized | Не автентифікований (не увійшов) |
| **403** | Forbidden | Автентифікований, але немає прав (чужий пост) |
| **404** | Not Found | Ресурсу не існує |
| **405** | Method Not Allowed | Метод не підтримується; заголовок `Allow` перелічує дозволені |
| **415** | Unsupported Media Type | Тіло не в JSON |
| **422** | Unprocessable Content | JSON коректний, але дані не пройшли валідацію |
| **500** | Internal Server Error | Помилка на сервері (виняток, недоступна БД) |

Групи: `2xx` — успіх, `3xx` — перенаправлення, `4xx` — помилка клієнта (він може виправити запит), `5xx` — помилка сервера.

### Анатомія запиту й відповіді

```text
POST /mini-blog/api/posts.php HTTP/1.1
Host: localhost
Content-Type: application/json
Cookie: MINIBLOGSESS=k3j9f8...

{"title": "Пост через API", "body": "Створено без жодної HTML-форми"}
```

```text
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
Location: /mini-blog/api/posts.php?id=12

{"data":{"id":12,"title":"Пост через API","body":"Створено без жодної HTML-форми","author":"Олена","user_id":1,"comments_count":0,"created_at":"2026-04-02T10:15:00+03:00"}}
```

На відміну від HTML-форми, тіло JSON-запиту PHP **не розбирає** в `$_POST` — його читають вручну з потоку `php://input` і декодують `json_decode()`.

### Дизайн відповідей нашого API

Усі відповіді — JSON-об'єкти з передбачуваною структурою:

```json
// Успіх — дані в ключі data
{ "data": { "id": 5, "title": "..." } }

// Список — плюс метадані пагінації
{ "data": [ ... ], "meta": { "total": 23, "page": 1, "per_page": 10, "pages": 3 } }

// Помилка — повідомлення і (для валідації) помилки полів
{ "error": "Помилки валідації", "errors": { "title": "Введіть заголовок" } }
```

## Хід роботи

### Крок 1. Структура і автозавантажувач

Наприкінці роботи до проєкту додадуться такі файли:

```text
mini-blog/
├── api/
│   └── posts.php          ← REST API
├── src/
│   ├── autoload.php       ← автозавантажувач класів App\...
│   ├── Database.php       ← клас App\Database
│   └── PostRepository.php ← клас App\PostRepository
├── api-demo.html          ← сторінка для перевірки API через fetch
└── ...                    ← усе, що було після П10
```

Почнемо з автозавантажувача — спрощеної реалізації PSR-4 з лекції 11: клас `App\PostRepository` шукається у файлі `src/PostRepository.php`.

```php title="src/autoload.php"
<?php
declare(strict_types=1);

// PSR-4: простір імен App\ ↔ папка src/
spl_autoload_register(function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }

    $relative = substr($class, strlen($prefix));
    $file = __DIR__ . '/' . str_replace('\\', '/', $relative) . '.php';

    if (is_file($file)) {
        require $file;
    }
});
```

### Крок 2. Клас `Database`

Клас відповідає за одне — створити й видати з'єднання PDO. По суті, це та сама функція `db()`, але в об'єктній формі і в просторі імен `App`.

```php title="src/Database.php (основна частина)"
final class Database
{
    private static ?PDO $connection = null;

    // Приватний конструктор: створювати об'єкти Database не потрібно
    private function __construct() {}

    public static function connection(): PDO
    {
        if (self::$connection === null) {
            $config = (require __DIR__ . '/../config.php')['db'];
            // ... DSN і new PDO(...) з тими самими опціями, що й у П8
        }
        return self::$connection;
    }
}
```

Повний лістинг — у додатку наприкінці сторінки. Зверніть увагу: всередині простору імен `App` вбудований клас треба імпортувати (`use PDO;`) або писати `\PDO`, інакше PHP шукатиме неіснуючий `App\PDO`.

Щоб у проєкті не було двох різних з'єднань (одне з `db()`, друге з `Database`), переведемо `db()` на новий клас:

```php title="includes/db.php"
<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/autoload.php';

// Сумісність зі сторінками П8–П10: db() тепер делегує класу Database
function db(): PDO
{
    return App\Database::connection();
}
```

Відкрийте кілька сторінок блогу — усе має працювати, як і раніше. Ми змінили реалізацію, не змінивши інтерфейсу функції, тому решта коду цього навіть «не помітила».

### Крок 3. Клас `PostRepository`

Збираємо всі SQL-запити до постів в одному класі (патерн «Репозиторій» з лекції 11). PDO передається через конструктор — **впровадження залежностей**.

```php title="src/PostRepository.php (структура)"
final class PostRepository
{
    public function __construct(private PDO $pdo) {}

    public function all(string $search = '', int $limit = 10, int $offset = 0): array { /* ... */ }
    public function count(string $search = ''): int { /* ... */ }
    public function find(int $id): ?array { /* ... */ }
    public function create(int $userId, string $title, string $body): int { /* ... */ }
    public function update(int $id, array $fields): void { /* ... */ }
    public function delete(int $id): bool { /* ... */ }

    private function searchCondition(string $search): array { /* ... */ }
}
```

Розглянемо найцікавіші місця.

**Спільна частина `SELECT`** винесена в приватну константу класу, бо `all()` і `find()` повертають пости в однаковому форматі — з ім'ям автора і кількістю коментарів:

```php
private const SELECT_POSTS = "
    SELECT p.id, p.user_id, p.title, p.body, p.created_at,
           COALESCE(u.name, p.author, 'Анонім') AS author_name,
           (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count
    FROM posts p
    LEFT JOIN users u ON u.id = p.user_id";
```

Тут кількість коментарів рахується **корельованим підзапитом** (subquery) замість `LEFT JOIN` + `GROUP BY`, як у П9. Результат той самий, але не потрібен `GROUP BY`, і запит легко доповнювати умовами `WHERE`.

**Умова пошуку** використовується і в `all()`, і в `count()`. Метод повертає масив з двох елементів, який зручно розпакувати деструктуризацією:

```php
private function searchCondition(string $search): array
{
    if ($search === '') {
        return ['', []];
    }
    $like = '%' . $search . '%';
    return ['WHERE p.title LIKE :q1 OR p.body LIKE :q2', ['q1' => $like, 'q2' => $like]];
}

// використання:
[$where, $params] = $this->searchCondition($search);
```

**Часткове оновлення** `update()` приймає масив лише тих полів, які треба змінити (для `PATCH`). Імена стовпців потрапляють у SQL, тому їх **обов'язково** фільтруємо білим списком:

```php
public function update(int $id, array $fields): void
{
    // Лише дозволені стовпці — ключі з запиту ніколи не потрапляють у SQL напряму
    $fields = array_intersect_key($fields, array_flip(self::UPDATABLE));
    if ($fields === []) {
        return;
    }

    // ['title' => ..., 'body' => ...] → "title = :title, body = :body"
    $set = implode(', ', array_map(
        fn(string $column): string => "{$column} = :{$column}",
        array_keys($fields),
    ));

    $stmt = $this->pdo->prepare("UPDATE posts SET {$set} WHERE id = :id");
    $stmt->execute([...$fields, 'id' => $id]);
}
```

де `private const UPDATABLE = ['title', 'body'];`. Без `array_intersect_key` зловмисник надіслав би `{"user_id": 1}` або навіть ключ з SQL-кодом в імені.

Створіть файли `src/Database.php` і `src/PostRepository.php` за повними лістингами з **додатка** наприкінці сторінки та переконайтеся, що розумієте кожен метод.

:::tip[Швидка перевірка класу без API]
Створіть тимчасовий `test-repo.php` у корені проєкту:

```php
<?php
declare(strict_types=1);
require __DIR__ . '/src/autoload.php';

$repo = new App\PostRepository(App\Database::connection());
header('Content-Type: text/plain; charset=utf-8');
echo 'Постів: ' . $repo->count() . PHP_EOL;
print_r($repo->find(1));
```

Відкрийте його в браузері, переконайтеся, що бачите дані, і видаліть файл.
:::

### Крок 4. Каркас `api/posts.php`: заголовки й маршрутизація

API — це один файл, що за HTTP-методом і наявністю `?id=` вирішує, яку дію виконати. Почнемо з допоміжних функцій для відповідей:

```php title="api/posts.php (допоміжні функції)"
// Відправити JSON-відповідь і завершити скрипт
function send_json(mixed $data, int $status = 200): never
{
    http_response_code($status);
    if ($status !== 204) {
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }
    exit;
}

// Відповідь з помилкою: {"error": "...", ...додаткові поля}
function json_error(int $status, string $message, array $extra = []): never
{
    send_json(['error' => $message] + $extra, $status);
}
```

Прапорці `json_encode`:

| Прапорець | Що робить |
|---|---|
| `JSON_UNESCAPED_UNICODE` | Кирилиця виводиться як є, а не `При...` |
| `JSON_UNESCAPED_SLASHES` | `/` не екранується як `\/` |
| `JSON_THROW_ON_ERROR` | При помилці кодування — виняток `JsonException` замість тихого `false` |

Далі — головна частина: спільні заголовки і **маршрутизація** через `match (true)`:

```php title="api/posts.php (маршрутизація)"
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$id = request_id($_GET);
if (isset($_GET['id']) && $id === null) {
    json_error(400, 'Некоректний id');
}

$repo = new PostRepository(Database::connection());

try {
    match (true) {
        $method === 'GET' && $id === null    => list_posts($repo),
        $method === 'GET'                    => show_post($repo, $id),
        $method === 'POST' && $id === null   => create_post($repo),
        $method === 'PUT' && $id !== null    => update_post($repo, $id, partial: false),
        $method === 'PATCH' && $id !== null  => update_post($repo, $id, partial: true),
        $method === 'DELETE' && $id !== null => delete_post($repo, $id),
        default                              => method_not_allowed($id),
    };
} catch (Throwable $ex) {
    error_log((string) $ex);                 // деталі — у журнал сервера
    json_error(500, 'Внутрішня помилка сервера'); // клієнту — без подробиць
}
```

`match (true)` перевіряє умови по черзі і виконує першу, що дорівнює `true`. Кожен обробник має тип повернення `never` — він обов'язково завершується через `send_json()` або `json_error()`.

:::caution[Попередження PHP ламають JSON]
Якщо PHP виведе `Warning: Undefined array key...` прямо у відповідь, клієнт отримає не JSON, а `<br /><b>Warning</b>...{"data":...}`, і `response.json()` у браузері впаде з `SyntaxError`. Під час розробки це навіть корисно — одразу видно проблему. На продакшні виведення помилок вимикаємо (П14).
:::

### Крок 5. GET: список і один пост

```php title="api/posts.php (обробники GET)"
function list_posts(PostRepository $repo): never
{
    $q       = trim((string) ($_GET['q'] ?? ''));
    $perPage = min(MAX_PER_PAGE, max(1, (int) ($_GET['per_page'] ?? 10)));
    $page    = max(1, (int) ($_GET['page'] ?? 1));

    $total = $repo->count($q);
    $posts = $repo->all($q, $perPage, ($page - 1) * $perPage);

    send_json([
        'data' => array_map(present_post(...), $posts),
        'meta' => [
            'total'    => $total,
            'page'     => $page,
            'per_page' => $perPage,
            'pages'    => (int) ceil($total / $perPage),
        ],
    ]);
}

function show_post(PostRepository $repo, int $id): never
{
    $post = $repo->find($id) ?? json_error(404, 'Пост не знайдено');
    send_json(['data' => present_post($post)]);
}
```

- `MAX_PER_PAGE` (50) не дає клієнту запросити `?per_page=1000000` і «покласти» сервер.
- `present_post(...)` — синтаксис **first-class callable** (PHP 8.1): створює замикання з функції для `array_map`.

Функція `present_post()` перетворює рядок БД на **публічне представлення** ресурсу. Це окремий шар: ми самі вирішуємо, які поля і в якому форматі бачить клієнт, і змінювати таблицю можемо, не ламаючи API.

```php title="api/posts.php (представлення поста)"
function present_post(array $row): array
{
    return [
        'id'             => (int) $row['id'],
        'title'          => $row['title'],
        'body'           => $row['body'],
        'author'         => $row['author_name'],
        'user_id'        => $row['user_id'] !== null ? (int) $row['user_id'] : null,
        'comments_count' => (int) $row['comments_count'],
        'created_at'     => date(DATE_ATOM, strtotime($row['created_at'])), // ISO 8601
    ];
}
```

Формат дати ISO 8601 (`2026-04-02T10:15:00+03:00`) — стандарт для API: JavaScript розбирає його через `new Date(...)` без додаткових бібліотек.

Перевірте в браузері:

- `http://localhost/mini-blog/api/posts.php` — список постів у JSON;
- `...api/posts.php?page=2&per_page=2` — друга сторінка по 2;
- `...api/posts.php?q=php` — пошук;
- `...api/posts.php?id=1` — один пост;
- `...api/posts.php?id=99999` — `{"error":"Пост не знайдено"}` зі статусом 404 (перевірте статус у DevTools → Network).

Chrome і Firefox мають вбудований переглядач JSON — відповідь буде гарно відформатована.

### Крок 6. POST: створення поста

Для змінювальних операцій потрібні ще три допоміжні функції — читання JSON-тіла, безпечне отримання рядкового поля і перевірка автентифікації:

```php title="api/posts.php (читання запиту)"
// Прочитати JSON-тіло запиту як асоціативний масив
function read_json_body(): array
{
    $contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
    if (!str_starts_with($contentType, 'application/json')) {
        json_error(415, 'Очікується Content-Type: application/json');
    }

    try {
        $data = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        json_error(400, 'Некоректний JSON у тілі запиту');
    }

    if (!is_array($data)) {
        json_error(400, "Тіло запиту має бути JSON-об'єктом");
    }
    return $data;
}

// Рядкове поле з JSON (обрізане) або null, якщо поля немає чи воно не рядок
function input_string(array $input, string $key): ?string
{
    return is_string($input[$key] ?? null) ? trim($input[$key]) : null;
}

// Користувач із сесії або відповідь 401
function require_api_user(): array
{
    return current_user() ?? json_error(401, 'Потрібна автентифікація');
}
```

Чому `input_string()` перевіряє тип: у JSON клієнт може надіслати `"title": ["масив"]` або `"title": 42`. Приведення `(string)` масиву дало б рядок `"Array"` з попередженням, а `trim()` масиву — `TypeError` при `strict_types`. Перевірка `is_string` робить API передбачуваним.

Тепер обробник:

```php title="api/posts.php (POST)"
function create_post(PostRepository $repo): never
{
    $user  = require_api_user();
    $input = read_json_body();

    $title = input_string($input, 'title') ?? '';
    $body  = input_string($input, 'body') ?? '';

    $errors = validate_post($title, $body); // та сама валідація, що й у формі
    if ($errors !== []) {
        json_error(422, 'Помилки валідації', ['errors' => $errors]);
    }

    $newId = $repo->create($user['id'], $title, $body);

    header('Location: ' . $_SERVER['SCRIPT_NAME'] . '?id=' . $newId);
    send_json(['data' => present_post($repo->find($newId))], 201);
}
```

Зверніть увагу, що валідацію ми **повторно використали** — `validate_post()` з `includes/posts.php`. Правила для форми і для API однакові й описані в одному місці.

З браузерного рядка адреси POST-запит не надіслати — перевіримо його на кроці 9.

### Крок 7. PUT і PATCH: оновлення

`PUT` замінює ресурс повністю — потрібні **обидва** поля. `PATCH` змінює лише передані поля. Один обробник з параметром `$partial` обслуговує обидва методи:

```php title="api/posts.php (PUT і PATCH)"
function update_post(PostRepository $repo, int $id, bool $partial): never
{
    require_api_user();
    $post = $repo->find($id) ?? json_error(404, 'Пост не знайдено');
    if (!can_manage_post($post)) {
        json_error(403, 'Змінювати пост може лише його автор');
    }

    $input = read_json_body();
    $title = input_string($input, 'title');
    $body  = input_string($input, 'body');

    if (!$partial && ($title === null || $body === null)) {
        json_error(422, 'PUT вимагає повного набору полів: title і body');
    }
    if ($title === null && $body === null) {
        json_error(422, 'Немає полів для оновлення');
    }

    // Валідуємо підсумковий стан: нові значення + незмінені старі
    $errors = validate_post($title ?? $post['title'], $body ?? $post['body']);
    if ($errors !== []) {
        json_error(422, 'Помилки валідації', ['errors' => $errors]);
    }

    $repo->update($id, array_filter(
        ['title' => $title, 'body' => $body],
        fn(?string $value): bool => $value !== null,
    ));

    send_json(['data' => present_post($repo->find($id))]);
}
```

Порядок перевірок не випадковий: **401** (хто ви?) → **404** (чи існує?) → **403** (чи ваше?) → **422** (чи коректні дані?). Функція `can_manage_post()` — та сама, що захищає `edit.php` з П10.

### Крок 8. DELETE і непідтримувані методи

```php title="api/posts.php (DELETE і 405)"
function delete_post(PostRepository $repo, int $id): never
{
    require_api_user();
    $post = $repo->find($id) ?? json_error(404, 'Пост не знайдено');
    if (!can_manage_post($post)) {
        json_error(403, 'Видаляти пост може лише його автор');
    }

    $repo->delete($id);
    send_json(null, 204); // успіх без тіла
}

function method_not_allowed(?int $id): never
{
    header('Allow: ' . ($id === null ? 'GET, POST, OPTIONS' : 'GET, PUT, PATCH, DELETE, OPTIONS'));
    json_error(405, 'Метод не дозволено');
}
```

Зберіть `api/posts.php` повністю за лістингом з **додатка** — там усі фрагменти разом, у правильному порядку, з підключенням файлів і CORS.

### Крок 9. Тестування через curl

`curl` — консольний HTTP-клієнт. Основні параметри: `-i` — показати заголовки відповіді, `-X` — метод, `-H` — заголовок запиту, `-d` — тіло, `-b` — кукі.

```bash
# Список постів (з заголовками відповіді)
curl -i "http://localhost/mini-blog/api/posts.php?per_page=2"

# Один пост і неіснуючий пост
curl -i "http://localhost/mini-blog/api/posts.php?id=1"
curl -i "http://localhost/mini-blog/api/posts.php?id=99999"

# Створення без входу → 401
curl -i -X POST "http://localhost/mini-blog/api/posts.php" \
  -H "Content-Type: application/json" \
  -d '{"title":"Тест","body":"Текст тестового поста"}'
```

Для змінювальних запитів потрібна сесія. Найпростіше — «позичити» її в браузера: увійдіть у блог, у DevTools → **Application → Cookies** скопіюйте значення `MINIBLOGSESS` і передайте його через `-b`:

```bash
SESSION="вставте-значення-кукі"

# Створення → 201 і заголовок Location
curl -i -X POST "http://localhost/mini-blog/api/posts.php" \
  -b "MINIBLOGSESS=$SESSION" \
  -H "Content-Type: application/json" \
  -d '{"title":"Пост через API","body":"Створено без жодної HTML-форми"}'

# Помилка валідації → 422 з errors
curl -i -X POST "http://localhost/mini-blog/api/posts.php" \
  -b "MINIBLOGSESS=$SESSION" -H "Content-Type: application/json" \
  -d '{"title":"","body":"коротко"}'

# Часткове оновлення (підставте id створеного поста)
curl -i -X PATCH "http://localhost/mini-blog/api/posts.php?id=12" \
  -b "MINIBLOGSESS=$SESSION" -H "Content-Type: application/json" \
  -d '{"title":"Новий заголовок"}'

# Видалення → 204
curl -i -X DELETE "http://localhost/mini-blog/api/posts.php?id=12" -b "MINIBLOGSESS=$SESSION"
```

:::caution[curl у Windows]
У **PowerShell** `curl` може бути псевдонімом `Invoke-WebRequest` — викликайте явно `curl.exe`. Одинарні лапки навколо JSON у `cmd.exe` не працюють: використовуйте подвійні з екрануванням (`-d "{\"title\":\"Тест\"}"`) або збережіть тіло у файл і передайте `-d @body.json`. Перенесення рядків `\` — синтаксис bash; у PowerShell — зворотний апостроф `` ` ``, у `cmd` — `^`. Кирилиця в консолі Windows іноді псується — тоді зручніше тестувати через Thunder Client.
:::

Заповніть таблицю перевірки:

| Запит | Очікуваний статус |
|---|---|
| `GET` список | 200 |
| `GET ?id=99999` | 404 |
| `GET ?id=abc` | 400 |
| `POST` без кукі | 401 |
| `POST` без заголовка `Content-Type` | 415 |
| `POST` з `-d '{bad json'` | 400 |
| `POST` з порожнім заголовком | 422 |
| `POST` коректний | 201 + `Location` |
| `PUT` лише з `title` | 422 |
| `PATCH`/`DELETE` чужого поста (сесія іншого користувача) | 403 |
| `DELETE` свого поста | 204 |
| `DELETE` без `?id=` | 405 + `Allow` |

### Крок 10. Thunder Client або Postman

Графічні клієнти зручніші для щоденної роботи з API: історія запитів, колекції, зручний редактор JSON.

1. Встановіть розширення **Thunder Client** у VS Code (значок блискавки на бічній панелі) або відкрийте Postman.
2. **New Request** → метод `GET`, адреса `http://localhost/mini-blog/api/posts.php` → **Send**. Праворуч — статус, час відповіді, тіло й заголовки.
3. Для `POST`: метод `POST`, вкладка **Body → JSON**, введіть `{"title": "З Thunder Client", "body": "Перевіряємо API з VS Code"}`. Заголовок `Content-Type: application/json` додасться автоматично.
4. Вкладка **Headers** → додайте `Cookie: MINIBLOGSESS=<значення з браузера>` → **Send** → має бути `201 Created`.
5. Збережіть запити в колекцію **Mini-blog API** (кнопка **Save** → нова колекція): GET-список, GET-один, POST, PATCH, DELETE. Колекцію можна експортувати в JSON і здати разом зі звітом.

### Крок 11. Клієнт на fetch: `api-demo.html`

Створимо в корені проєкту статичну сторінку, яка працює з постами **лише через API**, як це робив би React-фронтенд. Сторінка відкривається з того самого походження (origin), що й API, тому браузер автоматично додає сесійну кукі до запитів.

```html title="api-demo.html"
<!doctype html>
<html lang="uk">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Міні-блог — API demo</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; }
    form { display: grid; gap: .5rem; margin-bottom: 2rem; }
    .post { border: 1px solid #cbd5e1; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
    .meta { color: #64748b; font-size: .9rem; }
    .error { color: #b91c1c; white-space: pre-line; }
  </style>
</head>
<body>
  <h1>Пости через REST API</h1>

  <form id="create-form">
    <input name="title" placeholder="Заголовок" maxlength="200">
    <textarea name="body" rows="4" placeholder="Текст поста"></textarea>
    <button type="submit">Створити через API</button>
    <p id="form-message" class="error"></p>
  </form>

  <div id="posts">Завантаження…</div>

  <script type="module">
    const API = 'api/posts.php';
    const postsBox = document.querySelector('#posts');
    const form = document.querySelector('#create-form');
    const message = document.querySelector('#form-message');

    // Обгортка над fetch: JSON у обидва боки, помилки HTTP → винятки
    async function api(url, options = {}) {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        ...options,
      });
      const data = response.status === 204 ? null : await response.json();
      if (!response.ok) {
        const error = new Error(data?.error ?? `HTTP ${response.status}`);
        error.details = data?.errors ?? {};
        throw error;
      }
      return data;
    }

    function renderPost(post) {
      const article = document.createElement('article');
      article.className = 'post';

      const title = document.createElement('h2');
      title.textContent = post.title;          // textContent, НЕ innerHTML — захист від XSS

      const meta = document.createElement('p');
      meta.className = 'meta';
      meta.textContent = `${post.author} · ${new Date(post.created_at).toLocaleString('uk-UA')} · 💬 ${post.comments_count}`;

      const body = document.createElement('p');
      body.textContent = post.body;

      const del = document.createElement('button');
      del.textContent = 'Видалити';
      del.addEventListener('click', async () => {
        if (!confirm('Видалити пост?')) return;
        try {
          await api(`${API}?id=${post.id}`, { method: 'DELETE' });
          await loadPosts();
        } catch (error) {
          alert(error.message);                // 401 або 403 — покажемо причину
        }
      });

      article.append(title, meta, body, del);
      return article;
    }

    async function loadPosts() {
      try {
        const { data, meta } = await api(`${API}?per_page=20`);
        postsBox.replaceChildren(...data.map(renderPost));
        document.title = `Міні-блог — ${meta.total} постів`;
      } catch (error) {
        postsBox.textContent = `Помилка: ${error.message}`;
      }
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      message.textContent = '';
      const payload = Object.fromEntries(new FormData(form));

      try {
        await api(API, { method: 'POST', body: JSON.stringify(payload) });
        form.reset();
        await loadPosts();
      } catch (error) {
        message.textContent = [error.message, ...Object.values(error.details)].join('\n');
      }
    });

    loadPosts();
  </script>
</body>
</html>
```

Відкрийте `http://localhost/mini-blog/api-demo.html`:

1. Без входу: список видно, а створення дає «Потрібна автентифікація» (401).
2. Увійдіть у блог у сусідній вкладці, поверніться і створіть пост — він з'явиться в списку без перезавантаження сторінки.
3. Спробуйте видалити чужий пост — повідомлення 403.
4. Створіть пост із заголовком `<img src=x onerror=alert(1)>` — на сторінці він відобразиться як текст, бо ми використовуємо `textContent`.

У вкладці DevTools → **Network** подивіться запити до `posts.php`: метод, статус, заголовки, тіло (`Payload`) і відповідь (`Response`).

### Крок 12. CORS: доступ з іншого походження

**Походження** (origin) — це схема + домен + порт: `http://localhost` і `http://localhost:5173` — різні походження. За **політикою одного походження** (Same-Origin Policy) браузер не дає JavaScript зі сторінки одного походження читати відповіді іншого. Якщо в майбутньому React-застосунок на Vite (`http://localhost:5173`) звертатиметься до нашого API на `http://localhost`, браузер заблокує відповідь з помилкою `blocked by CORS policy`.

**CORS** (Cross-Origin Resource Sharing) — механізм, яким **сервер** дозволяє певним походженням доступ до себе через заголовки відповіді. Для «непростих» запитів (`PUT`, `PATCH`, `DELETE`, або `POST` з `Content-Type: application/json`) браузер спершу надсилає **попередній запит** (preflight) методом `OPTIONS` і продовжує, лише якщо сервер відповів дозволом.

За це відповідає такий блок на початку основної частини `api/posts.php` (одразу після заголовка `Content-Type`; у повному лістингу з додатка він уже є, а константа `ALLOWED_ORIGINS` оголошена вгорі файлу):

```php title="api/posts.php (CORS)"
// Походження, яким дозволено звертатися до API з браузера
const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, ALLOWED_ORIGINS, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');   // дозволити кукі
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Vary: Origin');                              // відповідь залежить від Origin
}

// Preflight: лише заголовки, без тіла
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    send_json(null, 204);
}
```

| Заголовок | Значення |
|---|---|
| `Access-Control-Allow-Origin` | Яке походження може читати відповідь |
| `Access-Control-Allow-Credentials: true` | Дозволити надсилати кукі (на клієнті — `fetch(url, { credentials: 'include' })`) |
| `Access-Control-Allow-Methods` | Дозволені методи (для preflight) |
| `Access-Control-Allow-Headers` | Дозволені заголовки запиту (для preflight) |

:::danger[`Access-Control-Allow-Origin: *` разом із кукі]
Зірочка означає «будь-який сайт». Разом з кукі браузер її не прийме, а спроба «обійти» це, віддзеркалюючи будь-який `Origin` без перевірки, дозволить **будь-якому** сайту від імені вашого користувача створювати й видаляти пости. Дозволяйте лише конкретні походження з білого списку.
:::

:::note[Чому API без CSRF-токена все одно захищене]
HTML-форма на чужому сайті не може надіслати `Content-Type: application/json`, а наш API без нього відповідає 415. `fetch` з JSON або методом `DELETE` з чужого сайту викликає preflight, який не пройде перевірку `ALLOWED_ORIGINS`. Плюс сесійна кукі має `SameSite=Lax`. Разом ці заходи закривають CSRF для API без окремого токена. Детально — у лекції 13.
:::

Перевірити preflight можна через curl:

```bash
curl -i -X OPTIONS "http://localhost/mini-blog/api/posts.php" \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: DELETE"
# HTTP/1.1 204 No Content
# Access-Control-Allow-Origin: http://localhost:5173
# ...

curl -i -X OPTIONS "http://localhost/mini-blog/api/posts.php" -H "Origin: https://evil.example"
# 204, але БЕЗ заголовків Access-Control-* → браузер заблокує запит
```

**Результат роботи:** «Міні-блог» має REST API `api/posts.php` з повним набором операцій над постами, правильними кодами статусів і JSON-відповідями. Доступ до БД інкапсульовано в класах `App\Database` і `App\PostRepository` з автозавантаженням; змінювальні операції доступні лише автору через сесію; налаштовано CORS для фронтенду на іншому порту.

## Завдання для самостійного виконання

1. ★ Додайте до `GET`-списку параметр `?sort=old|new|title` (через білий список у `PostRepository::all()`).
2. ★ Додайте до відповіді `GET ?id=` масив коментарів поста: метод `PostRepository::comments(int $postId): array` і ключ `comments` у JSON.
3. ★★ Створіть `api/comments.php`: `GET ?post_id=` — коментарі поста, `POST` — додати коментар (JSON: `post_id`, `body`; автор — ім'я користувача з сесії, або 401). Перевірте, що для неіснуючого поста повертається 404, а не помилка зовнішнього ключа 500.
4. ★★ Переведіть `index.php` і `post.php` на `PostRepository` замість прямих SQL-запитів. Скільки рядків коду вдалося прибрати?
5. ★★★ **Автентифікація токеном.** Мобільний застосунок не має зручних кукі, тому API часто використовують токени. Створіть таблицю `api_tokens(id, user_id FK, token_hash CHAR(64) UNIQUE, created_at)` і `api/token.php`: `POST` з `{"email","password"}` перевіряє пароль, генерує `bin2hex(random_bytes(32))`, зберігає в БД **SHA-256 хеш** токена (`hash('sha256', $token)`) і повертає сам токен один раз. У `api/posts.php` функція `require_api_user()` має приймати також заголовок `Authorization: Bearer <токен>` (`$_SERVER['HTTP_AUTHORIZATION']`; для Apache може знадобитися рядок `CGIPassAuth On` у `.htaccess`). Поясніть у звіті, чому в БД зберігаємо хеш, а не сам токен.

## Контрольні питання

1. Що таке ресурс у REST? Чому `DELETE /api/posts/5` краще за `GET /api/deletePost?id=5`?
2. Які HTTP-методи безпечні, а які ідемпотентні? Чи ідемпотентний `POST`? Чому?
3. Чим відрізняються `PUT` і `PATCH`? Як це враховано в `update_post()`?
4. Коли повертати 401, а коли 403? Чим 400 відрізняється від 422?
5. Чому JSON-тіло запиту не потрапляє в `$_POST`? Як його прочитати?
6. Навіщо прапорці `JSON_UNESCAPED_UNICODE` і `JSON_THROW_ON_ERROR`?
7. Навіщо метод `update()` фільтрує ключі через `array_intersect_key` з білим списком?
8. Що таке впровадження залежностей на прикладі `PostRepository`? Що дає виклик `db()` через `Database::connection()`?
9. Чому на сторінці `api-demo.html` дані виводяться через `textContent`, а не `innerHTML`?
10. Що таке походження (origin), CORS і preflight-запит? Чому не можна відповідати `Access-Control-Allow-Origin` будь-якому `Origin`?

## Домашнє завдання

1. Створіть у Thunder Client або Postman колекцію з щонайменше 8 запитів, що покривають усі статуси з таблиці кроку 9, і експортуйте її у файл `mini-blog-api.json`.
2. Напишіть коротку документацію API у `api/README.md`: для кожної операції — метод, адреса, параметри, приклад тіла запиту, приклад відповіді і можливі коди статусів.
3. Додайте на `api-demo.html` пошук: поле введення, що при натисканні Enter перезавантажує список з параметром `?q=`.

## Що здати

- Файли `src/autoload.php`, `src/Database.php`, `src/PostRepository.php`, `includes/db.php`, `api/posts.php`, `api-demo.html`.
- Скриншоти (або текстовий лог) curl-запитів з таблиці кроку 9 з видимими статусами.
- Експорт колекції Thunder Client/Postman.
- Скриншот DevTools → Network із запитами `api-demo.html` до API.
- Відповіді на контрольні питання.

## Додаток: повні лістинги

### `src/Database.php`

```php title="src/Database.php"
<?php
declare(strict_types=1);

namespace App;

use PDO;

/**
 * Єдине з'єднання з базою даних на весь запит.
 */
final class Database
{
    private static ?PDO $connection = null;

    // Створювати об'єкти класу не потрібно — лише статичний доступ
    private function __construct() {}

    public static function connection(): PDO
    {
        if (self::$connection === null) {
            $config = (require __DIR__ . '/../config.php')['db'];

            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=%s',
                $config['host'],
                $config['port'],
                $config['name'],
                $config['charset'],
            );

            self::$connection = new PDO($dsn, $config['user'], $config['pass'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        }

        return self::$connection;
    }
}
```

### `src/PostRepository.php`

```php title="src/PostRepository.php"
<?php
declare(strict_types=1);

namespace App;

use PDO;

/**
 * Доступ до таблиці posts. Уся робота з SQL для постів — тут.
 */
final class PostRepository
{
    // Стовпці, які дозволено змінювати методом update()
    private const UPDATABLE = ['title', 'body'];

    // Спільна вибірка: пост + ім'я автора + кількість коментарів
    private const SELECT_POSTS = "
        SELECT p.id, p.user_id, p.title, p.body, p.created_at,
               COALESCE(u.name, p.author, 'Анонім') AS author_name,
               (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count
        FROM posts p
        LEFT JOIN users u ON u.id = p.user_id";

    public function __construct(private PDO $pdo) {}

    /**
     * Сторінка постів (нові спочатку) з необов'язковим пошуком.
     *
     * @return list<array<string, mixed>>
     */
    public function all(string $search = '', int $limit = 10, int $offset = 0): array
    {
        [$where, $params] = $this->searchCondition($search);

        $stmt = $this->pdo->prepare(
            self::SELECT_POSTS . " {$where}
             ORDER BY p.created_at DESC, p.id DESC
             LIMIT :limit OFFSET :offset"
        );
        foreach ($params as $name => $value) {
            $stmt->bindValue($name, $value);
        }
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Кількість постів, що відповідають пошуку
    public function count(string $search = ''): int
    {
        [$where, $params] = $this->searchCondition($search);

        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM posts p {$where}");
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    // Один пост або null
    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare(self::SELECT_POSTS . ' WHERE p.id = :id');
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    // Створити пост; повертає id нового запису
    public function create(int $userId, string $title, string $body): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO posts (user_id, title, body) VALUES (:user_id, :title, :body)'
        );
        $stmt->execute(['user_id' => $userId, 'title' => $title, 'body' => $body]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Оновити передані поля поста (часткове оновлення).
     *
     * @param array<string, string> $fields наприклад ['title' => 'Новий заголовок']
     */
    public function update(int $id, array $fields): void
    {
        // Білий список: у SQL потрапляють лише відомі імена стовпців
        $fields = array_intersect_key($fields, array_flip(self::UPDATABLE));
        if ($fields === []) {
            return;
        }

        $set = implode(', ', array_map(
            fn(string $column): string => "{$column} = :{$column}",
            array_keys($fields),
        ));

        $stmt = $this->pdo->prepare("UPDATE posts SET {$set} WHERE id = :id");
        $stmt->execute([...$fields, 'id' => $id]);
    }

    // Видалити пост (коментарі видалить ON DELETE CASCADE); true, якщо рядок був
    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM posts WHERE id = :id');
        $stmt->execute(['id' => $id]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Частина WHERE для пошуку і її параметри.
     *
     * @return array{0: string, 1: array<string, string>}
     */
    private function searchCondition(string $search): array
    {
        if ($search === '') {
            return ['', []];
        }

        $like = '%' . $search . '%';

        return ['WHERE p.title LIKE :q1 OR p.body LIKE :q2', ['q1' => $like, 'q2' => $like]];
    }
}
```

### `api/posts.php`

```php title="api/posts.php"
<?php
declare(strict_types=1);

/*
 * REST API постів «Міні-блогу»
 *   GET    /api/posts.php                 список (?q=, ?page=, ?per_page=)
 *   GET    /api/posts.php?id=5            один пост
 *   POST   /api/posts.php                 створити (JSON), потрібен вхід
 *   PUT    /api/posts.php?id=5            замінити title і body (лише автор)
 *   PATCH  /api/posts.php?id=5            змінити частину полів (лише автор)
 *   DELETE /api/posts.php?id=5            видалити (лише автор)
 */

use App\Database;
use App\PostRepository;

require __DIR__ . '/../includes/helpers.php';    // сесія, current_user(), can_manage_post()
require_once __DIR__ . '/../includes/posts.php'; // validate_post(), request_id()
require_once __DIR__ . '/../src/autoload.php';

const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const MAX_PER_PAGE = 50;

// ===================== Допоміжні функції =====================

// Відправити JSON-відповідь і завершити скрипт
function send_json(mixed $data, int $status = 200): never
{
    http_response_code($status);
    if ($status !== 204) {
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }
    exit;
}

// Відповідь з помилкою: {"error": "...", ...додаткові поля}
function json_error(int $status, string $message, array $extra = []): never
{
    send_json(['error' => $message] + $extra, $status);
}

// Прочитати JSON-тіло запиту як асоціативний масив
function read_json_body(): array
{
    $contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
    if (!str_starts_with($contentType, 'application/json')) {
        json_error(415, 'Очікується Content-Type: application/json');
    }

    try {
        $data = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        json_error(400, 'Некоректний JSON у тілі запиту');
    }

    if (!is_array($data)) {
        json_error(400, "Тіло запиту має бути JSON-об'єктом");
    }
    return $data;
}

// Рядкове поле з JSON (обрізане) або null, якщо поля немає чи воно не рядок
function input_string(array $input, string $key): ?string
{
    return is_string($input[$key] ?? null) ? trim($input[$key]) : null;
}

// Користувач із сесії або відповідь 401
function require_api_user(): array
{
    return current_user() ?? json_error(401, 'Потрібна автентифікація');
}

// Рядок БД → публічне представлення поста
function present_post(array $row): array
{
    return [
        'id'             => (int) $row['id'],
        'title'          => $row['title'],
        'body'           => $row['body'],
        'author'         => $row['author_name'],
        'user_id'        => $row['user_id'] !== null ? (int) $row['user_id'] : null,
        'comments_count' => (int) $row['comments_count'],
        'created_at'     => date(DATE_ATOM, strtotime($row['created_at'])),
    ];
}

// ===================== Обробники =====================

function list_posts(PostRepository $repo): never
{
    $q       = trim((string) ($_GET['q'] ?? ''));
    $perPage = min(MAX_PER_PAGE, max(1, (int) ($_GET['per_page'] ?? 10)));
    $page    = max(1, (int) ($_GET['page'] ?? 1));

    $total = $repo->count($q);
    $posts = $repo->all($q, $perPage, ($page - 1) * $perPage);

    send_json([
        'data' => array_map(present_post(...), $posts),
        'meta' => [
            'total'    => $total,
            'page'     => $page,
            'per_page' => $perPage,
            'pages'    => (int) ceil($total / $perPage),
        ],
    ]);
}

function show_post(PostRepository $repo, int $id): never
{
    $post = $repo->find($id) ?? json_error(404, 'Пост не знайдено');
    send_json(['data' => present_post($post)]);
}

function create_post(PostRepository $repo): never
{
    $user  = require_api_user();
    $input = read_json_body();

    $title = input_string($input, 'title') ?? '';
    $body  = input_string($input, 'body') ?? '';

    $errors = validate_post($title, $body);
    if ($errors !== []) {
        json_error(422, 'Помилки валідації', ['errors' => $errors]);
    }

    $newId = $repo->create($user['id'], $title, $body);

    header('Location: ' . $_SERVER['SCRIPT_NAME'] . '?id=' . $newId);
    send_json(['data' => present_post($repo->find($newId))], 201);
}

function update_post(PostRepository $repo, int $id, bool $partial): never
{
    require_api_user();
    $post = $repo->find($id) ?? json_error(404, 'Пост не знайдено');
    if (!can_manage_post($post)) {
        json_error(403, 'Змінювати пост може лише його автор');
    }

    $input = read_json_body();
    $title = input_string($input, 'title');
    $body  = input_string($input, 'body');

    if (!$partial && ($title === null || $body === null)) {
        json_error(422, 'PUT вимагає повного набору полів: title і body');
    }
    if ($title === null && $body === null) {
        json_error(422, 'Немає полів для оновлення');
    }

    $errors = validate_post($title ?? $post['title'], $body ?? $post['body']);
    if ($errors !== []) {
        json_error(422, 'Помилки валідації', ['errors' => $errors]);
    }

    $repo->update($id, array_filter(
        ['title' => $title, 'body' => $body],
        fn(?string $value): bool => $value !== null,
    ));

    send_json(['data' => present_post($repo->find($id))]);
}

function delete_post(PostRepository $repo, int $id): never
{
    require_api_user();
    $post = $repo->find($id) ?? json_error(404, 'Пост не знайдено');
    if (!can_manage_post($post)) {
        json_error(403, 'Видаляти пост може лише його автор');
    }

    $repo->delete($id);
    send_json(null, 204);
}

function method_not_allowed(?int $id): never
{
    header('Allow: ' . ($id === null ? 'GET, POST, OPTIONS' : 'GET, PUT, PATCH, DELETE, OPTIONS'));
    json_error(405, 'Метод не дозволено');
}

// ===================== Основна частина =====================

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// CORS: лише для походжень з білого списку
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, ALLOWED_ORIGINS, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Vary: Origin');
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    send_json(null, 204); // preflight
}

$id = request_id($_GET);
if (isset($_GET['id']) && $id === null) {
    json_error(400, 'Некоректний id');
}

try {
    $repo = new PostRepository(Database::connection());

    match (true) {
        $method === 'GET' && $id === null    => list_posts($repo),
        $method === 'GET'                    => show_post($repo, $id),
        $method === 'POST' && $id === null   => create_post($repo),
        $method === 'PUT' && $id !== null    => update_post($repo, $id, partial: false),
        $method === 'PATCH' && $id !== null  => update_post($repo, $id, partial: true),
        $method === 'DELETE' && $id !== null => delete_post($repo, $id),
        default                              => method_not_allowed($id),
    };
} catch (Throwable $ex) {
    error_log((string) $ex);
    json_error(500, 'Внутрішня помилка сервера');
}
```
