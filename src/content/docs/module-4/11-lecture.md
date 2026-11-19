---
title: "Основи ООП у PHP"
description: "Класи й об'єкти, інкапсуляція, конструктори та readonly-властивості, статичні члени, наслідування, абстрактні класи, інтерфейси, трейти, перелічення, винятки, простори імен і автозавантаження — і як усе це застосувати в «Міні-блозі»."
type: lecture
pair: 11
topic: 67
---

## Мета заняття

- Зрозуміти, навіщо потрібне об'єктно-орієнтоване програмування (ООП) і чим воно відрізняється від процедурного стилю, у якому написаний наш «Міні-блог».
- Навчитися описувати класи з типізованими властивостями, методами, конструкторами та модифікаторами видимості.
- Опанувати сучасні можливості PHP 8: просування властивостей у конструкторі (constructor promotion), `readonly`, перелічення (`enum`), іменовані аргументи.
- Розібратися з наслідуванням, абстрактними класами, інтерфейсами, трейтами й поліморфізмом.
- Навчитися створювати власні винятки та обробляти помилки через `try/catch`.
- Зрозуміти простори імен (namespaces) і автозавантаження класів (`spl_autoload_register`, PSR-4, Composer).
- Підготуватися до практичної 12: класи `Database` і `PostRepository` для REST API.

## План лекції

1. Від функцій до об'єктів: навіщо ООП.
2. Класи та об'єкти. Інкапсуляція.
3. Конструктор, просування властивостей, `readonly`.
4. Статичні члени, константи, фабричні методи.
5. Наслідування й абстрактні класи.
6. Інтерфейси й поліморфізм. Трейти.
7. Перелічення (enum).
8. Винятки.
9. Простори імен і автозавантаження.
10. ООП у «Міні-блозі»: патерн «Репозиторій».

## 1. Від функцій до об'єктів

Подивіться на наш «Міні-блог» після П10. Код працює, але має характерні для процедурного стилю риси:

- Дані поста — це асоціативний масив `$post['title']`. Опечатка `$post['tittle']` дасть лише попередження і `null`, а IDE не підкаже, які ключі взагалі існують.
- Функції `find_post()`, `validate_post()`, `db()` лежать у глобальному просторі. Ніщо не заважає оголосити в іншому файлі ще одну `db()` — і отримати `Cannot redeclare`.
- `db()` прихована всередині кожної функції: щоб протестувати `find_post()` на тестовій базі, доведеться змінювати код.

**Об'єктно-орієнтоване програмування** (object-oriented programming, OOP) пропонує інший спосіб організації: дані й функції, що з ними працюють, об'єднуються в **об'єкти**. Об'єкт — це «річ», яка має **стан** (властивості) і **поведінку** (методи) та сама відповідає за коректність свого стану.

| | Процедурний стиль | ООП |
|---|---|---|
| Одиниця коду | Функція | Клас (дані + методи) |
| Дані | Масиви, передаються у функції | Властивості об'єкта |
| Захист даних | Немає: будь-хто змінює будь-який ключ масиву | Видимість `private`/`protected`, перевірки в конструкторі |
| Повторне використання | Копіювання, підключення файлів з функціями | Наслідування, композиція, інтерфейси |
| Підміна реалізації | Зміна коду функції | Інша реалізація того самого інтерфейсу |
| Підходить для | Невеликих скриптів | Середніх і великих застосунків, фреймворків |

Чотири класичні принципи ООП, які ми розглянемо:

1. **Інкапсуляція** (encapsulation) — приховування внутрішнього стану і доступ до нього лише через методи.
2. **Наслідування** (inheritance) — створення нового класу на основі існуючого.
3. **Поліморфізм** (polymorphism) — однаковий інтерфейс для різних реалізацій.
4. **Абстракція** (abstraction) — виділення суттєвого і приховування деталей.

Усі сучасні PHP-фреймворки (Laravel, Symfony) і бібліотеки написані в об'єктному стилі, тож без ООП читати й писати сучасний PHP-код неможливо.

## 2. Класи та об'єкти

**Клас** (class) — це шаблон, опис: які властивості й методи матимуть об'єкти. **Об'єкт** (object, екземпляр — instance) — конкретний «виріб» за цим шаблоном. Як креслення будинку і будинки, побудовані за ним.

Як приклад протягом лекції візьмемо невеликий інтернет-магазин.

```php title="Product.php"
<?php
declare(strict_types=1);

class Product
{
    // Властивості (properties) — з типами
    public string $name;
    public float $price;
    public int $stock = 0; // значення за замовчуванням

    // Метод (method) — функція всередині класу
    public function isAvailable(): bool
    {
        // $this — посилання на поточний об'єкт
        return $this->stock > 0;
    }
}

$laptop = new Product();      // створення об'єкта оператором new
$laptop->name = 'Ноутбук';    // доступ до властивості через ->
$laptop->price = 25999.0;
$laptop->stock = 3;

echo $laptop->isAvailable() ? 'Є в наявності' : 'Немає'; // Є в наявності
```

Правила іменування: класи — `PascalCase` (`Product`, `PostRepository`), методи і властивості — `camelCase` (`isAvailable`, `createdAt`). За стандартом PSR-1 один клас — один файл з такою самою назвою.

### Об'єкти передаються «за дескриптором»

Масиви в PHP при присвоєнні копіюються, а об'єкти — ні: змінна містить лише **дескриптор** (handle), що вказує на об'єкт.

```php
$a = ['price' => 100];
$b = $a;          // копія масиву
$b['price'] = 50;
echo $a['price']; // 100

$p1 = new Product();
$p1->price = 100;
$p2 = $p1;        // той самий об'єкт!
$p2->price = 50;
echo $p1->price;  // 50

$p3 = clone $p1;  // справжня (поверхнева) копія
```

Тому функція, що отримала об'єкт параметром, може змінити його стан — це треба враховувати.

### Інкапсуляція і модифікатори видимості

У класі `Product` вище будь-хто може написати `$laptop->price = -500;` або `$laptop->stock = -10;`. Об'єкт не захищає свій стан. Виправимо це **модифікаторами видимості** (visibility):

| Модифікатор | Звідки доступно |
|---|---|
| `public` | Звідусіль |
| `protected` | Усередині класу і його нащадків |
| `private` | Лише всередині цього класу |

```php title="Product.php (з інкапсуляцією)"
class Product
{
    private int $stock = 0;

    public function __construct(
        public readonly string $name,
        private float $price,
    ) {
        if ($price < 0) {
            throw new InvalidArgumentException('Ціна не може бути від\'ємною');
        }
    }

    // Геттер (getter) — читання
    public function getPrice(): float
    {
        return $this->price;
    }

    // Змінювати склад можна лише через методи з перевірками
    public function addStock(int $quantity): void
    {
        if ($quantity <= 0) {
            throw new InvalidArgumentException('Кількість має бути додатною');
        }
        $this->stock += $quantity;
    }

    public function sell(int $quantity): void
    {
        if ($quantity > $this->stock) {
            throw new RuntimeException("Недостатньо товару «{$this->name}» на складі");
        }
        $this->stock -= $quantity;
    }

    public function isAvailable(): bool
    {
        return $this->stock > 0;
    }
}

$phone = new Product('Смартфон', 12999.0);
$phone->addStock(5);
$phone->sell(2);
// $phone->stock = 100;  // Error: Cannot access private property Product::$stock
```

Тепер об'єкт **гарантує інваріант** (invariant): склад ніколи не від'ємний, ціна ніколи не від'ємна. Код, що використовує клас, не може зламати ці правила — навіть випадково.

:::tip[Правило за замовчуванням]
Робіть усе `private`, а `public` — лише те, що справді потрібно зовнішньому коду. Звузити доступ пізніше важко (зламається чужий код), розширити — легко.
:::

## 3. Конструктор, просування властивостей, readonly

### Конструктор

**Конструктор** (constructor) — спеціальний метод `__construct()`, що викликається автоматично при `new`. Його завдання — привести об'єкт у коректний початковий стан. Класичний запис:

```php
class Customer
{
    private string $name;
    private string $email;

    public function __construct(string $name, string $email)
    {
        $this->name = $name;
        $this->email = $email;
    }
}
```

### Просування властивостей (constructor promotion, PHP 8.0)

Те саме коротше: якщо параметр конструктора має модифікатор видимості, PHP сам оголосить властивість і присвоїть їй значення.

```php
class Customer
{
    public function __construct(
        private string $name,
        private string $email,
        private bool $isVip = false,
    ) {}
}

// Іменовані аргументи (named arguments, PHP 8.0) — зручно, коли параметрів багато
$c = new Customer(name: 'Олена', email: 'olena@example.com', isVip: true);
```

### `readonly`-властивості (PHP 8.1) і класи (PHP 8.2)

Властивість `readonly` можна присвоїти **лише один раз** — зазвичай у конструкторі. Після цього вона доступна для читання, але не для зміни. Це ідеально для **об'єктів-значень** (value objects) — сутностей, які визначаються своїми даними: гроші, адреса, координати.

```php title="Money.php"
final readonly class Money // усі властивості класу — readonly (PHP 8.2)
{
    public function __construct(
        public int $amount,          // у копійках — без проблем з float
        public string $currency = 'UAH',
    ) {}

    public function add(Money $other): Money
    {
        if ($other->currency !== $this->currency) {
            throw new InvalidArgumentException('Різні валюти');
        }
        // не змінюємо поточний об'єкт, а повертаємо НОВИЙ
        return new Money($this->amount + $other->amount, $this->currency);
    }

    public function format(): string
    {
        return number_format($this->amount / 100, 2, ',', ' ') . ' ' . $this->currency;
    }
}

$a = new Money(1050);
$b = $a->add(new Money(250));
echo $b->format();   // 13,00 UAH
// $a->amount = 0;   // Error: Cannot modify readonly property Money::$amount
```

Незмінні (immutable) об'єкти безпечно передавати будь-куди: ніхто не змінить їх «за спиною». `public readonly` властивості не потребують геттерів — читати можна, змінювати не можна.

### Магічні методи

Методи з назвою на `__` PHP викликає автоматично в певних ситуаціях:

| Метод | Коли викликається |
|---|---|
| `__construct()` | При створенні об'єкта (`new`) |
| `__toString()` | Коли об'єкт використовують як рядок (`echo $obj`) |
| `__get($name)`, `__set($name, $value)` | Звернення до неіснуючої або недоступної властивості |
| `__call($name, $args)` | Виклик неіснуючого методу |
| `__clone()` | Після `clone $obj` |

```php
final readonly class Money
{
    // ...
    public function __toString(): string
    {
        return $this->format();
    }
}

echo new Money(9999); // 99,99 UAH
```

Магічними `__get`/`__call` не варто зловживати: вони роблять код неочевидним для IDE і колег.

## 4. Статичні члени, константи, фабричні методи

**Статичні** (static) властивості й методи належать **класу**, а не окремому об'єкту. Звертаються до них через `::`.

```php
class Order
{
    public const STATUS_NEW = 'new';      // константа класу
    private const VAT_RATE = 0.2;

    private static int $created = 0;      // спільний лічильник для всіх об'єктів

    public function __construct(public readonly Money $total)
    {
        self::$created++;                 // self:: — поточний клас
    }

    public static function createdCount(): int
    {
        return self::$created;
    }

    public function vat(): Money
    {
        return new Money((int) round($this->total->amount * self::VAT_RATE));
    }
}

new Order(new Money(10000));
new Order(new Money(5000));
echo Order::createdCount();  // 2
echo Order::STATUS_NEW;      // new
```

### Іменовані конструктори (фабричні методи)

Статичний метод, що створює об'єкт, — **фабричний метод** (factory method). Він робить код зрозумілішим, ніж конструктор з багатьма варіантами параметрів:

```php
final readonly class Money
{
    public function __construct(public int $amount, public string $currency = 'UAH') {}

    public static function fromHryvnias(float $value): static
    {
        return new static((int) round($value * 100));
    }

    public static function zero(): static
    {
        return new static(0);
    }
}

$price = Money::fromHryvnias(249.99); // amount = 24999
```

:::caution[Не зловживайте static]
Статичні властивості — це, по суті, глобальні змінні, «загорнуті» в клас. Їх важко підмінити в тестах і легко отримати приховані залежності. Доречно: константи, фабричні методи, прості лічильники. Підключення до бази як статичну властивість ми використаємо в П12 у навчальних цілях, але у великих проєктах його передають через конструктор (див. розділ 10).
:::

## 5. Наслідування й абстрактні класи

**Наслідування** дозволяє створити клас-нащадок (child, subclass), що отримує всі `public` і `protected` члени батьківського класу (parent) і може додати власні або **перевизначити** (override) наявні.

```php
class Product
{
    public function __construct(
        protected string $name,
        protected Money $price,
    ) {}

    public function getPrice(): Money
    {
        return $this->price;
    }

    public function describe(): string
    {
        return "{$this->name} — {$this->getPrice()}";
    }
}

class DigitalProduct extends Product
{
    public function __construct(
        string $name,
        Money $price,
        private string $downloadUrl,
    ) {
        parent::__construct($name, $price); // виклик конструктора батька
    }

    // Перевизначення: доповнюємо поведінку батьківського методу
    public function describe(): string
    {
        return parent::describe() . ' (електронна версія)';
    }
}

class DiscountedProduct extends Product
{
    public function __construct(string $name, Money $price, private int $percent)
    {
        parent::__construct($name, $price);
    }

    public function getPrice(): Money
    {
        return new Money(intdiv($this->price->amount * (100 - $this->percent), 100));
    }
}

$book = new DiscountedProduct('Книга «PHP 8»', new Money(50000), 20);
echo $book->describe(); // Книга «PHP 8» — 400,00 UAH
```

Зверніть увагу: `describe()` визначений у `Product`, але викликає `getPrice()` нащадка. Це і є поліморфізм у дії: метод, що викликається, визначається **фактичним** класом об'єкта.

- Ключове слово `final` перед класом забороняє від нього наслідуватися, перед методом — перевизначати метод.
- PHP підтримує лише **одиночне** наслідування: у класу один батько.

### Абстрактні класи

**Абстрактний клас** (abstract class) — це «недороблений» клас: створити його об'єкт не можна, він існує лише для наслідування. Він може містити **абстрактні методи** — без тіла, які нащадки **зобов'язані** реалізувати.

```php
abstract class Shipping
{
    // Загальний алгоритм — однаковий для всіх способів доставки
    public function cost(float $weightKg): Money
    {
        $base = $this->baseCost($weightKg);
        return $weightKg > 30 ? $base->add(new Money(10000)) : $base; // доплата за важке
    }

    // Деталь, яку визначає кожен нащадок
    abstract protected function baseCost(float $weightKg): Money;
}

final class PostOfficeShipping extends Shipping
{
    protected function baseCost(float $weightKg): Money
    {
        return new Money(6000 + (int) ceil($weightKg) * 500);
    }
}

final class PickupShipping extends Shipping
{
    protected function baseCost(float $weightKg): Money
    {
        return Money::zero();
    }
}

// new Shipping(); // Error: Cannot instantiate abstract class Shipping
```

Такий прийом називається **шаблонним методом** (template method): батько задає «скелет» алгоритму, нащадки — змінні кроки.

### Наслідування чи композиція

Наслідування — це відношення «**є**» (is-a): `DigitalProduct` **є** `Product`. Якщо відношення інше — «**має**» (has-a), — використовують **композицію**: один об'єкт зберігає інший у властивості. `Order` **має** `Money`, `Cart` **має** список `Product`. Поширена порада — «надавайте перевагу композиції над наслідуванням»: глибокі ієрархії класів крихкі, зміна батька ламає всіх нащадків.

## 6. Інтерфейси, поліморфізм, трейти

### Інтерфейси

**Інтерфейс** (interface) — це **контракт**: перелік публічних методів, які клас зобов'язується мати. Інтерфейс не містить реалізації і властивостей (лише константи).

```php
interface PaymentMethod
{
    public function pay(Money $amount): bool;
    public function title(): string;
}

final class CardPayment implements PaymentMethod
{
    public function __construct(private string $cardMask) {}

    public function pay(Money $amount): bool
    {
        // тут був би запит до платіжного шлюзу
        return true;
    }

    public function title(): string
    {
        return "Картка {$this->cardMask}";
    }
}

final class CashOnDelivery implements PaymentMethod
{
    public function pay(Money $amount): bool
    {
        return true; // оплата при отриманні
    }

    public function title(): string
    {
        return 'Готівкою при отриманні';
    }
}

// Функція залежить від КОНТРАКТУ, а не від конкретного класу
function checkout(Money $total, PaymentMethod $method): string
{
    return $method->pay($total)
        ? "Оплачено {$total} ({$method->title()})"
        : 'Оплата не пройшла';
}

echo checkout(new Money(150000), new CardPayment('**** 4242'));
echo checkout(new Money(150000), new CashOnDelivery());
```

Функція `checkout()` нічого не знає про конкретні способи оплати. Завтра додамо `ApplePayPayment implements PaymentMethod` — і `checkout()` не зміниться. Це **поліморфізм** через інтерфейси, і саме на ньому тримається розширюваність великих систем.

Клас може реалізовувати **кілька** інтерфейсів: `class X implements PaymentMethod, JsonSerializable`. Вбудований інтерфейс `JsonSerializable`, наприклад, визначає, як об'єкт перетвориться на JSON у `json_encode()` — знадобиться в API.

Перевірити, чи об'єкт реалізує інтерфейс або є екземпляром класу, можна оператором `instanceof`: `$method instanceof PaymentMethod`.

| | Абстрактний клас | Інтерфейс |
|---|---|---|
| Реалізація методів | Може містити | Ні (лише сигнатури) |
| Властивості | Так | Ні (лише константи) |
| Скільки можна «підключити» | Один (`extends`) | Багато (`implements A, B`) |
| Відношення | «є різновидом» | «вміє робити» |
| Коли обирати | Спільний код для близьких класів | Спільний контракт для різних класів |

### Трейти

**Трейт** (trait) — набір методів (і властивостей), який можна «вклеїти» в кілька класів, не пов'язаних наслідуванням. Це механізм повторного використання коду в мові з одиночним наслідуванням.

```php
trait HasTimestamps
{
    private ?DateTimeImmutable $createdAt = null;

    public function touch(): void
    {
        $this->createdAt = new DateTimeImmutable();
    }

    public function createdAt(): ?DateTimeImmutable
    {
        return $this->createdAt;
    }
}

final class Review
{
    use HasTimestamps;
    // ...
}

final class Order2
{
    use HasTimestamps;
    // ...
}
```

Трейт — це фактично «копіювання коду компілятором». Корисний для невеликих допоміжних можливостей, але велика кількість трейтів робить клас важким для розуміння.

## 7. Перелічення (enum)

До PHP 8.1 статуси зберігали рядковими константами: `'new'`, `'paid'`, `'shipped'`. Ніщо не заважало передати `'payed'` з помилкою. **Перелічення** (enumeration, `enum`) — тип з фіксованим набором можливих значень.

```php title="OrderStatus.php"
enum OrderStatus: string   // backed enum: кожен варіант має скалярне значення
{
    case New = 'new';
    case Paid = 'paid';
    case Shipped = 'shipped';
    case Cancelled = 'cancelled';

    // enum може мати методи
    public function label(): string
    {
        return match ($this) {
            self::New       => 'Новий',
            self::Paid      => 'Оплачений',
            self::Shipped   => 'Відправлений',
            self::Cancelled => 'Скасований',
        };
    }

    public function canBeCancelled(): bool
    {
        return in_array($this, [self::New, self::Paid], true);
    }
}

$status = OrderStatus::Paid;
echo $status->value;     // paid   — зберігаємо в БД
echo $status->label();   // Оплачений — показуємо користувачу

// З рядка (наприклад, з БД або запиту) — в enum
$fromDb = OrderStatus::from('shipped');        // ValueError, якщо значення невідоме
$fromGet = OrderStatus::tryFrom($_GET['status'] ?? ''); // null, якщо невідоме

function setStatus(OrderStatus $status): void { /* ... */ }
// setStatus('payed'); // TypeError — помилку видно одразу
```

Перелічення ідеальні для статусів, ролей користувачів (`Role::Admin`, `Role::Author`), типів, а `match` з enum PHP перевіряє повністю: якщо забути варіант, отримаєте `UnhandledMatchError`.

## 8. Винятки

**Виняток** (exception) — об'єкт, що описує помилкову ситуацію. Його «кидають» (`throw`), і він «спливає» стеком викликів, доки його не «спіймає» (`catch`) відповідний обробник. Якщо ніхто не спіймав — фатальна помилка `Uncaught exception`.

```php
try {
    $phone->sell(10);
    echo 'Продано';
} catch (RuntimeException $ex) {
    echo 'Не вдалося: ' . $ex->getMessage();
} finally {
    // виконується завжди: і після успіху, і після винятку
    echo ' | операцію завершено';
}
```

### Ієрархія винятків

```text
Throwable (інтерфейс)
├── Error                      ← помилки рушія: TypeError, ValueError, DivisionByZeroError...
└── Exception                  ← помилки застосунку
    ├── RuntimeException       ← помилки під час виконання
    │   └── PDOException       ← помилки бази даних
    ├── LogicException
    │   └── InvalidArgumentException
    └── JsonException
```

`catch` ловить вказаний клас **і всіх його нащадків**. Тому `catch (Exception $ex)` спіймає й `PDOException`, а `catch (Throwable $t)` — узагалі все.

### Власні винятки

Власний клас винятку робить помилки самодокументованими і дозволяє обробляти різні ситуації по-різному:

```php
final class OutOfStockException extends RuntimeException
{
    public function __construct(public readonly string $productName, int $requested)
    {
        parent::__construct("Товару «{$productName}» недостатньо (запитано {$requested})");
    }
}

final class PaymentFailedException extends RuntimeException {}

try {
    $cart->checkout();
} catch (OutOfStockException $ex) {
    // показати користувачу, якого товару бракує
    $message = $ex->getMessage();
} catch (PaymentFailedException) {   // змінну можна не вказувати (PHP 8.0)
    $message = 'Оплата не пройшла, спробуйте іншу картку';
}
```

Корисна можливість PHP 8 — `throw` як **вираз**: `$user = find_user($id) ?? throw new NotFoundException();`.

:::caution[Не «ковтайте» винятки]
`catch (Exception $e) {}` з порожнім тілом — одна з найгірших практик: помилка відбулася, але про неї ніхто не дізнається. Ловіть лише ті винятки, які **знаєте, як обробити**. Решта хай спливають до глобального обробника, який залогує помилку і покаже користувачу загальну сторінку «Щось пішло не так».
:::

## 9. Простори імен і автозавантаження

### Простори імен

У великому проєкті й сторонніх бібліотеках неминуче з'являться однакові назви: `User`, `Database`, `Logger`. **Простори імен** (namespaces) розв'язують конфлікти, як папки для файлів.

```php title="src/Shop/Product.php"
<?php
declare(strict_types=1);

namespace App\Shop;   // перший оператор файлу (після declare)

final class Product
{
    // повне ім'я класу — App\Shop\Product
}
```

```php title="index.php"
<?php
declare(strict_types=1);

use App\Shop\Product;              // імпорт — далі можна писати коротко
use App\Payment\CardPayment as Card; // псевдонім

$p = new Product(/* ... */);
$c = new Card('**** 4242');

// Вбудовані класи лежать у глобальному просторі — всередині namespace
// до них звертаються з \ або імпортують: use PDO;
$now = new \DateTimeImmutable();
```

### Автозавантаження

Якщо кожен клас — окремий файл, то писати `require` для кожного незручно. PHP дозволяє зареєструвати **автозавантажувач** (autoloader) — функцію, яку PHP викликає, коли зустрічає ще не відомий клас.

```php title="autoload.php"
<?php
declare(strict_types=1);

// Простір імен App\ відповідає папці src/
spl_autoload_register(function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return; // не наш клас — хай шукають інші автозавантажувачі
    }
    // App\Shop\Product → src/Shop/Product.php
    $relative = substr($class, strlen($prefix));
    $file = __DIR__ . '/src/' . str_replace('\\', '/', $relative) . '.php';

    if (is_file($file)) {
        require $file;
    }
});
```

Це спрощена реалізація стандарту **PSR-4**: простір імен відображається на структуру папок. На практиці автозавантажувач генерує **Composer** — менеджер залежностей PHP (аналог npm):

```json title="composer.json"
{
    "autoload": {
        "psr-4": { "App\\": "src/" }
    }
}
```

```bash
composer dump-autoload   # згенерувати vendor/autoload.php
```

Після цього в проєкті достатньо одного рядка `require __DIR__ . '/vendor/autoload.php';`, і всі класи `App\...` та всі встановлені бібліотеки завантажуватимуться автоматично. У «Міні-блозі» ми обійдемося власним `spl_autoload_register`, щоб не встановлювати Composer.

## 10. ООП у «Міні-блозі»: патерн «Репозиторій»

Застосуємо вивчене до нашого проєкту. Зараз SQL-запити до таблиці `posts` розкидані по `index.php`, `post.php`, `create.php`, `edit.php`, `delete.php`, а в П12 до них додасться ще й API. Логічно зібрати всю роботу з постами в одному місці.

**Репозиторій** (Repository) — клас, що інкапсулює доступ до даних певної сутності. Решта коду просить у нього «дай пост з id 5» або «збережи цей пост» і не знає, чи це MySQL, SQLite або взагалі JSON-файл.

```text
 index.php ─┐
 post.php  ─┼──►  PostRepository  ──►  PDO  ──►  MySQL
 api/...   ─┘     all() find() create()
                  update() delete()
```

Ескіз, який ми повністю реалізуємо в П12:

```php title="src/PostRepository.php (ескіз)"
<?php
declare(strict_types=1);

namespace App;

use PDO;

final class PostRepository
{
    // Залежність передається ззовні — це і є впровадження залежностей
    public function __construct(private PDO $pdo) {}

    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM posts WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM posts WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->rowCount() > 0;
    }

    // all(), create(), update() — у П12
}
```

```php title="Використання"
$posts = new PostRepository(Database::connection());
$post = $posts->find(5) ?? throw new NotFoundException();
```

### Впровадження залежностей

Зверніть увагу: `PostRepository` **не створює** PDO сам і не викликає глобальну `db()`. Він отримує готовий об'єкт через конструктор. Це **впровадження залежностей** (dependency injection, DI) — один з найважливіших прийомів ООП-проєктування:

- залежності класу видно з сигнатури конструктора — нічого прихованого;
- у тестах можна передати PDO, підключений до тестової бази або до SQLite у пам'яті (`new PDO('sqlite::memory:')`);
- клас простіше повторно використати в іншому проєкті.

У фреймворках (Laravel, Symfony) об'єкти з потрібними залежностями створює **контейнер залежностей** (DI container) автоматично — достатньо вказати типи параметрів у конструкторі.

### Чи переписувати весь блог на класи?

Ні. ООП — інструмент, а не самоціль. У П12 ми створимо класи `Database` і `PostRepository` і використаємо їх у новому API, а сторінки з П8–П10 можна поступово перевести на репозиторій як самостійну роботу. Так і відбувається в реальних проєктах: нові частини пишуть у кращому стилі, старі — переписують, коли до них доходять руки.

## Підсумки

- **Клас** — шаблон, **об'єкт** — його екземпляр зі своїм станом. Об'єкти передаються за дескриптором, для копії потрібен `clone`.
- **Інкапсуляція**: властивості `private`, зміна стану — через методи з перевірками; об'єкт сам гарантує свої інваріанти.
- Сучасний PHP пропонує **constructor promotion**, **іменовані аргументи**, **`readonly`**-властивості й класи — коротший і надійніший код.
- **Статичні** члени належать класу; доречні для констант і фабричних методів, але не замінюють передачу залежностей.
- **Наслідування** — відношення «є», **композиція** — «має». Абстрактні класи задають спільну основу, інтерфейси — контракт.
- **Поліморфізм** дозволяє писати код, що працює з будь-якою реалізацією інтерфейсу.
- **Трейти** — повторне використання коду між непов'язаними класами; **enum** — типобезпечний набір значень.
- **Винятки** утворюють ієрархію; власні класи винятків роблять обробку помилок точною. Не ловіть того, що не можете обробити.
- **Простори імен** запобігають конфліктам назв, **автозавантаження** (PSR-4, Composer) позбавляє ручних `require`.
- **Репозиторій** і **впровадження залежностей** — основа архітектури, яку ми застосуємо в П12.

## Контрольні питання

1. Чим клас відрізняється від об'єкта? Що станеться з першим об'єктом після `$b = $a; $b->price = 0;`?
2. Що таке інкапсуляція? Чим відрізняються модифікатори `public`, `protected` і `private`?
3. Що таке constructor promotion? Перепишіть клас з двома властивостями і класичним конструктором у скороченій формі.
4. Що дає модифікатор `readonly`? Що таке об'єкт-значення і чому його методи повертають новий об'єкт?
5. Чим статичний метод відрізняється від звичайного? Що таке фабричний метод?
6. Як працює виклик `parent::__construct()`? Що забороняє ключове слово `final`?
7. Чим абстрактний клас відрізняється від інтерфейсу? Коли що обирати?
8. Поясніть поліморфізм на прикладі `PaymentMethod`. Що потрібно змінити у функції `checkout()`, щоб додати новий спосіб оплати?
9. Чим `enum` кращий за рядкові константи? Чим відрізняються `from()` і `tryFrom()`?
10. Як простір імен `App\` відображається на папки за PSR-4? Що робить `spl_autoload_register`? Що таке впровадження залежностей і навіщо воно `PostRepository`?

## Домашнє завдання

1. Створіть у `htdocs/practice-11/` клас `BankAccount` з `private` балансом (у копійках), методами `deposit()`, `withdraw()` і `balance()`. Спроба зняти більше, ніж є, має кидати власний виняток `InsufficientFundsException`. Продемонструйте роботу з `try/catch`.
2. Додайте перелічення `AccountType: string` (`Checking`, `Savings`) з методом `label()` і передайте його в конструктор `BankAccount`.
3. Розкладіть класи по файлах у папці `src/` з простором імен `App\` і підключіть їх через власний `spl_autoload_register` в `index.php` — жодного ручного `require` для класів.
