---
title: Запити до API, збереження даних
description: Підключаємо до «Моїх місць» погодне API Open-Meteo, пишемо хук useWeather з AbortController і зберігаємо список місць в AsyncStorage між запусками.
type: practice
pair: 8
topic: 133
---

## Мета роботи

- Організувати мережевий код у вигляді окремого сервісного шару (`services/`).
- Виконувати запити до реального REST API (Open-Meteo) з перевіркою `response.ok` та обробкою помилок.
- Написати власний хук `useWeather` зі станами `data / loading / error` і скасуванням запитів через `AbortController`.
- Зберігати список місць в AsyncStorage і відновлювати його під час запуску застосунку.
- Реалізувати індикатори завантаження, повідомлення про помилки та pull-to-refresh.

## Що потрібно

- Результат практичної роботи P3 (пара 6): проєкт `my-places` з файлами `constants/theme.js`, `components/Header.js`, `components/PlaceCard.js`, `components/AddPlaceForm.js`, `data/places.js`, `App.js` (стан `places`, `FlatList`, додавання/видалення/улюблені).
- Доступ до інтернету на емуляторі або телефоні.
- Матеріал лекції «Робота з API, збереження даних» (пара 7).

## Короткі теоретичні відомості

**Open-Meteo** — безкоштовне погодне API без ключа. Нам знадобляться два ендпоінти:

| Призначення | Запит | Що беремо з відповіді |
|---|---|---|
| Геокодування (місто → координати) | `https://geocoding-api.open-meteo.com/v1/search?name=Kyiv&count=1&language=uk` | `results[0].latitude`, `results[0].longitude`, `results[0].name` |
| Поточна погода | `https://api.open-meteo.com/v1/forecast?latitude=50.45&longitude=30.52&current=temperature_2m,weather_code` | `current.temperature_2m`, `current.weather_code` |

Відкрийте обидва URL у браузері й подивіться на структуру JSON — це хороша звичка перед написанням коду. Зверніть увагу: якщо місто не знайдено, у відповіді геокодування **немає** поля `results`.

**Архітектура рішення.** Розділимо відповідальність:

| Шар | Файл | Відповідає за |
|---|---|---|
| Сервіси | `services/weatherApi.js`, `services/storage.js` | «Як» отримати/зберегти дані: URL, `fetch`, JSON, AsyncStorage |
| Хуки | `hooks/useWeather.js` | Стан запиту в компоненті, життєвий цикл, скасування |
| Компоненти | `PlaceCard.js`, `App.js` | Відображення і реакція на дії користувача |

Компоненти нічого не знають про URL і формат відповіді Open-Meteo — якщо колись замінимо API, зміниться лише сервіс.

## Хід роботи

### Крок 1. Встановлення AsyncStorage

У корені проєкту виконайте:

```bash
npx expo install @react-native-async-storage/async-storage
```

`npx expo install` підбирає версію пакета, сумісну з актуальною версією Expo SDK вашого проєкту. AsyncStorage входить до Expo Go, тому додаткова збірка не потрібна.

### Крок 2. Сервіс збереження даних

Створіть папку `services` і файл:

```js title="services/storage.js"
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'places';

// Повертає масив місць або null, якщо даних ще немає чи вони пошкоджені
export async function loadPlaces() {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (json == null) return null;
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.warn('Не вдалося прочитати місця зі сховища:', error);
    return null;
  }
}

// Зберігає масив місць як JSON-рядок
export async function savePlaces(places) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(places));
  } catch (error) {
    console.warn('Не вдалося зберегти місця:', error);
  }
}

// Допоміжна функція для налагодження: очистити збережені місця
export async function clearPlaces() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
```

Чому повертаємо `null`, а не порожній масив? Щоб відрізняти дві ситуації: «користувач ще жодного разу не запускав застосунок» (показуємо демонстраційні `PLACES`) і «користувач видалив усі місця» (показуємо порожній список, а не повертаємо демо-дані).

### Крок 3. Сервіс погодного API

```js title="services/weatherApi.js"
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

// Місто → { latitude, longitude } або null, якщо місто не знайдено
export async function geocodeCity(city) {
  const params = new URLSearchParams({
    name: city,
    count: '1',
    language: 'uk',
  });

  const response = await fetch(`${GEOCODING_URL}?${params}`);
  if (!response.ok) {
    throw new Error(`Помилка геокодування: HTTP ${response.status}`);
  }

  const json = await response.json();
  const first = json.results?.[0]; // results відсутнє, якщо нічого не знайдено
  if (!first) return null;

  return { latitude: first.latitude, longitude: first.longitude };
}

// Поточна погода за координатами. signal — для скасування запиту
export async function getCurrentWeather(latitude, longitude, signal) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,weather_code',
  });

  const response = await fetch(`${FORECAST_URL}?${params}`, { signal });
  if (!response.ok) {
    throw new Error(`Помилка прогнозу: HTTP ${response.status}`);
  }

  const json = await response.json();
  return {
    temperature: json.current.temperature_2m,
    code: json.current.weather_code,
  };
}

// Короткий текстовий опис коду погоди (коди WMO)
export function describeWeather(code) {
  if (code === 0) return 'Ясно';
  if (code <= 3) return 'Хмарно';
  if (code === 45 || code === 48) return 'Туман';
  if (code >= 51 && code <= 67) return 'Дощ';
  if (code >= 71 && code <= 77) return 'Сніг';
  if (code >= 80 && code <= 82) return 'Злива';
  if (code >= 95) return 'Гроза';
  return 'Невідомо';
}
```

:::tip[Перевірка без UI]
Тимчасово додайте в `App.js` виклик `geocodeCity('Львів').then(console.log)` — у терміналі Metro має з'явитися `{ latitude: 49.83826, longitude: 24.02324 }` (значення можуть трохи відрізнятися). Після перевірки видаліть цей рядок.
:::

### Крок 4. Хук useWeather

Створіть папку `hooks` і файл:

```js title="hooks/useWeather.js"
import { useEffect, useState } from 'react';
import { getCurrentWeather } from '../services/weatherApi';

// coords — { latitude, longitude } або null/undefined
// refreshKey — будь-яке значення; його зміна змушує завантажити погоду повторно
export function useWeather(coords, refreshKey = 0) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Беремо примітиви, щоб ефект не перезапускався через новий об'єкт coords
  const latitude = coords?.latitude;
  const longitude = coords?.longitude;

  useEffect(() => {
    // Немає координат — нема що завантажувати
    if (latitude == null || longitude == null) {
      setData(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getCurrentWeather(latitude, longitude, controller.signal)
      .then((weather) => setData(weather))
      .catch((err) => {
        if (err.name === 'AbortError') return; // запит скасовано — не помилка
        setError('Не вдалося отримати погоду');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    // Очищення: скасовуємо запит при зміні координат або розмонтуванні картки
    return () => controller.abort();
  }, [latitude, longitude, refreshKey]);

  return { data, loading, error };
}
```

:::caution[Нескінченні запити]
Якщо записати залежність як `[coords]`, а батьківський компонент створюватиме новий об'єкт `coords` на кожному рендері, ефект запускатиметься знову і знову. Залежність від примітивів `latitude` і `longitude` цю проблему усуває.
:::

### Крок 5. Погода в картці місця

Додайте до `PlaceCard` блок погоди. Нижче — повний код файлу; нові частини виділено.

```jsx title="components/PlaceCard.js" {1,3,4,6,7,22-34}
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { useWeather } from '../hooks/useWeather';
import { describeWeather } from '../services/weatherApi';

export default function PlaceCard({ place, onDelete, onToggleFavorite, refreshKey }) {
  const { data: weather, loading, error } = useWeather(place.coords, refreshKey);

  return (
    <View style={[styles.card, place.isFavorite && styles.cardFavorite]}>
      <Image source={{ uri: place.image }} style={styles.image} />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.titleBox}>
            <Text style={styles.title} numberOfLines={1}>
              {place.title}
            </Text>
            <Text style={styles.city}>{place.city}</Text>
          </View>

          {/* Блок погоди: завантаження / помилка / дані */}
          <View style={styles.weather}>
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : error ? (
              <Text style={styles.weatherError}>—</Text>
            ) : weather ? (
              <>
                <Text style={styles.temperature}>{Math.round(weather.temperature)}°C</Text>
                <Text style={styles.weatherText}>{describeWeather(weather.code)}</Text>
              </>
            ) : null}
          </View>

          <Pressable
            onPress={() => onToggleFavorite(place.id)}
            hitSlop={10}
            style={({ pressed }) => [styles.heartButton, pressed && styles.heartPressed]}
            accessibilityRole="button"
            accessibilityLabel={
              place.isFavorite ? 'Прибрати з улюблених' : 'Додати до улюблених'
            }
          >
            <Text style={[styles.heart, place.isFavorite && styles.heartActive]}>
              {place.isFavorite ? '♥' : '♡'}
            </Text>
          </Pressable>
        </View>

        {place.description ? (
          <Text style={styles.description}>{place.description}</Text>
        ) : null}

        {error ? <Text style={styles.weatherErrorText}>{error}</Text> : null}

        <Pressable
          onPress={() => onDelete(place.id)}
          style={({ pressed }) => [styles.deleteButton, pressed && styles.deletePressed]}
        >
          {({ pressed }) => (
            <Text style={[styles.deleteText, pressed && styles.deleteTextPressed]}>
              Видалити
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
```

До об'єкта `styles` (стилі з P3 залишаються без змін) додайте нові ключі:

```js title="components/PlaceCard.js (доповнення до StyleSheet.create)"
  weather: {
    alignItems: 'flex-end',
    minWidth: 56,
    marginRight: SPACING.sm,
  },
  temperature: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  weatherText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  weatherError: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  weatherErrorText: {
    marginTop: SPACING.sm,
    fontSize: 13,
    color: COLORS.danger,
  },
```

Кожна картка викликає `useWeather` незалежно — у кожної свій стан і свій запит. Коли картку видаляють, функція очищення скасовує її незавершений запит.

### Крок 6. Координати для демонстраційних даних

Місця з `data/places.js` не мають координат, тож погоди для них не буде. Додайте поле `coords` до кількох записів (решту полів залиште як були):

```js title="data/places.js (фрагмент)"
export const PLACES = [
  {
    id: '1',
    title: 'Софійський собор',
    city: 'Київ',
    // ...інші поля без змін
    coords: { latitude: 50.4529, longitude: 30.5143 },
  },
  {
    id: '2',
    title: 'Площа Ринок',
    city: 'Львів',
    // ...
    coords: { latitude: 49.8419, longitude: 24.0315 },
  },
  // ...
];
```

### Крок 7. Асинхронна форма додавання

Під час додавання місця ми тепер робимо запит геокодування, а він займає час. Форма має показувати процес і блокувати повторне натискання. Змініть у `components/AddPlaceForm.js`:

```jsx title="components/AddPlaceForm.js (зміни)"
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

export default function AddPlaceForm({ onAdd }) {
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (isSubmitting) return; // захист від подвійного натискання

    const trimmedTitle = title.trim();
    const trimmedCity = city.trim();

    if (!trimmedTitle || !trimmedCity) {
      setError('Вкажіть назву місця та місто');
      return;
    }
    if (trimmedTitle.length < 3) {
      setError('Назва має містити щонайменше 3 символи');
      return;
    }

    setIsSubmitting(true);
    try {
      // onAdd тепер асинхронна — чекаємо завершення
      await onAdd({
        title: trimmedTitle,
        city: trimmedCity,
        description: description.trim(),
      });
      setTitle('');
      setCity('');
      setDescription('');
      setError('');
    } finally {
      setIsSubmitting(false);
    }
  }

  // return (...) — розмітка форми без змін, крім кнопки «Додати» (див. нижче)
}
```

У JSX замініть кнопку «Додати» на:

```jsx title="components/AddPlaceForm.js (кнопка)"
<Pressable
  onPress={handleSubmit}
  disabled={isSubmitting}
  style={({ pressed }) => [
    styles.button,
    pressed && styles.buttonPressed,
    isSubmitting && styles.buttonDisabled,
  ]}
>
  {isSubmitting ? (
    <ActivityIndicator color={COLORS.white} />
  ) : (
    <Text style={styles.buttonText}>Додати</Text>
  )}
</Pressable>
```

І новий стиль:

```js
  buttonDisabled: {
    opacity: 0.6,
  },
```

Блок `try/finally` гарантує, що `isSubmitting` повернеться у `false`, навіть якщо `onAdd` кине помилку.

### Крок 8. Завантаження та збереження в App.js

Тепер найважливіше: під час запуску читаємо місця зі сховища, після кожної зміни — зберігаємо. Повний код `App.js`:

```jsx title="App.js"
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import Header from './components/Header';
import PlaceCard from './components/PlaceCard';
import AddPlaceForm from './components/AddPlaceForm';
import { PLACES } from './data/places';
import { COLORS, SPACING } from './constants/theme';
import { loadPlaces, savePlaces } from './services/storage';
import { geocodeCity } from './services/weatherApi';

export default function App() {
  const [places, setPlaces] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false); // чи завершилося початкове читання
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // 1. Завантаження під час запуску
  useEffect(() => {
    async function init() {
      const stored = await loadPlaces();
      // null — перший запуск: показуємо демонстраційні дані
      setPlaces(stored ?? PLACES);
      setIsLoaded(true);
    }
    init();
  }, []);

  // 2. Збереження після кожної зміни — але лише ПІСЛЯ завантаження
  useEffect(() => {
    if (!isLoaded) return;
    savePlaces(places);
  }, [places, isLoaded]);

  async function handleAddPlace({ title, city, description }) {
    let coords = null;
    try {
      coords = await geocodeCity(city);
      if (!coords) {
        Alert.alert('Місто не знайдено', 'Місце збережено, але погода для нього недоступна.');
      }
    } catch (error) {
      // Немає мережі чи помилка сервера — все одно зберігаємо місце
      Alert.alert('Немає з\'єднання', 'Не вдалося визначити координати міста.');
    }

    const id = Date.now().toString();
    const newPlace = {
      id,
      title,
      city,
      description,
      image: `https://picsum.photos/seed/${id}/600/400`,
      isFavorite: false,
      coords, // { latitude, longitude } або null
    };
    setPlaces((prev) => [newPlace, ...prev]);
  }

  function handleDeletePlace(id) {
    Alert.alert('Видалити місце?', 'Цю дію не можна скасувати.', [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити',
        style: 'destructive',
        onPress: () => setPlaces((prev) => prev.filter((p) => p.id !== id)),
      },
    ]);
  }

  function handleToggleFavorite(id) {
    setPlaces((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p))
    );
  }

  function handleRefresh() {
    setRefreshing(true);
    // Зміна ключа змушує useWeather у кожній картці перезавантажити погоду
    setRefreshKey((k) => k + 1);
    // Картки показують власні індикатори, тому загальний ховаємо одразу
    setTimeout(() => setRefreshing(false), 500);
  }

  // Поки дані читаються зі сховища — повноекранний індикатор
  if (!isLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderText}>Завантаження місць…</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
        <Header title="Мої місця" count={places.length} />

        <FlatList
          data={places}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PlaceCard
              place={item}
              onDelete={handleDeletePlace}
              onToggleFavorite={handleToggleFavorite}
              refreshKey={refreshKey}
            />
          )}
          ListHeaderComponent={<AddPlaceForm onAdd={handleAddPlace} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Список порожній</Text>
              <Text style={styles.emptyText}>
                Додайте перше місце за допомогою форми вище.
              </Text>
            </View>
          }
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  loaderText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
  },
  listContent: {
    paddingBottom: SPACING.xl,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyText: {
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
```

:::danger[Чому без isLoaded дані зникають]
Порядок подій без прапорця: (1) перший рендер, `places = []`; (2) запускаються обидва ефекти — перший **починає** асинхронне читання, другий **одразу** записує `[]` у сховище; (3) читання завершується — але там уже порожній масив. Користувач втратив усі місця. Прапорець `isLoaded` дозволяє зберігати лише після того, як початкові дані прочитано.
:::

### Крок 9. Перевірка

Запустіть застосунок (`npx expo start`) і перевірте:

1. **Перший запуск:** показуються демонстраційні місця; у карток з `coords` спочатку крутиться індикатор, потім з'являється температура.
2. **Додавання:** введіть «Одеса» — кнопка показує індикатор, після додавання в картці з'являється погода.
3. **Неіснуюче місто:** введіть «Абвгдейка» — з'являється попередження, місце додається без погоди.
4. **Збереження:** додайте місце, позначте улюблене, видаліть одне з демо-місць. Повністю закрийте застосунок (змахніть його зі списку запущених) і відкрийте знову — зміни на місці.
5. **Pull-to-refresh:** потягніть список вниз — погода перезавантажується.
6. **Офлайн:** увімкніть режим «У літаку» на емуляторі й оновіть список — картки показують «—» і текст помилки, але застосунок не падає.

:::tip[Скидання даних]
Щоб знову побачити «перший запуск», тимчасово викличте `clearPlaces()` з `services/storage.js` або очистіть дані застосунку Expo Go у налаштуваннях Android.
:::

## Завдання для самостійного виконання

1. ★ **Повтор запиту.** Поверніть з `useWeather` функцію `retry` і додайте в картку кнопку «Оновити», яка з'являється лише в стані помилки.
2. ★★ **Тайм-аут.** Додайте до `getCurrentWeather` обмеження часу запиту 8 секунд: створіть власний `AbortController` і викликайте `abort()` через `setTimeout`, не забувши поєднати його із зовнішнім `signal` (або використайте `AbortSignal.timeout`, якщо він підтримується).
3. ★★ **Кешування погоди.** Зберігайте останню отриману погоду кожного місця в AsyncStorage (ключ `weather:<id>`) разом з часом отримання. Якщо кешу менше 10 хвилин — не робіть запит.
4. ★★★ **Назва з геокодування.** Повертайте з `geocodeCity` також офіційну назву (`results[0].name`) і країну (`results[0].country`) та показуйте їх у картці замість введеного користувачем рядка.

## Контрольні питання

1. Навіщо виносити роботу з API та AsyncStorage в окремі файли `services/`?
2. Чому `loadPlaces` повертає `null`, а не `[]`, коли даних немає?
3. Що станеться, якщо у хуці `useWeather` вказати залежність `[coords]` замість `[latitude, longitude]`?
4. Яку роль відіграє функція очищення у `useWeather`? Коли саме вона викликається?
5. Чому помилку `AbortError` не показуємо користувачеві?
6. Навіщо прапорець `isLoaded` і що станеться без нього?
7. Як працює pull-to-refresh у `FlatList` і як зміна `refreshKey` змушує картки оновити погоду?
8. Чому ми зберігаємо координати місця під час додавання, а не геокодуємо місто при кожному показі картки?

## Домашнє завдання

Додайте до шапки застосунку рядок «Оновлено: 14:35» — час останнього успішного збереження списку місць:

- `savePlaces` має зберігати також час (`new Date().toISOString()`) під окремим ключем `places:updatedAt`;
- додайте до `services/storage.js` функцію `loadUpdatedAt()`;
- показуйте час у `Header` (форматування: `toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })`).

Орієнтовний час — 30–40 хвилин.

## Що здати

- Посилання на репозиторій з комітом «P4: API та збереження даних».
- Скриншоти: список із погодою в картках; стан помилки погоди (режим «У літаку»); список після перезапуску застосунку зі збереженими змінами.
- Відповіді на контрольні питання.
