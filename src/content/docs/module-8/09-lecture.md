---
title: Навігація у React Native
description: Принципи навігації в мобільних застосунках, React Navigation v7 — стек, вкладки, бокове меню, параметри, вкладені навігатори, модальні екрани, deep linking, сценарій авторизації та порівняння з Expo Router.
type: lecture
pair: 9
topic: 134
---

## Мета заняття

- Зрозуміти, чим навігація в мобільному застосунку відрізняється від навігації у вебі.
- Опанувати основні поняття React Navigation: контейнер, навігатори, екрани, маршрути.
- Навчитися використовувати стековий навігатор, вкладки та бокове меню, передавати параметри між екранами.
- Розібратися з вкладеними навігаторами, модальними екранами та хуками навігації.
- Ознайомитися з deep linking, патерном авторизації та файловою маршрутизацією Expo Router.

## План лекції

1. Навігація у вебі та в мобільних застосунках.
2. React Navigation: основні поняття та встановлення.
3. Стековий навігатор (native stack): переходи, параметри, налаштування заголовка.
4. Вкладки (bottom tabs) та бокове меню (drawer).
5. Вкладені навігатори, модальні екрани, хуки навігації.
6. Deep linking і сценарій авторизації.
7. Expo Router: файлова маршрутизація.

## 1. Навігація у вебі та в мобільних застосунках

У браузері навігацію забезпечує сама платформа: кожна сторінка має **URL**, є **історія** (кнопки «Назад»/«Вперед»), посилання `<a href>`. Бібліотеки на кшталт React Router лише синхронізують інтерфейс з адресним рядком.

У мобільному застосунку нічого цього немає:

| Аспект | Веб | Мобільний застосунок |
|---|---|---|
| Ідентифікація екрана | URL у адресному рядку | Назва маршруту (route name) у стані навігатора |
| Історія | Лінійна історія браузера | Стек екранів (а також окремі стани вкладок) |
| «Назад» | Кнопка браузера | Кнопка в заголовку (iOS), системна кнопка/жест «Назад» (Android), свайп від краю (iOS) |
| Переходи | Миттєва заміна сторінки | Нативні анімації: виїзд справа, модальне вікно знизу |
| Попередній екран | Знищується | Залишається змонтованим під поточним (зберігає стан, прокрутку) |
| Структура | Плоска (сторінки) | Ієрархічна: стек усередині вкладок, вкладки всередині стека |

Тому в React Native навігацію реалізують бібліотеки, які самі зберігають **стан навігації** — дерево маршрутів — і відображають його за допомогою нативних компонентів. Найпоширеніша — **React Navigation**; альтернатива, побудована поверх неї, — **Expo Router**.

## 2. React Navigation: основні поняття

| Поняття | Опис |
|---|---|
| `NavigationContainer` | Кореневий компонент; зберігає стан навігації всього застосунку. Має бути один, огортає все дерево |
| Навігатор (navigator) | Компонент, що визначає спосіб переходу між екранами: стек, вкладки, бокове меню |
| Екран (screen) | Компонент, зареєстрований у навігаторі під унікальною назвою |
| Маршрут (route) | Конкретний екземпляр екрана в стані навігації: `{ key, name, params }` |
| Об'єкт `navigation` | Методи для переходів (`navigate`, `goBack`…) і налаштувань (`setOptions`) |
| Опції (options) | Налаштування екрана: заголовок, кнопки, іконки, анімації |

### Встановлення (Expo)

```bash
# ядро та нативні залежності
npx expo install @react-navigation/native react-native-screens react-native-safe-area-context

# потрібні навігатори
npx expo install @react-navigation/native-stack @react-navigation/bottom-tabs
```

`react-native-screens` дає змогу використовувати нативні контейнери екранів (економія пам'яті), `react-native-safe-area-context` — правильні відступи від «чубчика» і системних панелей.

### Мінімальний застосунок

```jsx title="App.js"
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import DetailsScreen from './screens/DetailsScreen';

// Створюємо навігатор поза компонентом — один раз
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Головна' }} />
        <Stack.Screen name="Details" component={DetailsScreen} options={{ title: 'Деталі' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

Кожен компонент, переданий у `component`, автоматично отримує пропси `navigation` і `route`.

:::note[Статичний і динамічний API]
У React Navigation v7 з'явився статичний API конфігурації (`createNativeStackNavigator({ screens: { … } })` + `createStaticNavigation`), що спрощує типізацію і deep linking. На курсі використовуємо класичний **динамічний** API з компонентами `<Stack.Navigator>` і `<Stack.Screen>` — він наочніше показує, як усе влаштовано, і трапляється в переважній більшості існуючого коду.
:::

## 3. Стековий навігатор

Стековий навігатор (stack) працює як стопка карток: новий екран кладеться зверху, «Назад» знімає верхній. `@react-navigation/native-stack` використовує нативні примітиви (`UINavigationController` на iOS, фрагменти на Android) — анімації та жести виглядають «рідними».

### Методи переходу

| Метод | Що робить | Приклад стека до → після |
|---|---|---|
| `navigate(name, params)` | Переходить до екрана; якщо поточний екран має ту саму назву — оновлює параметри, інакше додає новий | `[A]` → `[A, B]` |
| `push(name, params)` | Завжди додає **новий** екземпляр, навіть якщо такий уже є | `[A, B]` → `[A, B, B]` |
| `goBack()` | Повертається на один екран назад | `[A, B, C]` → `[A, B]` |
| `pop(n)` | Знімає `n` екранів | `[A, B, C]` → `[A]` при `n = 2` |
| `popTo(name, params)` | Повертається до вказаного екрана в стеку | `[A, B, C]` → `[A]` |
| `popToTop()` | Повертається до першого екрана стека | `[A, B, C]` → `[A]` |
| `replace(name, params)` | Замінює поточний екран новим (без можливості повернутися) | `[A, B]` → `[A, C]` |

```jsx title="screens/HomeScreen.js"
import { Button, View } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 12, padding: 16 }}>
      <Button title="Деталі поста 1" onPress={() => navigation.navigate('Details', { postId: 1 })} />
      <Button title="Ще один екран Details" onPress={() => navigation.push('Details', { postId: 2 })} />
    </View>
  );
}
```

:::caution[Зміни у v7]
У попередніх версіях `navigate` міг повернутися «назад» до екрана, який уже є глибше в стеку. У v7 для цього призначено окремий метод `popTo`. Звертайте увагу на версію, коли читаєте приклади з інтернету.
:::

`replace` типово використовують для екранів, до яких не можна повертатися: після заставки (splash) чи після завершення онбордингу.

### Параметри маршруту

Параметри передаються другим аргументом і читаються з `route.params`:

```jsx title="screens/DetailsScreen.js"
import { Text, View } from 'react-native';

export default function DetailsScreen({ route }) {
  const { postId } = route.params; // { postId: 1 }
  return (
    <View style={{ padding: 16 }}>
      <Text>Пост №{postId}</Text>
    </View>
  );
}
```

Значення за замовчуванням задаються у реєстрації екрана: `<Stack.Screen name="Details" component={DetailsScreen} initialParams={{ postId: 1 }} />`. Змінити параметри поточного екрана можна через `navigation.setParams({ … })`.

**Правила роботи з параметрами:**

- Параметри мають бути **серіалізованими** (рядки, числа, булеві значення, прості об'єкти/масиви). Функції, класи, `Date`, складні об'єкти ламають збереження стану і deep linking; React Navigation виведе попередження.
- Передавайте **мінімум даних** — ідентифікатор, а не весь об'єкт: `navigate('Details', { placeId: '42' })`. Екран сам знаходить дані за `id` у глобальному стані (контексті) чи завантажує з API. Так дані завжди актуальні: якщо об'єкт змінився, екран побачить нову версію.
- Параметри — це не глобальний стан. Для даних, потрібних багатьом екранам, використовуйте Context, Zustand, Redux тощо.

### Налаштування екрана (options)

Опції можна задати статично, функцією від маршруту або для всіх екранів навігатора:

```jsx
<Stack.Navigator
  screenOptions={{
    // для всіх екранів цього стека
    headerStyle: { backgroundColor: '#2F6FED' },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: '700' },
  }}
>
  <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Головна' }} />
  <Stack.Screen
    name="Details"
    component={DetailsScreen}
    // функція: заголовок залежить від параметрів
    options={({ route }) => ({ title: `Пост №${route.params.postId}` })}
  />
</Stack.Navigator>
```

Найуживаніші опції native stack:

| Опція | Призначення |
|---|---|
| `title` | Текст заголовка |
| `headerShown` | Показувати чи приховати заголовок |
| `headerRight`, `headerLeft` | Функції, що повертають елементи (кнопки) в заголовку |
| `headerBackTitle` | Текст кнопки «Назад» (iOS) |
| `headerLargeTitle` | Великий заголовок (iOS) |
| `presentation` | `'card'` (звичайний), `'modal'`, `'transparentModal'`, `'formSheet'` тощо |
| `animation` | `'default'`, `'fade'`, `'slide_from_bottom'`, `'none'` тощо |
| `gestureEnabled` | Чи можна закрити екран жестом |

### Динамічні опції: setOptions

Коли заголовок залежить від даних, яких немає в параметрах (наприклад, завантажених з API), використовуємо `navigation.setOptions` усередині екрана. Щоб уникнути «блимання» старого заголовка, викликаємо його в `useLayoutEffect`:

```jsx
import { useLayoutEffect } from 'react';

export default function DetailsScreen({ navigation, route }) {
  const post = usePost(route.params.postId); // умовний хук завантаження

  useLayoutEffect(() => {
    navigation.setOptions({ title: post ? post.title : 'Завантаження…' });
  }, [navigation, post]);
  // ...
}
```

### Кнопки в заголовку

```jsx
import { Pressable, Text } from 'react-native';

<Stack.Screen
  name="Home"
  component={HomeScreen}
  options={({ navigation }) => ({
    headerRight: () => (
      <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={10}>
        <Text style={{ color: '#fff', fontSize: 16 }}>Налаштування</Text>
      </Pressable>
    ),
  })}
/>
```

Якщо кнопка має взаємодіяти зі станом екрана (наприклад, «Зберегти» форму), її задають через `setOptions` усередині самого екрана, де цей стан доступний.

## 4. Вкладки та бокове меню

### Bottom Tabs

Нижня панель вкладок — основний спосіб навігації між розділами застосунку верхнього рівня (Instagram, Telegram, Monobank). Кожна вкладка зберігає свій стан: перейшовши на іншу вкладку і повернувшись, користувач побачить той самий екран і прокрутку.

```jsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#2F6FED',
        tabBarInactiveTintColor: '#6B7280',
        // Функція отримує стан вкладки й повертає іконку
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Feed: focused ? 'home' : 'home-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} options={{ title: 'Стрічка' }} />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Профіль', tabBarBadge: 3 }}
      />
    </Tab.Navigator>
  );
}
```

Пакет `@expo/vector-icons` входить до проєктів Expo і містить набори Ionicons, MaterialIcons, FontAwesome та інші. Назви іконок можна знайти на сайті icons.expo.fyi.

Рекомендації: 3–5 вкладок, короткі підписи, вкладки — для рівноправних розділів, а не для кроків процесу.

### Drawer

Бокове меню (drawer) висувається з краю екрана. Воно зручне, коли розділів багато, але гірше помітне, ніж вкладки, тому в сучасних застосунках використовується рідше.

```bash
npx expo install @react-navigation/drawer react-native-gesture-handler react-native-reanimated
```

:::caution
Drawer залежить від `react-native-gesture-handler` і `react-native-reanimated`. Залежно від версії Reanimated можуть знадобитися додаткові пакети (наприклад, `react-native-worklets`) — звіряйтеся з актуальною документацією React Navigation.
:::

```jsx
import { createDrawerNavigator } from '@react-navigation/drawer';

const Drawer = createDrawerNavigator();

function RootDrawer() {
  return (
    <Drawer.Navigator screenOptions={{ drawerPosition: 'left' }}>
      <Drawer.Screen name="Home" component={HomeScreen} options={{ title: 'Головна' }} />
      <Drawer.Screen name="About" component={AboutScreen} options={{ title: 'Про застосунок' }} />
    </Drawer.Navigator>
  );
}

// В екрані: navigation.openDrawer(), navigation.closeDrawer(), navigation.toggleDrawer()
```

| Навігатор | Коли використовувати |
|---|---|
| Native Stack | Перехід «вглиб»: список → деталі → редагування |
| Bottom Tabs | 3–5 основних розділів, між якими користувач часто перемикається |
| Drawer | Багато розділів, другорядні пункти (налаштування, довідка) |
| Material Top Tabs | Свайпові вкладки всередині екрана (`@react-navigation/material-top-tabs`) |

## 5. Вкладені навігатори, модальні екрани, хуки

### Вкладення навігаторів

Реальні застосунки поєднують навігатори. Типова схема: **стек є кореневим**, а його перший екран — **навігатор вкладок**. Тоді екран деталей відкривається поверх вкладок і перекриває панель вкладок:

```jsx
const Stack = createNativeStackNavigator();

function RootNavigator() {
  return (
    <Stack.Navigator>
      {/* Вкладки як один екран стека; власний заголовок стека ховаємо */}
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Details" component={DetailsScreen} />
      <Stack.Screen name="Compose" component={ComposeScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
```

**Як навігація знаходить маршрут.** Коли екран вкладки `Feed` викликає `navigation.navigate('Details')`, запит спочатку обробляє найближчий навігатор (вкладки). Він не має маршруту `Details`, тому дія «спливає» (bubbles up) до батьківського стека, який цей маршрут знає. Дочірні навігатори батько не переглядає, тому для переходу на екран **всередині** вкладеного навігатора вказують шлях:

```js
// Відкрити вкладку Profile всередині MainTabs і передати їй параметри
navigation.navigate('MainTabs', { screen: 'Profile', params: { tab: 'posts' } });
```

Інші особливості вкладення:

- `navigation.setOptions` змінює опції лише свого навігатора. Щоб приховати заголовок стека для вкладок, задаємо `headerShown: false` для екрана `MainTabs` у стеку.
- Кожен навігатор має власну історію: `goBack()` у вкладці спершу повертає в межах вкладеного стека (якщо він є).
- Не вкладайте зайвих навігаторів — кожен рівень ускладнює код і додає роботи при рендері.

### Модальні екрани

Модальний екран з'являється знизу і призначений для окремої короткої задачі: створення запису, фільтри, підтвердження. Достатньо опції `presentation: 'modal'`. Кілька модальних екранів зручно об'єднати в групу:

```jsx
<Stack.Navigator>
  <Stack.Group>
    <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
  </Stack.Group>
  <Stack.Group screenOptions={{ presentation: 'modal' }}>
    <Stack.Screen name="Compose" component={ComposeScreen} options={{ title: 'Новий запис' }} />
    <Stack.Screen name="Filters" component={FiltersScreen} />
  </Stack.Group>
</Stack.Navigator>
```

Закривається модальне вікно тим самим `navigation.goBack()` або жестом.

### Хуки навігації

Об'єкти `navigation` і `route` передаються лише компонентам-екранам. Вкладеним компонентам їх можна не передавати пропсами, а отримати хуками:

| Хук | Повертає / робить |
|---|---|
| `useNavigation()` | Об'єкт `navigation` найближчого навігатора |
| `useRoute()` | Об'єкт `route` поточного екрана |
| `useFocusEffect(callback)` | Запускає ефект, коли екран отримує фокус, і очищення — коли втрачає |
| `useIsFocused()` | `true`, якщо екран зараз у фокусі (спричиняє рендер при зміні) |

```jsx
import { useNavigation } from '@react-navigation/native';

function PostItem({ post }) {
  const navigation = useNavigation();
  return (
    <Pressable onPress={() => navigation.navigate('Details', { postId: post.id })}>
      <Text>{post.title}</Text>
    </Pressable>
  );
}
```

Важлива відмінність від вебу: екран, з якого пішли «вглиб» стека, **не розмонтовується**. Тому `useEffect(…, [])` не спрацює при поверненні на екран. Для дій «кожного разу, коли екран показано» використовують `useFocusEffect` (колбек обов'язково обгортати в `useCallback`):

```jsx
import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

function FeedScreen() {
  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(refreshFeed, 30000); // оновлюємо, поки екран видимий
      return () => clearInterval(timer);             // зупиняємо, коли пішли з екрана
    }, [])
  );
  // ...
}
```

Також у навігатора є події: `navigation.addListener('focus' | 'blur' | 'beforeRemove', …)`. Подія `beforeRemove` дозволяє, наприклад, попередити про незбережені зміни перед виходом з форми.

## 6. Deep linking і сценарій авторизації

### Deep linking

**Глибоке посилання** (deep link) відкриває конкретний екран застосунку за URL: `myapp://post/42` або `https://example.com/post/42` (universal links / app links). Сценарії: посилання з push-сповіщення, листа, сайту.

1. Задайте схему в `app.json`:

   ```json title="app.json (фрагмент)"
   {
     "expo": {
       "scheme": "myapp"
     }
   }
   ```

2. Опишіть відповідність шляхів і екранів та передайте її в `NavigationContainer`:

   ```jsx title="App.js"
   import * as Linking from 'expo-linking';

   const linking = {
     prefixes: [Linking.createURL('/')], // myapp:// (або exp://… в Expo Go)
     config: {
       screens: {
         MainTabs: {
           screens: {
             Feed: 'feed',
             Profile: 'profile',
           },
         },
         Details: 'post/:postId', // :postId стане route.params.postId (рядком!)
       },
     },
   };

   export default function App() {
     return (
       <NavigationContainer linking={linking}>
         <RootNavigator />
       </NavigationContainer>
     );
   }
   ```

3. Перевірте (Android-емулятор):

   ```bash
   npx uri-scheme open "myapp://post/42" --android
   ```

Зверніть увагу: параметри з URL завжди надходять **рядками**, тому `postId` слід перетворювати (`Number(route.params.postId)`) або одразу використовувати рядкові `id`. Це ще одна причина передавати в параметрах лише прості значення.

`expo-linking` встановлюється командою `npx expo install expo-linking`.

### Сценарій авторизації

Початківці часто реалізують вхід так: після успішного логіну `navigation.navigate('Home')`. Проблема — користувач може натиснути «Назад» і повернутися на екран входу, а після виходу — навпаки. Рекомендований патерн — **умовне визначення екранів** залежно від стану авторизації:

```jsx
function RootNavigator() {
  const { userToken, isLoading } = useAuth(); // власний контекст авторизації

  if (isLoading) return <SplashScreen />; // читаємо токен із SecureStore

  return (
    <Stack.Navigator>
      {userToken == null ? (
        // Неавторизований користувач бачить лише ці екрани
        <>
          <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: 'Вхід' }} />
          <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: 'Реєстрація' }} />
        </>
      ) : (
        // Авторизований — лише ці
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Details" component={DetailsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
```

Після входу `signIn` лише змінює `userToken` у контексті — React Navigation сам перемкне набір екранів з анімацією, а екранів входу в історії вже не буде. Вручну викликати `navigate` не потрібно. У v7 для цього також є проп `navigationKey` і групи з умовами; принцип той самий — **екрани визначаються станом**.

## 7. Expo Router: файлова маршрутизація

**Expo Router** — бібліотека маршрутизації від команди Expo, побудована поверх React Navigation. Замість явної конфігурації навігаторів маршрути визначаються **структурою файлів** у папці `app/` (як у Next.js):

```text
app/
├── _layout.js          // кореневий макет: <Stack />
├── (tabs)/
│   ├── _layout.js      // макет вкладок: <Tabs />
│   ├── index.js        // маршрут "/"        (вкладка «Стрічка»)
│   └── profile.js      // маршрут "/profile" (вкладка «Профіль»)
├── post/
│   └── [id].js         // динамічний маршрут "/post/42"
└── compose.js          // модальний екран "/compose"
```

```jsx title="app/post/[id].js"
import { useLocalSearchParams, Link } from 'expo-router';
import { Text, View } from 'react-native';

export default function PostScreen() {
  const { id } = useLocalSearchParams(); // параметр з імені файлу
  return (
    <View>
      <Text>Пост №{id}</Text>
      <Link href="/">На головну</Link>
    </View>
  );
}
```

| Критерій | React Navigation | Expo Router |
|---|---|---|
| Визначення маршрутів | Код: `<Stack.Screen name=…>` | Файли в `app/` |
| Deep linking | Ручна конфігурація `linking` | Автоматично: кожен файл має URL |
| Переходи | `navigation.navigate('Details', { id })` | `router.push('/post/42')`, `<Link href>` |
| Параметри | `route.params` | `useLocalSearchParams()` |
| Веб-підтримка | Можлива, потребує налаштування | Повноцінна, з URL у браузері |
| Гнучкість | Максимальна, будь-яка структура | Обмежена конвенціями файлової системи |
| Новий проєкт Expo | Встановлюється окремо | Шаблон за замовчуванням (`create-expo-app` без `--template blank`) |
| Розуміння «під капотом» | Явне | Приховане (але це той самий React Navigation) |

На курсі вивчаємо React Navigation напряму, бо це фундамент: знаючи стек, вкладки, вкладення й параметри, ви легко перейдете на Expo Router, де всі ці поняття існують у файловій формі.

## Підсумки

- У мобільних застосунках немає URL та історії браузера; навігаційні бібліотеки зберігають стан навігації самі й використовують нативні переходи.
- React Navigation: `NavigationContainer` → навігатори → екрани; кожен екран отримує `navigation` і `route`.
- Native stack — переходи вглиб (`navigate`, `push`, `goBack`, `popTo`, `popToTop`, `replace`); параметри мають бути серіалізованими й мінімальними (передаємо `id`).
- Опції екрана задаються статично, функцією або динамічно через `setOptions`; кнопки в заголовку — `headerRight`/`headerLeft`.
- Bottom tabs — основні розділи з іконками; drawer — для великої кількості розділів.
- Навігатори вкладаються; дія `navigate` спливає до батьківських навігаторів; до вкладених екранів звертаються через `{ screen, params }`.
- `useNavigation`, `useRoute`, `useFocusEffect` — доступ до навігації будь-де та реакція на фокус екрана.
- Deep linking зіставляє URL з екранами; авторизацію реалізують умовним рендером екранів.
- Expo Router — файлова маршрутизація поверх React Navigation.

## Контрольні питання

1. Чим принципово відрізняється навігація у вебзастосунку і в мобільному застосунку?
2. Яку роль виконує `NavigationContainer`? Скільки їх може бути в застосунку?
3. Чим відрізняються методи `navigate`, `push`, `replace` і `popToTop`?
4. Чому в параметрах маршруту рекомендують передавати ідентифікатор, а не весь об'єкт? Які дані не можна передавати в параметрах?
5. Як змінити заголовок екрана залежно від завантажених даних? Чому для цього використовують `useLayoutEffect`?
6. Як задати іконки для вкладок нижньої панелі?
7. Як дія `navigate('Details')` з екрана вкладки знаходить екран, оголошений у батьківському стеку? Як перейти до екрана вкладеного навігатора?
8. Чим `useFocusEffect` відрізняється від `useEffect` з порожнім масивом залежностей?
9. Чому після входу користувача не варто викликати `navigation.navigate('Home')` і як правильно реалізувати сценарій авторизації?
10. Назвіть переваги та недоліки Expo Router порівняно з React Navigation.

## Домашнє завдання

Створіть навчальний проєкт `nav-demo` (`npx create-expo-app@latest nav-demo --template blank`) і реалізуйте:

1. Нижні вкладки «Пости» і «Про мене» з іконками Ionicons.
2. Вкладка «Пости» — список з 10 постів JSONPlaceholder (`https://jsonplaceholder.typicode.com/posts?_limit=10`); натискання відкриває екран `PostDetails` (оголошений у кореневому стеку поверх вкладок) з параметром `postId`.
3. На екрані деталей завантажте пост за `id` і встановіть його назву як заголовок через `setOptions`.
4. У заголовку вкладки «Пости» — кнопка `headerRight`, що відкриває модальний екран «Про застосунок».

Здати: посилання на репозиторій і три скриншоти (список, деталі, модальне вікно). Орієнтовний час — 60 хвилин.
