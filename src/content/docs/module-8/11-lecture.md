---
title: Використання сторонніх бібліотек, карта, камера
description: Екосистема бібліотек React Native, вибір і встановлення пакетів в Expo, модель дозволів, геолокація, карти та камера.
type: lecture
pair: 11
topic: 136
---

## Мета заняття

- Зрозуміти, як влаштована екосистема бібліотек React Native і чим вона відрізняється від екосистеми React для вебу.
- Навчитися обирати бібліотеку за об'єктивними критеріями: підтримка, сумісність з New Architecture та Expo.
- Розрізняти JS-only бібліотеки та бібліотеки з нативним кодом і розуміти, коли потрібна збірка для розробки (development build).
- Опанувати модель дозволів (permissions) Android та iOS і правильно обробляти відмову користувача.
- Ознайомитися з API `expo-location`, `react-native-maps`, `expo-camera` та `expo-image-picker`.
- Отримати огляд інших корисних бібліотек: сповіщення, тактильний відгук, сенсори, анімації, жести.

## План лекції

1. Екосистема npm для React Native і критерії вибору бібліотеки.
2. JS-only та нативні бібліотеки. `npx expo install` і сумісність версій.
3. Expo Go, development build, config plugins і CNG (prebuild).
4. Модель дозволів на Android та iOS.
5. Геолокація: `expo-location`.
6. Карти: `react-native-maps`.
7. Камера та вибір зображень: `expo-camera` vs `expo-image-picker`.
8. Огляд інших корисних бібліотек.

## Екосистема бібліотек React Native

React Native використовує той самий реєстр пакетів **npm**, що й веб. Проте не кожен пакет з npm працює в мобільному застосунку. Бібліотека, яка звертається до `window`, `document`, DOM-елементів або CSS, у React Native просто впаде: тут немає браузера, а компоненти рендеряться у нативні view (`View` → `android.view.View` / `UIView`).

Умовно всі пакети можна поділити на три групи:

| Група | Приклади | Чи працює в RN |
| --- | --- | --- |
| Чистий JavaScript без залежності від DOM | `date-fns`, `lodash`, `zod`, `axios` | Так |
| Бібліотеки для вебу (DOM, CSS) | `react-router-dom`, `chart.js`, `bootstrap` | Ні |
| Бібліотеки, написані спеціально для RN | `react-native-maps`, `expo-camera`, `@react-navigation/native` | Так (але можуть мати нативний код) |

### Як обрати бібліотеку

Для пошуку пакетів існує спеціальний каталог **React Native Directory** — [reactnative.directory](https://reactnative.directory). На відміну від npm, він показує саме те, що важливо мобільному розробнику:

- **платформи** — Android, iOS, Web, чи підтримується кожна з них;
- **Expo Go** — чи працює бібліотека без власної збірки;
- **New Architecture** — чи сумісна з новою архітектурою (Fabric, TurboModules), яка в актуальних версіях Expo SDK увімкнена за замовчуванням;
- **дата останнього оновлення**, кількість завантажень, зірки на GitHub;
- позначки «unmaintained» для покинутих проєктів.

Перед тим як додати залежність, варто пройти короткий чек-лист:

1. Чи є офіційна Expo-бібліотека для цієї задачі (`expo-*`)? Якщо так — найчастіше її і слід брати: вона протестована з поточною версією SDK.
2. Коли був останній реліз? Бібліотека без оновлень понад рік — ризик.
3. Скільки відкритих issues і як швидко на них відповідають?
4. Чи підтримується New Architecture? Якщо ні — у новому проєкті можуть бути проблеми.
5. Чи є нативний код? Якщо так — чи є config plugin для Expo?
6. Яка ліцензія (MIT, Apache 2.0 — безпечно для навчальних і комерційних проєктів)?
7. Наскільки великий пакет і скільки транзитивних залежностей він тягне?

:::tip[Правило мінімалізму]
Кожна залежність — це код, який ви не контролюєте, але за який відповідаєте. Якщо задача вирішується 20 рядками власного коду (наприклад, форматування дати), не додавайте бібліотеку.
:::

## JS-only та нативні бібліотеки

Ключове питання для будь-якої RN-бібліотеки: **чи містить вона нативний код** (Kotlin/Java для Android, Swift/Objective-C для iOS)?

- **JS-only бібліотека** складається лише з JavaScript. Вона потрапляє у JS-бандл, який завантажує застосунок. Її можна додати й одразу використовувати навіть у Expo Go.
- **Нативна бібліотека** містить модулі, які компілюються разом з застосунком. Наприклад, доступ до GPS, камери, Bluetooth неможливий без нативного коду. Такий код не можна «довантажити» в уже зібраний застосунок — його треба **зібрати заново**.

| Характеристика | JS-only | З нативним кодом |
| --- | --- | --- |
| Приклади | `date-fns`, `zustand`, `react-hook-form` | `react-native-maps`, `expo-camera`, `react-native-reanimated` |
| Потрібна перезбірка | Ні | Так |
| Працює в Expo Go | Завжди | Лише якщо модуль вже вбудований в Expo Go |
| Оновлення через OTA | Можливе | Лише JS-частина; зміна нативної частини — нова збірка |

### `npx expo install` замість `npm install`

Нативні бібліотеки жорстко прив'язані до версії React Native. Якщо встановити найновішу версію пакета, вона може вимагати новішого React Native, ніж у вашому проєкті, і застосунок не збереться або впаде під час запуску.

Expo розв'язує цю проблему командою:

```bash
npx expo install expo-location react-native-maps
```

Вона дивиться, яка версія Expo SDK використовується у проєкті, і встановлює **сумісні** версії пакетів (для відомих Expo пакетів). Для інших пакетів команда просто викликає ваш пакетний менеджер (npm, yarn, pnpm).

Корисні суміжні команди:

```bash
# перевірити, чи версії залежностей відповідають SDK
npx expo install --check

# виправити несумісні версії автоматично
npx expo install --fix

# загальна діагностика проєкту
npx expo-doctor
```

:::caution
Звичайний `npm install react-native-maps` встановить останню версію з npm, яка не обов'язково сумісна з вашим SDK. У Expo-проєктах для бібліотек з нативним кодом завжди використовуйте `npx expo install`.
:::

## Expo Go, development build і config plugins

### Expo Go

**Expo Go** — це готовий застосунок з магазину, у який заздалегідь вкомпільовано набір нативних модулів Expo SDK (камера, геолокація, карти, сенсори тощо). Ваш код (JS-бандл) завантажується в нього з комп'ютера через QR-код. Це дуже зручно для навчання, але має обмеження:

- можна використовувати лише ті нативні модулі, які вже є в Expo Go;
- не можна змінити ім'я застосунку, іконку, нативні налаштування (вони належать Expo Go);
- деякі можливості (наприклад, push-сповіщення на Android) в Expo Go обмежені або недоступні;
- Expo Go підтримує лише одну (актуальну) версію SDK.

### Development build

**Збірка для розробки (development build)** — це ваш власний застосунок з бібліотекою `expo-dev-client`. По суті, це «ваш персональний Expo Go», куди вкомпільовано саме ті нативні модулі, які потрібні вашому проєкту.

```bash
npx expo install expo-dev-client

# локальна збірка (потрібні Android Studio / Xcode)
npx expo run:android

# або хмарна збірка через EAS
eas build --profile development --platform android
```

Після встановлення такої збірки на телефон ви запускаєте `npx expo start` і працюєте так само, як з Expo Go: швидке оновлення (Fast Refresh), QR-код, DevTools. Перезбирати потрібно лише тоді, коли додаєте або оновлюєте бібліотеку з нативним кодом чи змінюєте нативну конфігурацію.

| | Expo Go | Development build |
| --- | --- | --- |
| Встановлення | З магазину | Збирається з вашого проєкту |
| Сторонні нативні бібліотеки | Ні | Так |
| Власна іконка, назва, `android.package` | Ні | Так |
| Швидкість старту навчання | Миттєво | Потрібна перша збірка (хвилини) |
| Підходить для продакшн-тестування | Ні | Частково (ближче до реального застосунку) |

### Config plugins і CNG

У керованому (managed) робочому процесі Expo ви не редагуєте вручну папки `android/` та `ios/`. Натомість діє принцип **Continuous Native Generation (CNG)**: нативні проєкти генеруються з `app.json` та залежностей командою:

```bash
npx expo prebuild
```

Щоб бібліотека могла змінити нативні файли (додати дозвіл у `AndroidManifest.xml`, рядок в `Info.plist`, ключ API), вона постачає **config plugin** — функцію, яка під час prebuild модифікує нативний проєкт. Плагіни підключаються у `app.json`:

```json title="app.json"
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "Дозвольте доступ до геолокації, щоб зберігати координати ваших місць."
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "Дозвольте доступ до камери, щоб фотографувати місця."
        }
      ]
    ]
  }
}
```

:::note
Config plugins застосовуються лише під час збірки (prebuild / EAS Build). В Expo Go вони не діють — там використовуються стандартні тексти дозволів самого Expo Go. Тому зміни в `plugins` потребують нової збірки, а не просто перезапуску сервера.
:::

## Модель дозволів (permissions)

Доступ до чутливих даних — геолокації, камери, фото, мікрофона, контактів — захищений операційною системою. Застосунок має **попросити дозвіл під час роботи** (runtime permission), а користувач може погодитися, відмовити або пізніше змінити рішення в налаштуваннях.

### Android та iOS: спільне й відмінне

| Аспект | Android | iOS |
| --- | --- | --- |
| Де оголошуються дозволи | `AndroidManifest.xml` (`<uses-permission>`) | `Info.plist` (ключі `NS...UsageDescription`) |
| Пояснення для користувача | Необов'язкове в маніфесті, система показує стандартний діалог | **Обов'язковий** рядок-пояснення, інакше застосунок впаде або не пройде рев'ю |
| Повторний запит після відмови | Можна ще раз; після двох відмов система більше не показує діалог | Діалог показується лише один раз |
| Геолокація | Точна / приблизна (`ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION`) | Точна / приблизна (вибір користувача) |
| Фото | Обмежений доступ до вибраних фото (нові версії Android) | «Лише вибрані фото» (limited access) |

### Стани дозволу

Більшість Expo-модулів повертають однаковий об'єкт відповіді:

```js
{
  status: 'granted' | 'denied' | 'undetermined',
  granted: true | false,
  canAskAgain: true | false,
  expires: 'never',
}
```

- `undetermined` — ще не питали;
- `granted` — дозволено;
- `denied` + `canAskAgain: true` — відмовили, але можна запитати ще раз;
- `denied` + `canAskAgain: false` — **заблоковано**: системний діалог більше не з'явиться, єдиний шлях — налаштування телефону.

Типовий шаблон обробки:

```jsx
import { Alert, Linking } from 'react-native';
import * as Location from 'expo-location';

async function ensureLocationPermission() {
  const { status, canAskAgain } =
    await Location.requestForegroundPermissionsAsync();

  if (status === 'granted') return true;

  if (!canAskAgain) {
    // діалог більше не показується — ведемо користувача в налаштування
    Alert.alert(
      'Немає доступу до геолокації',
      'Увімкніть дозвіл у налаштуваннях застосунку.',
      [
        { text: 'Скасувати', style: 'cancel' },
        { text: 'Відкрити налаштування', onPress: () => Linking.openSettings() },
      ]
    );
  }
  return false;
}
```

:::tip[Гарні практики]
- Просіть дозвіл **у момент, коли він потрібен** (натиснули «Зробити фото»), а не одразу при старті застосунку.
- Перед системним діалогом поясніть, навіщо доступ потрібен — це підвищує ймовірність згоди.
- Застосунок має залишатися корисним і без дозволу: показуйте альтернативу (ввести місто вручну, вибрати фото з галереї).
- Не просіть фонову геолокацію, якщо вона не потрібна: магазини дуже прискіпливо перевіряють таке обґрунтування.
:::

## Геолокація: `expo-location`

```bash
npx expo install expo-location
```

Основні функції:

| Функція | Призначення |
| --- | --- |
| `requestForegroundPermissionsAsync()` | Запит дозволу на геолокацію, коли застосунок відкритий |
| `requestBackgroundPermissionsAsync()` | Запит фонової геолокації (окремий дозвіл, потребує обґрунтування) |
| `getCurrentPositionAsync(options)` | Одноразове отримання поточних координат |
| `getLastKnownPositionAsync()` | Остання відома позиція (швидко, але може бути застарілою) |
| `watchPositionAsync(options, callback)` | Підписка на зміну позиції (трекінг маршруту) |
| `reverseGeocodeAsync({ latitude, longitude })` | Координати → адреса (місто, вулиця, країна) |
| `geocodeAsync(address)` | Адреса → координати |
| `hasServicesEnabledAsync()` | Чи увімкнено службу геолокації на пристрої |

Приклад одноразового отримання позиції з визначенням міста:

```jsx
import * as Location from 'expo-location';

export async function getCurrentPlace() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Дозвіл на геолокацію не надано');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced, // компроміс між точністю й батареєю
  });

  const { latitude, longitude } = position.coords;
  const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });

  return {
    coords: { latitude, longitude },
    city: address?.city ?? address?.region ?? '',
  };
}
```

Параметр `accuracy` суттєво впливає на швидкість і енергоспоживання: `Lowest` / `Low` використовують мережу (секунди, сотні метрів похибки), `High` / `Highest` вмикають GPS (точно, але довше і витратніше). Для «щоденника місць» цілком достатньо `Balanced`.

Підписка на зміну позиції повертає об'єкт з методом `remove()`, який обов'язково треба викликати при демонтажі компонента:

```jsx
useEffect(() => {
  let subscription;
  (async () => {
    subscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 10 },
      (pos) => setRoute((prev) => [...prev, pos.coords])
    );
  })();
  return () => subscription?.remove(); // відписка, щоб не витрачати батарею
}, []);
```

## Карти: `react-native-maps`

```bash
npx expo install react-native-maps
```

`react-native-maps` — найпоширеніша бібліотека карт для RN. Вона рендерить **нативну** карту: Apple Maps на iOS та Google Maps на Android (на iOS можна також увімкнути Google Maps через `provider={PROVIDER_GOOGLE}`). Бібліотека працює в Expo Go; для продакшн-збірки Android потрібен ключ Google Maps API:

```json title="app.json"
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "ВАШ_КЛЮЧ_GOOGLE_MAPS"
        }
      }
    }
  }
}
```

### Основні компоненти

| Компонент | Призначення |
| --- | --- |
| `MapView` | Сама карта. Пропси: `initialRegion`, `region`, `onRegionChangeComplete`, `showsUserLocation`, `provider`, `mapType` |
| `Marker` | Маркер у точці `coordinate`; `title`, `description`, `pinColor`, `onCalloutPress` |
| `Callout` | Власна «бульбашка» над маркером з довільним вмістом, `onPress` |
| `Polyline` | Лінія через масив координат (маршрут) |
| `Polygon`, `Circle` | Область на карті |

### Регіон

Видима область карти описується об'єктом **region**:

```js
const KYIV_REGION = {
  latitude: 50.4501,      // центр
  longitude: 30.5234,
  latitudeDelta: 0.1,     // «висота» видимої області в градусах
  longitudeDelta: 0.1,    // «ширина» видимої області в градусах
};
```

Чим менші `latitudeDelta`/`longitudeDelta`, тим більше наближення. `initialRegion` задає стартову позицію (далі користувач вільно рухає карту), а `region` робить карту **контрольованою** — як `value` в `<input>`: тоді потрібно оновлювати стан в `onRegionChangeComplete`.

### Маркери, Callout і маршрут

```jsx
import MapView, { Marker, Callout, Polyline } from 'react-native-maps';
import { StyleSheet, Text, View } from 'react-native';

const places = [
  { id: '1', title: 'Софійський собор', coords: { latitude: 50.4529, longitude: 30.5143 } },
  { id: '2', title: 'Андріївська церква', coords: { latitude: 50.4589, longitude: 30.5177 } },
];

export default function MiniMap({ onOpen }) {
  return (
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={{ latitude: 50.456, longitude: 30.516, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
      showsUserLocation
    >
      {places.map((p) => (
        <Marker key={p.id} coordinate={p.coords} pinColor="tomato">
          <Callout onPress={() => onOpen(p.id)}>
            <View style={{ padding: 4 }}>
              <Text style={{ fontWeight: 'bold' }}>{p.title}</Text>
              <Text>Натисніть, щоб відкрити</Text>
            </View>
          </Callout>
        </Marker>
      ))}

      {/* лінія маршруту між точками */}
      <Polyline
        coordinates={places.map((p) => p.coords)}
        strokeColor="#2f80ed"
        strokeWidth={4}
      />
    </MapView>
  );
}
```

:::caution[Висота карти]
`MapView` без явних розмірів має висоту 0 і її просто не видно. Задавайте `style={StyleSheet.absoluteFill}`, `flex: 1` або фіксовану висоту.
:::

Для програмного керування картою використовують ref: `mapRef.current.animateToRegion(region, 500)` або `fitToCoordinates(coords, { edgePadding })` — щоб вмістити всі маркери на екран.

## Камера та вибір зображень

Для роботи з фото в Expo є дві бібліотеки, і їх часто плутають.

| | `expo-image-picker` | `expo-camera` |
| --- | --- | --- |
| Що робить | Відкриває **системну** камеру або галерею й повертає результат | Вбудовує **живий потік камери** у ваш екран |
| UI | Системний, без налаштування | Повністю ваш (кнопки, рамки, накладки) |
| Галерея | Так (`launchImageLibraryAsync`) | Ні |
| Сканування QR/штрихкодів | Ні | Так |
| Відео | Так | Так |
| Складність | Кілька рядків | Окремий екран, стан, ref |
| Коли обирати | «Додати фото до запису» | Сканер, AR-накладки, власна камера |

### `expo-image-picker`

```bash
npx expo install expo-image-picker
```

```jsx
import * as ImagePicker from 'expo-image-picker';

async function takePhoto() {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,   // дозволити обрізати
    aspect: [4, 3],
    quality: 0.7,          // 0..1 — стиснення JPEG
  });

  if (result.canceled) return null;   // користувач закрив камеру
  return result.assets[0].uri;        // локальний file:// URI
}

async function pickFromGallery() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  return result.canceled ? null : result.assets[0].uri;
}
```

:::note
Для вибору з галереї на сучасних версіях Android та iOS дозвіл зазвичай не потрібен — система показує власний захищений вибірник фото. Дозвіл на камеру (`requestCameraPermissionsAsync`) потрібен завжди.
:::

### `expo-camera`

```bash
npx expo install expo-camera
```

Сучасний API — компонент `CameraView` і хук `useCameraPermissions`:

```jsx
import { useRef, useState } from 'react';
import { Button, Image, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [photoUri, setPhotoUri] = useState(null);
  const cameraRef = useRef(null);

  if (!permission) return <View />; // дозволи ще завантажуються

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>Потрібен доступ до камери</Text>
        <Button title="Надати доступ" onPress={requestPermission} />
      </View>
    );
  }

  async function handleShot() {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
    if (photo) setPhotoUri(photo.uri);
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} />
      <View style={styles.controls}>
        <Button title="Перемкнути" onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} />
        <Button title="Знімок" onPress={handleShot} />
      </View>
      {photoUri && <Image source={{ uri: photoUri }} style={styles.preview} />}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  controls: { flexDirection: 'row', justifyContent: 'space-around', padding: 16 },
  preview: { position: 'absolute', top: 16, right: 16, width: 90, height: 120, borderRadius: 8 },
});
```

### Сканування QR-кодів

`CameraView` вміє розпізнавати штрихкоди без додаткових бібліотек:

```jsx
<CameraView
  style={{ flex: 1 }}
  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
  onBarcodeScanned={scanned ? undefined : ({ type, data }) => {
    setScanned(true);         // щоб не обробляти той самий код десятки разів
    Alert.alert('QR-код', data);
  }}
/>
```

:::caution
`onBarcodeScanned` викликається для кожного кадру, у якому видно код. Без прапорця `scanned` ви отримаєте десятки однакових подій за секунду.
:::

## Огляд інших корисних бібліотек

| Бібліотека | Призначення | Примітки |
| --- | --- | --- |
| `expo-notifications` | Локальні та push-сповіщення | Push на Android потребує development build і налаштування FCM |
| `expo-haptics` | Тактильний відгук (вібрація при натисканні) | `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` |
| `expo-sensors` | Акселерометр, гіроскоп, магнітометр, крокомір, барометр | Підписка через `addListener`, частота `setUpdateInterval` |
| `react-native-reanimated` | Високопродуктивні анімації на UI-потоці | Worklets, `useSharedValue`, `useAnimatedStyle` |
| `react-native-gesture-handler` | Нативні жести: свайпи, pinch, pan | Працює в парі з Reanimated, використовується в навігації |
| `expo-image` | Компонент зображень з кешуванням і плейсхолдерами | Заміна стандартного `Image` |
| `expo-file-system` | Робота з файлами на пристрої | Копіювання фото у постійну папку застосунку |
| `expo-secure-store` | Зашифроване сховище для токенів | Замість AsyncStorage для секретів |

Короткі приклади:

```jsx
import * as Haptics from 'expo-haptics';
// легкий «клік» при додаванні в улюблені
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
```

```jsx
import { Accelerometer } from 'expo-sensors';

useEffect(() => {
  Accelerometer.setUpdateInterval(200); // мс
  const sub = Accelerometer.addListener(({ x, y, z }) => setData({ x, y, z }));
  return () => sub.remove();
}, []);
```

```jsx
import * as Notifications from 'expo-notifications';

// локальне сповіщення через 5 секунд
await Notifications.scheduleNotificationAsync({
  content: { title: 'Мої місця', body: 'Не забудьте додати фото сьогоднішнього місця!' },
  trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
});
```

```jsx
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

function HeartButton() {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPress = () => {
    scale.value = withSpring(1.3, {}, () => { scale.value = withSpring(1); });
  };
  return <Animated.View style={style}>{/* іконка */}</Animated.View>;
}
```

Детальніше про Reanimated і продуктивність анімацій — на лекції 13.

## Підсумки

- React Native користується реєстром npm, але веб-бібліотеки, прив'язані до DOM, у ньому не працюють. Для пошуку RN-пакетів використовуйте React Native Directory.
- Обираючи бібліотеку, перевіряйте підтримку, сумісність з New Architecture та Expo, ліцензію і розмір. Офіційним `expo-*` пакетам варто надавати перевагу.
- Бібліотеки з нативним кодом потребують перезбірки застосунку; `npx expo install` підбирає версії, сумісні з SDK.
- Expo Go обмежений вбудованим набором модулів; для сторонніх нативних бібліотек потрібна збірка для розробки з `expo-dev-client`.
- Config plugins змінюють нативну конфігурацію під час prebuild (CNG): дозволи, ключі API, тексти пояснень.
- Дозволи запитують під час роботи; враховуйте стани `granted`, `denied`, `undetermined` і `canAskAgain: false` (направлення в налаштування через `Linking.openSettings()`).
- `expo-location` дає координати та зворотне геокодування, `react-native-maps` — нативні карти з маркерами, callout і лініями, `expo-image-picker` — системна камера й галерея, `expo-camera` — вбудований потік камери та сканер QR.

## Контрольні питання

1. Чому бібліотека `react-router-dom` не працює в React Native, а `date-fns` працює?
2. Які критерії слід перевірити перед додаванням бібліотеки до проєкту? Яку інформацію дає React Native Directory?
3. Чим відрізняється `npx expo install` від `npm install`? Що робить `npx expo install --fix`?
4. У яких випадках неможливо обійтися Expo Go і потрібна збірка для розробки (development build)?
5. Що таке config plugin і CNG? Чому зміни в `plugins` не застосовуються в Expo Go?
6. Опишіть стани дозволу. Що означає `canAskAgain: false` і як має реагувати застосунок?
7. Чим відрізняються `initialRegion` і `region` у `MapView`? Що задають `latitudeDelta` і `longitudeDelta`?
8. Порівняйте `expo-camera` та `expo-image-picker`. Яку бібліотеку оберете для додавання фото до запису, а яку для сканера QR-кодів?
9. Навіщо викликати `remove()` у підписок `watchPositionAsync` та сенсорів?

## Домашнє завдання

1. На [reactnative.directory](https://reactnative.directory) знайдіть дві бібліотеки для однієї задачі (наприклад, дві бібліотеки для вибору дати або для графіків). Порівняйте їх у таблиці за критеріями: платформи, Expo Go, New Architecture, дата останнього релізу, завантаження за тиждень, ліцензія. Напишіть 3–4 речення з обґрунтуванням вибору.
2. У тестовому Expo-проєкті створіть екран, який після натискання кнопки показує ваші поточні координати та назву міста (`expo-location`), а при відмові в дозволі пропонує відкрити налаштування.

**Що здати:** таблицю порівняння з висновком (у звіті) та скриншот екрана з координатами і скриншот діалогу відмови.
