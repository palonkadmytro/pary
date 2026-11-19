---
title: "Форми. Керовані компоненти"
description: "Як працювати з формами в React: керовані й некеровані компоненти, текстові поля, textarea, select, checkbox і radio, один об'єкт стану для форми, відправлення з preventDefault, валідація з повідомленнями про помилки, доступність, а також нові можливості React 19 — form actions, useActionState і useFormStatus."
type: lecture
pair: 6
topic: 76
---

## Мета заняття

- Зрозуміти різницю між керованими (controlled) і некерованими (uncontrolled) компонентами.
- Навчитися керувати всіма основними елементами форм: `input` різних типів, `textarea`, `select`, `checkbox`, `radio`.
- Зберігати стан форми в одному об'єкті і писати універсальний обробник змін.
- Обробляти відправлення форми, виконувати валідацію і показувати помилки під полями.
- Знати правила доступності форм.
- Ознайомитися з некерованими формами, `FormData`, `useRef` і можливостями React 19 (`action`, `useActionState`, `useFormStatus`).

## План лекції

1. Форми в HTML і в React.
2. Керований компонент: `value` + `onChange`.
3. Елементи форм: textarea, select, checkbox, radio, number.
4. Форма з кількома полями: один об'єкт стану.
5. Відправлення форми.
6. Валідація і повідомлення про помилки.
7. Доступність форм.
8. Некеровані компоненти, `useRef`, `FormData`.
9. Форми в React 19: actions.
10. Типові помилки і бібліотеки.

Приклад для лекції — форма реєстрації учасника на студентський хакатон.

## 1. Форми в HTML і в React

У звичайному HTML поле введення **саме зберігає** своє значення: користувач друкує, браузер оновлює DOM-вузол `<input>`, а ви читаєте значення, коли знадобиться (`input.value`). Під час відправлення браузер збирає значення всіх полів і робить HTTP-запит — сторінка перезавантажується. Саме так працювали ваші PHP-форми: `<form method="post" action="register.php">`.

У SPA ми зазвичай:

- **не перезавантажуємо сторінку** — дані відправляються через `fetch` або обробляються на клієнті;
- хочемо **реагувати на кожне натискання клавіші**: показувати лічильник символів, підказки, блокувати кнопку, фільтрувати список під час введення;
- хочемо, щоб дані форми були **частиною стану** застосунку.

Звідси два підходи:

| | Некерований компонент (uncontrolled) | Керований компонент (controlled) |
|---|---|---|
| Хто зберігає значення | DOM (браузер) | Стан React |
| Як прочитати значення | Під час відправлення: `FormData`, `ref` | Будь-коли — це змінна стану |
| Початкове значення | `defaultValue`, `defaultChecked` | `value`, `checked` |
| Реакція на кожну зміну | Незручно | Природно |
| Обсяг коду | Менше | Більше |
| Типове використання | Прості форми, `input type="file"`, інтеграція з не-React кодом | Пошук «на льоту», складна валідація, залежні поля |

## 2. Керований компонент: `value` + `onChange`

**Керований компонент** — елемент форми, значення якого задається станом React, а кожна зміна проходить через обробник:

```jsx
import { useState } from 'react';

function NicknameField() {
  const [nickname, setNickname] = useState('');

  return (
    <label>
      Нікнейм:
      <input
        type="text"
        value={nickname}                              // значення — зі стану
        onChange={(e) => setNickname(e.target.value)}  // кожна зміна — у стан
      />
      <small>{nickname.length}/20</small>
    </label>
  );
}
```

Цикл керованого поля:

```text
Користувач натискає «a»
   │
   ▼
onChange(e) → e.target.value === 'a' → setNickname('a')
   │
   ▼
Рендер: <input value="a" />  → React показує в полі «a»
```

Стан стає **єдиним джерелом правди** (single source of truth): у полі завжди саме те, що в стані. Це дає контроль — значення можна змінити, перш ніж воно потрапить у поле:

```jsx
// Лише малі латинські літери і цифри, максимум 20 символів
onChange={(e) => {
  const clean = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
  setNickname(clean);
}}
```

:::note[onChange у React ≠ change у DOM]
У DOM подія `change` для текстового поля спрацьовує лише після втрати фокусу. У React `onChange` спрацьовує **на кожну зміну** значення — фактично як подія `input`. Це навмисне рішення React.
:::

### Об'єкт події

Обробники подій у React отримують **синтетичну подію** (SyntheticEvent) — обгортку над нативною, з однаковою поведінкою в усіх браузерах. Основне, що знадобиться у формах:

| Властивість / метод | Що повертає |
|---|---|
| `e.target` | Елемент, на якому сталася подія |
| `e.target.value` | Значення поля (**завжди рядок**) |
| `e.target.checked` | Стан чекбокса |
| `e.target.name` | Атрибут `name` поля |
| `e.preventDefault()` | Скасувати дію браузера за замовчуванням |

## 3. Елементи форм

### textarea

У HTML вміст `<textarea>` пишеться між тегами. У React — через атрибут `value`, як у `input`:

```jsx
const [about, setAbout] = useState('');

<textarea
  value={about}
  onChange={(e) => setAbout(e.target.value)}
  rows={4}
  maxLength={500}
  placeholder="Розкажіть про свій досвід"
/>
<small>Залишилось символів: {500 - about.length}</small>
```

### select

Замість атрибута `selected` на `<option>` React використовує `value` на самому `<select>`:

```jsx
const [track, setTrack] = useState('');

<select value={track} onChange={(e) => setTrack(e.target.value)}>
  <option value="" disabled>— Оберіть напрям —</option>
  <option value="web">Веброзробка</option>
  <option value="mobile">Мобільні застосунки</option>
  <option value="ai">Штучний інтелект</option>
</select>
```

Варіанти часто генерують з масиву:

```jsx
const TRACKS = [
  { value: 'web', label: 'Веброзробка' },
  { value: 'mobile', label: 'Мобільні застосунки' },
  { value: 'ai', label: 'Штучний інтелект' },
];

<select value={track} onChange={(e) => setTrack(e.target.value)}>
  <option value="" disabled>— Оберіть напрям —</option>
  {TRACKS.map((t) => (
    <option key={t.value} value={t.value}>{t.label}</option>
  ))}
</select>
```

Для множинного вибору (`<select multiple>`) значення — масив, а прочитати вибрані опції можна так: `Array.from(e.target.selectedOptions, (o) => o.value)`.

### checkbox

Для чекбокса керують атрибутом **`checked`**, а читають **`e.target.checked`** (не `value`!):

```jsx
const [agree, setAgree] = useState(false);

<label>
  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
  Погоджуюсь з правилами хакатону
</label>
```

Група чекбоксів (кілька варіантів) зберігається масивом:

```jsx
const [skills, setSkills] = useState([]);   // ['react', 'figma']

function toggleSkill(skill) {
  setSkills((prev) =>
    prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
  );
}

{['react', 'node', 'figma', 'python'].map((skill) => (
  <label key={skill}>
    <input
      type="checkbox"
      checked={skills.includes(skill)}
      onChange={() => toggleSkill(skill)}
    />
    {skill}
  </label>
))}
```

### radio

Група перемикачів має спільний `name`; кожна кнопка «вибрана», якщо її `value` збігається зі станом:

```jsx
const [format, setFormat] = useState('offline');

<fieldset>
  <legend>Формат участі</legend>
  <label>
    <input type="radio" name="format" value="offline"
           checked={format === 'offline'} onChange={(e) => setFormat(e.target.value)} />
    Офлайн
  </label>
  <label>
    <input type="radio" name="format" value="online"
           checked={format === 'online'} onChange={(e) => setFormat(e.target.value)} />
    Онлайн
  </label>
</fieldset>
```

### Числа і дати

`e.target.value` — **завжди рядок**, навіть для `type="number"` і `type="date"`:

```jsx
const [teamSize, setTeamSize] = useState('3');   // зберігаємо рядок

<input type="number" min={1} max={5} value={teamSize}
       onChange={(e) => setTeamSize(e.target.value)} />

// Перетворюємо, коли потрібне число:
const size = Number(teamSize);
```

Зберігати в стані саме **рядок** зручніше: інакше користувач не зможе тимчасово очистити поле (порожній рядок перетвориться на `0`). Для зручності є також `e.target.valueAsNumber`.

### Зведена таблиця

| Елемент | Атрибут значення | Що читати в `onChange` |
|---|---|---|
| `input` (text, email, password, tel, number, date) | `value` | `e.target.value` (рядок) |
| `textarea` | `value` | `e.target.value` |
| `select` | `value` на `<select>` | `e.target.value` |
| `input type="checkbox"` | `checked` | `e.target.checked` (boolean) |
| `input type="radio"` | `checked={state === value}` | `e.target.value` |
| `input type="file"` | — (лише некерований) | `e.target.files` |

## 4. Форма з кількома полями: один об'єкт стану

Коли полів багато, окремий `useState` для кожного стає громіздким. Зручніше зберігати форму **одним об'єктом** і написати **один універсальний обробник**, що визначає поле за атрибутом `name`:

```jsx
const initialForm = {
  fullName: '',
  email: '',
  track: '',
  format: 'offline',
  about: '',
  agree: false,
};

function RegistrationForm() {
  const [form, setForm] = useState(initialForm);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,                                     // копіюємо всі поля
      [name]: type === 'checkbox' ? checked : value, // змінюємо одне
    }));
  }

  return (
    <form>
      <input name="fullName" value={form.fullName} onChange={handleChange} />
      <input name="email" type="email" value={form.email} onChange={handleChange} />
      <select name="track" value={form.track} onChange={handleChange}>{/* ... */}</select>
      <textarea name="about" value={form.about} onChange={handleChange} />
      <input name="agree" type="checkbox" checked={form.agree} onChange={handleChange} />
    </form>
  );
}
```

Ключові моменти:

- `[name]: ...` — **обчислюване ім'я властивості** (computed property name) ES2015: ключ об'єкта береться зі змінної;
- `...prev` — незмінне оновлення: новий об'єкт з усіма старими полями (див. практичну 5);
- атрибут `name` кожного поля **має точно збігатися** з ключем в об'єкті стану;
- функціональне оновлення `setForm(prev => ...)` гарантує, що ми не втратимо зміни.

:::caution[Не забудьте про ...prev]
`setForm({ [name]: value })` **замінить** увесь об'єкт на об'єкт з одним полем — решта полів стануть `undefined`, а поля форми перейдуть у некерований режим (див. розділ 10).
:::

## 5. Відправлення форми

Обробник вішають на подію **`onSubmit` форми**, а не на `onClick` кнопки. Тоді форма відправлятиметься і кліком на кнопку, і клавішею Enter у полі, а браузерна валідація (`required`, `type="email"`) спрацює автоматично.

```jsx
function handleSubmit(e) {
  e.preventDefault();   // скасовуємо перезавантаження сторінки

  // Тут — валідація і відправлення
  console.log('Дані форми:', form);

  setForm(initialForm);  // очищуємо форму
}

return (
  <form onSubmit={handleSubmit}>
    {/* ...поля... */}
    <button type="submit">Зареєструватися</button>
  </form>
);
```

Без `e.preventDefault()` браузер виконає стандартну дію — надішле форму і перезавантажить сторінку, весь стан React буде втрачено.

:::tip[Тип кнопок]
Кнопка всередині `<form>` за замовчуванням має `type="submit"`. Якщо у формі є допоміжні кнопки («Очистити», «Показати пароль»), обов'язково вказуйте їм `type="button"`, інакше вони відправлятимуть форму.
:::

### Відправлення на сервер

```jsx
const [status, setStatus] = useState('idle'); // 'idle' | 'sending' | 'success' | 'error'

async function handleSubmit(e) {
  e.preventDefault();
  setStatus('sending');
  try {
    const res = await fetch('/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setStatus('success');
    setForm(initialForm);
  } catch {
    setStatus('error');
  }
}

// у розмітці:
<button type="submit" disabled={status === 'sending'}>
  {status === 'sending' ? 'Надсилаємо…' : 'Зареєструватися'}
</button>
{status === 'success' && <p className="ok">Дякуємо! Ви зареєстровані.</p>}
{status === 'error' && <p className="error">Не вдалося надіслати. Спробуйте ще раз.</p>}
```

## 6. Валідація і повідомлення про помилки

### Вбудована валідація HTML

Атрибути `required`, `minLength`, `maxLength`, `min`, `max`, `pattern`, `type="email"` працюють і в React. Браузер не дасть відправити форму і покаже стандартну підказку. Це простий перший рубіж, але:

- вигляд повідомлень не налаштовується (і залежить від браузера);
- складні правила (пароль і повтор пароля збігаються) не описати;
- повідомлення мовою браузера, а не інтерфейсу.

Тому зазвичай додають **власну валідацію**. Атрибут `noValidate` на формі вимикає браузерні підказки, щоб вони не дублювали ваші.

### Функція валідації

Валідацію зручно винести в **чисту функцію**, що отримує дані форми і повертає об'єкт помилок:

```js
function validate(form) {
  const errors = {};

  if (form.fullName.trim().length < 2) {
    errors.fullName = "Вкажіть ім'я та прізвище";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Некоректний email';
  }
  if (!form.track) {
    errors.track = 'Оберіть напрям';
  }
  if (!form.agree) {
    errors.agree = 'Потрібна згода з правилами';
  }

  return errors; // {} — помилок немає
}
```

### Помилки — похідне значення

Помилки можна обчислювати **під час рендеру** з поточного стану — окремий `useState` для них не потрібен (принцип із практичної 5: не зберігайте те, що можна обчислити):

```jsx
const errors = validate(form);
const isValid = Object.keys(errors).length === 0;
```

Але показувати всі помилки одразу, коли користувач ще нічого не ввів, — погана практика. Тому зберігають, **які поля користувач уже «торкнувся»** (touched), або прапорець «була спроба відправлення»:

```jsx
const [touched, setTouched] = useState({});    // { email: true, ... }
const [submitted, setSubmitted] = useState(false);

const errors = validate(form);
const isValid = Object.keys(errors).length === 0;

// Показуємо помилку поля, якщо його торкнулися або була спроба відправлення
const showError = (field) => (touched[field] || submitted) && errors[field];

function handleBlur(e) {
  setTouched((prev) => ({ ...prev, [e.target.name]: true }));
}

function handleSubmit(e) {
  e.preventDefault();
  setSubmitted(true);
  if (!isValid) return;      // не відправляємо
  // ...відправлення
}
```

```jsx
<div className="field">
  <label htmlFor="email">Email</label>
  <input
    id="email"
    name="email"
    type="email"
    value={form.email}
    onChange={handleChange}
    onBlur={handleBlur}
    aria-invalid={Boolean(showError('email'))}
    aria-describedby={showError('email') ? 'email-error' : undefined}
  />
  {showError('email') && (
    <p id="email-error" className="field__error">{errors.email}</p>
  )}
</div>
```

### Коли валідувати

| Момент | Плюси | Мінуси |
|---|---|---|
| Під час відправлення | Не заважає вводити | Користувач дізнається про помилки пізно |
| При втраті фокусу (`onBlur`) | Баланс: перевірка одразу після заповнення поля | Трохи більше коду (`touched`) |
| На кожне натискання (`onChange`) | Миттєвий відгук | Дратує: «Некоректний email» з першої літери |
| Комбінований | Перша перевірка на blur, далі — на кожну зміну, поки помилку не виправлено | Найзручніше для користувача |

### Блокування кнопки

```jsx
<button type="submit" disabled={!isValid}>Зареєструватися</button>
```

Блокувати кнопку зручно, але є нюанс: користувач не розуміє, **чому** кнопка неактивна, якщо помилки ще не показані. Хороший компроміс — кнопка активна, а при натисканні показуються всі помилки (`submitted = true`) і фокус переводиться на перше хибне поле.

:::danger[Валідація на клієнті — не захист]
Клієнтську валідацію легко обійти (DevTools, запит через `curl`). Вона потрібна для **зручності** користувача. Сервер (ваш PHP-бекенд чи будь-який інший) **завжди** має перевіряти дані повторно.
:::

## 7. Доступність форм

| Правило | Як у JSX |
|---|---|
| Кожне поле має підпис | `<label htmlFor="email">` + `<input id="email">` або поле всередині `<label>` |
| Група перемикачів має заголовок | `<fieldset>` + `<legend>` |
| Поле з помилкою позначене | `aria-invalid={true}` |
| Текст помилки пов'язаний з полем | `aria-describedby="email-error"` на полі, `id="email-error"` на повідомленні |
| Обов'язкові поля позначені | `required` (або `aria-required`) і візуальна позначка `*` |
| Правильний тип поля | `type="email"`, `type="tel"` — мобільна клавіатура підлаштовується |
| Автозаповнення | `autoComplete="name"`, `"email"`, `"tel"` |
| Placeholder не замінює label | Placeholder зникає при введенні і має низький контраст |

Оскільки `htmlFor`/`id` мають бути унікальними на сторінці, а компонент може використовуватися кілька разів, для генерації id є хук **`useId`**:

```jsx
import { useId } from 'react';

function Field({ label, error, ...inputProps }) {
  const id = useId();               // унікальний і стабільний між рендерами id
  const errorId = `${id}-error`;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error && <p id={errorId} className="field__error">{error}</p>}
    </div>
  );
}
```

Такий компонент `Field` — гарний приклад композиції з лекції 4: він інкапсулює підпис, поле і помилку, а решту пропсів «прокидає» в `<input>` через spread.

## 8. Некеровані компоненти, `useRef`, `FormData`

Не кожну форму потрібно робити керованою. Якщо значення потрібні лише в момент відправлення, можна дозволити браузеру зберігати їх, а прочитати через **`FormData`**:

```jsx
function QuickFeedback() {
  function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);   // e.currentTarget — сама форма
    const data = Object.fromEntries(formData);        // { name: '...', rating: '5', text: '...' }
    console.log(data);
    e.currentTarget.reset();                          // очищення — засобами DOM
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" defaultValue="Анонім" />
      <select name="rating" defaultValue="5">
        <option value="5">Відмінно</option>
        <option value="3">Нормально</option>
        <option value="1">Погано</option>
      </select>
      <textarea name="text" required />
      <button type="submit">Надіслати</button>
    </form>
  );
}
```

- `defaultValue` / `defaultChecked` — **початкове** значення; далі поле живе власним життям.
- Для групи чекбоксів з однаковим `name` використовуйте `formData.getAll('skills')`.

### Доступ до DOM-елемента через `useRef`

Хук **`useRef`** повертає об'єкт `{ current: ... }`, який зберігається між рендерами. Якщо передати його в атрибут `ref`, React запише в `current` DOM-елемент:

```jsx
import { useRef } from 'react';

function SearchBox() {
  const inputRef = useRef(null);

  return (
    <>
      <input ref={inputRef} type="search" placeholder="Пошук..." />
      <button type="button" onClick={() => inputRef.current.focus()}>
        Фокус у поле
      </button>
    </>
  );
}
```

Типові сценарії для `ref`: фокус на полі з помилкою, прокручування до елемента, читання файлів з `<input type="file">`, інтеграція зі сторонніми бібліотеками. Зміна `ref.current` **не запускає рендер** — тому для даних, що відображаються, використовуйте стан.

У React 19 `ref` можна передавати власним компонентам як **звичайний проп** — обгортка `forwardRef` більше не потрібна:

```jsx
function TextInput({ ref, ...props }) {
  return <input ref={ref} className="text-input" {...props} />;
}
```

### `input type="file"`

Поле вибору файлу **завжди некероване**: його значення з міркувань безпеки не можна встановити з коду.

```jsx
<input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files[0])} />
```

## 9. Форми в React 19: actions

React 19 додав власну підтримку форм. У атрибут **`action`** елемента `<form>` можна передати **функцію**. React сам скасує перезавантаження сторінки, викличе функцію з об'єктом `FormData` і після успішного виконання **очистить** некеровані поля форми:

```jsx
function Subscribe() {
  async function subscribe(formData) {
    const email = formData.get('email');
    await fetch('/api/subscribe', { method: 'POST', body: formData });
    alert(`Підписано: ${email}`);
  }

  return (
    <form action={subscribe}>
      <input name="email" type="email" required />
      <button type="submit">Підписатися</button>
    </form>
  );
}
```

### useActionState

Хук **`useActionState`** зберігає результат останнього виконання дії і прапорець очікування:

```jsx
import { useActionState } from 'react';

async function registerAction(prevState, formData) {
  const name = formData.get('fullName');
  if (!name || name.length < 2) {
    return { error: "Вкажіть ім'я", ok: false };
  }
  await new Promise((r) => setTimeout(r, 1000)); // імітація запиту
  return { error: null, ok: true };
}

function QuickRegistration() {
  const [state, formAction, isPending] = useActionState(registerAction, { error: null, ok: false });

  return (
    <form action={formAction}>
      <input name="fullName" placeholder="Ім'я та прізвище" />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Надсилаємо…' : 'Зареєструватися'}
      </button>
      {state.error && <p className="field__error">{state.error}</p>}
      {state.ok && <p className="ok">Готово!</p>}
    </form>
  );
}
```

### useFormStatus

Хук **`useFormStatus`** (з пакета `react-dom`) дозволяє будь-якому компоненту **всередині** форми дізнатися, чи відправляється вона, — без передачі пропсів:

```jsx
import { useFormStatus } from 'react-dom';

function SubmitButton({ children }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? 'Зачекайте…' : children}</button>;
}
```

| Підхід | Коли обирати |
|---|---|
| Керовані поля + `onSubmit` | Потрібен миттєвий відгук: валідація під час введення, залежні поля, лічильники, фільтри. **Цей підхід ми використовуватимемо в проєкті.** |
| Некеровані поля + `FormData` у `onSubmit` | Прості форми, значення потрібні лише при відправленні |
| `action` + `useActionState` | Відправлення на сервер зі станом очікування і результатом; особливо зручно у фреймворках з Server Actions (Next.js) |

## 10. Типові помилки і бібліотеки

### Типові помилки

| Помилка | Симптом | Виправлення |
|---|---|---|
| `value` без `onChange` | Поле не редагується; попередження «You provided a `value` prop to a form field without an `onChange` handler» | Додати `onChange` або використати `defaultValue` (чи `readOnly`) |
| Початкове значення `undefined` або `null` | Попередження «A component is changing an uncontrolled input to be controlled» | Ініціалізувати рядком: `useState('')` |
| `setForm({ [name]: value })` без `...prev` | Інші поля зникають | `setForm(prev => ({ ...prev, [name]: value }))` |
| Читання `e.target.value` для чекбокса | Завжди `"on"` | `e.target.checked` |
| `name` поля не збігається з ключем стану | Введення «не працює» | Перевірити написання `name` |
| Обробник на `onClick` кнопки замість `onSubmit` | Не працює Enter, не спрацьовує браузерна валідація | `<form onSubmit={...}>` |
| Немає `e.preventDefault()` | Сторінка перезавантажується, стан втрачено | Викликати першим рядком обробника |
| Число з `input type="number"` як рядок | `'2' + 1 === '21'` | `Number(value)` під час обчислень |

### Бібліотеки

Для великих форм (десятки полів, складна валідація, динамічні масиви полів) використовують бібліотеки:

- **React Hook Form** — найпопулярніша; працює переважно з некерованими полями, мінімум рендерів;
- **Zod** / **Yup** — опис схеми даних і правил валідації (схему Zod можна використати і на сервері);
- **Formik** — старіша альтернатива React Hook Form.

Розібравшись із керованими компонентами вручну, ви легко освоїте будь-яку з них.

## Підсумки

- **Керований компонент**: значення поля зберігається в стані React (`value`/`checked`), кожна зміна проходить через `onChange`. Стан — єдине джерело правди.
- Для чекбоксів використовують `checked` і `e.target.checked`, для radio — `checked={state === value}`, для `select` — `value` на самому `<select>`. `e.target.value` — завжди рядок.
- Багато полів зручно зберігати **одним об'єктом** і обробляти універсальною функцією з `[name]: value` і `...prev`.
- Форма обробляється через **`onSubmit`** з `e.preventDefault()`.
- Валідація — чиста функція, що повертає об'єкт помилок; помилки — похідне значення; показуємо їх після `blur` або спроби відправлення. Клієнтська валідація не замінює серверну.
- Доступність: `label`/`htmlFor`, `fieldset`/`legend`, `aria-invalid`, `aria-describedby`, хук `useId`.
- **Некеровані** форми читають через `FormData` або `useRef`; `input type="file"` завжди некерований.
- React 19 додав `action` для форм, `useActionState` і `useFormStatus`.

## Контрольні питання

1. Чим керований компонент відрізняється від некерованого? Хто є «джерелом правди» в кожному випадку?
2. Чому поле з `value`, але без `onChange` не редагується?
3. Як керувати чекбоксом, групою radio і `select` у React?
4. Чому значення `input type="number"` краще зберігати в стані як рядок?
5. Поясніть роботу універсального обробника `handleChange` з `[name]` і `...prev`.
6. Чому обробник відправлення вішають на `onSubmit` форми, а не на `onClick` кнопки? Навіщо `e.preventDefault()`?
7. Чому помилки валідації можна не зберігати в окремому стані? Навіщо тоді стан `touched`?
8. Які атрибути роблять повідомлення про помилку доступним для програм зчитування з екрана? Для чого потрібен `useId`?
9. Коли доречно використовувати некеровані поля і `FormData`?
10. Що роблять `action` на формі, `useActionState` і `useFormStatus` у React 19?

## Домашнє завдання

1. Створіть (у пісочниці або окремому Vite-проєкті) форму реєстрації на хакатон з полями: ім'я та прізвище, email, напрям (`select`), формат участі (`radio`), навички (група чекбоксів), розмір команди (`number`, 1–5), коротко про себе (`textarea`, до 300 символів з лічильником) і згода з правилами (`checkbox`). Стан — один об'єкт, обробник змін — один.
2. Додайте валідацію з показом помилок під полями після втрати фокусу або спроби відправлення, `aria-invalid` і `aria-describedby`. Після успішного відправлення покажіть повідомлення з іменем учасника і очистіть форму.
3. Перепишіть поле email у вигляді компонента `Field` з `useId` (розділ 7) і використайте його для всіх текстових полів форми.

**Що здати:** посилання на репозиторій або архів проєкту і скриншот форми з показаними помилками.
