---
title: Компоненти інтерфейсу в React Native
description: Базові вбудовані компоненти React Native — View, Text, Image, ScrollView, TextInput, Pressable, FlatList, Modal та інші — і правила їх використання.
type: lecture
pair: 3
topic: 128
---

## Мета заняття

- Ознайомитися з основними вбудованими компонентами (core components) React Native та їхніми ключовими пропсами.
- Зрозуміти правила вкладання тексту, роботи із зображеннями та прокручуванням.
- Навчитися обирати правильний компонент для кнопок і списків.
- Опанувати компоненти для роботи з клавіатурою, безпечними зонами екрана і рядком стану.
- Дізнатися, як писати платформно-специфічний код.

## План лекції

1. Контейнери і текст: `View`, `Text`.
2. Зображення: `Image`, `ImageBackground`.
3. Прокручування: `ScrollView`.
4. Введення даних: `TextInput`, `Switch`.
5. Обробка натискань: `Button`, `Pressable`, `Touchable*`.
6. Списки: `FlatList`, `SectionList`.
7. Службові компоненти: `Modal`, `ActivityIndicator`, `SafeAreaView`, `KeyboardAvoidingView`, `StatusBar`.
8. Платформно-специфічний код.

## 1. View і Text

### View

`View` — базовий будівельний блок інтерфейсу, контейнер, що підтримує Flexbox-розмітку, стилі, обробку дотиків і доступність. Аналог `<div>`, але з важливими відмінностями:

- `View` **не прокручується** — якщо вміст не вміщується, він просто обрізається або виходить за межі.
- `View` **не може містити текст напряму**.
- Стилі `View` (наприклад, `color`, `fontSize`) **не успадковуються** дочірніми елементами.

```jsx
import { View, StyleSheet } from 'react-native';

export default function Boxes() {
  return (
    <View style={styles.row}>
      <View style={[styles.box, { backgroundColor: '#ef4444' }]} />
      <View style={[styles.box, { backgroundColor: '#22c55e' }]} />
      <View style={[styles.box, { backgroundColor: '#3b82f6' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, padding: 16 },
  box: { width: 60, height: 60, borderRadius: 8 },
});
```

Корисні пропси `View`: `style`, `onLayout` (отримати розміри після розмітки), `pointerEvents`, `accessible`, `accessibilityLabel`, `testID`.

### Text

`Text` — єдиний компонент для відображення тексту. Правила:

1. **Будь-який рядок у JSX має бути всередині `<Text>`**, інакше — помилка «Text strings must be rendered within a `<Text>` component».
2. `Text` можна **вкладати** в `Text` — вкладений текст **успадковує** стилі батьківського і рендериться в одному рядку (inline).
3. Усередині `Text` не можна розміщувати `View` для розмітки (технічно частково підтримується, але поводиться непередбачувано).

```jsx
<Text style={{ fontSize: 16, color: '#334155' }}>
  Я відвідав <Text style={{ fontWeight: 'bold' }}>Львів</Text> і
  <Text style={{ color: '#2563eb' }} onPress={() => console.log('link')}> Одесу</Text>.
</Text>
```

Корисні пропси:

| Проп | Призначення |
|---|---|
| `numberOfLines` | Обмежити кількість рядків (решта обрізається з «…») |
| `ellipsizeMode` | Де ставити «…»: `'tail'`, `'head'`, `'middle'`, `'clip'` |
| `selectable` | Дозволити виділення й копіювання тексту |
| `onPress`, `onLongPress` | Текст як посилання |
| `allowFontScaling` | Чи враховувати системний розмір шрифту (за замовчуванням `true`) |
| `adjustsFontSizeToFit` | Зменшувати шрифт, щоб умістити текст |

```jsx
<Text numberOfLines={2} ellipsizeMode="tail">
  Дуже довгий опис місця, який не повинен займати пів екрана, тому
  ми обрізаємо його до двох рядків...
</Text>
```

:::caution[Пастка з умовним рендерингом]
```jsx
{places.length && <Text>Є місця</Text>}
```
Якщо `places.length === 0`, вираз поверне `0`, і React Native спробує відрендерити число поза `<Text>` — застосунок впаде. Пишіть `places.length > 0 && ...` або тернарний оператор.
:::

## 2. Image

`Image` відображає зображення з різних джерел.

### Локальні зображення

```jsx
<Image source={require('./assets/logo.png')} style={{ width: 120, height: 120 }} />
```

- Шлях у `require()` має бути **статичним рядком** (Metro аналізує його під час збирання). `require('./assets/' + name)` не працює.
- Для локальних зображень розміри відомі заздалегідь, тож `width`/`height` можна не вказувати.
- Підтримуються суфікси щільності: `logo.png`, `logo@2x.png`, `logo@3x.png` — RN обере потрібний для екрана.

### Віддалені зображення

```jsx
<Image
  source={{ uri: 'https://picsum.photos/id/1018/600/400' }}
  style={{ width: '100%', height: 200 }}
  resizeMode="cover"
/>
```

:::danger[Обов'язково вказуйте розміри]
Для зображень з мережі (`{ uri }`) React Native **не знає розміру заздалегідь**. Без `width` і `height` (або `aspectRatio`) зображення матиме розмір 0×0 і буде невидимим.
:::

Замість фіксованої висоти зручно використовувати `aspectRatio`:

```jsx
<Image source={{ uri }} style={{ width: '100%', aspectRatio: 16 / 9 }} />
```

### resizeMode

| Значення | Поведінка |
|---|---|
| `cover` (за замовчуванням) | Заповнює контейнер зі збереженням пропорцій, зайве обрізається |
| `contain` | Уміщує повністю зі збереженням пропорцій, можуть бути порожні поля |
| `stretch` | Розтягує без збереження пропорцій |
| `center` | По центру без масштабування (зменшує, якщо більше) |
| `repeat` | Заповнює плиткою |

Інші корисні пропси: `onLoad`, `onError`, `blurRadius`, `defaultSource` (заглушка, iOS і релізні збірки Android). Для `ImageBackground` — фонове зображення, всередину якого можна вкладати інші компоненти:

```jsx
<ImageBackground source={{ uri }} style={{ height: 200, justifyContent: 'flex-end' }}>
  <Text style={{ color: '#fff', padding: 12 }}>Карпати</Text>
</ImageBackground>
```

:::tip
У реальних проєктах замість `Image` часто використовують `expo-image` (`npx expo install expo-image`) — він має кешування на диску, плавну появу (`transition`), підтримку плейсхолдерів (blurhash) і сучасних форматів. API схожий: `<Image source={uri} contentFit="cover" />`.
:::

## 3. ScrollView

`ScrollView` — контейнер з прокручуванням. **Рендерить усіх дочірніх елементів одразу**, навіть тих, що за межами екрана.

```jsx
<ScrollView
  contentContainerStyle={{ padding: 16, gap: 12 }}
  showsVerticalScrollIndicator={false}
>
  {/* вміст */}
</ScrollView>
```

Ключові пропси:

| Проп | Призначення |
|---|---|
| `horizontal` | Горизонтальне прокручування |
| `contentContainerStyle` | Стилі внутрішнього контейнера (відступи, `gap`, `alignItems`) |
| `pagingEnabled` | Прокручування «сторінками» (каруселі) |
| `keyboardShouldPersistTaps` | `'handled'` — дотики до кнопок спрацьовують при відкритій клавіатурі |
| `refreshControl` | Pull-to-refresh (`<RefreshControl refreshing onRefresh />`) |
| `onScroll` + `scrollEventThrottle` | Відстеження позиції |

:::caution
Не задавайте `alignItems`/`justifyContent`/`padding` у `style` у `ScrollView` — для розмітки вмісту використовуйте `contentContainerStyle`. А щоб `ScrollView` заповнював екран, йому самому чи батьківському контейнеру потрібен `flex: 1` або обмежена висота.
:::

`ScrollView` підходить для **невеликого обмеженого** обсягу вмісту: форма, сторінка «Про застосунок», деталі об'єкта. Для довгих і динамічних списків — `FlatList`.

## 4. TextInput і Switch

### TextInput

`TextInput` — поле введення тексту. Найчастіше використовується як **контрольований компонент**:

```jsx
import { useState } from 'react';
import { TextInput, StyleSheet } from 'react-native';

export default function CityInput() {
  const [city, setCity] = useState('');

  return (
    <TextInput
      style={styles.input}
      value={city}
      onChangeText={setCity}
      placeholder="Місто"
      placeholderTextColor="#94a3b8"
      autoCapitalize="words"
      autoCorrect={false}
      returnKeyType="done"
      onSubmitEditing={() => console.log('Готово:', city)}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
```

Основні пропси:

| Проп | Призначення |
|---|---|
| `value`, `onChangeText` | Контрольоване значення і обробник зміни (отримує рядок) |
| `placeholder`, `placeholderTextColor` | Підказка |
| `keyboardType` | Тип клавіатури |
| `secureTextEntry` | Приховування символів (паролі) |
| `multiline`, `numberOfLines` | Багаторядкове поле (аналог `<textarea>`) |
| `maxLength` | Максимальна довжина |
| `autoCapitalize` | `'none'`, `'sentences'`, `'words'`, `'characters'` |
| `autoCorrect`, `autoComplete` | Автовиправлення та автозаповнення |
| `returnKeyType` | Підпис кнопки Enter: `'done'`, `'next'`, `'search'`, `'send'` |
| `onSubmitEditing` | Натиснуто Enter |
| `onFocus`, `onBlur` | Фокус |
| `editable` | `false` — лише для читання |

Значення `keyboardType`:

| Значення | Клавіатура |
|---|---|
| `default` | Звичайна |
| `numeric` | Цифри |
| `number-pad` | Лише цифри без крапки |
| `decimal-pad` | Цифри з десятковим роздільником |
| `phone-pad` | Телефонна |
| `email-address` | З символами `@` і `.` |
| `url` | Для адрес |

Перехід між полями по кнопці «Далі» реалізується через `useRef`:

```jsx
const cityRef = useRef(null);

<TextInput returnKeyType="next" onSubmitEditing={() => cityRef.current?.focus()} />
<TextInput ref={cityRef} returnKeyType="done" />
```

:::note
На Android багаторядкове поле за замовчуванням вирівнює текст по центру вертикально. Додайте `textAlignVertical: 'top'` у стилі.
:::

### Switch

Нативний перемикач (аналог checkbox):

```jsx
const [isFavorite, setIsFavorite] = useState(false);

<Switch
  value={isFavorite}
  onValueChange={setIsFavorite}
  trackColor={{ false: '#cbd5e1', true: '#86efac' }}
  thumbColor={isFavorite ? '#16a34a' : '#f8fafc'}
/>
```

## 5. Обробка натискань: Button, Pressable, Touchable*

### Button

Найпростіша нативна кнопка:

```jsx
<Button title="Зберегти" onPress={handleSave} color="#2563eb" disabled={!title} />
```

Обмеження: **майже не стилізується** (лише `color`), виглядає по-різному на Android (прямокутна кнопка з фоном) та iOS (просто синій текст). Підходить для прототипів.

### Pressable

`Pressable` — сучасний рекомендований компонент для будь-яких елементів, що реагують на дотик. Обгортає довільний вміст і дає доступ до стану натискання:

```jsx
<Pressable
  onPress={() => console.log('press')}
  onLongPress={() => console.log('long press')}
  delayLongPress={400}
  hitSlop={8}                                  // збільшує зону дотику на 8 dp
  android_ripple={{ color: 'rgba(0,0,0,0.1)' }} // ефект хвилі на Android
  style={({ pressed }) => [
    styles.button,
    pressed && { opacity: 0.7 },               // стиль під час натискання
  ]}
>
  {({ pressed }) => (
    <Text style={styles.buttonText}>{pressed ? 'Тримаю...' : 'Натисни'}</Text>
  )}
</Pressable>
```

Події `Pressable`: `onPressIn` → (`onLongPress`) → `onPressOut` → `onPress`.

### Touchable* (застарілий підхід)

`TouchableOpacity`, `TouchableHighlight`, `TouchableWithoutFeedback` — попереднє покоління. Досі працюють і часто зустрічаються в старому коді та туторіалах, але документація рекомендує `Pressable` як більш гнучкий і перспективний API.

| Компонент | Стилізація | Зворотний зв'язок | Рекомендація |
|---|---|---|---|
| `Button` | лише `color` | нативний | прототипи, прості форми |
| `Pressable` | повна, залежно від `pressed` | будь-який, `android_ripple` | **основний вибір** |
| `TouchableOpacity` | повна | зміна прозорості | легасі-код |
| `TouchableHighlight` | повна | підкладка кольором | легасі-код |

:::tip[Мінімальний розмір зони дотику]
Рекомендації Apple і Google — не менше 44×44 pt / 48×48 dp для інтерактивного елемента. Маленьку іконку робіть більшою за допомогою `padding` або `hitSlop`.
:::

## 6. Списки: FlatList і SectionList

### Чому не map у ScrollView

```jsx
// Погано для довгих списків
<ScrollView>
  {places.map((p) => <PlaceCard key={p.id} place={p} />)}
</ScrollView>
```

`ScrollView` створить нативні елементи **для всіх** записів одразу. При 1000 записів із зображеннями це — тисячі нативних view, повільний старт, велике споживання пам'яті, можливе падіння.

`FlatList` використовує **віртуалізацію**: рендерить лише видимі елементи плюс невеликий буфер і видаляє/перевикористовує ті, що пішли за межі екрана.

### FlatList

```jsx
import { FlatList, Text, View } from 'react-native';

const PLACES = [
  { id: '1', title: 'Софійський собор', city: 'Київ' },
  { id: '2', title: 'Площа Ринок', city: 'Львів' },
  { id: '3', title: 'Потьомкінські сходи', city: 'Одеса' },
];

export default function PlacesList() {
  return (
    <FlatList
      data={PLACES}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <Text style={{ padding: 16 }}>
          {index + 1}. {item.title} — {item.city}
        </Text>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#e2e8f0' }} />}
      ListHeaderComponent={<Text style={{ fontSize: 22, padding: 16 }}>Мої місця</Text>}
      ListEmptyComponent={<Text style={{ padding: 16 }}>Поки що порожньо</Text>}
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}
```

| Проп | Призначення |
|---|---|
| `data` | Масив даних |
| `renderItem` | Функція `({ item, index }) => element` |
| `keyExtractor` | Унікальний ключ (рядок) для кожного елемента |
| `ListHeaderComponent`, `ListFooterComponent` | Шапка/підвал, що прокручуються разом зі списком |
| `ListEmptyComponent` | Що показати, коли `data` порожній |
| `ItemSeparatorComponent` | Роздільник між елементами |
| `numColumns` | Сітка з кількох колонок |
| `horizontal` | Горизонтальний список |
| `onEndReached`, `onEndReachedThreshold` | Підвантаження наступної сторінки (нескінченний список) |
| `refreshing`, `onRefresh` | Pull-to-refresh |
| `extraData` | Додаткові дані, від яких залежить рендеринг елементів |

:::caution
Не вкладайте `FlatList` у `ScrollView` з тим самим напрямком прокручування — віртуалізація перестане працювати, і ви отримаєте попередження «VirtualizedLists should never be nested inside plain ScrollViews». Використовуйте `ListHeaderComponent`/`ListFooterComponent` для вмісту над і під списком.
:::

### SectionList

Список з групуванням за секціями (контакти за літерою, місця за містом):

```jsx
const SECTIONS = [
  { title: 'Київ', data: ['Софійський собор', 'Андріївський узвіз'] },
  { title: 'Львів', data: ['Площа Ринок', 'Високий замок'] },
];

<SectionList
  sections={SECTIONS}
  keyExtractor={(item, index) => item + index}
  renderItem={({ item }) => <Text style={{ padding: 12 }}>{item}</Text>}
  renderSectionHeader={({ section }) => (
    <Text style={{ fontWeight: 'bold', backgroundColor: '#f1f5f9', padding: 8 }}>
      {section.title}
    </Text>
  )}
  stickySectionHeadersEnabled
/>
```

## 7. Службові компоненти

### Modal

Модальне вікно поверх поточного екрана:

```jsx
const [visible, setVisible] = useState(false);

<Modal
  visible={visible}
  animationType="slide"          // 'none' | 'slide' | 'fade'
  transparent                    // прозорий фон, щоб зробити затемнення самостійно
  onRequestClose={() => setVisible(false)} // кнопка «Назад» на Android
>
  <View style={styles.backdrop}>
    <View style={styles.dialog}>
      <Text>Видалити місце?</Text>
      <Button title="Закрити" onPress={() => setVisible(false)} />
    </View>
  </View>
</Modal>
```

Для простих підтверджень зручніше `Alert.alert('Заголовок', 'Повідомлення', [{ text: 'Скасувати', style: 'cancel' }, { text: 'Видалити', style: 'destructive', onPress: remove }])`.

### ActivityIndicator

Нативний індикатор завантаження (спінер):

```jsx
{isLoading ? <ActivityIndicator size="large" color="#2563eb" /> : <Content />}
```

### SafeAreaView і react-native-safe-area-context

Сучасні телефони мають «чубчики» (notch), вирізи під камеру, заокруглені кути та системні панелі. **Безпечна зона** (safe area) — область екрана, де вміст не перекривається.

Вбудований `SafeAreaView` з `react-native` працює **лише на iOS** і вважається застарілим. Рекомендовано бібліотеку `react-native-safe-area-context` (вона вже входить у шаблони Expo і потрібна React Navigation):

```bash
npx expo install react-native-safe-area-context
```

```jsx
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {/* вміст екрана */}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
```

Альтернатива — хук `useSafeAreaInsets()`, що повертає `{ top, bottom, left, right }` для ручних відступів:

```jsx
const insets = useSafeAreaInsets();
<View style={{ paddingTop: insets.top }} />
```

### KeyboardAvoidingView

Коли з'являється екранна клавіатура, вона може перекрити поле введення. `KeyboardAvoidingView` зсуває або стискає вміст:

```jsx
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
>
  <ScrollView keyboardShouldPersistTaps="handled">
    {/* поля форми */}
  </ScrollView>
</KeyboardAvoidingView>
```

На Android поведінка також залежить від налаштування `softwareKeyboardLayoutMode` в `app.json` (за замовчуванням — `resize`, вікно стискається само). Для складних форм часто використовують бібліотеку `react-native-keyboard-controller`.

Щоб сховати клавіатуру програмно — `Keyboard.dismiss()`.

### StatusBar

Рядок стану — системна смуга з часом, батареєю, мережею. В Expo зручно використовувати `expo-status-bar`:

```jsx
import { StatusBar } from 'expo-status-bar';

<StatusBar style="light" />   // 'auto' | 'light' | 'dark'
```

`style="auto"` автоматично підбирає колір під світлу/темну тему. Вбудований `StatusBar` з `react-native` також доступний і має проп `barStyle`.

## 8. Платформно-специфічний код

### Platform.OS і Platform.select

```jsx
import { Platform } from 'react-native';

const isIOS = Platform.OS === 'ios';   // 'ios' | 'android' | 'web'

const styles = StyleSheet.create({
  title: {
    fontFamily: Platform.select({ ios: 'Helvetica', android: 'sans-serif', default: 'System' }),
  },
});
```

### Платформні розширення файлів

Якщо реалізація суттєво відрізняється, створіть два файли:

```text
components/
├── DatePicker.ios.js
└── DatePicker.android.js
```

і імпортуйте **без розширення платформи**:

```jsx
import DatePicker from './components/DatePicker';
```

Metro автоматично підставить потрібний файл під час збирання для кожної платформи. Аналогічно працює суфікс `.native.js` (для iOS і Android, на противагу `.web.js` або звичайному `.js` для вебу).

## Підсумки

- `View` — контейнер без прокручування; `Text` — єдиний спосіб показати текст, вкладені `Text` успадковують стилі.
- `Image` з мережі **потребує явних розмірів** або `aspectRatio`; локальні зображення підключаються через статичний `require`.
- `ScrollView` рендерить усе одразу — для коротких сторінок; для списків — `FlatList`/`SectionList` з віртуалізацією і `keyExtractor`.
- `TextInput` — контрольований компонент з `value` + `onChangeText`; тип клавіатури задається `keyboardType`.
- Для натискань використовуйте `Pressable` (стан `pressed`, `android_ripple`, `hitSlop`); `Button` — для прототипів; `Touchable*` — легасі.
- Безпечні зони — через `react-native-safe-area-context`, клавіатура — `KeyboardAvoidingView`, рядок стану — `expo-status-bar`.
- Платформні відмінності — `Platform.OS`, `Platform.select`, файли `.ios.js`/`.android.js`.

## Контрольні питання

1. Чому текст не можна розмістити безпосередньо у `View`? Які стилі успадковуються в `Text`?
2. Чим відрізняється підключення локального і віддаленого зображення? Чому віддалене зображення без розмірів не видно?
3. Поясніть різницю між `resizeMode="cover"` і `"contain"`.
4. Чим `style` відрізняється від `contentContainerStyle` у `ScrollView`?
5. Чому для довгих списків слід використовувати `FlatList`, а не `map()` у `ScrollView`? Що таке віртуалізація?
6. Які значення `keyboardType` ви використаєте для полів «Email», «Телефон», «Ціна»?
7. Порівняйте `Button`, `Pressable` і `TouchableOpacity`. Як змінити стиль кнопки під час натискання?
8. Навіщо потрібен `react-native-safe-area-context`, якщо в RN є `SafeAreaView`?
9. Як працює `KeyboardAvoidingView` і чому значення `behavior` різні для iOS та Android?
10. Як Metro обирає між файлами `Map.ios.js` і `Map.android.js`?

## Домашнє завдання

Створіть у [snack.expo.dev](https://snack.expo.dev) (або у своєму проєкті в окремій гілці) екран «Список покупок»:

1. `TextInput` для назви товару та `Pressable`-кнопка «Додати» (зі зміною прозорості під час натискання).
2. `FlatList` товарів з `keyExtractor`, `ListEmptyComponent` («Список порожній») і роздільником.
3. У кожному рядку — назва та `Switch` «Куплено»; куплені товари відображаються закресленим текстом (`textDecorationLine: 'line-through'`).
4. Екран обгорнуто в `SafeAreaView` з `react-native-safe-area-context` та `KeyboardAvoidingView`.

Обсяг роботи — 40–60 хвилин.

**Що здати:** посилання на Snack або на гілку репозиторію + скриншот екрана з 3–4 товарами, з яких хоча б один позначено купленим.
