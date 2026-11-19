---
title: Стан, події, стилізація
description: Пропси і стан, хуки useState, useEffect та useReducer, обробка подій у React Native, а також стилізація — StyleSheet, умовні стилі, Flexbox, адаптивність, темна тема й тіні.
type: lecture
pair: 5
topic: 130
---

## Мета заняття

- Повторити різницю між пропсами (props) і станом (state) та застосувати її в контексті React Native.
- Навчитися працювати з контрольованими полями введення та подіями `onPress`, `onLongPress`, `onChangeText`, `onSubmitEditing`.
- Зрозуміти базове використання `useEffect` і познайомитися з `useReducer`.
- Опанувати стилізацію в RN: `StyleSheet.create`, масиви стилів, умовні стилі, Flexbox, одиниці виміру.
- Навчитися робити адаптивний інтерфейс (`useWindowDimensions`), платформні стилі (`Platform.select`), темну тему (`useColorScheme`) і тіні для обох платформ.

## План лекції

1. Пропси і стан. Хук `useState`.
2. Підняття стану. Контрольовані компоненти.
3. Події в React Native.
4. Побічні ефекти: `useEffect`. Знайомство з `useReducer`.
5. Основи стилізації: `StyleSheet`, масиви та умовні стилі.
6. Flexbox і одиниці виміру в RN.
7. Адаптивність, платформи, темна тема, тіні.
8. Альтернативні підходи: NativeWind, styled-components.

## 1. Пропси і стан

**Пропси** (props) — вхідні дані компонента, які передає батьківський компонент. Компонент **не може змінювати** свої пропси.

**Стан** (state) — дані, якими компонент володіє сам і які змінюються з часом (через дії користувача, відповіді мережі, таймери). Зміна стану спричиняє **повторний рендеринг** (re-render) компонента та його нащадків.

| | Пропси | Стан |
|---|---|---|
| Хто задає | Батьківський компонент | Сам компонент |
| Чи можна змінювати | Ні (лише читати) | Так, через функцію-сеттер |
| Призначення | Налаштування, передача даних униз | Дані, що змінюються в часі |
| Приклад | `title` картки місця | текст у полі введення, прапорець «улюблене» |

### useState

```jsx
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

export default function LikeButton({ initialLikes = 0 }) {
  // [поточне значення, функція оновлення] = useState(початкове значення)
  const [likes, setLikes] = useState(initialLikes);

  return (
    <View>
      <Text>Вподобань: {likes}</Text>
      <Pressable onPress={() => setLikes((prev) => prev + 1)}>
        <Text>Подобається</Text>
      </Pressable>
    </View>
  );
}
```

Важливі правила:

1. **Стан незмінний (immutable).** Не змінюйте об'єкти та масиви напряму — створюйте нові:

   ```jsx
   // Неправильно: React не помітить змін
   places.push(newPlace);
   setPlaces(places);

   // Правильно: новий масив
   setPlaces([...places, newPlace]);

   // Видалення
   setPlaces(places.filter((p) => p.id !== id));

   // Оновлення одного елемента
   setPlaces(places.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p)));
   ```

2. **Функціональне оновлення** `setX(prev => ...)` використовуйте, коли нове значення залежить від попереднього (особливо при кількох оновленнях поспіль або в асинхронному коді).
3. **Оновлення стану асинхронне**: одразу після `setLikes(5)` змінна `likes` у поточному рендерингу ще має старе значення.
4. **Лінива ініціалізація**: якщо початкове значення дороге в обчисленні, передайте функцію: `useState(() => computeInitial())`.
5. Хуки викликаються лише на верхньому рівні компонента — не в умовах, циклах чи вкладених функціях.

## 2. Підняття стану і контрольовані компоненти

### Підняття стану (lifting state up)

Якщо двом компонентам потрібні одні й ті самі дані, стан переносять у їхнього **найближчого спільного предка**, а вниз передають значення і функції-обробники через пропси.

```jsx title="App.js"
export default function App() {
  const [places, setPlaces] = useState(PLACES);

  const handleAdd = (place) => setPlaces((prev) => [place, ...prev]);
  const handleRemove = (id) => setPlaces((prev) => prev.filter((p) => p.id !== id));

  return (
    <>
      <Header count={places.length} />
      <AddPlaceForm onAdd={handleAdd} />
      <PlacesList places={places} onRemove={handleRemove} />
    </>
  );
}
```

`Header`, `AddPlaceForm` і `PlacesList` не мають власної копії списку — вони отримують дані «згори» і повідомляють про події «вгору» через колбеки. Це і є **односпрямований потік даних**.

### Контрольовані поля введення

Поле є **контрольованим** (controlled), якщо його значення зберігається у стані React і задається пропсом `value`:

```jsx
function AddPlaceForm({ onAdd }) {
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!title.trim() || !city.trim()) {
      setError('Заповніть назву та місто');
      return;
    }
    onAdd({ id: Date.now().toString(), title: title.trim(), city: city.trim() });
    setTitle('');   // очищаємо форму
    setCity('');
    setError('');
  };

  return (
    <View>
      <TextInput value={title} onChangeText={setTitle} placeholder="Назва" />
      <TextInput value={city} onChangeText={setCity} placeholder="Місто" />
      {error ? <Text style={{ color: 'red' }}>{error}</Text> : null}
      <Pressable onPress={handleSubmit}>
        <Text>Додати</Text>
      </Pressable>
    </View>
  );
}
```

Переваги: значення завжди доступне для валідації, його легко очистити або змінити програмно, можна форматувати під час введення (наприклад, лише цифри: `onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}`).

Для форми з багатьма полями зручно тримати один об'єкт стану:

```jsx
const [form, setForm] = useState({ title: '', city: '', description: '' });

const updateField = (field) => (value) =>
  setForm((prev) => ({ ...prev, [field]: value }));

<TextInput value={form.title} onChangeText={updateField('title')} />
<TextInput value={form.city} onChangeText={updateField('city')} />
```

:::tip
Для великих форм з валідацією у реальних проєктах використовують бібліотеку `react-hook-form` (працює і в RN через компонент `Controller`) разом зі схемами `zod` або `yup`.
:::

## 3. Події в React Native

| Подія | Компоненти | Що отримує обробник |
|---|---|---|
| `onPress` | `Pressable`, `Button`, `Text`, `Touchable*` | об'єкт події дотику (`nativeEvent` з координатами) |
| `onLongPress` | `Pressable`, `Text`, `Touchable*` | подія; час задається `delayLongPress` (за замовчуванням 500 мс) |
| `onPressIn` / `onPressOut` | `Pressable` | початок / кінець дотику |
| `onChangeText` | `TextInput` | **рядок** з новим текстом |
| `onChange` | `TextInput` | подія з `nativeEvent.text` |
| `onSubmitEditing` | `TextInput` | натиснуто кнопку Enter/Готово |
| `onFocus` / `onBlur` | `TextInput` | отримання / втрата фокусу |
| `onValueChange` | `Switch` | нове булеве значення |
| `onScroll` | `ScrollView`, `FlatList` | `nativeEvent.contentOffset` |
| `onLayout` | `View` та ін. | `nativeEvent.layout` — `{ x, y, width, height }` |

### Передача параметрів в обробник

```jsx
// Створюємо стрілкову функцію, яка викличе обробник з id
<Pressable onPress={() => onRemove(place.id)}>
  <Text>Видалити</Text>
</Pressable>
```

:::caution[Типова помилка]
```jsx
<Pressable onPress={onRemove(place.id)}>
```
Тут функція **викликається одразу під час рендерингу**, а в `onPress` передається її результат (`undefined`). Якщо `onRemove` змінює стан — отримаєте нескінченний цикл рендерингу. Потрібно передавати функцію: `onPress={() => onRemove(place.id)}`.
:::

### onLongPress і підтвердження

```jsx
import { Alert, Pressable } from 'react-native';

function PlaceRow({ place, onRemove }) {
  const confirmRemove = () => {
    Alert.alert('Видалити місце?', `«${place.title}» буде видалено`, [
      { text: 'Скасувати', style: 'cancel' },
      { text: 'Видалити', style: 'destructive', onPress: () => onRemove(place.id) },
    ]);
  };

  return (
    <Pressable onPress={() => console.log('Відкрити', place.id)} onLongPress={confirmRemove}>
      <Text>{place.title}</Text>
    </Pressable>
  );
}
```

### onSubmitEditing і клавіатура

```jsx
<TextInput
  value={query}
  onChangeText={setQuery}
  returnKeyType="search"
  onSubmitEditing={() => {
    search(query);
    Keyboard.dismiss(); // сховати клавіатуру
  }}
/>
```

## 4. useEffect і useReducer

### useEffect — побічні ефекти

**Побічний ефект** — дія, яка виходить за межі обчислення JSX: запит до мережі, читання сховища, підписка на події, таймер. Такі дії виконуються в `useEffect` **після** рендерингу.

```jsx
useEffect(() => {
  // код ефекту
  return () => {
    // необов'язкова функція очищення (cleanup)
  };
}, [залежності]);
```

| Масив залежностей | Коли виконується ефект |
|---|---|
| не передано | після кожного рендерингу (рідко потрібно) |
| `[]` | один раз після першого рендерингу (монтування) |
| `[a, b]` | після першого рендерингу і щоразу, коли змінюється `a` або `b` |

Приклад: завантаження даних при появі компонента.

```jsx
function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false; // захист від оновлення стану після демонтування

    async function load() {
      try {
        const res = await fetch('https://jsonplaceholder.typicode.com/users');
        const data = await res.json();
        if (!ignore) setUsers(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  if (loading) return <ActivityIndicator />;
  return <FlatList data={users} keyExtractor={(u) => String(u.id)} renderItem={({ item }) => <Text>{item.name}</Text>} />;
}
```

Приклад з очищенням таймера:

```jsx
useEffect(() => {
  const id = setInterval(() => setSeconds((s) => s + 1), 1000);
  return () => clearInterval(id); // інакше таймер працюватиме після зникнення екрана
}, []);
```

:::note
Функцію, передану в `useEffect`, не можна робити `async` напряму (вона має повертати функцію очищення або нічого, а не Promise). Оголошуйте асинхронну функцію всередині ефекту і викликайте її. Детальніше роботу з API розглянемо на окремій лекції.
:::

### useReducer — коли стану багато

Коли логіка оновлення стану складна (кілька пов'язаних полів, багато типів дій), її зручно винести в **редʼюсер** (reducer) — чисту функцію `(state, action) => newState`.

```jsx
import { useReducer } from 'react';

function placesReducer(state, action) {
  switch (action.type) {
    case 'add':
      return [action.place, ...state];
    case 'remove':
      return state.filter((p) => p.id !== action.id);
    case 'toggleFavorite':
      return state.map((p) =>
        p.id === action.id ? { ...p, isFavorite: !p.isFavorite } : p
      );
    default:
      throw new Error(`Невідома дія: ${action.type}`);
  }
}

export default function App() {
  const [places, dispatch] = useReducer(placesReducer, PLACES);

  return (
    <PlacesList
      places={places}
      onRemove={(id) => dispatch({ type: 'remove', id })}
      onToggleFavorite={(id) => dispatch({ type: 'toggleFavorite', id })}
    />
  );
}
```

| | `useState` | `useReducer` |
|---|---|---|
| Підходить для | простих незалежних значень | складного стану з багатьма діями |
| Логіка оновлення | у компонентах-обробниках | в одному місці (reducer) |
| Тестування | разом із компонентом | reducer тестується як звичайна функція |

У поєднанні з Context `useReducer` дає легку альтернативу Redux — цей підхід ми використаємо, коли додамо навігацію.

## 5. Основи стилізації

### StyleSheet.create

```jsx
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '600' },
});

<View style={styles.container}>
  <Text style={styles.title}>Заголовок</Text>
</View>
```

Особливості стилів у RN:

- Назви властивостей — **camelCase**: `backgroundColor`, `borderRadius`, `marginHorizontal`.
- Числові значення — **без одиниць**; рядки — для відсотків (`'50%'`) і кольорів.
- Кольори: `'#2563eb'`, `'rgb(37, 99, 235)'`, `'rgba(0,0,0,0.5)'`, `'tomato'`, `'transparent'`.
- Скорочення RN-специфічні: `marginHorizontal`, `marginVertical`, `paddingHorizontal`, `paddingVertical`. Рядкові скорочення CSS (`margin: '10px 20px'`, `border: '1px solid red'`) **не підтримуються** — пишіть `borderWidth`, `borderColor`, `borderStyle` окремо.
- `fontWeight` — рядок: `'400'`, `'700'`, `'bold'`.

### Масиви стилів і умовні стилі

Проп `style` приймає масив. Стилі об'єднуються зліва направо, пізніші перекривають попередні. Значення `false`, `null`, `undefined` ігноруються — це основа умовних стилів:

```jsx
<Pressable
  style={[
    styles.button,
    variant === 'danger' && styles.buttonDanger,
    disabled && styles.buttonDisabled,
  ]}
  disabled={disabled}
>
  <Text style={[styles.buttonText, disabled && { color: '#94a3b8' }]}>Видалити</Text>
</Pressable>
```

Стиль, що залежить від стану натискання:

```jsx
<Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
```

Динамічні значення (обчислені під час виконання) комбінують зі статичними:

```jsx
<View style={[styles.progressBar, { width: `${progress}%` }]} />
```

:::tip
Перевикористовувані значення (кольори, відступи, радіуси) виносьте у файл теми, наприклад `constants/theme.js` з об'єктами `COLORS`, `SPACING`, `RADIUS`. Так змінювати дизайн застосунку можна в одному місці.
:::

## 6. Flexbox і одиниці виміру

### Flexbox у RN

Усі `View` — flex-контейнери за замовчуванням (`display: 'flex'`). Відмінності від вебу:

| Властивість | Веб (CSS) | React Native |
|---|---|---|
| `flexDirection` | `row` | **`column`** |
| `flexShrink` | `1` | `0` |
| `alignContent` | `normal` | `flex-start` |
| `flex` | скорочення `grow shrink basis` | **одне число** |
| `display: grid`, `float` | є | немає |
| `position` | `static` за замовчуванням | **`relative`** за замовчуванням; також `absolute` |

`flex: 1` означає «займи весь вільний простір уздовж головної осі батька». Кілька елементів з `flex` ділять простір пропорційно:

```jsx
<View style={{ flex: 1 }}>
  <View style={{ flex: 1, backgroundColor: '#fecaca' }} /> {/* 1/6 висоти */}
  <View style={{ flex: 2, backgroundColor: '#fde68a' }} /> {/* 2/6 */}
  <View style={{ flex: 3, backgroundColor: '#bbf7d0' }} /> {/* 3/6 */}
</View>
```

:::caution[Чому мій екран порожній?]
Якщо батьківський контейнер не має висоти (немає `flex: 1` або `height`), дочірній `flex: 1` нічого не отримає. Кореневий `View` екрана майже завжди повинен мати `flex: 1`.
:::

Основні властивості:

| Властивість | Значення | Призначення |
|---|---|---|
| `flexDirection` | `column`, `row`, `column-reverse`, `row-reverse` | Головна вісь |
| `justifyContent` | `flex-start`, `center`, `flex-end`, `space-between`, `space-around`, `space-evenly` | Розподіл уздовж головної осі |
| `alignItems` | `stretch` (за замовч.), `flex-start`, `center`, `flex-end`, `baseline` | Вирівнювання по поперечній осі |
| `alignSelf` | те саме + `auto` | Вирівнювання окремого елемента |
| `flexWrap` | `nowrap`, `wrap` | Перенесення на новий рядок |
| `gap`, `rowGap`, `columnGap` | число | Відстань між елементами |

Типовий рядок «іконка — текст — кнопка»:

```jsx
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
  <Image source={{ uri }} style={{ width: 48, height: 48, borderRadius: 24 }} />
  <Text style={{ flex: 1 }} numberOfLines={1}>Довга назва, що стискається</Text>
  <Pressable><Text>♥</Text></Pressable>
</View>
```

Абсолютне позиціонування (наприклад, бейдж поверх зображення):

```jsx
<View>
  <Image source={{ uri }} style={{ width: '100%', height: 180 }} />
  <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: '#fff', borderRadius: 12, padding: 4 }}>
    <Text>♥</Text>
  </View>
</View>
```

Для заповнення всього батька є готовий стиль `StyleSheet.absoluteFill` (еквівалент `position: 'absolute', top: 0, right: 0, bottom: 0, left: 0`).

### Одиниці виміру

Числа в стилях — це **незалежні від щільності пікселі** (density-independent pixels: dp на Android, points на iOS). Фізичних пікселів на 1 dp може бути 1, 2, 3 або більше — залежно від щільності екрана:

```jsx
import { PixelRatio } from 'react-native';

PixelRatio.get();        // наприклад, 3 — на екрані 3 фізичні пікселі на 1 dp
PixelRatio.getFontScale(); // системний масштаб шрифту користувача
```

Завдяки цьому кнопка `width: 100` має приблизно однаковий фізичний розмір на різних телефонах. Відсотки (`'50%'`) обчислюються відносно батьківського контейнера. `StyleSheet.hairlineWidth` — найтонша лінія, яку може відобразити екран.

## 7. Адаптивність, платформи, темна тема, тіні

### Dimensions і useWindowDimensions

```jsx
import { useWindowDimensions } from 'react-native';

function Gallery() {
  const { width, height, fontScale } = useWindowDimensions();
  const isLandscape = width > height;
  const columns = width >= 768 ? 3 : 2;
  const itemSize = (width - 16 * (columns + 1)) / columns;

  return /* ... FlatList з numColumns={columns} key={columns} ... */;
}
```

`useWindowDimensions()` — хук, який **автоматично оновлює** компонент при повороті екрана, зміні розміру вікна (планшети, складані телефони, режим розділеного екрана). `Dimensions.get('window')` повертає значення лише на момент виклику; якщо викликати його поза компонентом, значення не оновиться при повороті. Тому в компонентах віддавайте перевагу хуку.

:::note
У `FlatList` змінювати `numColumns` «на льоту» не можна — додайте проп `key={columns}`, щоб список перемонтувався.
:::

### Platform.select

```jsx
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'android' ? 8 : 0,
    ...Platform.select({
      ios: { fontFamily: 'Avenir' },
      android: { fontFamily: 'sans-serif-medium' },
      default: {}, // web та інші
    }),
  },
});
```

### Темна тема: useColorScheme

```jsx
import { useColorScheme, View, Text, StyleSheet } from 'react-native';

const THEMES = {
  light: { background: '#ffffff', text: '#0f172a', card: '#f1f5f9' },
  dark: { background: '#0f172a', text: '#f8fafc', card: '#1e293b' },
};

export default function Screen() {
  const scheme = useColorScheme(); // 'light' | 'dark' | null
  const theme = THEMES[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={{ color: theme.text }}>Тема: {scheme}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 16 } });
```

:::caution
В Expo-проєкті поле `"userInterfaceStyle"` у `app.json` за замовчуванням дорівнює `"light"` — тоді `useColorScheme()` завжди повертатиме `'light'`. Щоб застосунок реагував на системну тему, встановіть `"userInterfaceStyle": "automatic"` і перезапустіть застосунок (на Android для development build потрібен також пакет `expo-system-ui`).
:::

### Тіні: iOS vs Android

Історично платформи мали різні механізми тіней:

```jsx
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', // тінь на Android потребує непрозорого фону
    borderRadius: 12,

    // iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,

    // Android
    elevation: 4,
  },
});
```

| | iOS | Android |
|---|---|---|
| Властивості | `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius` | `elevation` (висота в dp) |
| Контроль | детальний (зміщення, розмиття, прозорість) | лише «висота»; `shadowColor` впливає з Android 9+ |
| Особливість | `overflow: 'hidden'` обрізає тінь | потрібен `backgroundColor` |

У Новій архітектурі з'явилася підтримка властивості **`boxShadow`** (у CSS-подібному синтаксисі), яка працює однаково на обох платформах:

```jsx
<View style={{ boxShadow: '0 4px 8px rgba(0, 0, 0, 0.12)', borderRadius: 12, backgroundColor: '#fff' }} />
```

Якщо ваш проєкт підтримує лише сучасні версії RN — це найзручніший варіант; класичні властивості залишаються для сумісності.

## 8. Альтернативні підходи до стилізації

Окрім `StyleSheet`, в екосистемі популярні:

- **NativeWind** — Tailwind CSS для React Native: стилі через `className="flex-1 items-center bg-white dark:bg-slate-900"`. Зручно для тих, хто знає Tailwind з вебу; потребує налаштування Babel/Metro.
- **styled-components / Emotion** — CSS-in-JS: стилі описуються шаблонними рядками на кшталт CSS, а результатом є готовий стилізований компонент (`styled.Text`, `styled.View`).
- **Tamagui, Unistyles, Restyle** — бібліотеки дизайн-систем з темами та оптимізацією.

```jsx
// NativeWind (для ознайомлення)
<View className="flex-1 items-center justify-center bg-white">
  <Text className="text-2xl font-bold text-slate-900">Мої місця</Text>
</View>
```

У нашому курсі використовуємо стандартний `StyleSheet` — він не потребує додаткових залежностей і показує, як усе працює «під капотом».

## Підсумки

- **Пропси** передаються згори і лише читаються; **стан** належить компоненту і змінюється через сеттер, викликаючи повторний рендеринг. Стан оновлюють незмінно (новими масивами/об'єктами).
- Спільний стан піднімають до найближчого предка; дочірні компоненти повідомляють про події через колбеки.
- Поля введення роблять **контрольованими** (`value` + `onChangeText`). Основні події: `onPress`, `onLongPress`, `onChangeText`, `onSubmitEditing`. В обробник передають функцію, а не результат її виклику.
- `useEffect` — для побічних ефектів з масивом залежностей і функцією очищення; `useReducer` — для складної логіки оновлення стану.
- Стилі — JS-об'єкти в `StyleSheet.create`; масиви стилів дають умовні та комбіновані стилі.
- Flexbox у RN: головна вісь — вертикальна, `flex` — одне число, корінь екрана потребує `flex: 1`. Розміри — у dp.
- Адаптивність — `useWindowDimensions`; платформні відмінності — `Platform.select`; темна тема — `useColorScheme` + `userInterfaceStyle: "automatic"`; тіні — `shadow*` (iOS), `elevation` (Android) або `boxShadow`.

## Контрольні питання

1. Чим пропси відрізняються від стану? Наведіть приклад даних кожного типу в застосунку «Мої місця».
2. Чому не можна змінювати масив стану через `push` і передавати його в сеттер? Як правильно додати, видалити й оновити елемент?
3. Коли слід використовувати функціональну форму оновлення `setState(prev => ...)`?
4. Що означає «підняти стан» і навіщо це робити?
5. Що таке контрольований `TextInput`? Чим `onChangeText` відрізняється від `onChange`?
6. Що станеться, якщо написати `onPress={handleDelete(id)}`? Як правильно?
7. Як масив залежностей впливає на виконання `useEffect`? Навіщо потрібна функція очищення?
8. У яких випадках `useReducer` зручніший за `useState`?
9. Назвіть відмінності Flexbox у RN від CSS. Що означає `flex: 1`?
10. Чим `useWindowDimensions` кращий за `Dimensions.get` у компонентах? Як реалізувати тіні, що працюють на обох платформах?

## Домашнє завдання

У Snack або в окремій гілці свого проєкту створіть екран **«Лічильник витрат у поїздці»**:

1. Два контрольовані поля: «Назва витрати» та «Сума» (`keyboardType="decimal-pad"`), кнопка «Додати» на `Pressable` зі стилем натискання. Валідація: назва не порожня, сума — додатне число; помилку виводити червоним текстом під полями.
2. Список витрат (`FlatList`) і загальна сума в шапці. Довге натискання на витрату — `Alert` з підтвердженням видалення.
3. Логіку стану реалізуйте через `useReducer` (дії `add`, `remove`).
4. Підтримка темної теми через `useColorScheme` (не забудьте `userInterfaceStyle` у `app.json`, якщо робите в проєкті) і картки з тінню, що відображається і на Android, і на iOS.

Обсяг — 45–60 хвилин.

**Що здати:** посилання на Snack або гілку репозиторію та два скриншоти — у світлій і темній темі з 3+ витратами.
