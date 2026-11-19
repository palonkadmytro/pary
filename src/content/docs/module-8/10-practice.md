---
title: Реалізація навігації
description: Перетворюємо «Мої місця» на багатоекранний застосунок — React Navigation з вкладками, стеком, модальним екраном додавання та спільним станом через Context.
type: practice
pair: 10
topic: 135
---

## Мета роботи

- Встановити та налаштувати React Navigation v7 у проєкті Expo.
- Винести спільний стан місць і логіку збереження з `App.js` у React Context.
- Розбити застосунок на екрани: список, деталі, додавання, улюблені.
- Поєднати нижні вкладки (bottom tabs) і стековий навігатор (native stack), налаштувати модальний екран.
- Передавати параметри між екранами, динамічно змінювати заголовок, додати кнопку в заголовок та іконки вкладок.

## Що потрібно

- Результат практичної роботи P4 (пара 8): проєкт `my-places` з файлами `services/storage.js`, `services/weatherApi.js`, `hooks/useWeather.js`, `components/PlaceCard.js`, `components/AddPlaceForm.js` (асинхронний `onAdd`), `constants/theme.js`, `data/places.js`, `App.js`.
- Матеріал лекції «Навігація у React Native» (пара 9).
- Емулятор/симулятор або телефон з Expo Go.

## Короткі теоретичні відомості

Зараз увесь застосунок — це один екран, а стан місць живе в `App.js`. Після переходу на кілька екранів доступ до місць потрібен скрізь: списку, деталям, улюбленим, формі додавання. Передавати `places` і обробники пропсами через навігатори незручно (екрани створює навігатор, а не ми), тому використаємо **React Context**:

- `PlacesProvider` зберігає стан і функції `addPlace`, `removePlace`, `toggleFavorite`;
- будь-який компонент отримує їх хуком `usePlaces()`.

Цільова структура навігації:

```text
NavigationContainer
└── Stack (native stack)
    ├── MainTabs (headerShown: false)
    │   ├── Places     «Місця»     — кнопка «+» у заголовку
    │   └── Favorites  «Улюблені»
    ├── PlaceDetails   — деталі місця (параметр placeId)
    └── AddPlace       — модальний екран (presentation: 'modal')
```

Стек є кореневим, тому деталі та форма відкриваються **поверх** вкладок, ховаючи панель вкладок, — саме так поводиться більшість застосунків.

Нова структура файлів:

```text
my-places/
├── App.js                       (змінено)
├── context/PlacesContext.js     (новий)
├── navigation/AppNavigator.js   (новий)
├── screens/
│   ├── PlacesScreen.js          (новий)
│   ├── PlaceDetailsScreen.js    (новий)
│   ├── AddPlaceScreen.js        (новий)
│   └── FavoritesScreen.js       (новий)
├── components/PlaceCard.js      (змінено)
├── components/AddPlaceForm.js   (без змін)
├── components/Header.js         (більше не використовується)
├── hooks/, services/, constants/, data/  (без змін)
```

## Хід роботи

### Крок 1. Встановлення React Navigation

```bash
npx expo install @react-navigation/native react-native-screens react-native-safe-area-context
npx expo install @react-navigation/native-stack @react-navigation/bottom-tabs
```

Іконки беремо з пакета `@expo/vector-icons`, який уже є в проєктах Expo. Якщо імпорт не знаходиться, встановіть його: `npx expo install @expo/vector-icons`.

Перезапустіть Metro з очищенням кешу:

```bash
npx expo start -c
```

### Крок 2. Контекст місць

Перенесемо в контекст усе, що в P4 було в `App.js`: стан, завантаження/збереження та обробники.

```jsx title="context/PlacesContext.js"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { PLACES } from '../data/places';
import { loadPlaces, savePlaces } from '../services/storage';
import { geocodeCity } from '../services/weatherApi';

const PlacesContext = createContext(null);

export function PlacesProvider({ children }) {
  const [places, setPlaces] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Завантаження під час запуску застосунку
  useEffect(() => {
    async function init() {
      const stored = await loadPlaces();
      setPlaces(stored ?? PLACES);
      setIsLoaded(true);
    }
    init();
  }, []);

  // Збереження після кожної зміни (лише після початкового завантаження)
  useEffect(() => {
    if (!isLoaded) return;
    savePlaces(places);
  }, [places, isLoaded]);

  const addPlace = useCallback(async ({ title, city, description }) => {
    let coords = null;
    try {
      coords = await geocodeCity(city);
      if (!coords) {
        Alert.alert('Місто не знайдено', 'Місце збережено, але погода для нього недоступна.');
      }
    } catch (error) {
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
      coords,
    };
    setPlaces((prev) => [newPlace, ...prev]);
    return newPlace;
  }, []);

  const removePlace = useCallback((id) => {
    setPlaces((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const toggleFavorite = useCallback((id) => {
    setPlaces((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p))
    );
  }, []);

  // useMemo: новий об'єкт value лише тоді, коли змінилися дані
  const value = useMemo(
    () => ({ places, isLoaded, addPlace, removePlace, toggleFavorite }),
    [places, isLoaded, addPlace, removePlace, toggleFavorite]
  );

  return <PlacesContext.Provider value={value}>{children}</PlacesContext.Provider>;
}

// Власний хук для доступу до контексту
export function usePlaces() {
  const context = useContext(PlacesContext);
  if (!context) {
    throw new Error('usePlaces потрібно використовувати всередині PlacesProvider');
  }
  return context;
}
```

:::tip[Чому перевірка в usePlaces]
Якщо забути обгорнути застосунок у `PlacesProvider`, `useContext` поверне `null`, і помилка проявиться десь далеко (`Cannot read property 'places' of null`). Явне повідомлення одразу вказує на причину.
:::

Зверніть увагу: підтвердження видалення (`Alert`) тепер не в контексті — контекст відповідає за дані, а питати користувача будуть екрани.

### Крок 3. Картка, на яку можна натиснути

Картка має відкривати деталі. Додамо проп `onPress` і обгорнемо картку в `Pressable`. Внутрішні кнопки (сердечко, «Видалити») залишаються окремими `Pressable` — натискання на них не спрацює як натискання на картку.

```jsx title="components/PlaceCard.js (зміни)" {6,10-17}
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { useWeather } from '../hooks/useWeather';
import { describeWeather } from '../services/weatherApi';

export default function PlaceCard({ place, onPress, onDelete, onToggleFavorite, refreshKey }) {
  const { data: weather, loading, error } = useWeather(place.coords, refreshKey);

  return (
    <Pressable
      onPress={() => onPress?.(place.id)}
      style={({ pressed }) => [
        styles.card,
        place.isFavorite && styles.cardFavorite,
        pressed && styles.cardPressed,
      ]}
    >
      <Image source={{ uri: place.image }} style={styles.image} />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.titleBox}>
            <Text style={styles.title} numberOfLines={1}>
              {place.title}
            </Text>
            <Text style={styles.city}>{place.city}</Text>
          </View>

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
          <Text style={styles.description} numberOfLines={2}>
            {place.description}
          </Text>
        ) : null}

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
    </Pressable>
  );
}
```

Стилі з P3–P4 залишаються, додайте один новий ключ:

```js title="components/PlaceCard.js (доповнення до StyleSheet.create)"
  cardPressed: {
    opacity: 0.85,
  },
```

Опис у списку обмежено двома рядками (`numberOfLines={2}`) — повний текст буде на екрані деталей.

### Крок 4. Екран списку місць

```jsx title="screens/PlacesScreen.js"
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import PlaceCard from '../components/PlaceCard';
import { usePlaces } from '../context/PlacesContext';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

export default function PlacesScreen({ navigation }) {
  const { places, removePlace, toggleFavorite } = usePlaces();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleOpen(placeId) {
    // Передаємо лише ідентифікатор — сам об'єкт екран знайде в контексті
    navigation.navigate('PlaceDetails', { placeId });
  }

  function handleDelete(id) {
    Alert.alert('Видалити місце?', 'Цю дію не можна скасувати.', [
      { text: 'Скасувати', style: 'cancel' },
      { text: 'Видалити', style: 'destructive', onPress: () => removePlace(id) },
    ]);
  }

  function handleRefresh() {
    setRefreshing(true);
    setRefreshKey((k) => k + 1); // перезавантажує погоду в картках
    setTimeout(() => setRefreshing(false), 500);
  }

  return (
    <FlatList
      style={styles.list}
      data={places}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <PlaceCard
          place={item}
          onPress={handleOpen}
          onDelete={handleDelete}
          onToggleFavorite={toggleFavorite}
          refreshKey={refreshKey}
        />
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Список порожній</Text>
          <Text style={styles.emptyText}>Додайте своє перше місце.</Text>
          <Pressable
            onPress={() => navigation.navigate('AddPlace')}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>Додати місце</Text>
          </Pressable>
        </View>
      }
      refreshing={refreshing}
      onRefresh={handleRefresh}
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingTop: SPACING.lg,
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
  },
  button: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.sm,
  },
  buttonPressed: {
    backgroundColor: COLORS.primaryDark,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});
```

Форми у списку більше немає — додавання переїхало на окремий модальний екран.

`navigation.navigate('AddPlace')` викликається з екрана вкладки, хоча `AddPlace` оголошено в батьківському стеку. Навігатор вкладок не знає такого маршруту і передає дію батьківському — стеку.

### Крок 5. Екран деталей

```jsx title="screens/PlaceDetailsScreen.js"
import { useLayoutEffect } from 'react';
import {
  ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlaces } from '../context/PlacesContext';
import { useWeather } from '../hooks/useWeather';
import { describeWeather } from '../services/weatherApi';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

export default function PlaceDetailsScreen({ route, navigation }) {
  const { placeId } = route.params;
  const { places, removePlace, toggleFavorite } = usePlaces();
  const place = places.find((p) => p.id === placeId);

  // Хук викликаємо завжди (правила хуків), навіть якщо місця немає
  const { data: weather, loading, error } = useWeather(place?.coords);

  // Заголовок і кнопка «улюблене» залежать від даних місця
  useLayoutEffect(() => {
    if (!place) return;
    navigation.setOptions({
      title: place.title,
      headerRight: () => (
        <Pressable onPress={() => toggleFavorite(place.id)} hitSlop={10}>
          <Ionicons
            name={place.isFavorite ? 'heart' : 'heart-outline'}
            size={24}
            color={COLORS.favorite}
          />
        </Pressable>
      ),
    });
  }, [navigation, place, toggleFavorite]);

  if (!place) {
    // Наприклад, місце видалили або передали неправильний id
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Місце не знайдено</Text>
      </View>
    );
  }

  function handleDelete() {
    Alert.alert('Видалити місце?', `«${place.title}» буде видалено.`, [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити',
        style: 'destructive',
        onPress: () => {
          navigation.goBack(); // спочатку закриваємо екран
          removePlace(place.id);
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={{ uri: place.image }} style={styles.image} />

      <View style={styles.body}>
        <Text style={styles.title}>{place.title}</Text>
        <Text style={styles.city}>{place.city}</Text>

        <View style={styles.weatherBox}>
          {!place.coords ? (
            <Text style={styles.weatherMuted}>Координати невідомі — погода недоступна</Text>
          ) : loading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : error ? (
            <Text style={styles.weatherError}>{error}</Text>
          ) : weather ? (
            <>
              <Text style={styles.temperature}>{Math.round(weather.temperature)}°C</Text>
              <Text style={styles.weatherMuted}>{describeWeather(weather.code)}</Text>
            </>
          ) : null}
        </View>

        {place.description ? (
          <Text style={styles.description}>{place.description}</Text>
        ) : (
          <Text style={styles.weatherMuted}>Опис відсутній</Text>
        )}

        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => [styles.deleteButton, pressed && styles.deletePressed]}
        >
          <Text style={styles.deleteText}>Видалити місце</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: SPACING.xl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFound: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  image: {
    width: '100%',
    height: 280,
  },
  body: {
    padding: SPACING.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
  },
  city: {
    marginTop: SPACING.xs,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  weatherBox: {
    marginVertical: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  temperature: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.primary,
  },
  weatherMuted: {
    color: COLORS.textSecondary,
  },
  weatherError: {
    color: COLORS.danger,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.text,
  },
  deleteButton: {
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.danger,
    alignItems: 'center',
  },
  deletePressed: {
    backgroundColor: '#FDECEC',
  },
  deleteText: {
    color: COLORS.danger,
    fontWeight: '600',
  },
});
```

:::note[Чому дані беремо з контексту, а не з параметрів]
Якщо передати весь об'єкт `place` у параметрах, то після натискання сердечка в заголовку екран і далі показував би стару копію. Знаходячи місце за `placeId` у контексті, ми завжди маємо актуальні дані — це правило «передавайте id, а не об'єкт» з лекції.
:::

### Крок 6. Модальний екран додавання

Використовуємо готовий `AddPlaceForm` з P4 — його асинхронний `onAdd` якраз дозволяє дочекатися геокодування, а потім закрити екран.

```jsx title="screens/AddPlaceScreen.js"
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import AddPlaceForm from '../components/AddPlaceForm';
import { usePlaces } from '../context/PlacesContext';
import { COLORS } from '../constants/theme';

export default function AddPlaceScreen({ navigation }) {
  const { addPlace } = usePlaces();

  async function handleAdd(data) {
    await addPlace(data);  // чекаємо геокодування та додавання
    navigation.goBack();   // закриваємо модальне вікно
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <AddPlaceForm onAdd={handleAdd} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
```

### Крок 7. Екран улюблених

```jsx title="screens/FavoritesScreen.js"
import { FlatList, StyleSheet, Text, View } from 'react-native';
import PlaceCard from '../components/PlaceCard';
import { usePlaces } from '../context/PlacesContext';
import { COLORS, SPACING } from '../constants/theme';

export default function FavoritesScreen({ navigation }) {
  const { places, removePlace, toggleFavorite } = usePlaces();
  // Похідні дані обчислюємо під час рендеру, окремий стан не потрібен
  const favorites = places.filter((p) => p.isFavorite);

  return (
    <FlatList
      style={styles.list}
      data={favorites}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <PlaceCard
          place={item}
          onPress={(placeId) => navigation.navigate('PlaceDetails', { placeId })}
          onDelete={removePlace}
          onToggleFavorite={toggleFavorite}
        />
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Поки що порожньо</Text>
          <Text style={styles.emptyText}>
            Натисніть ♡ на картці місця, щоб додати його до улюблених.
          </Text>
        </View>
      }
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingTop: SPACING.lg,
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

Обидва екрани читають ті самі дані з контексту, тому зміна на одній вкладці миттєво відображається на іншій.

### Крок 8. Навігатор застосунку

```jsx title="navigation/AppNavigator.js"
import { Pressable } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import PlacesScreen from '../screens/PlacesScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import PlaceDetailsScreen from '../screens/PlaceDetailsScreen';
import AddPlaceScreen from '../screens/AddPlaceScreen';
import { COLORS } from '../constants/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Спільний стиль заголовків
const headerOptions = {
  headerStyle: { backgroundColor: COLORS.primary },
  headerTintColor: COLORS.white,
  headerTitleStyle: { fontWeight: '700' },
};

// Іконки вкладок: [активна, неактивна]
const TAB_ICONS = {
  Places: ['map', 'map-outline'],
  Favorites: ['heart', 'heart-outline'],
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...headerOptions,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarIcon: ({ focused, color, size }) => {
          const [active, inactive] = TAB_ICONS[route.name];
          return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Places"
        component={PlacesScreen}
        options={({ navigation }) => ({
          title: 'Місця',
          // Кнопка «+» у заголовку відкриває модальний екран зі стека
          headerRight: () => (
            <Pressable
              onPress={() => navigation.navigate('AddPlace')}
              hitSlop={10}
              style={{ marginRight: 16 }}
              accessibilityLabel="Додати місце"
            >
              <Ionicons name="add" size={28} color={COLORS.white} />
            </Pressable>
          ),
        })}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ title: 'Улюблені' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      {/* Вкладки мають власні заголовки — заголовок стека ховаємо */}
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="PlaceDetails"
        component={PlaceDetailsScreen}
        options={{ title: 'Місце', headerBackTitle: 'Назад' }}
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

Пояснення:

- `screenOptions` функцією від `route` дозволяє обрати іконку для кожної вкладки в одному місці.
- `headerRight` задано через `options={({ navigation }) => …}` — так кнопка отримує об'єкт навігації вкладки.
- Заголовок `PlaceDetails` спочатку «Місце», а потім екран замінює його назвою через `setOptions`.
- На Android модальний екран native stack відкривається з анімацією знизу; на iOS — у вигляді картки, яку можна закрити свайпом вниз.

### Крок 9. Новий App.js

`App.js` тепер лише збирає провайдери та навігацію. Індикатор початкового завантаження показуємо, доки контекст читає дані зі сховища.

```jsx title="App.js"
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { PlacesProvider, usePlaces } from './context/PlacesContext';
import AppNavigator from './navigation/AppNavigator';
import { COLORS } from './constants/theme';

// Окремий компонент, бо usePlaces працює лише всередині PlacesProvider
function Root() {
  const { isLoaded } = usePlaces();

  if (!isLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PlacesProvider>
        <StatusBar style="light" />
        <Root />
      </PlacesProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});
```

`SafeAreaView` в екранах більше не потрібен: заголовки навігаторів і панель вкладок самі враховують безпечні зони. Компонент `components/Header.js` можна видалити або залишити для подальших експериментів.

:::caution[Типові помилки]
- *Couldn't find a navigation object* — `useNavigation` викликано поза `NavigationContainer`.
- *The action 'NAVIGATE' with payload … was not handled by any navigator* — помилка в назві маршруту (`'PlaceDetail'` замість `'PlaceDetails'`); назви чутливі до регістру.
- Порожній білий екран після встановлення пакетів — перезапустіть `npx expo start -c`.
:::

### Крок 10. Перевірка

1. Застосунок відкривається на вкладці «Місця» з іконками внизу; дані збереглися з P4.
2. Натискання на картку відкриває деталі: велике зображення, погода, заголовок — назва місця. Кнопка «Назад» і системний жест повертають до списку.
3. Сердечко в заголовку деталей перемикає «улюблене»; повернувшись, бачимо зміни в списку та на вкладці «Улюблені».
4. Кнопка «+» відкриває модальний екран; після додавання він закривається, нове місце — на початку списку.
5. Видалення на екрані деталей закриває екран і прибирає місце зі списку.
6. Перезапуск застосунку зберігає всі зміни.

## Завдання для самостійного виконання

1. ★ **Лічильник на вкладці.** Показуйте кількість улюблених місць бейджем на вкладці «Улюблені» (`tabBarBadge`; якщо улюблених немає — `undefined`). Підказка: `MainTabs` може викликати `usePlaces()`.
2. ★★ **Редагування.** Додайте екран `EditPlaceScreen` (параметр `placeId`), що відкривається кнопкою «Редагувати» в заголовку деталей, і функцію `updatePlace(id, changes)` у контексті. Для форми використайте `AddPlaceForm` з новим пропом `initialValues`.
3. ★★ **Сортування.** Додайте на вкладку «Місця» кнопку в `headerLeft`, яка перемикає сортування (за датою додавання / за назвою). Як передати стан сортування з заголовка в екран? Порівняйте варіанти: `setOptions` усередині екрана та `setParams`.
4. ★★★ **Deep linking.** Додайте в `app.json` схему `myplaces` та конфігурацію `linking` у `NavigationContainer`, щоб посилання `myplaces://place/<id>` відкривало екран деталей. Перевірте командою `npx uri-scheme open "myplaces://place/1" --android`.

## Контрольні питання

1. Навіщо стан місць перенесено в Context? Які проблеми виникли б при передачі пропсів через навігатори?
2. Чому навігатор вкладок вкладено в стек, а не навпаки? Як би змінилася поведінка панелі вкладок?
3. Як екран деталей отримує ідентифікатор місця? Чому не передаємо весь об'єкт?
4. Як `navigate('AddPlace')`, викликаний з вкладки, знаходить екран, оголошений у стеку?
5. Для чого використовуємо `navigation.setOptions` у `PlaceDetailsScreen` і чому в `useLayoutEffect`?
6. Як налаштовано іконки вкладок? Що передає навігатор у функцію `tabBarIcon`?
7. Чим модальний екран відрізняється від звичайного і як його закрити?
8. Навіщо в `App.js` окремий компонент `Root`?

## Домашнє завдання

Додайте третю вкладку **«Профіль»** (`screens/ProfileScreen.js`, іконка `person` / `person-outline`), на якій відображається статистика: загальна кількість місць, кількість улюблених, кількість різних міст (`new Set(places.map(p => p.city)).size`) і назва останнього доданого місця. Натискання на назву останнього місця має відкривати його деталі.

Орієнтовний час — 30–40 хвилин.

## Що здати

- Посилання на репозиторій з комітом «P5: навігація».
- Скриншоти: вкладка «Місця» з кнопкою «+»; екран деталей з погодою; модальне вікно додавання; вкладка «Улюблені».
- Коротке відео (до 30 с) або GIF із переходами між екранами (необов'язково, але бажано).
- Відповіді на контрольні питання.
