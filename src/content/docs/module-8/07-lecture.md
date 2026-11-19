---
title: Робота з API, збереження даних
description: HTTP-запити з fetch та async/await, стани завантаження й помилок, AbortController, власні хуки, а також локальне збереження даних — AsyncStorage, SecureStore, SQLite.
type: lecture
pair: 7
topic: 132
---

## Мета заняття

- Пригадати основи HTTP, REST і формату JSON у контексті мобільного застосунку.
- Навчитися виконувати GET- і POST-запити за допомогою `fetch` і `async/await`, правильно обробляти помилки.
- Зрозуміти, як організувати стани «завантаження — помилка — дані» та уникати гонитви запитів (race conditions).
- Навчитися виносити логіку запитів у власні хуки (custom hooks).
- Ознайомитися з бібліотеками axios і TanStack Query та зрозуміти, коли вони потрібні.
- Розібратися з варіантами локального збереження даних у React Native і правилами безпеки.

## План лекції

1. HTTP, REST і JSON: коротке нагадування.
2. `fetch` і `async/await`: GET- і POST-запити, перевірка `response.ok`.
3. Запити всередині компонентів: `useEffect`, стани, гонитва запитів, `AbortController`.
4. Власні хуки: `useFetch`.
5. axios, TanStack Query та особливості мережі в мобільній розробці.
6. Локальне збереження даних: AsyncStorage, SecureStore, SQLite, MMKV.
7. Offline-first, кешування та безпека.

## 1. HTTP, REST і JSON: коротке нагадування

Мобільний застосунок рідко живе сам по собі: прогноз погоди, стрічка новин, банківський рахунок — усе це дані з сервера. Обмін даними відбувається за протоколом **HTTP** (HyperText Transfer Protocol): клієнт надсилає **запит** (request), сервер повертає **відповідь** (response).

Запит складається з:

- **методу** — що ми хочемо зробити;
- **URL** — з яким ресурсом;
- **заголовків** (headers) — метадані: формат даних, токен авторизації тощо;
- **тіла** (body) — дані, які надсилаємо (для POST/PUT/PATCH).

**REST** (Representational State Transfer) — архітектурний стиль API, у якому дані подаються як ресурси з адресами, а дії над ними — HTTP-методами:

| Метод | Призначення | Приклад | Тіло запиту |
|---|---|---|---|
| `GET` | Отримати ресурс(и) | `GET /posts`, `GET /posts/1` | Немає |
| `POST` | Створити ресурс | `POST /posts` | Так |
| `PUT` | Повністю замінити ресурс | `PUT /posts/1` | Так |
| `PATCH` | Частково змінити ресурс | `PATCH /posts/1` | Так |
| `DELETE` | Видалити ресурс | `DELETE /posts/1` | Зазвичай немає |

Відповідь сервера містить **код стану** (status code):

| Діапазон | Значення | Типові коди |
|---|---|---|
| 2xx | Успіх | 200 OK, 201 Created, 204 No Content |
| 3xx | Перенаправлення | 301, 304 Not Modified |
| 4xx | Помилка клієнта | 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests |
| 5xx | Помилка сервера | 500 Internal Server Error, 503 Service Unavailable |

Дані найчастіше передаються у форматі **JSON** (JavaScript Object Notation). У JavaScript є дві протилежні операції:

```js
const obj = { id: 1, title: 'Київ' };
const text = JSON.stringify(obj); // об'єкт → рядок '{"id":1,"title":"Київ"}'
const back = JSON.parse(text);    // рядок → об'єкт
```

Для навчальних прикладів використовуватимемо безкоштовне тестове API **JSONPlaceholder** (`https://jsonplaceholder.typicode.com`), а на практиці — погодне API **Open-Meteo**, яке не вимагає ключа.

## 2. fetch і async/await

У React Native доступна та сама глобальна функція `fetch`, що й у браузері. Вона повертає проміс (Promise) з об'єктом `Response`.

### GET-запит

```js
async function getPost(id) {
  const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
  const post = await response.json(); // розбір тіла як JSON — теж асинхронний
  return post;
}
```

### Перевірка response.ok

Найпоширеніша помилка початківців: вважати, що `fetch` відхиляє проміс при відповіді 404 чи 500. **Це не так.** `fetch` кидає виняток лише тоді, коли запит узагалі не вдалося виконати (немає мережі, DNS-помилка, скасування). Відповідь з кодом 404 — це «успішно отриманий» `Response`. Тому код стану перевіряємо самі:

```js {3-5}
async function getPost(id) {
  const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
  if (!response.ok) {
    // response.ok === true лише для кодів 200–299
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}
```

### Обробка помилок

Викликаючи асинхронну функцію, обгортаємо її в `try/catch`:

```js
try {
  const post = await getPost(1);
  console.log(post.title);
} catch (error) {
  // сюди потрапить і помилка мережі, і наш throw для 4xx/5xx,
  // і помилка розбору JSON, якщо сервер повернув не JSON
  console.warn('Не вдалося завантажити:', error.message);
}
```

| Ситуація | Що робить `fetch` | Як виявити |
|---|---|---|
| Немає інтернету / сервер недоступний | Відхиляє проміс (`TypeError: Network request failed`) | `catch` |
| Код 404, 500 тощо | Повертає `Response` з `ok === false` | `if (!response.ok)` |
| Тіло не є валідним JSON | `response.json()` відхиляє проміс | `catch` |
| Запит скасовано через `AbortController` | Відхиляє з `error.name === 'AbortError'` | `catch` + перевірка імені |

### Параметри запиту в URL

Значення, що вводить користувач, обов'язково кодуємо — інакше пробіли, кирилиця чи `&` зламають URL:

```js
const city = 'Біла Церква';
const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=uk`;
```

Альтернатива — `URLSearchParams`:

```js
const params = new URLSearchParams({ name: city, count: '1', language: 'uk' });
const url2 = `https://geocoding-api.open-meteo.com/v1/search?${params}`;
```

### POST-запит з JSON-тілом

```js
async function createPost(post) {
  const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', // повідомляємо серверу формат тіла
      Accept: 'application/json',
    },
    body: JSON.stringify(post), // тіло — завжди рядок
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json(); // JSONPlaceholder поверне об'єкт з новим id (201 Created)
}

// Використання
const created = await createPost({ title: 'Нотатка', body: 'Текст', userId: 1 });
```

:::caution[Забутий JSON.stringify]
Якщо передати в `body` об'єкт без `JSON.stringify`, він перетвориться на рядок `"[object Object]"`. Сервер отримає сміття, а помилку буде складно знайти.
:::

### Обгортка над fetch

Щоб не повторювати перевірку `ok` і заголовки в кожному запиті, створюють невелику допоміжну функцію:

```js title="services/http.js"
const BASE_URL = 'https://jsonplaceholder.typicode.com';

export async function request(path, { method = 'GET', body, signal } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    signal,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new Error(`Помилка сервера: ${response.status}`);
  }
  // 204 No Content не має тіла
  return response.status === 204 ? null : response.json();
}
```

## 3. Запити всередині компонентів

### Три стани запиту

Будь-який мережевий запит у UI має щонайменше три стани, і кожен має бути відображений:

| Стан | Що показуємо |
|---|---|
| `loading` | `ActivityIndicator` або скелетон (skeleton) |
| `error` | Повідомлення про помилку + кнопка «Спробувати ще» |
| `data` | Власне дані (або порожній стан, якщо масив порожній) |

### Запит у useEffect

```jsx title="PostsScreen.js"
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

export default function PostsScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Функція-ефект не може бути async, тому оголошуємо async-функцію всередині
    async function load() {
      try {
        const res = await fetch('https://jsonplaceholder.typicode.com/posts');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setPosts(await res.json());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []); // порожній масив залежностей — лише під час монтування

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  if (error) return <Text>Помилка: {error}</Text>;

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <Text style={{ padding: 12 }}>{item.title}</Text>}
    />
  );
}
```

:::danger[Чому не useEffect(async () => …)]
Функція ефекту має повертати або нічого, або функцію очищення (cleanup). `async`-функція завжди повертає проміс, тому React не зможе викликати очищення і виведе попередження.
:::

### Гонитва запитів (race condition)

Нехай компонент завантажує дані залежно від пропа `userId`, а користувач швидко перемикає користувачів: 1 → 2. Запит для `1` може відповісти **пізніше**, ніж запит для `2`. Тоді на екрані опиняться дані користувача 1, хоча вибрано 2.

```jsx
// ПОГАНО: можлива гонитва
useEffect(() => {
  fetch(`https://jsonplaceholder.typicode.com/users/${userId}`)
    .then((r) => r.json())
    .then(setUser); // встановиться відповідь, що прийшла ОСТАННЬОЮ, а не остання за запитом
}, [userId]);
```

Ще одна проблема: якщо користувач пішов з екрана, відповідь приходить у вже розмонтований компонент — робота виконана даремно.

### AbortController та функція очищення

`AbortController` дозволяє скасувати запит. Його `signal` передається у `fetch`, а виклик `controller.abort()` перериває запит і відхиляє проміс з `AbortError`. Функція очищення ефекту викликається **перед** наступним запуском ефекту та під час розмонтування — ідеальне місце для скасування:

```jsx {2,10,15,18,23}
useEffect(() => {
  const controller = new AbortController();

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `https://jsonplaceholder.typicode.com/users/${userId}`,
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUser(await res.json());
    } catch (e) {
      if (e.name === 'AbortError') return; // скасування — це не помилка
      setError(e.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  load();

  return () => controller.abort(); // очищення: скасовуємо «застарілий» запит
}, [userId]);
```

Тепер при зміні `userId` попередній запит скасовується, і його відповідь ніколи не потрапить у стан.

:::note[Залежності ефекту]
Якщо ефект залежить від об'єкта (`coords`), а батьківський компонент щоразу створює новий об'єкт, ефект запускатиметься на кожному рендері. Передавайте у масив залежностей примітиви: `[coords?.latitude, coords?.longitude]`.
:::

## 4. Власні хуки: useFetch

Логіка «стан + ефект + скасування» повторюється в кожному екрані. React дозволяє винести її у **власний хук** — звичайну функцію, назва якої починається з `use` і яка викликає інші хуки.

```js title="hooks/useFetch.js"
import { useCallback, useEffect, useState } from 'react';

export function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!url) return; // дозволяємо «вимкнути» запит, передавши null
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [url, reloadKey]);

  // Повторний запит, наприклад для кнопки «Спробувати ще» або pull-to-refresh
  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  return { data, loading, error, refetch };
}
```

Використання стає лаконічним:

```jsx
function UserScreen({ userId }) {
  const { data: user, loading, error, refetch } = useFetch(
    `https://jsonplaceholder.typicode.com/users/${userId}`
  );

  if (loading) return <ActivityIndicator />;
  if (error) {
    return (
      <View>
        <Text>Помилка: {error}</Text>
        <Button title="Спробувати ще" onPress={refetch} />
      </View>
    );
  }
  return <Text>{user.name}</Text>;
}
```

Переваги власних хуків: повторне використання, тестованість, компоненти відповідають лише за відображення. Кожен виклик хука має **власний** незалежний стан.

### Pull-to-refresh

`FlatList` має вбудовану підтримку жесту «потягнути для оновлення»:

```jsx
<FlatList
  data={posts}
  refreshing={refreshing}   // чи показувати індикатор
  onRefresh={handleRefresh} // викликається, коли користувач потягнув список
  /* ... */
/>
```

## 5. axios, TanStack Query та особливості мережі

### axios

**axios** — популярна HTTP-бібліотека. Порівняно з `fetch`:

```js
import axios from 'axios';

const api = axios.create({ baseURL: 'https://jsonplaceholder.typicode.com', timeout: 10000 });

const { data } = await api.get('/posts', { params: { userId: 1 } }); // JSON розбирається автоматично
const { data: created } = await api.post('/posts', { title: 'Нотатка' }); // stringify автоматично
```

| | `fetch` | `axios` |
|---|---|---|
| Встановлення | Вбудований | `npx expo install axios` |
| Розбір JSON | Вручну `res.json()` | Автоматично (`data`) |
| Помилка на 4xx/5xx | Ні, перевіряємо `ok` | Так, кидає виняток |
| Тайм-аут | Через `AbortController` / `AbortSignal.timeout` | Опція `timeout` |
| Перехоплювачі (interceptors) | Немає (власна обгортка) | Є — зручно додавати токен до кожного запиту |

Для невеликих проєктів `fetch` з власною обгорткою цілком достатньо.

### TanStack Query

Коли запитів багато, з'являються нові задачі: кешування, повторне використання даних між екранами, автоматичне оновлення, повтори при помилках, інвалідація кешу після POST. **TanStack Query** (раніше React Query) вирішує саме їх — це бібліотека керування **серверним станом**:

```jsx
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Posts />
    </QueryClientProvider>
  );
}

function Posts() {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['posts'], // ключ кешу
    queryFn: ({ signal }) =>
      fetch('https://jsonplaceholder.typicode.com/posts', { signal }).then((r) => r.json()),
  });
  // ...
}
```

**Коли що використовувати:** `fetch` + власні хуки — для навчання і кількох простих запитів; TanStack Query — для реальних застосунків з великою кількістю серверних даних, кешуванням і синхронізацією. На цьому курсі пишемо запити вручну, щоб розуміти, що відбувається «під капотом».

### Мережа в емуляторі та на пристрої

Якщо ви розробляєте власний бекенд на комп'ютері (наприклад, Express на порту 3000), адреса `localhost` у мобільному застосунку вказує **на сам пристрій**, а не на комп'ютер:

| Де запущено застосунок | Адреса сервера на комп'ютері |
|---|---|
| Емулятор Android | `http://10.0.2.2:3000` (спеціальний псевдонім хост-машини) |
| Симулятор iOS | `http://localhost:3000` |
| Фізичний телефон (Expo Go) | `http://192.168.x.x:3000` — IP комп'ютера в локальній мережі (обидва пристрої в одній Wi-Fi мережі) |

```js
import { Platform } from 'react-native';

const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
```

:::caution[HTTP без шифрування]
Android (з API 28) і iOS (App Transport Security) за замовчуванням **блокують незашифрований HTTP** у зібраних застосунках. У продакшені використовуйте лише HTTPS. Для локальної розробки в Expo дозвіл на cleartext-трафік можна ввімкнути через плагін `expo-build-properties` (`android.usesCleartextTraffic`), але ніколи не залишайте це у релізній збірці без потреби.
:::

## 6. Локальне збереження даних

Стан React живе в оперативній пам'яті й зникає після закриття застосунку. Для збереження між запусками потрібне постійне сховище. Об'єкта `localStorage`, як у браузері, у React Native **немає**.

| Сховище | Модель даних | Синхронне? | Шифрування | Для чого |
|---|---|---|---|---|
| **AsyncStorage** (`@react-native-async-storage/async-storage`) | Ключ–значення, лише рядки | Ні (проміси) | Ні | Налаштування, невеликі списки, кеш |
| **expo-secure-store** | Ключ–значення, рядки (невеликого розміру) | Ні (є і синхронні варіанти) | Так (Keychain / Keystore) | Токени, паролі, секрети користувача |
| **expo-sqlite** | Реляційна БД, SQL | Ні / так | Ні | Великі структуровані дані, пошук, фільтрація |
| **MMKV** (`react-native-mmkv`) | Ключ–значення | Так | Опційно | Дуже швидке сховище; потребує development build (не працює в Expo Go) |
| **expo-file-system** | Файли | Ні | Ні | Зображення, документи, великі JSON |

### AsyncStorage

```bash
npx expo install @react-native-async-storage/async-storage
```

AsyncStorage зберігає **лише рядки**, тому об'єкти серіалізуємо в JSON:

```js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Запис
await AsyncStorage.setItem('settings', JSON.stringify({ theme: 'dark', lang: 'uk' }));

// Читання: getItem повертає null, якщо ключа немає
const json = await AsyncStorage.getItem('settings');
const settings = json != null ? JSON.parse(json) : { theme: 'light', lang: 'uk' };

// Видалення
await AsyncStorage.removeItem('settings');
```

Типовий патерн у компоненті — завантажити дані під час старту і зберігати при кожній зміні:

```jsx
const [items, setItems] = useState([]);
const [isLoaded, setIsLoaded] = useState(false);

useEffect(() => {
  AsyncStorage.getItem('items')
    .then((json) => {
      if (json) setItems(JSON.parse(json));
    })
    .finally(() => setIsLoaded(true));
}, []);

useEffect(() => {
  // Не зберігаємо, доки не завантажили — інакше перезапишемо дані порожнім масивом!
  if (!isLoaded) return;
  AsyncStorage.setItem('items', JSON.stringify(items));
}, [items, isLoaded]);
```

:::caution[Пастка першого рендеру]
Без прапорця `isLoaded` другий ефект спрацює одразу після монтування з початковим `[]` і **затре** збережені дані ще до того, як перший ефект їх прочитає.
:::

### expo-secure-store

```bash
npx expo install expo-secure-store
```

```js
import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('authToken', token);
const savedToken = await SecureStore.getItemAsync('authToken'); // null, якщо немає
await SecureStore.deleteItemAsync('authToken');
```

Дані шифруються засобами ОС: Keychain на iOS, Keystore на Android. Розмір значення обмежений (близько 2 КБ), тому для великих даних SecureStore не підходить.

### expo-sqlite

Коли записів тисячі й потрібні фільтри, сортування, зв'язки — використовують SQLite:

```js
import * as SQLite from 'expo-sqlite';

const db = await SQLite.openDatabaseAsync('places.db');
await db.execAsync(`
  CREATE TABLE IF NOT EXISTS places (id TEXT PRIMARY KEY NOT NULL, title TEXT, city TEXT);
`);
await db.runAsync('INSERT INTO places (id, title, city) VALUES (?, ?, ?)', ['1', 'Ратуша', 'Львів']);
const rows = await db.getAllAsync('SELECT * FROM places WHERE city = ?', ['Львів']);
```

Параметри `?` захищають від SQL-ін'єкцій — ніколи не вставляйте значення у SQL конкатенацією рядків.

## 7. Offline-first, кешування та безпека

### Offline-first

Мобільний інтернет нестабільний: метро, ліфт, роумінг. Підхід **offline-first** означає, що застосунок спочатку показує локальні дані, а мережа лише оновлює їх:

1. Під час запуску читаємо кеш із локального сховища і одразу показуємо.
2. Паралельно робимо запит до сервера.
3. Отримавши відповідь — оновлюємо UI і перезаписуємо кеш.
4. Якщо мережі немає — користувач бачить останні збережені дані та позначку «офлайн».

```js
async function loadPostsWithCache() {
  const cached = await AsyncStorage.getItem('cache:posts');
  if (cached) setPosts(JSON.parse(cached)); // миттєвий показ

  try {
    const res = await fetch('https://jsonplaceholder.typicode.com/posts');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const fresh = await res.json();
    setPosts(fresh);
    await AsyncStorage.setItem(
      'cache:posts',
      JSON.stringify(fresh)
    );
  } catch (e) {
    if (!cached) setError('Немає з\'єднання і немає збережених даних');
  }
}
```

Для визначення стану мережі є бібліотека `@react-native-community/netinfo`. Кеш варто доповнювати часом збереження, щоб розуміти, наскільки дані застарілі.

### Безпека

:::danger[Секрети в застосунку — не секрети]
Будь-який рядок у коді JavaScript потрапляє у бандл, який можна витягти з APK/IPA і прочитати. **Ніколи** не зберігайте в застосунку приватні API-ключі, паролі до БД, ключі платіжних систем. Змінні оточення з префіксом `EXPO_PUBLIC_` також вбудовуються в бандл і є публічними.
:::

Правила:

- Запити, що потребують секретного ключа, виконуються через **власний сервер-посередник** (backend, serverless-функцію): застосунок звертається до вашого сервера, а сервер — до стороннього API з ключем.
- Токени користувача (access/refresh token) зберігайте в `expo-secure-store`, а не в AsyncStorage.
- Використовуйте лише HTTPS.
- Не логуйте токени та персональні дані через `console.log` у релізних збірках.
- Перевіряйте дані, отримані з сервера: поле може бути відсутнім (`json.results?.[0]`).

## Підсумки

- `fetch` + `async/await` — базовий інструмент HTTP-запитів; `fetch` **не** кидає помилку на 4xx/5xx, тому завжди перевіряємо `response.ok`.
- Кожен запит у UI має стани завантаження, помилки та даних — усі три мають бути відображені.
- Запити в `useEffect` потребують функції очищення з `AbortController`, щоб уникнути гонитви запитів і роботи з розмонтованим компонентом.
- Повторювану логіку запитів виносимо у власні хуки (`useFetch`); для складних сценаріїв — TanStack Query.
- `localhost` в емуляторі Android — це `10.0.2.2`; незашифрований HTTP блокується.
- AsyncStorage — для простих даних (лише рядки, `JSON.stringify`), SecureStore — для токенів, SQLite — для структурованих даних.
- Секретні ключі не можна зберігати в мобільному застосунку.

## Контрольні питання

1. Які HTTP-методи використовують у REST для створення, читання, оновлення і видалення ресурсів?
2. У яких випадках `fetch` відхиляє проміс, а в яких — ні? Навіщо перевіряти `response.ok`?
3. Як надіслати POST-запит із JSON-тілом? Які заголовки потрібні?
4. Чому функцію ефекту не можна оголосити як `async`?
5. Що таке гонитва запитів (race condition) і як `AbortController` допомагає її уникнути?
6. Що таке власний хук? Чи поділяють два компоненти, що викликають `useFetch`, спільний стан?
7. Яку адресу використати для звернення до сервера на комп'ютері з емулятора Android? Чому не `localhost`?
8. Чим відрізняються AsyncStorage і expo-secure-store? Що де зберігати?
9. Навіщо прапорець `isLoaded` під час синхронізації стану з AsyncStorage?
10. Чому не можна зберігати приватний API-ключ у коді мобільного застосунку і як правильно розв'язати таку задачу?

## Домашнє завдання

Створіть у навчальному проєкті (можна окремий `npx create-expo-app@latest api-demo --template blank`) екран «Пости»:

1. Напишіть хук `hooks/useFetch.js` (як у лекції) з `AbortController` і функцією `refetch`.
2. Виведіть список постів `https://jsonplaceholder.typicode.com/posts?_limit=20` у `FlatList` з індикатором завантаження, повідомленням про помилку і кнопкою «Спробувати ще» (перевірте, змінивши URL на неіснуючий).
3. Додайте pull-to-refresh.
4. Збережіть у AsyncStorage кількість відкриттів застосунку і показуйте її в заголовку.

Здати: посилання на репозиторій і два скриншоти (список та стан помилки). Орієнтовний час — 45–60 хвилин.
