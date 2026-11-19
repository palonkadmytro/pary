---
title: Стан та стилізація компонентів
description: Додаємо до застосунку «Мої місця» стан (useState), форму додавання місця, видалення, «улюблені», FlatList та єдину тему оформлення.
type: practice
pair: 6
topic: 131
---

## Мета роботи

- Навчитися зберігати й змінювати дані застосунку за допомогою хука `useState`.
- Реалізувати керовані поля введення (controlled inputs) на основі `TextInput` та валідацію форми.
- Замінити `ScrollView` на продуктивний список `FlatList` і налаштувати порожній стан списку.
- Опанувати компонент `Pressable` та стилізацію залежно від стану (натиснуто, вибрано, помилка).
- Винести кольори, відступи та радіуси в окремий файл теми й використовувати їх в усіх компонентах.

## Що потрібно

- Результат практичної роботи P2 (пара 4): проєкт `my-places` зі статичним інтерфейсом — файли `data/places.js`, `components/Header.js`, `components/PlaceCard.js`, `App.js`.
- Node.js (LTS), редактор коду (VS Code), запущений емулятор Android / симулятор iOS або телефон з Expo Go.
- Знання React-хуків `useState` на рівні веброзробки.

## Короткі теоретичні відомості

**Стан (state)** — це дані компонента, зміна яких спричиняє повторний рендер. У React Native стан працює так само, як у React для вебу: `const [value, setValue] = useState(initial)`. Стан не можна змінювати напряму (мутувати) — завжди створюємо новий масив чи об'єкт: `setPlaces(prev => [...prev, newPlace])`.

**Керований компонент (controlled component)** — поле введення, значення якого зберігається у стані: `TextInput` отримує `value` і повідомляє про зміни через `onChangeText` (у вебі — `onChange` з `event.target.value`; у React Native обробник одразу отримує рядок).

**FlatList** — віртуалізований список: він рендерить лише ті елементи, що потрапляють на екран (плюс невеликий запас). `ScrollView` рендерить усі дочірні елементи одразу, тому для довгих списків він повільний і споживає багато пам'яті.

| Властивість | `ScrollView` | `FlatList` |
|---|---|---|
| Рендер елементів | Усі одразу | Лише видимі (віртуалізація) |
| Джерело даних | Дочірні елементи (`children`) | Масив `data` + функція `renderItem` |
| Ключі | `key` вручну на кожному елементі | `keyExtractor` |
| Порожній стан | Вручну | `ListEmptyComponent` |
| Шапка/підвал | Вручну | `ListHeaderComponent`, `ListFooterComponent` |
| Коли використовувати | Невеликий фіксований вміст (форма, сторінка налаштувань) | Будь-які списки даних |

**Pressable** — сучасний базовий компонент для обробки натискань. На відміну від `TouchableOpacity`, він дозволяє передати у `style` **функцію**, що отримує стан натискання: `style={({ pressed }) => [styles.button, pressed && styles.pressed]}`.

**Стилі в масиві.** Проп `style` у React Native приймає масив; пізніші стилі перекривають попередні, а значення `false`, `null`, `undefined` ігноруються. Це головний інструмент умовної стилізації.

## Хід роботи

### Крок 1. Файл теми оформлення

Коли кольори і відступи «розкидані» по всіх `StyleSheet`, змінити дизайн складно. Створимо єдине джерело значень — файл теми.

Створіть папку `constants` у корені проєкту та файл:

```js title="constants/theme.js"
// Палітра кольорів застосунку
export const COLORS = {
  primary: '#2F6FED',       // основний колір (кнопки, акценти)
  primaryDark: '#1F4FB5',   // основний колір у натиснутому стані
  background: '#F3F5F9',    // фон екрана
  card: '#FFFFFF',          // фон карток
  text: '#1B1F29',          // основний текст
  textSecondary: '#6B7280', // другорядний текст
  border: '#D9DEE7',        // рамки полів введення
  danger: '#E5484D',        // помилки, видалення
  favorite: '#E5484D',      // заповнене сердечко
  white: '#FFFFFF',
};

// Шкала відступів: використовуємо лише ці значення
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

// Радіуси заокруглення
export const RADIUS = {
  sm: 6,
  md: 12,
  lg: 20,
};
```

:::tip[Чому шкала відступів]
Обмежений набір значень (4, 8, 12, 16, 24) робить інтерфейс візуально узгодженим. Якщо дизайнер вирішить збільшити всі відступи — достатньо змінити один файл.
:::

### Крок 2. Оновлюємо Header з урахуванням теми

Відкрийте `components/Header.js` і замініть «жорстко зашиті» значення на константи теми. Додамо також лічильник місць, який отримуємо через пропси.

```jsx title="components/Header.js"
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';

export default function Header({ title, count }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {/* Лічильник показуємо лише тоді, коли його передали */}
      {count !== undefined && (
        <Text style={styles.subtitle}>Збережено місць: {count}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
  },
  subtitle: {
    marginTop: SPACING.xs,
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.85,
  },
});
```

### Крок 3. Картка місця з кнопками «улюблене» та «видалити»

Тепер `PlaceCard` не лише показує дані, а й повідомляє батьківський компонент про дії користувача. Сама картка **не змінює** масив місць — вона викликає функції з пропсів `onDelete` і `onToggleFavorite`. Це принцип «дані течуть вниз, події — вгору» (lifting state up).

```jsx title="components/PlaceCard.js" {4,18-31,38-48}
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

export default function PlaceCard({ place, onDelete, onToggleFavorite }) {
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

          {/* Кнопка-сердечко: вигляд залежить від isFavorite */}
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    // Тінь для iOS
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    // Тінь для Android
    elevation: 3,
  },
  cardFavorite: {
    borderColor: COLORS.favorite,
  },
  image: {
    width: '100%',
    height: 180,
  },
  body: {
    padding: SPACING.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleBox: {
    flex: 1, // займає весь простір, крім сердечка
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  city: {
    marginTop: 2,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  heartButton: {
    padding: SPACING.xs,
    borderRadius: RADIUS.lg,
  },
  heartPressed: {
    transform: [{ scale: 0.85 }],
  },
  heart: {
    fontSize: 28,
    color: COLORS.textSecondary,
  },
  heartActive: {
    color: COLORS.favorite,
  },
  description: {
    marginTop: SPACING.sm,
    fontSize: 15,
    lineHeight: 21,
    color: COLORS.text,
  },
  deleteButton: {
    alignSelf: 'flex-start',
    marginTop: SPACING.md,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  deletePressed: {
    backgroundColor: COLORS.danger,
  },
  deleteText: {
    color: COLORS.danger,
    fontWeight: '600',
  },
  deleteTextPressed: {
    color: COLORS.white,
  },
});
```

Зверніть увагу на два способи використання `Pressable`:

1. `style={({ pressed }) => [...]}` — функція повертає стилі самої кнопки.
2. Дочірній елемент-функція `{({ pressed }) => <Text ... />}` — дозволяє змінювати і вкладені елементи (тут колір тексту).

:::note[hitSlop]
`hitSlop={10}` розширює зону натискання на 10 пікселів у кожен бік, не змінюючи розміру елемента. Рекомендована мінімальна зона натискання — близько 44×44 точки (iOS) / 48×48 dp (Android).
:::

### Крок 4. Форма додавання місця

Створіть компонент форми. Він має **власний** стан для полів введення та повідомлення про помилку, а готові дані передає вгору через проп `onAdd`.

```jsx title="components/AddPlaceForm.js"
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

export default function AddPlaceForm({ onAdd }) {
  // Стан кожного поля — керовані компоненти
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {
    const trimmedTitle = title.trim();
    const trimmedCity = city.trim();

    // Валідація: назва і місто обов'язкові
    if (!trimmedTitle || !trimmedCity) {
      setError('Вкажіть назву місця та місто');
      return;
    }
    if (trimmedTitle.length < 3) {
      setError('Назва має містити щонайменше 3 символи');
      return;
    }

    onAdd({
      title: trimmedTitle,
      city: trimmedCity,
      description: description.trim(),
    });

    // Очищаємо форму після успішного додавання
    setTitle('');
    setCity('');
    setDescription('');
    setError('');
  }

  return (
    <View style={styles.form}>
      <Text style={styles.heading}>Нове місце</Text>

      <TextInput
        style={[styles.input, error && !title.trim() && styles.inputError]}
        placeholder="Назва (наприклад, Софійський собор)"
        placeholderTextColor={COLORS.textSecondary}
        value={title}
        onChangeText={(text) => {
          setTitle(text);
          if (error) setError(''); // прибираємо помилку, щойно користувач почав виправляти
        }}
      />

      <TextInput
        style={[styles.input, error && !city.trim() && styles.inputError]}
        placeholder="Місто"
        placeholderTextColor={COLORS.textSecondary}
        value={city}
        onChangeText={(text) => {
          setCity(text);
          if (error) setError('');
        }}
      />

      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Опис (необов'язково)"
        placeholderTextColor={COLORS.textSecondary}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        onPress={handleSubmit}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>Додати</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    backgroundColor: COLORS.card,
    margin: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top', // для Android: текст починається зверху
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    marginBottom: SPACING.sm,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  buttonPressed: {
    backgroundColor: COLORS.primaryDark,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
```

:::caution[Умовний рендер і текст]
Вираз `{error && <Text>…</Text>}` небезпечний, якщо `error` може бути порожнім рядком або числом `0`: у React Native «голий» рядок/число поза `<Text>` спричиняє помилку *Text strings must be rendered within a &lt;Text&gt; component*. Тому використовуємо тернарний оператор `{error ? <Text>…</Text> : null}`.
:::

### Крок 5. Стан списку місць у App.js і FlatList

Тепер «головний» компонент зберігає масив місць у стані та передає дочірнім компонентам дані й обробники подій.

Обгортки `SafeAreaProvider` і `SafeAreaView` з пакета `react-native-safe-area-context` залишаються такими, як у P2 (пакет уже встановлено). Якщо раптом він відсутній у `package.json`, встановіть його:

```bash
npx expo install react-native-safe-area-context
```

Повний код `App.js`:

```jsx title="App.js"
import { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import Header from './components/Header';
import PlaceCard from './components/PlaceCard';
import AddPlaceForm from './components/AddPlaceForm';
import { PLACES } from './data/places';
import { COLORS, SPACING } from './constants/theme';

export default function App() {
  // Початкове значення стану — статичні дані з P2
  const [places, setPlaces] = useState(PLACES);

  function handleAddPlace({ title, city, description }) {
    const id = Date.now().toString(); // простий унікальний ідентифікатор
    const newPlace = {
      id,
      title,
      city,
      description,
      image: `https://picsum.photos/seed/${id}/600/400`,
      isFavorite: false,
    };
    // Нове місце — на початок списку. Створюємо НОВИЙ масив, не мутуємо старий
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
  listContent: {
    paddingBottom: SPACING.xl,
    flexGrow: 1, // щоб порожній стан міг центруватися
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

Ключові моменти:

- **Функціональне оновлення** `setPlaces(prev => ...)` гарантує, що ми працюємо з актуальним значенням стану, навіть якщо кілька оновлень відбуваються поспіль.
- `filter` для видалення і `map` + spread `{ ...p, isFavorite: !p.isFavorite }` для зміни — обидва повертають **новий** масив. Якби ми написали `place.isFavorite = true; setPlaces(places)`, React порівняв би посилання, побачив той самий масив і не оновив екран.
- `keyExtractor` повертає рядок — `id` у даних має бути рядком (саме тому `Date.now().toString()`).
- `keyboardShouldPersistTaps="handled"` дозволяє натиснути кнопку «Додати», поки відкрита клавіатура (інакше перше натискання лише ховає клавіатуру).

:::danger[Не створюйте компонент усередині пропа]
Форму передано як **елемент** `ListHeaderComponent={<AddPlaceForm … />}`. Якщо написати `ListHeaderComponent={() => <AddPlaceForm … />}`, на кожному рендері `App` створюватиметься новий тип компонента — форма буде перемонтовуватися, стан полів скидатиметься, а клавіатура закриватиметься після кожної літери.
:::

### Крок 6. Перевірка роботи

Запустіть застосунок:

```bash
npx expo start
```

Перевірте сценарії:

1. Натисніть «Додати» з порожніми полями — з'являється червоний текст помилки, рамки полів стають червоними.
2. Почніть вводити текст — помилка зникає.
3. Додайте місце — воно з'являється на початку списку, лічильник у шапці збільшується, форма очищається.
4. Натисніть ♡ — сердечко заповнюється (♥), рамка картки стає червоною. Повторне натискання повертає початковий вигляд.
5. Натисніть «Видалити» — підтвердьте у діалозі, картка зникає.
6. Видаліть усі місця — відображається `ListEmptyComponent`.

:::note
Після перезапуску застосунку всі зміни зникають: стан зберігається лише в оперативній пам'яті. Постійне збереження даних (AsyncStorage) реалізуємо у практичній роботі P4.
:::

### Крок 7 (необов'язковий). Клавіатура не перекриває поля

На iOS клавіатура може закривати поля форми. Обгорніть `FlatList` у `KeyboardAvoidingView`:

```jsx title="App.js (фрагмент)"
import { KeyboardAvoidingView, Platform } from 'react-native';

// ...усередині SafeAreaView, замість «голого» FlatList:
<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
>
  <FlatList /* ...ті самі пропси... */ />
</KeyboardAvoidingView>
```

`Platform.OS` повертає `'ios'` або `'android'` — так пишуть платформозалежний код без окремих файлів.

## Завдання для самостійного виконання

1. ★ **Фільтр «Лише улюблені».** Додайте над списком перемикач (`Switch` або два `Pressable`-«таби»), який показує лише місця з `isFavorite: true`. Відфільтрований масив обчислюйте під час рендеру (`const visible = showFavorites ? places.filter(...) : places`), а не зберігайте в окремому стані.
2. ★ **Лічильник символів.** Обмежте опис 200 символами (`maxLength`) і показуйте під полем «125/200»; коли лишається менше 20 символів — текст лічильника стає червоним.
3. ★★ **Пошук.** Додайте `TextInput` пошуку, що фільтрує місця за назвою або містом без урахування регістру (`toLowerCase().includes(...)`).
4. ★★★ **Темна тема.** Створіть у `constants/theme.js` два набори кольорів (`LIGHT`, `DARK`) і перемикайте їх залежно від системної теми за допомогою хука `useColorScheme()` з `react-native`. Подумайте, чому `StyleSheet.create` поза компонентом не підходить для динамічних кольорів і як це обійти.

## Контрольні питання

1. Чим стан компонента відрізняється від пропсів? Хто може змінювати кожен із них?
2. Чому не можна змінювати масив стану напряму (`places.push(...)`)? Що станеться з рендером?
3. Що таке керований `TextInput`? Чим `onChangeText` відрізняється від `onChange` у вебі?
4. Які переваги `FlatList` над `ScrollView`? Для чого потрібен `keyExtractor`?
5. Як стилізувати `Pressable` залежно від того, чи натиснуто його?
6. Як працює масив стилів `[styles.a, condition && styles.b]`? Що станеться, якщо `condition` дорівнює `false`?
7. Навіщо виносити кольори та відступи в `constants/theme.js`?
8. Чому функцію `handleDeletePlace` оголошено в `App.js`, а не в `PlaceCard.js`?

## Домашнє завдання

Додайте до кожного місця **рейтинг від 1 до 5**:

- у формі `AddPlaceForm` — п'ять `Pressable`-зірочок (★/☆), вибраний рейтинг зберігається у стані форми (за замовчуванням 0, валідація: рейтинг обов'язковий);
- у `PlaceCard` — відображення рейтингу зірочками під назвою міста;
- усі нові кольори й відступи беріть лише з `constants/theme.js`.

Орієнтовний час — 40 хвилин.

## Що здати

- Посилання на репозиторій (GitHub/GitLab) з комітом «P3: стан та стилізація» або архів проєкту без папки `node_modules`.
- Скриншоти: список з кількома місцями (одне — улюблене); форма з повідомленням про помилку; порожній список.
- Короткі відповіді на контрольні питання (у файлі `REPORT.md` у репозиторії або в окремому документі).
