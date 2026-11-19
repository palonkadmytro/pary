---
title: Побудова інтерфейсу мобільного застосунку
description: Створюємо статичний інтерфейс застосунку «Мої місця» — дані, компоненти Header і PlaceCard, розмітка на Flexbox і стилі через StyleSheet.
type: practice
pair: 4
topic: 129
---

## Мета роботи

- Навчитися розбивати інтерфейс мобільного застосунку на перевикористовувані компоненти.
- Закріпити роботу з `View`, `Text`, `Image`, `ScrollView` і `SafeAreaView`.
- Опанувати стилізацію через `StyleSheet.create` і розмітку на Flexbox.
- Побудувати статичний екран списку місць у застосунку «Мої місця».

## Що потрібно

- Результат практичної роботи №1: проєкт `my-places`, що запускається на емуляторі або телефоні.
- Запущений Android-емулятор або телефон з Expo Go.
- Знання з лекції «Компоненти інтерфейсу в React Native».

## Короткі теоретичні відомості

**Компонентний підхід.** Екран розбивається на незалежні частини: шапка (`Header`), картка місця (`PlaceCard`), список. Кожен компонент отримує дані через пропси і не знає, звідки вони взялися. Дані зберігаються окремо (`data/places.js`) — пізніше ми замінимо їх на стан і сховище, не змінюючи компонентів відображення.

**StyleSheet.** `StyleSheet.create({...})` створює об'єкт стилів. Переваги порівняно з інлайн-об'єктами: стилі визначені один раз поза функцією компонента (не створюються наново при кожному рендерингу), код компонента чистіший, редактор підказує властивості.

**Flexbox у RN** відрізняється від вебу значеннями за замовчуванням:

| Властивість | Веб | React Native |
|---|---|---|
| `flexDirection` | `row` | `column` |
| `alignContent` | `normal` | `flex-start` |
| `flexShrink` | `1` | `0` |
| `flex` | скорочення `grow shrink basis` | одне число: `flex: 1` — зайняти вільний простір |

Розміри задаються числами без одиниць — це **незалежні від щільності пікселі** (density-independent pixels, dp): на екранах з різною щільністю елемент матиме однаковий фізичний розмір.

**Структура екрана, який ми побудуємо:**

```text
┌──────────────────────────────┐
│ SafeAreaView                  │
│ ┌──────────────────────────┐ │
│ │ Header: «Мої місця», 4 місця│ │
│ └──────────────────────────┘ │
│ ScrollView                    │
│ ┌──────────────────────────┐ │
│ │ PlaceCard                 │ │
│ │ [  зображення 16:9     ]  │ │
│ │ Назва            ♥        │ │
│ │ Місто                     │ │
│ │ Опис (2 рядки)...         │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ PlaceCard ...             │ │
└──────────────────────────────┘
```

## Хід роботи

### Крок 1. Підготовка проєкту

1. Відкрийте проєкт `my-places` і запустіть сервер розробки:

   ```bash
   cd my-places
   npx expo start
   ```

2. Встановіть бібліотеку безпечних зон (вона знадобиться і для навігації в наступних роботах):

   ```bash
   npx expo install react-native-safe-area-context
   ```

   Команда `npx expo install` (на відміну від `npm install`) підбирає версію пакета, сумісну з версією Expo SDK вашого проєкту. Для бібліотек з нативним кодом завжди використовуйте саме її.

3. Створіть структуру папок:

   ```bash
   mkdir data components
   ```

   Після роботи проєкт матиме вигляд:

   ```text
   my-places/
   ├── App.js
   ├── components/
   │   ├── Header.js
   │   └── PlaceCard.js
   ├── data/
   │   └── places.js
   └── ...
   ```

### Крок 2. Тестові дані

Створіть файл з масивом місць. Кожне місце — об'єкт з полями `id`, `title`, `city`, `description`, `image` (URL зображення) і `isFavorite`.

```js title="data/places.js"
// Тестові дані для застосунку «Мої місця».
// Зображення — з сервісу picsum.photos (за id завжди повертається одне й те саме фото).
export const PLACES = [
  {
    id: '1',
    title: 'Софійський собор',
    city: 'Київ',
    description:
      'Пам’ятка архітектури XI століття з унікальними мозаїками та фресками. ' +
      'З дзвіниці відкривається чудовий краєвид на центр міста.',
    image: 'https://picsum.photos/id/1040/800/450',
    isFavorite: true,
  },
  {
    id: '2',
    title: 'Площа Ринок',
    city: 'Львів',
    description:
      'Серце старого Львова: ратуша, кам’яниці різних епох, кав’ярні та ' +
      'вуличні музиканти. Обов’язково піднятися на вежу ратуші.',
    image: 'https://picsum.photos/id/1067/800/450',
    isFavorite: false,
  },
  {
    id: '3',
    title: 'Потьомкінські сходи',
    city: 'Одеса',
    description:
      'Знамениті сходи з оптичною ілюзією: знизу видно лише сходинки, ' +
      'а згори — лише майданчики. Поруч — Приморський бульвар.',
    image: 'https://picsum.photos/id/1015/800/450',
    isFavorite: false,
  },
  {
    id: '4',
    title: 'Говерла',
    city: 'Ворохта',
    description:
      'Найвища вершина України (2061 м). Підйом з бази «Заросляк» займає ' +
      '2–3 години, у ясну погоду видно пів Карпат.',
    image: 'https://picsum.photos/id/1018/800/450',
    isFavorite: true,
  },
];
```

:::tip
Іменований експорт (`export const PLACES`) імпортується у фігурних дужках: `import { PLACES } from './data/places';`. Розширення `.js` в імпорті можна не писати.
:::

### Крок 3. Компонент Header

Шапка показує назву застосунку і кількість місць, яку отримує через пропс.

```jsx title="components/Header.js"
import { StyleSheet, Text, View } from 'react-native';

// Допоміжна функція: правильна форма слова «місце» для числа
function pluralizePlaces(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'місце';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'місця';
  return 'місць';
}

export default function Header({ title, count }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {count} {pluralizePlaces(count)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',          // елементи в рядок
    justifyContent: 'space-between', // заголовок ліворуч, бейдж праворуч
    alignItems: 'center',          // вирівнювання по вертикалі
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth, // найтонша лінія для екрана
    borderBottomColor: '#cbd5e1',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
  },
  badge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,             // «пігулка»: дуже великий радіус
  },
  badgeText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '600',
  },
});
```

Зверніть увагу: колір тексту бейджа задано на `Text` (`badgeText`), а не на `View` (`badge`), — стилі з `View` не успадковуються.

### Крок 4. Компонент PlaceCard

Картка отримує об'єкт `place` і відображає зображення, назву, місто та опис.

```jsx title="components/PlaceCard.js"
import { Image, StyleSheet, Text, View } from 'react-native';

export default function PlaceCard({ place }) {
  const { title, city, description, image, isFavorite } = place;

  return (
    <View style={styles.card}>
      {/* Зображення з мережі: обов'язково задаємо розміри */}
      <Image source={{ uri: image }} style={styles.image} />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {/* Поки що статичний індикатор улюбленого місця */}
          <Text style={[styles.heart, isFavorite && styles.heartActive]}>
            {isFavorite ? '♥' : '♡'}
          </Text>
        </View>

        <Text style={styles.city}>{city}</Text>

        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden', // щоб зображення не виходило за заокруглені кути
    marginBottom: 16,

    // Тінь для iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    // Тінь для Android
    elevation: 3,
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 9, // висота обчислюється з ширини
    backgroundColor: '#e2e8f0', // фон, поки зображення завантажується
  },
  body: {
    padding: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,         // заголовок займає весь вільний простір, серце — праворуч
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginRight: 8,
  },
  heart: {
    fontSize: 22,
    color: '#94a3b8',
  },
  heartActive: {
    color: '#ef4444',
  },
  city: {
    marginTop: 2,
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  description: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
});
```

:::caution[Чому `overflow: 'hidden'` і тінь можуть конфліктувати]
На iOS `overflow: 'hidden'` обрізає не лише вміст, а й тінь елемента. Якщо тінь на iOS не видно — винесіть тінь на зовнішню `View`-обгортку, а `overflow: 'hidden'` і `borderRadius` — на внутрішню. На Android `elevation` з `overflow: 'hidden'` працює коректно. Це завдання для самостійної роботи нижче.
:::

### Крок 5. Збирання екрана в App.js

```jsx title="App.js"
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import Header from './components/Header';
import PlaceCard from './components/PlaceCard';
import { PLACES } from './data/places';

export default function App() {
  return (
    <SafeAreaProvider>
      {/* Відступи лише згори та з боків: знизу список може заходити під жест-панель */}
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header title="Мої місця" count={PLACES.length} />

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {PLACES.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </ScrollView>

        <StatusBar style="dark" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,                    // на весь екран
    backgroundColor: '#ffffff', // колір під рядком стану збігається з Header
  },
  list: {
    flex: 1,                    // ScrollView займає все місце під шапкою
    backgroundColor: '#f1f5f9',
  },
  listContent: {
    padding: 16,
  },
});
```

Збережіть файли і перевірте результат на емуляторі: шапка з бейджем «4 місця», нижче — картки, що прокручуються.

:::note
Тут ми навмисно використовуємо `ScrollView` + `map()`, бо список короткий і статичний. На практичній №3 замінимо його на `FlatList`, коли місця стануть динамічними.
:::

### Крок 6. Перевірка розмітки інспектором

1. Відкрийте меню розробника (`m` у терміналі) → **Toggle Element Inspector**.
2. Натисніть на заголовок картки — перевірте, що в нього `flex: 1` і він стискається, коли назва довга.
3. Тимчасово змініть `title` одного місця на дуже довгий рядок — переконайтеся, що він обрізається з «…», а серце залишається праворуч.
4. Поверніть емулятор в альбомну орієнтацію (якщо в `app.json` `orientation` = `portrait`, тимчасово змініть на `default` і перезапустіть) — картки мають розтягнутися на всю ширину.

### Крок 7. Рефакторинг: виносимо кольори

Ви, напевно, помітили, що кольори (`#0f172a`, `#2563eb`, `#475569`) повторюються в кількох файлах. На наступній практичній ми створимо файл теми `constants/theme.js`. Поки що достатньо пересвідчитися, що в коді немає інлайн-стилів (`style={{ ... }}`) — усі стилі мають бути в `StyleSheet.create`.

### Крок 8. Коміт

```bash
git add .
git commit -m "P2: static places list UI (Header, PlaceCard)"
git push
```

**Результат роботи:** застосунок показує шапку «Мої місця» з кількістю місць і прокручуваний список карток із зображенням, назвою, містом, описом та індикатором улюбленого місця.

## Завдання для самостійного виконання

1. ★ Додайте у `data/places.js` ще 2–3 місця, які ви відвідали. Переконайтеся, що бейдж у шапці показує правильну форму слова («5 місць», «6 місць»).
2. ★ Додайте в `Header` необов'язковий пропс `subtitle` (наприклад, «Мій щоденник подорожей»), що виводиться під заголовком дрібним сірим текстом, лише якщо його передано.
3. ★★ Виправте проблему тіні на iOS: розділіть картку на зовнішню `View` (тінь, `borderRadius`, `marginBottom`) і внутрішню (`overflow: 'hidden'`, `borderRadius`). Перевірте на iOS Simulator або в Snack з iOS-попереднім переглядом.
4. ★★★ Створіть компонент `components/PlaceCardCompact.js` — горизонтальну картку (зображення 80×80 ліворуч, текст праворуч) — і зробіть так, щоб на широких екранах (ширина > 600 dp, перевірте через `useWindowDimensions()`) список відображав картки у дві колонки (`flexDirection: 'row'`, `flexWrap: 'wrap'`, ширина картки ~48%).

## Контрольні питання

1. Чому дані місць винесено в окремий файл, а не записано прямо в `App.js`?
2. Які переваги `StyleSheet.create` порівняно з інлайн-стилями?
3. Яке значення `flexDirection` за замовчуванням у RN? Як розташувати елементи в рядок?
4. Навіщо заголовку в `PlaceCard` властивість `flex: 1`?
5. Чому для зображення з мережі обов'язково потрібні розміри? Як працює `aspectRatio`?
6. Чим відрізняються тіні на iOS і Android? Які властивості відповідають за кожну платформу?
7. Навіщо потрібні `SafeAreaProvider` і `SafeAreaView`? Що задає проп `edges`?
8. Чому колір тексту бейджа задається на `Text`, а не на батьківському `View`?

## Домашнє завдання

1. Замініть зображення picsum на власні фото місць (завантажте їх на будь-який хостинг зображень і вставте прямі посилання) або на інші id picsum, які відповідають тематиці.
2. Додайте до кожного місця поле `visitedAt` (рядок дати, наприклад `'2025-08-14'`) і виведіть його в `PlaceCard` у форматі «Відвідано: 14.08.2025». Форматування винесіть в окрему функцію `utils/formatDate.js`.
3. Зробіть коміт `P2: visited date`.

## Що здати

- Скриншот головного екрана з усіма картками (верхня частина) і скриншот після прокручування донизу.
- Скриншот з увімкненим Element Inspector, на якому видно стилі заголовка картки.
- Посилання на репозиторій з комітами цієї роботи (видно файли `data/places.js`, `components/Header.js`, `components/PlaceCard.js`).
- Відповіді на контрольні питання у звіті.
