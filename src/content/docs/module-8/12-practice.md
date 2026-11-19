---
title: Карта, камера, інтеграція бібліотек
description: Додаємо у «Мої місця» геолокацію, фото з камери та галереї, вкладку з картою і міні-карту на екрані деталей.
type: practice
pair: 12
topic: 137
---

## Мета роботи

- Інтегрувати в застосунок «Мої місця» бібліотеки, що працюють з апаратними можливостями пристрою: `expo-location`, `expo-image-picker`, `react-native-maps`.
- Навчитися запитувати дозволи, обробляти відмову та заблокований стан, направляти користувача в налаштування.
- Винести роботу з пристроєм у повторно використовувані компоненти `ImagePickerField` і `LocationPickerField`.
- Додати третю вкладку «Карта» з маркерами всіх місць та міні-карту на екрані деталей.
- Налаштувати config plugins і тексти дозволів у `app.json`.

## Що потрібно

- Проєкт `my-places` у стані після практичної роботи 5 (контекст `PlacesContext`, навігація зі stack та bottom tabs, збереження в AsyncStorage).
- Node.js LTS, редактор коду, Expo CLI (через `npx expo`).
- Фізичний смартфон з Expo Go (бажано): емулятор теж підійде, але камера й GPS там імітуються. В Android Emulator координати задаються в меню **Extended controls → Location**, в iOS Simulator — **Features → Location**.
- Лекція 11 «Використання сторонніх бібліотек, карта, камера».

## Короткі теоретичні відомості

Усі три бібліотеки цієї роботи містять нативний код, але вже вбудовані в Expo Go, тому для розробки окрема збірка не потрібна. Встановлюємо їх лише через `npx expo install`, щоб отримати версії, сумісні з актуальною версією Expo SDK.

Дозволи запитуються під час роботи. Об'єкт відповіді містить `status` (`granted` / `denied` / `undetermined`) та `canAskAgain`. Якщо `canAskAgain === false`, системний діалог більше не з'явиться, і єдине, що може зробити застосунок, — відкрити налаштування через `Linking.openSettings()`.

`expo-image-picker` повертає `{ canceled, assets }`; URI вибраного зображення — `result.assets[0].uri` (локальний `file://`). `react-native-maps` рендерить нативну карту; видима область задається регіоном `{ latitude, longitude, latitudeDelta, longitudeDelta }`.

Тексти пояснень дозволів задаються через config plugins у `app.json`. В Expo Go вони не застосовуються (там тексти самого Expo Go), але будуть потрібні для власних збірок у практичних 7–8.

## Хід роботи

### Крок 1. Встановлення бібліотек

У корені проєкту виконайте:

```bash
npx expo install expo-location expo-image-picker react-native-maps
```

Переконайтеся, що версії узгоджені:

```bash
npx expo install --check
```

Після встановлення перезапустіть сервер розробки з очищенням кешу:

```bash
npx expo start -c
```

### Крок 2. Налаштування `app.json`

Додайте плагіни з текстами дозволів українською. Тексти мають чесно пояснювати, **навіщо** застосунку доступ — Apple відхиляє застосунки з розмитими поясненнями на кшталт «Потрібен доступ».

```json title="app.json" {6-27}
{
  "expo": {
    "name": "my-places",
    "slug": "my-places",
    "version": "1.0.0",
    "plugins": [
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
    ],
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

:::note[Ключ Google Maps]
У Expo Go карта працює без вашого ключа. Ключ `android.config.googleMaps.apiKey` знадобиться для власної збірки Android (практична 7). Його створюють у Google Cloud Console (API «Maps SDK for Android»). Поки ключа немає, блок `android.config` можна не додавати. Не публікуйте реальний ключ у відкритому репозиторії без обмежень за назвою пакета.
:::

Решту полів `app.json` (іконка, splash тощо) залиште без змін.

### Крок 3. Плейсхолдер і кольори

Коли користувач не додав фото, застосунок має показати зображення-заглушку. Додайте константу в `constants/theme.js`:

```js title="constants/theme.js (додати в кінець файлу)"
// заглушка, якщо користувач не додав фото
export const PLACEHOLDER_IMAGE = 'https://placehold.co/600x400/png?text=My+Place';

// стартовий регіон карти, якщо немає жодного місця з координатами
export const DEFAULT_REGION = {
  latitude: 50.4501,
  longitude: 30.5234,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};
```

:::caution[Ключі кольорів]
У коді нижче використовуються `COLORS.primary`, `COLORS.background`, `COLORS.card`, `COLORS.text`, `COLORS.textSecondary`, `COLORS.border`, `COLORS.danger`, а також `SPACING.sm/md/lg` і `RADIUS.md`. Якщо у вашому `theme.js` якихось ключів немає або вони названі інакше, додайте їх або замініть у коді на свої.
:::

### Крок 4. Компонент `LocationPickerField`

Компонент відповідає за все, що пов'язано з геолокацією: запит дозволу, отримання координат, зворотне геокодування, індикатор завантаження та повідомлення про помилку. Наверх він повертає `{ coords, city }` через проп `onLocate`.

```jsx title="components/LocationPickerField.js"
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

export default function LocationPickerField({ coords, onLocate }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Запит дозволу з обробкою заблокованого стану
  async function ensurePermission() {
    const { status, canAskAgain } =
      await Location.requestForegroundPermissionsAsync();

    if (status === 'granted') return true;

    if (!canAskAgain) {
      Alert.alert(
        'Доступ до геолокації заблоковано',
        'Щоб визначати місцезнаходження, увімкніть дозвіл у налаштуваннях телефону.',
        [
          { text: 'Скасувати', style: 'cancel' },
          { text: 'Налаштування', onPress: () => Linking.openSettings() },
        ]
      );
    } else {
      setError('Без дозволу визначити місцезнаходження неможливо. Введіть місто вручну.');
    }
    return false;
  }

  async function handleLocate() {
    setError(null);
    const allowed = await ensurePermission();
    if (!allowed) return;

    setIsLoading(true);
    try {
      // перевіряємо, чи увімкнена служба геолокації (GPS) на пристрої
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setError('Увімкніть геолокацію на пристрої та спробуйте ще раз.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;

      // координати -> адреса
      let city = '';
      try {
        const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
        city = address?.city ?? address?.subregion ?? address?.region ?? '';
      } catch {
        // геокодування може не спрацювати без інтернету — координати все одно зберігаємо
      }

      onLocate({ coords: { latitude, longitude }, city });
    } catch (e) {
      setError('Не вдалося визначити місцезнаходження. Спробуйте ще раз.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={handleLocate}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : (
          <Ionicons name="locate" size={20} color={COLORS.primary} />
        )}
        <Text style={styles.buttonText}>Моє місцезнаходження</Text>
      </Pressable>

      {coords && (
        <Text style={styles.coords}>
          {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
        </Text>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
  },
  pressed: { opacity: 0.6 },
  buttonText: { color: COLORS.primary, fontWeight: '600' },
  coords: { marginTop: SPACING.sm, color: COLORS.textSecondary, textAlign: 'center' },
  error: { marginTop: SPACING.sm, color: COLORS.danger, textAlign: 'center' },
});
```

Зверніть увагу: помилка зворотного геокодування не скасовує отримані координати. Застосунок завжди має «деградувати» м'яко — краще зберегти точку без назви міста, ніж нічого.

### Крок 5. Компонент `ImagePickerField`

Компонент показує прев'ю обраного фото (або заглушку) та дві кнопки: «Зробити фото» і «З галереї». Наверх передає URI через `onChange`.

```jsx title="components/ImagePickerField.js"
import { Alert, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, PLACEHOLDER_IMAGE, RADIUS, SPACING } from '../constants/theme';

const PICKER_OPTIONS = {
  mediaTypes: ['images'],
  allowsEditing: true, // обрізання перед збереженням
  aspect: [4, 3],
  quality: 0.6,        // стискаємо, щоб не зберігати фото на 10 МБ
};

function showSettingsAlert(what) {
  Alert.alert(
    'Немає доступу',
    `Доступ до ${what} заборонено. Увімкніть його в налаштуваннях телефону.`,
    [
      { text: 'Скасувати', style: 'cancel' },
      { text: 'Налаштування', onPress: () => Linking.openSettings() },
    ]
  );
}

export default function ImagePickerField({ imageUri, onChange }) {
  async function handleTakePhoto() {
    const { granted, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      if (!canAskAgain) showSettingsAlert('камери');
      return;
    }

    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    if (!result.canceled) {
      onChange(result.assets[0].uri);
    }
  }

  async function handlePickFromGallery() {
    // на сучасних Android/iOS системний вибірник фото працює без окремого дозволу
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (!result.canceled) {
      onChange(result.assets[0].uri);
    }
  }

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: imageUri || PLACEHOLDER_IMAGE }}
        style={styles.preview}
      />
      {!imageUri && <Text style={styles.hint}>Фото ще не додано</Text>}

      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={handleTakePhoto}
        >
          <Ionicons name="camera" size={20} color={COLORS.primary} />
          <Text style={styles.buttonText}>Зробити фото</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={handlePickFromGallery}
        >
          <Ionicons name="images" size={20} color={COLORS.primary} />
          <Text style={styles.buttonText}>З галереї</Text>
        </Pressable>
      </View>

      {imageUri && (
        <Pressable onPress={() => onChange(null)}>
          <Text style={styles.remove}>Видалити фото</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  preview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.border,
  },
  hint: { marginTop: SPACING.sm, color: COLORS.textSecondary, textAlign: 'center' },
  row: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
  },
  pressed: { opacity: 0.6 },
  buttonText: { color: COLORS.primary, fontWeight: '600' },
  remove: { marginTop: SPACING.sm, color: COLORS.danger, textAlign: 'center' },
});
```

:::caution[Тимчасові файли]
URI з `expo-image-picker` вказує на файл у кеші застосунку. Система може очистити кеш, і тоді фото зникне. Для навчального проєкту це прийнятно; правильне рішення — скопіювати файл у постійну папку через `expo-file-system` (див. завдання для самостійного виконання).
:::

### Крок 6. Оновлення форми `AddPlaceForm`

Додамо до форми стан `imageUri` і `coords` та вбудуємо нові компоненти. Коли `LocationPickerField` повертає місто, воно автоматично підставляється в поле «Місто» (користувач може його виправити).

```jsx title="components/AddPlaceForm.js"
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import ImagePickerField from './ImagePickerField';
import LocationPickerField from './LocationPickerField';
import { COLORS, PLACEHOLDER_IMAGE, RADIUS, SPACING } from '../constants/theme';

export default function AddPlaceForm({ onAdd }) {
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [coords, setCoords] = useState(null);

  function handleLocate({ coords: newCoords, city: detectedCity }) {
    setCoords(newCoords);
    if (detectedCity) setCity(detectedCity);
  }

  function handleCityChange(text) {
    setCity(text);
    // місто змінено вручну — старі координати можуть не відповідати новому місту
    setCoords(null);
  }

  function handleSubmit() {
    if (!title.trim() || !city.trim()) {
      Alert.alert('Заповніть форму', 'Назва та місто є обов\'язковими.');
      return;
    }

    onAdd({
      title: title.trim(),
      city: city.trim(),
      description: description.trim(),
      image: imageUri || PLACEHOLDER_IMAGE,
      isFavorite: false,
      // якщо coords немає, PlacesContext сам геокодує місто
      ...(coords && { coords }),
    });
  }

  return (
    <View>
      <ImagePickerField imageUri={imageUri} onChange={setImageUri} />

      <Text style={styles.label}>Назва</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Наприклад, Софійський собор"
      />

      <Text style={styles.label}>Місто</Text>
      <TextInput
        style={styles.input}
        value={city}
        onChangeText={handleCityChange}
        placeholder="Київ"
      />

      <LocationPickerField coords={coords} onLocate={handleLocate} />

      <Text style={styles.label}>Опис</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Що вам запам'яталося?"
        multiline
      />

      <Pressable
        style={({ pressed }) => [styles.submit, pressed && { opacity: 0.8 }]}
        onPress={handleSubmit}
      >
        <Text style={styles.submitText}>Зберегти місце</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: SPACING.sm, fontWeight: '600', color: COLORS.text },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.card,
    color: COLORS.text,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  submit: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
```

Тепер форма передає ще й `image` та, можливо, `coords`. Але `addPlace` у `context/PlacesContext.js` (практична 5) приймає лише `title`, `city`, `description` і завжди геокодує місто. Оновіть його, щоб він використовував готові координати та фото, якщо вони є:

```jsx title="context/PlacesContext.js (зміни в addPlace)" {1,2,4,20,22}
const addPlace = useCallback(async ({ title, city, description, image, coords: givenCoords }) => {
  let coords = givenCoords ?? null;
  // геокодуємо місто лише тоді, коли координат від GPS немає
  if (!coords) {
    try {
      coords = await geocodeCity(city);
      if (!coords) {
        Alert.alert('Місто не знайдено', 'Місце збережено, але погода для нього недоступна.');
      }
    } catch (error) {
      Alert.alert('Немає з\'єднання', 'Не вдалося визначити координати міста.');
    }
  }

  const id = Date.now().toString();
  const newPlace = {
    id,
    title,
    city,
    description,
    image: image || `https://picsum.photos/seed/${id}/600/400`,
    isFavorite: false,
    coords,
  };
  setPlaces((prev) => [newPlace, ...prev]);
  return newPlace;
}, []);
```

:::caution[Не пропустіть цей крок]
Без цієї зміни фото з камери й координати з GPS мовчки відкидатимуться, а маркери на карті ставитимуться за центром міста, а не за точним місцем.
:::

### Крок 7. Оновлення `AddPlaceScreen`

Форма стала довшою, тому обгорнемо її в `ScrollView` і `KeyboardAvoidingView`, щоб клавіатура не перекривала поля.

```jsx title="screens/AddPlaceScreen.js"
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import AddPlaceForm from '../components/AddPlaceForm';
import { usePlaces } from '../context/PlacesContext';
import { COLORS, SPACING } from '../constants/theme';

export default function AddPlaceScreen({ navigation }) {
  const { addPlace } = usePlaces();

  async function handleAdd(place) {
    await addPlace(place); // якщо coords немає — контекст геокодує місто
    navigation.goBack();
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <AddPlaceForm onAdd={handleAdd} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md },
});
```

Перевірте: додайте місце з фото з камери, місце з фото з галереї і місце без фото (має з'явитися заглушка). Перевірте, що `PlaceCard` показує локальні `file://` зображення так само, як і URL з інтернету: компонент `Image` підтримує обидва варіанти.

### Крок 8. Екран карти `MapScreen`

Початковий регіон обчислимо з координат усіх місць: центр — середнє арифметичне, дельти — розмах координат з невеликим запасом. Якщо місць з координатами немає, показуємо Київ.

```jsx title="screens/MapScreen.js"
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';
import { usePlaces } from '../context/PlacesContext';
import { COLORS, DEFAULT_REGION, SPACING } from '../constants/theme';

// обчислює регіон, у який вміщуються всі точки
function getRegionForPlaces(places) {
  if (places.length === 0) return DEFAULT_REGION;

  const lats = places.map((p) => p.coords.latitude);
  const lngs = places.map((p) => p.coords.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    // запас 1.5x і мінімальне значення, щоб одна точка не давала нескінченний зум
    latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.05),
    longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.05),
  };
}

export default function MapScreen({ navigation }) {
  const { places, isLoaded } = usePlaces();

  // лише місця, для яких відомі координати
  const placesWithCoords = useMemo(
    () => places.filter((p) => p.coords?.latitude != null && p.coords?.longitude != null),
    [places]
  );

  const initialRegion = useMemo(
    () => getRegionForPlaces(placesWithCoords),
    [placesWithCoords]
  );

  if (!isLoaded) {
    return (
      <View style={styles.center}>
        <Text>Завантаження...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView style={StyleSheet.absoluteFill} initialRegion={initialRegion}>
        {placesWithCoords.map((place) => (
          <Marker
            key={place.id}
            coordinate={place.coords}
            pinColor={place.isFavorite ? 'gold' : 'red'}
          >
            <Callout
              onPress={() => navigation.navigate('PlaceDetails', { placeId: place.id })}
            >
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{place.title}</Text>
                <Text style={styles.calloutCity}>{place.city}</Text>
                <Text style={styles.calloutLink}>Детальніше</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {placesWithCoords.length === 0 && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Поки немає місць з координатами. Додайте місце з геолокацією.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  callout: { minWidth: 160, padding: SPACING.sm },
  calloutTitle: { fontWeight: '700', color: COLORS.text },
  calloutCity: { color: COLORS.textSecondary, marginTop: 2 },
  calloutLink: { color: COLORS.primary, marginTop: SPACING.sm },
  banner: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
    padding: SPACING.md,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    elevation: 3,
  },
  bannerText: { color: COLORS.text, textAlign: 'center' },
});
```

:::note[initialRegion не реагує на нові місця]
`initialRegion` застосовується лише при першому рендері карти. Якщо після цього додати місце, маркер з'явиться, але карта сама не переміститься. Тому вкладка показує правильний регіон після перезапуску або повторного монтування. Автоматичне «вписування» маркерів через `fitToCoordinates` — одне із завдань для самостійного виконання.
:::

:::tip
Якщо на якомусь пристрої натискання на `Callout` не спрацьовує, використайте проп маркера `onCalloutPress` — він викликається при натисканні на бульбашку на обох платформах.
:::

### Крок 9. Третя вкладка «Карта»

Додайте `MapScreen` у нижні вкладки. Нижче — повна версія навігатора після змін (нові рядки підсвічено).

```jsx title="navigation/AppNavigator.js" {6,33-40}
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import PlacesScreen from '../screens/PlacesScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import MapScreen from '../screens/MapScreen';
import PlaceDetailsScreen from '../screens/PlaceDetailsScreen';
import AddPlaceScreen from '../screens/AddPlaceScreen';
import { COLORS } from '../constants/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: COLORS.primary }}>
      <Tab.Screen
        name="Places"
        component={PlacesScreen}
        options={{
          title: 'Місця',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          title: 'Улюблені',
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          title: 'Карта',
          tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="PlaceDetails"
        component={PlaceDetailsScreen}
        options={{ title: 'Деталі' }}
      />
      <Stack.Screen
        name="AddPlace"
        component={AddPlaceScreen}
        options={{ title: 'Нове місце', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
```

Якщо у вашому навігаторі вже є додаткові опції (наприклад, кнопка «+» у заголовку вкладки «Місця»), збережіть їх — змінюється лише додавання третього `Tab.Screen`.

Оскільки `MapScreen` знаходиться всередині вкладок, а `PlaceDetails` — у батьківському stack, виклик `navigation.navigate('PlaceDetails', ...)` автоматично «підніметься» до батьківського навігатора.

### Крок 10. Міні-карта на екрані деталей

На екрані деталей покажемо невелику неінтерактивну карту з одним маркером. Додайте імпорт і фрагмент розмітки у `screens/PlaceDetailsScreen.js` (під описом місця):

```jsx title="screens/PlaceDetailsScreen.js (фрагмент)"
import MapView, { Marker } from 'react-native-maps';
// ...

// всередині JSX, після опису місця:
{place.coords ? (
  <View style={styles.mapWrapper}>
    <MapView
      style={styles.map}
      initialRegion={{
        ...place.coords,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      // вимикаємо взаємодію — це лише ілюстрація
      scrollEnabled={false}
      zoomEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      toolbarEnabled={false}
      pointerEvents="none"
    >
      <Marker coordinate={place.coords} />
    </MapView>
  </View>
) : (
  <Text style={styles.noMap}>Координати для цього місця невідомі</Text>
)}
```

```js title="screens/PlaceDetailsScreen.js (додати в StyleSheet)"
mapWrapper: {
  height: 180,
  borderRadius: RADIUS.md,
  overflow: 'hidden', // щоб заокруглення застосувалося до карти
  marginTop: SPACING.md,
},
map: { flex: 1 },
noMap: { marginTop: SPACING.md, color: COLORS.textSecondary },
```

Переконайтеся, що `RADIUS` імпортовано з `constants/theme.js`, а екран прокручується (`ScrollView`), якщо вміст не вміщується.

:::tip[Збереження фото на екрані деталей]
Якщо великий `Image` на екрані деталей має фіксовану висоту, для локальних фото з камери (зазвичай 4:3) краще використати `aspectRatio: 4 / 3` замість фіксованої висоти — тоді фото не обрізатиметься.
:::

### Крок 11. Перевірка роботи дозволів

Пройдіть сценарії і зробіть скриншоти:

1. **Перший запит.** Видаліть дозволи Expo Go в налаштуваннях телефону (Налаштування → Застосунки → Expo Go → Дозволи) і натисніть «Моє місцезнаходження». Має з'явитися системний діалог.
2. **Відмова.** Натисніть «Не дозволяти» — під кнопкою має з'явитися повідомлення з пропозицією ввести місто вручну.
3. **Заблокований стан.** Відмовте ще раз (на Android після двох відмов діалог перестає з'являтися; на iOS — одразу після першої). Тепер натискання має показувати `Alert` з кнопкою «Налаштування», яка відкриває сторінку дозволів.
4. **Вимкнений GPS.** Вимкніть геолокацію в шторці телефону — має з'явитися відповідне повідомлення.
5. Аналогічно перевірте камеру: відмова, заблокований стан, а також «З галереї», який працює без дозволу на камеру.

:::note
В Expo Go дозволи належать застосунку Expo Go, а не «Моїм місцям». Тому в налаштуваннях шукайте саме Expo Go. У власній збірці (практична 7) дозволи і тексти з `app.json` будуть вже вашими.
:::

### Крок 12. Додатково: власний екран камери з `expo-camera`

Цей крок необов'язковий, але дає досвід роботи з вбудованою камерою.

1. Встановіть бібліотеку та додайте плагін:

   ```bash
   npx expo install expo-camera
   ```

   ```json title="app.json (фрагмент plugins)"
   [
     "expo-camera",
     { "cameraPermission": "Застосунок використовує камеру, щоб ви могли сфотографувати місце." }
   ]
   ```

2. Створіть екран:

   ```jsx title="screens/CameraScreen.js"
   import { useRef, useState } from 'react';
   import { Pressable, StyleSheet, Text, View } from 'react-native';
   import { CameraView, useCameraPermissions } from 'expo-camera';
   import { Ionicons } from '@expo/vector-icons';
   import { COLORS, SPACING } from '../constants/theme';

   export default function CameraScreen({ navigation, route }) {
     const [permission, requestPermission] = useCameraPermissions();
     const [facing, setFacing] = useState('back');
     const [isTaking, setIsTaking] = useState(false);
     const cameraRef = useRef(null);

     if (!permission) return <View style={styles.container} />;

     if (!permission.granted) {
       return (
         <View style={styles.center}>
           <Text style={styles.text}>Потрібен доступ до камери</Text>
           <Pressable style={styles.grant} onPress={requestPermission}>
             <Text style={styles.grantText}>Надати доступ</Text>
           </Pressable>
         </View>
       );
     }

     async function handleShot() {
       if (isTaking) return;
       setIsTaking(true);
       try {
         const photo = await cameraRef.current?.takePictureAsync({ quality: 0.6 });
         if (photo) {
           // повертаємо URI на екран, з якого відкрили камеру
           route.params?.onPhoto?.(photo.uri);
           navigation.goBack();
         }
       } finally {
         setIsTaking(false);
       }
     }

     return (
       <View style={styles.container}>
         <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
         <View style={styles.controls}>
           <Pressable onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}>
             <Ionicons name="camera-reverse" size={36} color="#fff" />
           </Pressable>
           <Pressable style={styles.shutter} onPress={handleShot} />
           <Pressable onPress={() => navigation.goBack()}>
             <Ionicons name="close" size={36} color="#fff" />
           </Pressable>
         </View>
       </View>
     );
   }

   const styles = StyleSheet.create({
     container: { flex: 1, backgroundColor: '#000' },
     camera: { flex: 1 },
     center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
     text: { color: COLORS.text },
     grant: { backgroundColor: COLORS.primary, padding: SPACING.md, borderRadius: 8 },
     grantText: { color: '#fff', fontWeight: '600' },
     controls: {
       flexDirection: 'row',
       justifyContent: 'space-around',
       alignItems: 'center',
       paddingVertical: SPACING.lg,
     },
     shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 5, borderColor: '#fff' },
   });
   ```

3. Зареєструйте екран у stack (`<Stack.Screen name="Camera" component={CameraScreen} options={{ headerShown: false }} />`) і відкрийте його з `ImagePickerField`: `navigation.navigate('Camera', { onPhoto: onChange })` (отримайте `navigation` через `useNavigation()`).

:::caution
Передача функції в `route.params` працює, але React Navigation виведе попередження, бо параметри мають бути серіалізованими (це ламає збереження стану та deep links). Для навчального прикладу це прийнятно; чистіший варіант — повертатися через `navigation.popTo('AddPlace', { photoUri })` і читати `route.params.photoUri` у `useEffect` на екрані форми.
:::

## Завдання для самостійного виконання

1. ★ На `MapScreen` додайте кнопку «Показати всі», яка через `ref` викликає `mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true })`. Додайте `showsUserLocation` і кнопку центрування на користувачі.
2. ★ Додайте фільтр на карті: перемикач «Лише улюблені», що показує тільки маркери з `isFavorite`.
3. ★★ Збереження фото назавжди: після вибору фото скопіюйте файл з кешу в `documentDirectory` за допомогою `expo-file-system` (`npx expo install expo-file-system`) і зберігайте в `place.image` новий URI. При видаленні місця видаляйте і файл.
4. ★★★ Додайте можливість вибрати точку на карті вручну: окремий екран з `MapView`, де `onPress` (або перетягування `Marker` з `draggable` і `onDragEnd`) задає координати, після чого місто визначається через `reverseGeocodeAsync`.

## Контрольні питання

1. Чому бібліотеки встановлюються через `npx expo install`, а не `npm install`?
2. Які значення може мати `status` у відповіді на запит дозволу? Як застосунок має поводитися при `canAskAgain === false`?
3. Навіщо в `app.json` додаються config plugins з текстами дозволів, якщо в Expo Go вони не застосовуються?
4. Чим відрізняються `launchCameraAsync` та `launchImageLibraryAsync`? Що повертається, якщо користувач закрив камеру без знімка?
5. Як обчислюється початковий регіон карти в `MapScreen`? Навіщо мінімальне значення дельти?
6. Чому зміна `initialRegion` після першого рендеру не переміщує карту? Як це обійти?
7. Як із `MapScreen`, що знаходиться у вкладках, перейти на екран `PlaceDetails` батьківського stack?
8. Які пропси роблять `MapView` неінтерактивним?

## Домашнє завдання

1. Завершіть усі кроки практичної роботи, якщо не встигли на занятті.
2. Додайте до `PlaceCard` маленьку іконку `Ionicons name="location"`, яка показується лише для місць з координатами.
3. Виконайте завдання 1 з розділу самостійної роботи (кнопка «Показати всі»).
4. Закомітьте зміни в репозиторій з повідомленням на кшталт `feat: location, image picker and map`.

## Що здати

- Посилання на репозиторій з кодом (коміт з цієї роботи).
- Скриншоти: форма додавання з прев'ю фото та координатами; вкладка «Карта» з кількома маркерами і відкритим Callout; екран деталей з міні-картою; діалог відмови в дозволі та `Alert` з кнопкою «Налаштування».
- Короткий звіт (1 сторінка): які бібліотеки встановлено, які дозволи запитує застосунок і як обробляється відмова, з якими проблемами зіткнулися.
