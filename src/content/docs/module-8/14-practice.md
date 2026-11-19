---
title: "Збірка та публікація застосунку. Частина 1: оптимізація та перша збірка"
description: Профілюємо й оптимізуємо «Мої місця» (memo, useCallback, useMemo, FlatList), налаштовуємо app.json та EAS і збираємо перший APK для встановлення на телефон.
type: practice
pair: 14
topic: 139
---

## Мета роботи

- Навчитися вимірювати продуктивність застосунку за допомогою React Native DevTools Profiler і Perf Monitor.
- Оптимізувати список місць: `React.memo` для `PlaceCard`, `useCallback` для обробників, `useMemo` для фільтра улюблених, налаштування `FlatList`.
- Підготувати застосунок до релізу: прибрати `console.log`, налаштувати `app.json` (назва, іконки, splash, ідентифікатори пакета).
- Налаштувати EAS (`eas.json` з трьома профілями) і зібрати APK, встановити його на реальний телефон.

## Що потрібно

- Проєкт `my-places` у стані після практичної роботи 6 (геолокація, фото, вкладка «Карта»).
- Безкоштовний акаунт на [expo.dev](https://expo.dev).
- Смартфон на Android для встановлення APK (або Android Emulator). Для iOS встановлення збірок на пристрій потребує платного акаунта Apple Developer, тому в цій роботі збираємо лише Android.
- Графічний редактор (Figma, Canva, GIMP тощо) для іконки та splash.
- Лекція 13 «Оптимізація, публікація застосунків».

## Короткі теоретичні відомості

Кожна зміна стану в `PlacesContext` (наприклад, позначка «улюблене») створює новий масив `places`, і `PlacesScreen` ре-рендериться. За замовчуванням разом з ним ре-рендеряться **усі** картки списку, хоча змінилася одна. `React.memo` дозволяє пропустити рендер картки, якщо її пропси не змінилися, але лише за умови, що обробники (`onPress`, `onDelete`, `onToggleFavorite`) мають **стабільні посилання** — для цього їх загортають у `useCallback`. Обчислення, що повторюються на кожному рендері (фільтр улюблених), кешуються через `useMemo`.

Release-збірка відрізняється від того, що ви бачите в Expo Go: JS вбудований у застосунок і скомпільований Hermes, застосунок має власну назву, іконку, ідентифікатор пакета й підпис. Збирати будемо в хмарі через **EAS Build**: для профілю `preview` результатом буде APK, який можна встановити напряму.

## Хід роботи

### Крок 1. Тестові дані для вимірювань

На трьох-п'яти місцях різницю в продуктивності не видно. Тимчасово додамо генератор тестових місць, який працює лише в режимі розробки.

```js title="data/devSeed.js"
// Генерує N тестових місць для перевірки продуктивності списку
const CITIES = ['Київ', 'Львів', 'Одеса', 'Харків', 'Дніпро', 'Чернівці'];

export function makeTestPlaces(count = 60) {
  return Array.from({ length: count }, (_, i) => ({
    id: `test-${i}`,
    title: `Тестове місце ${i + 1}`,
    city: CITIES[i % CITIES.length],
    description: 'Автоматично згенероване місце для профілювання.',
    image: `https://picsum.photos/seed/place${i}/600/400`,
    isFavorite: i % 4 === 0,
  }));
}
```

У `PlacesScreen` тимчасово додайте кнопку (видима лише при `__DEV__`), яка додає тестові місця через `addPlace`, або просто підставте `makeTestPlaces()` замість `PLACES` у `data/places.js` на час вимірювань.

:::caution
Не забудьте прибрати тестові дані після вимірювань: вони не повинні потрапити в релізну збірку. Якщо ви зберігали їх через AsyncStorage, видаліть застосунок з Expo Go або очистіть сховище.
:::

### Крок 2. Вимірювання «до» оптимізації

1. Запустіть проєкт:

   ```bash
   npx expo start
   ```

2. Відкрийте застосунок на телефоні, потім у терміналі натисніть **`j`** — відкриється React Native DevTools.
3. Перейдіть на вкладку **Profiler**. Натисніть шестерню і увімкніть **Record why each component rendered while profiling** та **Highlight updates when components render**.
4. Натисніть синю кнопку запису, у застосунку двічі позначте якесь місце як улюблене, зупиніть запис.
5. Проаналізуйте **flamegraph**: скільки разів рендерилися `PlaceCard`, скільки мілісекунд зайняв коміт. Наведіть курсор на картку — у підказці «Why did this render?» буде, наприклад, «Parent component rendered» або «Props changed: onPress».
6. Відкрийте меню розробника (струсніть телефон або натисніть `m` у терміналі) → **Toggle Performance Monitor** і швидко прокрутіть список. Запишіть мінімальні значення FPS для JS та UI.

Занесіть результати в таблицю звіту:

| Метрика | До | Після |
| --- | --- | --- |
| Кількість рендерів `PlaceCard` при зміні улюбленого | | |
| Тривалість коміту, мс | | |
| Мінімальний JS FPS під час скролу | | |
| Мінімальний UI FPS під час скролу | | |

### Крок 3. `React.memo` для `PlaceCard`

Внесіть дві зміни в `components/PlaceCard.js`:

1. Картка отримує **стабільні** колбеки від батька і сама передає в них `place.id` (так батьку не потрібно створювати нову стрілкову функцію для кожного елемента).
2. Компонент експортується через `memo`.

```jsx title="components/PlaceCard.js (зміни)" {1,11,14,17,26}
import { memo } from 'react';
// ...інші імпорти без змін

function PlaceCard({ place, refreshKey, onPress, onDelete, onToggleFavorite }) {
  // логіка картки та useWeather — без змін
  const { data: weather, loading, error } = useWeather(place.coords, refreshKey);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => onPress(place.id)}
    >
      {/* ...зображення, назва, місто, погода */}
      <Pressable onPress={() => onToggleFavorite(place.id)} hitSlop={8}>
        {/* іконка серця */}
      </Pressable>
      <Pressable onPress={() => onDelete(place.id)} hitSlop={8}>
        {/* іконка кошика */}
      </Pressable>
    </Pressable>
  );
}

// ...styles

export default memo(PlaceCard);
```

:::note
Залиште розмітку і стилі своєї картки — важливо лише те, що колбеки викликаються з `place.id`, а експорт загорнуто в `memo`. Виклик `useWeather(place.coords, refreshKey)` залишається таким самим, як у практичних 4–5.
:::

Чому це працює: при перемиканні «улюбленого» `PlacesContext` створює новий масив, але об'єкти **незмінених** місць залишаються тими самими (якщо `toggleFavorite` написаний через `places.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p)`). Тому для них `place` — те саме посилання, і `memo` пропускає рендер.

:::caution[Перевірте контекст]
Якщо у вашому `toggleFavorite` або `loadPlaces` створюються нові об'єкти для **всіх** місць (наприклад, `places.map(p => ({ ...p }))`), `memo` не допоможе: кожен `place` буде новим посиланням. Змінюйте лише той об'єкт, який справді змінився.
:::

### Крок 4. `useCallback` і налаштування `FlatList` у `PlacesScreen`

```jsx title="screens/PlacesScreen.js"
import { useCallback } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import PlaceCard from '../components/PlaceCard';
import { usePlaces } from '../context/PlacesContext';
import { COLORS, SPACING } from '../constants/theme';

export default function PlacesScreen({ navigation }) {
  const { places, removePlace, toggleFavorite, isLoaded } = usePlaces();

  // стабільні посилання на обробники — інакше memo(PlaceCard) не спрацює
  const handlePress = useCallback(
    (id) => navigation.navigate('PlaceDetails', { placeId: id }),
    [navigation]
  );

  const handleDelete = useCallback(
    (id) => {
      Alert.alert('Видалити місце?', 'Цю дію не можна скасувати.', [
        { text: 'Скасувати', style: 'cancel' },
        { text: 'Видалити', style: 'destructive', onPress: () => removePlace(id) },
      ]);
    },
    [removePlace]
  );

  const handleToggleFavorite = useCallback(
    (id) => toggleFavorite(id),
    [toggleFavorite]
  );

  // renderItem теж стабільний, щоб FlatList не перерендерював усі рядки
  const renderItem = useCallback(
    ({ item }) => (
      <PlaceCard
        place={item}
        onPress={handlePress}
        onDelete={handleDelete}
        onToggleFavorite={handleToggleFavorite}
      />
    ),
    [handlePress, handleDelete, handleToggleFavorite]
  );

  if (!isLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={places}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      initialNumToRender={6}      // приблизно один екран карток
      maxToRenderPerBatch={6}
      windowSize={7}              // 3 екрани вгору + видимий + 3 вниз
      removeClippedSubviews       // відключати невидимі view (особливо корисно на Android)
      ListEmptyComponent={
        <Text style={styles.empty}>Ще немає жодного місця. Натисніть «+», щоб додати.</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: SPACING.lg },
});
```

Якщо на екрані у вас є додаткові елементи (заголовок `Header`, кнопка додавання), збережіть їх, наприклад, через `ListHeaderComponent`.

:::caution[Стабільність функцій контексту]
`useCallback(..., [removePlace])` дає стабільне посилання лише тоді, коли `removePlace` і `toggleFavorite` у `PlacesContext` самі стабільні. Якщо вони оголошені як звичайні функції всередині `PlacesProvider`, вони перестворюються при кожному оновленні стану. Загорніть їх у `useCallback` з функціональним оновленням стану, а значення контексту — у `useMemo`:

```jsx title="context/PlacesContext.js (фрагмент)"
const toggleFavorite = useCallback((id) => {
  setPlaces((prev) =>
    prev.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p))
  );
}, []);

const removePlace = useCallback((id) => {
  setPlaces((prev) => prev.filter((p) => p.id !== id));
}, []);

const value = useMemo(
  () => ({ places, addPlace, removePlace, toggleFavorite, isLoaded }),
  [places, addPlace, removePlace, toggleFavorite, isLoaded]
);
```

Збереження в AsyncStorage при цьому має відбуватися в `useEffect`, що стежить за `places`, — як і було у вашій реалізації.
:::

### Крок 5. Про `getItemLayout`

`getItemLayout` повідомляє `FlatList` висоту й зміщення кожного елемента без вимірювання. Це пришвидшує перший рендер і дозволяє миттєво виконувати `scrollToIndex`:

```jsx
const CARD_HEIGHT = 260;
const GAP = SPACING.md;

getItemLayout={(_, index) => ({
  length: CARD_HEIGHT + GAP,
  offset: (CARD_HEIGHT + GAP) * index,
  index,
})}
```

Але він коректний **лише для елементів фіксованої висоти**. У наших картках є опис довільної довжини та блок погоди, що з'являється після завантаження, тож висота змінюється. Неправильний `getItemLayout` призводить до «стрибків» і обрізаних елементів. Тому в «Моїх місцях» його не додаємо — або спочатку фіксуємо висоту картки (`height`, `numberOfLines={2}` для опису), і лише тоді вмикаємо.

### Крок 6. `useMemo` для улюблених

```jsx title="screens/FavoritesScreen.js"
import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import PlaceCard from '../components/PlaceCard';
import { usePlaces } from '../context/PlacesContext';
import { COLORS, SPACING } from '../constants/theme';

export default function FavoritesScreen({ navigation }) {
  const { places, removePlace, toggleFavorite } = usePlaces();

  // фільтр перераховується лише при зміні places
  const favorites = useMemo(() => places.filter((p) => p.isFavorite), [places]);

  const handlePress = useCallback(
    (id) => navigation.navigate('PlaceDetails', { placeId: id }),
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <PlaceCard
        place={item}
        onPress={handlePress}
        onDelete={removePlace}
        onToggleFavorite={toggleFavorite}
      />
    ),
    [handlePress, removePlace, toggleFavorite]
  );

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={favorites}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      initialNumToRender={6}
      ListEmptyComponent={
        <Text style={styles.empty}>Тут з'являться місця, позначені сердечком.</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: SPACING.lg },
});
```

Аналогічно в `MapScreen` фільтр `placesWithCoords` вже загорнуто в `useMemo` (практична 6).

### Крок 7. Вимірювання «після»

Повторіть Крок 2 у тих самих умовах (той самий телефон, та сама кількість місць, та сама дія). Тепер при перемиканні улюбленого у flamegraph має бути помітно, що рендериться лише одна картка, а інші позначені сірим («Did not render»). Заповніть стовпчик «Після» у таблиці.

:::tip
Увімкнена опція **Highlight updates** підсвічує на екрані телефону компоненти, що ре-рендеряться. До оптимізації при натисканні серця «спалахують» усі картки, після — лише одна. Зробіть скриншоти обох станів для звіту.
:::

### Крок 8. (Необов'язково) `expo-image` з кешуванням

```bash
npx expo install expo-image
```

У `PlaceCard` замініть імпорт `Image` з `react-native` на `expo-image`:

```jsx title="components/PlaceCard.js (фрагмент)"
import { Image } from 'expo-image';

<Image
  source={{ uri: place.image }}
  style={styles.image}
  contentFit="cover"          // аналог resizeMode="cover"
  transition={200}            // плавна поява
  cachePolicy="memory-disk"   // кеш у пам'яті та на диску
/>
```

Повторно відкрийте список без інтернету — зображення, що вже завантажувалися, мають показатися з кешу.

### Крок 9. Прибираємо `console.log` з продакшн-збірки

Виклики `console.log` у release-збірці сповільнюють JS-потік і можуть розкрити зайву інформацію. Видалимо їх автоматично на етапі збірки.

1. Встановіть плагін Babel:

   ```bash
   npm install --save-dev babel-plugin-transform-remove-console
   ```

2. Створіть конфігурацію Babel (якщо її ще немає):

   ```bash
   npx expo customize babel.config.js
   ```

3. Додайте плагін лише для продакшн-середовища, залишивши `console.error` і `console.warn`:

   ```js title="babel.config.js"
   module.exports = function (api) {
     api.cache(true);
     return {
       presets: ['babel-preset-expo'],
       env: {
         production: {
           // видаляємо console.log/info/debug у релізі, залишаємо помилки та попередження
           plugins: [['transform-remove-console', { exclude: ['error', 'warn'] }]],
         },
       },
     };
   };
   ```

4. Перезапустіть сервер з очищенням кешу: `npx expo start -c`.

Також видаліть тестові дані з Кроку 1 і кнопку генерації місць.

### Крок 10. Налаштування `app.json`

Підготуйте ресурси в папці `assets/`:

| Файл | Розмір | Вимоги |
| --- | --- | --- |
| `icon.png` | 1024×1024 | PNG без прозорості для iOS, без заокруглень (система заокруглить сама) |
| `adaptive-icon.png` | 1024×1024 | Передній план адаптивної іконки Android; важливий вміст — у центральному колі ≈ 66% |
| `splash-icon.png` | наприклад, 1024×1024 | Логотип для splash-екрана на прозорому фоні |

Тепер оновіть `app.json` (повна версія):

```json title="app.json"
{
  "expo": {
    "name": "Мої місця",
    "slug": "my-places",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.student.myplaces",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.student.myplaces",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#E8F1FF"
      },
      "config": {
        "googleMaps": {
          "apiKey": "ВАШ_КЛЮЧ_GOOGLE_MAPS"
        }
      }
    },
    "plugins": [
      [
        "expo-splash-screen",
        {
          "image": "./assets/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#E8F1FF"
        }
      ],
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "Застосунок використовує геолокацію, щоб зберегти координати місця та визначити місто."
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Застосунок відкриває галерею, щоб ви могли додати фото до місця.",
          "cameraPermission": "Застосунок використовує камеру, щоб ви могли сфотографувати місце."
        }
      ]
    ]
  }
}
```

Пояснення ключових полів:

- `name` — назва під іконкою на телефоні (може бути українською);
- `slug` — ідентифікатор проєкту на expo.dev, лише латиниця, цифри й дефіси;
- `version` — версія для користувачів (семантичне версіонування);
- `android.package` та `ios.bundleIdentifier` — **унікальний** ідентифікатор застосунку у форматі зворотного домену. Замініть `student` на своє прізвище латиницею (`com.shevchenko.myplaces`). Після публікації змінити його неможливо;
- `android.versionCode` / `ios.buildNumber` — службові номери збірки (див. практичну 8);
- `expo-splash-screen` — плагін налаштування заставки; якщо пакет ще не встановлено, виконайте `npx expo install expo-splash-screen`.

:::danger[Ключ Google Maps]
Без ключа `android.config.googleMaps.apiKey` у власній Android-збірці вкладка «Карта» показуватиме сірий фон без карти (в Expo Go все працювало, бо там використовується ключ Expo). Створіть ключ у Google Cloud Console: увімкніть **Maps SDK for Android**, створіть API key і обмежте його назвою пакета та SHA-1 відбитком сертифіката (SHA-1 можна побачити командою `eas credentials` після першої збірки). Якщо ключа поки немає, зберіть застосунок без нього і зафіксуйте це у звіті.
:::

Перевірте конфігурацію:

```bash
npx expo-doctor
npx expo config --type public
```

### Крок 11. Встановлення та налаштування EAS CLI

```bash
# встановлюємо EAS CLI глобально
npm install -g eas-cli

# входимо у свій акаунт expo.dev
eas login

# перевіряємо, під яким акаунтом ви увійшли
eas whoami

# створюємо eas.json і прив'язуємо проєкт до expo.dev
eas build:configure
```

На питання про платформу оберіть **All** (або Android). Команда створить проєкт на expo.dev, додасть у `app.json` поле `extra.eas.projectId` і згенерує `eas.json`. Приведіть його до такого вигляду:

```json title="eas.json"
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

Призначення профілів:

| Профіль | Для чого | Результат (Android) |
| --- | --- | --- |
| `development` | Збірка для розробки з `expo-dev-client` (потрібна лише для сторонніх нативних бібліотек) | APK з меню розробника |
| `preview` | Внутрішнє тестування: встановити на свій телефон, дати одногрупникам | APK |
| `production` | Публікація в Google Play | AAB, `versionCode` збільшується автоматично |

:::note
Значення `cli.version` залиште тим, яке згенерував ваш EAS CLI. `appVersionSource: "remote"` означає, що номери збірок (`versionCode`) EAS зберігає на своєму сервері, а значення `android.versionCode` з `app.json` ігнорується. Детально про версіонування — у практичній 8.
:::

Профіль `development` потребує пакета `expo-dev-client`. Якщо ви плануєте його використовувати: `npx expo install expo-dev-client`. Для цієї роботи він не обов'язковий.

### Крок 12. Перша збірка APK

```bash
eas build -p android --profile preview
```

Що відбувається:

1. EAS CLI запитає, чи згенерувати новий **Android Keystore** — відповідайте **Yes**. Ключ зберігатиметься на серверах Expo, і всі наступні збірки підписуватимуться ним.
2. Проєкт архівується і завантажується в хмару (файли з `.gitignore` не потрапляють в архів).
3. Збірка стає в чергу. На безкоштовному тарифі очікування може тривати від кількох хвилин до години — у цей час можна закрити термінал, збірка продовжиться.
4. Прогрес і логи видно за посиланням, яке виведе CLI, або на сторінці проєкту на expo.dev у розділі **Builds**.

Після завершення CLI покаже посилання та **QR-код**.

### Крок 13. Встановлення APK на телефон

1. Відскануйте QR-код камерою телефону або відкрийте посилання на сторінці збірки на expo.dev і натисніть **Install**.
2. Завантажте `.apk` файл.
3. Android попросить дозволити встановлення з невідомих джерел для браузера — дозвольте для цього випадку.
4. Google Play Protect може показати попередження про невідомого розробника — оберіть «Усе одно встановити» (застосунок підписаний вашим ключем, але ще не відомий Google).
5. Відкрийте «Мої місця» з робочого столу. Перевірте:
   - назву й іконку під іконкою на робочому столі;
   - splash-екран при запуску;
   - запити дозволів — тепер у них **ваші** тексти з `app.json`, а в налаштуваннях телефону дозволи належать «Моїм місцям», а не Expo Go;
   - додавання місця з фото та геолокацією, роботу карти, збереження після перезапуску.

:::tip
Порівняйте швидкість запуску й плавність скролу з Expo Go. Release-збірка з Hermes-байткодом помітно швидша: це і є «справжня» продуктивність вашого застосунку. Повторити вимірювання Perf Monitor у релізі не вийде (там немає меню розробника), тому плавність оцініть суб'єктивно й опишіть у звіті.
:::

### Крок 14. Типові помилки збірки

| Симптом | Причина | Рішення |
| --- | --- | --- |
| `Invalid UUID appId` / проєкт не знайдено | Відсутній або чужий `extra.eas.projectId` | Видаліть поле і повторіть `eas build:configure` або `eas init` |
| `Failed to resolve plugin for module "..."` | Плагін зазначено в `plugins`, але пакет не встановлено | `npx expo install <пакет>` |
| Помилки залежностей на етапі `npm install` у хмарі | Несумісні версії, розсинхрон `package-lock.json` | `npx expo install --fix`, `npx expo-doctor`, закомітьте оновлений lock-файл |
| `Gradle build failed` | Нативна помилка; деталі — у логах фази «Run gradlew» | Знайдіть перший рядок з `error:` у логах, перевірте сумісність бібліотек з SDK |
| Збірка проходить, але застосунок одразу закривається | Помилка JS під час старту (у релізі немає червоного екрана) | Запустіть `npx expo start --no-dev --minify` локально, перевірте логи через `adb logcat` |
| Сірий екран замість карти | Немає ключа Google Maps або ключ обмежений іншим пакетом/SHA-1 | Додайте або виправте `android.config.googleMaps.apiKey`, перезберіть |
| `package` вже зайнятий іншим застосунком на expo.dev / Play | Неунікальний `android.package` | Змініть на `com.<прізвище>.myplaces` до першої публікації |
| Застосунок не встановлюється поверх старої версії | Різні ключі підпису | Видаліть стару версію з телефону |

:::note
Зміни в `app.json` (іконка, назва, дозволи, ключ карт) потрапляють у застосунок **лише через нову збірку**. Після кожної такої зміни запускайте `eas build` ще раз.
:::

## Завдання для самостійного виконання

1. ★ Зафіксуйте висоту `PlaceCard` (обмежте опис `numberOfLines={2}`, задайте фіксовану висоту блоку погоди) і додайте коректний `getItemLayout`. Порівняйте час першого рендеру в Profiler.
2. ★★ Замініть `FlatList` на `FlashList` (`npx expo install @shopify/flash-list`) у `PlacesScreen`. Виміряйте FPS під час скролу 100 місць і порівняйте з `FlatList`.
3. ★★ Додайте в `PlaceCard` плавну анімацію сердечка при натисканні з `Animated` і `useNativeDriver: true` (масштаб 1 → 1.3 → 1). Переконайтеся в Profiler, що анімація не викликає ре-рендерів.
4. ★★★ Зберіть профіль `development` з `expo-dev-client` (`eas build -p android --profile development`), встановіть його й підключіться до `npx expo start`. Опишіть у звіті, чим робота з ним відрізняється від Expo Go.

## Контрольні питання

1. Чому без `useCallback` обгортання `PlaceCard` у `React.memo` не дає ефекту?
2. Що означає поверхневе порівняння пропсів? Чому важливо змінювати в масиві `places` лише змінений об'єкт?
3. Які пропси `FlatList` ви налаштували і що робить кожен з них? Чому в нашому проєкті не використано `getItemLayout`?
4. Як відкрити React Native DevTools з Expo CLI і як знайти в Profiler причину ре-рендеру компонента?
5. Як прибрати `console.log` з продакшн-збірки і чому це варто робити?
6. Чим відрізняються поля `name`, `slug` і `android.package` в `app.json`? Яке з них не можна змінити після публікації?
7. Для чого потрібні профілі `development`, `preview`, `production` в `eas.json`? Який формат файлу дає профіль `preview` і чому?
8. Чому у власній збірці карта може бути сірою, хоча в Expo Go все працювало?

## Домашнє завдання

1. Доведіть збірку до робочого стану: APK має встановлюватися і працювати без помилок (фото, геолокація, карта, збереження).
2. Дайте встановити APK двом одногрупникам (посилання зі сторінки збірки) і зберіть від них по 2–3 зауваження щодо інтерфейсу. Виправте хоча б одне.
3. Підготуйте для наступної пари: 4–6 скриншотів застосунку з телефону (вертикальна орієнтація, без особистих даних у статус-барі).

## Що здати

- Посилання на репозиторій з комітом цієї роботи (`perf: memo and list optimization`, `chore: app.json and eas config`).
- Таблицю вимірювань «до/після» і скриншоти flamegraph з Profiler в обох станах.
- Файли `app.json` та `eas.json` (у репозиторії).
- Посилання на сторінку збірки на expo.dev або сам APK-файл.
- Фото/скриншоти застосунку, встановленого з APK: іконка на робочому столі, splash, запит дозволу з вашим текстом, вкладка «Карта».
- Короткий опис проблем, що виникли під час збірки, і як їх розв'язано.
