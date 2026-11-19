---
title: Налаштування середовища, запуск на емуляторі
description: Встановлюємо Node.js, Android Studio з емулятором та Expo Go, створюємо проєкт «Мої місця» і запускаємо перший екран на емуляторі й телефоні.
type: practice
pair: 2
topic: 127
---

## Мета роботи

- Налаштувати робоче середовище для розробки на React Native з Expo.
- Створити та запустити віртуальний Android-пристрій (AVD) в Android Studio.
- Створити проєкт `my-places` — основу застосунку «Мої місця», який ми будуватимемо протягом усього модуля.
- Запустити застосунок на емуляторі та на власному телефоні через Expo Go.
- Опанувати Fast Refresh, меню розробника (dev menu) та базові прийоми налагодження.

## Що потрібно

| Програма | Призначення | Де взяти |
|---|---|---|
| **Node.js LTS** (актуальна LTS-версія) | Виконання npm/npx, Metro | [nodejs.org](https://nodejs.org) |
| **Git** | Контроль версій | [git-scm.com](https://git-scm.com) |
| **VS Code** | Редактор коду | [code.visualstudio.com](https://code.visualstudio.com) |
| **Android Studio** | Android SDK та емулятор | [developer.android.com/studio](https://developer.android.com/studio) |
| **Expo Go** | Запуск проєкту на телефоні | Google Play / App Store |
| **Xcode** (лише macOS, необов'язково) | iOS Simulator | Mac App Store |

Апаратні вимоги для емулятора: 8 ГБ ОЗП (бажано 16), увімкнена апаратна віртуалізація (Intel VT-x / AMD-V у BIOS/UEFI), 10+ ГБ вільного місця на диску.

:::tip[Корисні розширення VS Code]
- **Expo Tools** — автодоповнення для `app.json`, налагодження.
- **ES7+ React/Redux/React-Native snippets** — сніпети (`rnfes` створює функціональний компонент зі стилями).
- **Prettier** — автоформатування коду.
:::

## Короткі теоретичні відомості

Під час розробки з Expo працює така схема:

```text
 Ваш код (App.js)  ──►  Metro bundler (npx expo start)  ──►  JS-бандл
                                                               │
                         ┌─────────────────────────────────────┤
                         ▼                                     ▼
              Android-емулятор з Expo Go            Телефон з Expo Go
              (натиснути «a» у терміналі)           (сканувати QR-код)
```

- **Metro** — збирач, що перетворює ваші файли на бандл і роздає його пристроям.
- **Expo Go** — готовий нативний застосунок-«пісочниця», що містить React Native та модулі Expo SDK. Він завантажує ваш бандл і виконує його. Тому для початку роботи не потрібно нічого збирати.
- **AVD** (Android Virtual Device) — віртуальний Android-пристрій, що запускається в емуляторі Android Studio.
- **Fast Refresh** — при збереженні файлу змінений модуль підміняється «на льоту», стан компонентів зберігається.

Expo Go підтримує лише ту версію Expo SDK, з якою він випущений, тому проєкт і Expo Go мають бути актуальними. Якщо потрібні нативні бібліотеки поза Expo SDK — використовують development build (пізніше в курсі).

## Хід роботи

### Крок 1. Встановлення Node.js та перевірка інструментів

1. Завантажте та встановіть **LTS**-версію Node.js. На macOS/Linux зручно використовувати менеджер версій `nvm`:

   ```bash
   # macOS / Linux (через nvm)
   nvm install --lts
   nvm use --lts
   ```

2. Перевірте встановлення:

   ```bash
   node -v
   npm -v
   git --version
   ```

   Очікуваний результат — номери версій без помилок.

:::caution
Не встановлюйте глобально старий пакет `expo-cli` (`npm i -g expo-cli`) — він застарів. Усі команди виконуються через `npx expo ...`, що використовує локальну версію CLI з вашого проєкту.
:::

### Крок 2. Встановлення Android Studio та Android SDK

1. Завантажте Android Studio і запустіть інсталятор. У майстрі налаштування оберіть тип **Standard** — буде встановлено Android SDK, Platform-Tools, Emulator та образ системи.
2. Після встановлення відкрийте **More Actions → SDK Manager** (або **Settings → Languages & Frameworks → Android SDK**):
   - вкладка **SDK Platforms**: переконайтесь, що встановлено одну з останніх версій Android;
   - вкладка **SDK Tools**: позначте **Android SDK Build-Tools**, **Android Emulator**, **Android SDK Platform-Tools**.
3. Запам'ятайте шлях **Android SDK Location** (вказаний угорі вікна SDK Manager).
4. Налаштуйте змінні середовища.

   **macOS / Linux** — додайте до `~/.zshrc` (або `~/.bashrc`):

   ```bash
   # macOS: шлях за замовчуванням ~/Library/Android/sdk
   # Linux: зазвичай ~/Android/Sdk
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

   Потім виконайте `source ~/.zshrc`.

   **Windows** — у «Змінні середовища» створіть змінну користувача `ANDROID_HOME` зі значенням `%LOCALAPPDATA%\Android\Sdk` і додайте до `Path`:

   ```text
   %LOCALAPPDATA%\Android\Sdk\platform-tools
   %LOCALAPPDATA%\Android\Sdk\emulator
   ```

5. Перезапустіть термінал і перевірте:

   ```bash
   adb --version
   emulator -list-avds
   ```

### Крок 3. Створення віртуального пристрою (AVD)

1. У стартовому вікні Android Studio: **More Actions → Virtual Device Manager**.
2. Натисніть **Create Virtual Device** (або «+»).
3. Оберіть пристрій, наприклад **Pixel 8** (категорія Phone), натисніть **Next**.
4. Оберіть образ системи (System Image) з однією з останніх версій Android. Для комп'ютерів з процесорами Apple Silicon (M1–M4) обирайте образи **arm64-v8a**, для Intel/AMD — **x86_64**. Якщо образ не завантажено — натисніть значок завантаження.
5. **Next → Finish**.
6. Запустіть пристрій кнопкою ▶ у Device Manager. Дочекайтеся завантаження робочого столу Android.

Перевірте, що емулятор видно в системі:

```bash
adb devices
# List of devices attached
# emulator-5554   device
```

:::note[iOS Simulator (лише macOS)]
Встановіть Xcode з Mac App Store, відкрийте його один раз і погодьтеся з ліцензією. У **Xcode → Settings → Components** (або Platforms) завантажте iOS Simulator. Встановіть Command Line Tools: `xcode-select --install`. Після цього в терміналі Expo достатньо натиснути `i`. На Windows і Linux iOS Simulator недоступний — для перевірки на iOS використовуйте iPhone з Expo Go.
:::

### Крок 4. Створення проєкту `my-places`

1. Перейдіть у папку для навчальних проєктів і створіть проєкт:

   ```bash
   npx create-expo-app@latest my-places --template blank
   cd my-places
   ```

   Шаблон `blank` — мінімальний проєкт на JavaScript з одним файлом `App.js`.

2. Відкрийте проєкт у VS Code:

   ```bash
   code .
   ```

3. Ознайомтеся зі структурою: `App.js`, `index.js`, `app.json`, `package.json`, `assets/`.

4. Відкрийте `app.json` і змініть назву застосунку, яку бачить користувач:

   ```json title="app.json" {3}
   {
     "expo": {
       "name": "Мої місця",
       "slug": "my-places",
       "version": "1.0.0",
       "orientation": "portrait",
       "icon": "./assets/icon.png",
       "userInterfaceStyle": "light",
       "splash": {
         "image": "./assets/splash-icon.png",
         "resizeMode": "contain",
         "backgroundColor": "#ffffff"
       },
       "ios": {
         "supportsTablet": true
       },
       "android": {
         "adaptiveIcon": {
           "foregroundImage": "./assets/adaptive-icon.png",
           "backgroundColor": "#ffffff"
         }
       },
       "web": {
         "favicon": "./assets/favicon.png"
       }
     }
   }
   ```

   Змінюйте лише поле `name`, решту залиште такою, як згенерував шаблон (вміст може дещо відрізнятися залежно від актуальної версії Expo SDK).

5. Ініціалізуйте Git-репозиторій (якщо його не створено автоматично) і зробіть перший коміт:

   ```bash
   git init
   git add .
   git commit -m "Initial commit: create my-places project"
   ```

### Крок 5. Запуск на емуляторі

1. Переконайтеся, що емулятор запущено.
2. Запустіть сервер розробки:

   ```bash
   npx expo start
   ```

   У терміналі з'явиться QR-код і підказки щодо клавіш:

   ```text
   › Metro waiting on exp://192.168.0.105:8081
   › Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

   › Press a │ open Android
   › Press i │ open iOS simulator
   › Press w │ open web

   › Press j │ open debugger
   › Press r │ reload app
   › Press m │ toggle menu
   ```

3. Натисніть **`a`**. Expo автоматично встановить Expo Go на емулятор (при першому запуску) і відкриє в ньому ваш проєкт.
4. На екрані з'явиться текст «Open up App.js to start working on your app!».

:::caution[Якщо щось пішло не так]
- **«No Android connected device found»** — емулятор не запущено або `adb` не в `PATH`. Перевірте `adb devices`.
- **Емулятор дуже повільний / не стартує** — перевірте, чи ввімкнено віртуалізацію в BIOS; на Windows — чи встановлено Windows Hypervisor Platform.
- **Порт 8081 зайнятий** — Expo запропонує інший порт, погодьтеся.
- **Дивні помилки після оновлення пакетів** — запустіть з очищенням кешу: `npx expo start -c`.
:::

### Крок 6. Запуск на власному телефоні через Expo Go

1. Підключіть телефон і комп'ютер до **однієї Wi-Fi мережі**.
2. **Android:** відкрийте Expo Go → **Scan QR code** → наведіть на QR-код у терміналі.
   **iOS:** відскануйте QR-код стандартною камерою — з'явиться пропозиція відкрити в Expo Go.
3. Застосунок завантажиться на телефоні.

Якщо мережа університету блокує з'єднання між пристроями (ізоляція клієнтів Wi-Fi), використайте тунель:

```bash
npx expo start --tunnel
```

При першому використанні Expo запропонує встановити пакет `@expo/ngrok` — погодьтеся. Тунель працює повільніше, але не залежить від локальної мережі.

### Крок 7. Перший власний екран

Замініть вміст `App.js` на вітальний екран застосунку «Мої місця»:

```jsx title="App.js"
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  // Поточна дата для привітання
  const today = new Date().toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📍</Text>
      <Text style={styles.title}>Мої місця</Text>
      <Text style={styles.subtitle}>
        Щоденник місць, які я відвідав
      </Text>
      <Text style={styles.date}>Сьогодні: {today}</Text>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    marginTop: 8,
    textAlign: 'center',
  },
  date: {
    marginTop: 24,
    fontSize: 14,
    color: '#64748b',
  },
});
```

Збережіть файл (`Ctrl+S` / `Cmd+S`) — інтерфейс на емуляторі та телефоні оновиться автоматично.

:::note
На деяких Android-пристроях `toLocaleDateString('uk-UA', ...)` може повертати дату англійською, якщо в рушії немає повних даних локалізації. Для навчального прикладу це не критично.
:::

### Крок 8. Fast Refresh і збереження стану

Перевіримо, як Fast Refresh зберігає стан. Тимчасово додайте лічильник:

```jsx title="App.js (фрагмент)" {1,5,9-11}
import { useState } from 'react';
// ...

export default function App() {
  const [count, setCount] = useState(0);
  // ...
  return (
    <View style={styles.container}>
      <Text style={styles.date} onPress={() => setCount(count + 1)}>
        Натиснуто: {count}
      </Text>
      {/* ...решта розмітки */}
    </View>
  );
}
```

1. Натисніть на текст кілька разів — лічильник збільшується.
2. Змініть, наприклад, колір `title` у стилях і збережіть. Колір оновився, а **значення лічильника залишилось**.
3. Тепер зробіть синтаксичну помилку (видаліть закриваючу дужку) і збережіть. З'явиться червоний екран помилки (**RedBox**) з файлом і рядком. Виправте — екран зникне сам.

:::tip
Fast Refresh скидає стан, якщо ви змінили файл, що експортує не лише компоненти, або якщо в компоненті є помилка під час рендерингу. Для повного перезавантаження натисніть `r` у терміналі.
:::

Після перевірки видаліть лічильник з коду.

### Крок 9. Меню розробника (Dev Menu)

Відкрити меню розробника можна:

- у терміналі з Metro — клавіша **`m`**;
- в Android-емуляторі — `Ctrl+M` (Windows/Linux) або `Cmd+M` (macOS);
- в iOS Simulator — `Ctrl+Cmd+Z` або `Cmd+D`;
- на реальному телефоні — **потрусити** пристрій.

Основні пункти меню:

| Пункт | Призначення |
|---|---|
| Reload | Повне перезавантаження JS-бандла |
| Go Home | Повернення на головний екран Expo Go |
| Toggle Performance Monitor | Показ FPS UI- і JS-потоків, споживання пам'яті |
| Toggle Element Inspector | Інспектор елементів: натисніть на елемент — побачите його стилі та розміри |
| Open JS Debugger / DevTools | Відкриває React Native DevTools |
| Fast Refresh | Вмикає/вимикає автоматичне оновлення |

Увімкніть **Element Inspector** і натисніть на заголовок «Мої місця» — переконайтеся, що бачите його `fontSize`, `color` і розміри.

### Крок 10. Налагодження: console.log і DevTools

1. Додайте в компонент виведення в консоль:

   ```jsx title="App.js (фрагмент)"
   export default function App() {
     console.log('App відрендерено', new Date().toISOString());
     // ...
   }
   ```

   Повідомлення з'являться **в терміналі**, де запущено `npx expo start`.

2. Спробуйте також `console.warn('Увага!')` — на пристрої з'явиться жовте повідомлення (LogBox) внизу екрана, а `console.error()` — червоне.

3. Натисніть **`j`** у терміналі — відкриється **React Native DevTools** (на основі Chrome DevTools). Доступні вкладки:
   - **Console** — логи та виконання виразів;
   - **Sources** — точки зупинки (breakpoints) у вашому коді;
   - **Components** та **Profiler** (React DevTools) — дерево компонентів, пропси, стан.

4. Поставте точку зупинки на рядку з `console.log` у вкладці Sources, натисніть `r` для перезавантаження — виконання зупиниться, можна переглянути змінні.

5. Приберіть зайві `console.log` перед комітом.

### Крок 11. Коміт результату

```bash
git add .
git commit -m "P1: welcome screen"
```

За бажанням створіть репозиторій на GitHub і завантажте код:

```bash
git remote add origin https://github.com/<ваш-логін>/my-places.git
git branch -M main
git push -u origin main
```

**Результат роботи:** застосунок «Мої місця» запускається на Android-емуляторі (і на телефоні через Expo Go) та показує вітальний екран з назвою, підзаголовком і датою.

## Завдання для самостійного виконання

1. ★ Додайте під датою текст з вашим ім'ям і групою, стилізуйте його курсивом (`fontStyle: 'italic'`).
2. ★ Створіть другий AVD з іншим розміром екрана (наприклад, планшет **Pixel Tablet** або маленький телефон) і запустіть на ньому застосунок. Порівняйте вигляд. Запустіть одночасно на двох пристроях — зміни мають відображатися на обох.
3. ★★ Увімкніть **Performance Monitor** і спостерігайте FPS UI- та JS-потоків. Додайте в компонент «важкий» цикл (`for` на 50 млн ітерацій) у обробник натискання та подивіться, що відбувається з JS FPS і чуйністю інтерфейсу. Опишіть спостереження у звіті і приберіть цикл.
4. ★★★ Запустіть проєкт у вебверсії (клавіша `w`; Expo запропонує встановити `react-dom` та `react-native-web` — погодьтеся через `npx expo install react-dom react-native-web`). Порівняйте відображення з мобільним. Які елементи виглядають інакше?

## Контрольні питання

1. Яку роль виконує Metro bundler?
2. Що таке Expo Go і чому для запуску проєкту в ньому не потрібно збирати застосунок?
3. Для чого потрібна змінна середовища `ANDROID_HOME`? Які папки SDK додаються до `PATH`?
4. Який образ системи AVD слід обрати для комп'ютера з процесором Apple Silicon і чому?
5. Чим відрізняється Fast Refresh від повного перезавантаження (Reload)?
6. Як відкрити меню розробника на емуляторі та на реальному пристрої?
7. Де відображаються повідомлення `console.log` під час розробки з Expo?
8. Коли потрібен режим `--tunnel` і які в нього недоліки?

## Домашнє завдання

1. Якщо на парі не вдалося запустити емулятор — завершіть налаштування вдома (або переконайтеся, що застосунок працює на телефоні через Expo Go).
2. Створіть файл `components/Greeting.js` з компонентом `Greeting`, який приймає проп `name` і показує «Вітаю, {name}! Куди поїдемо сьогодні?». Використайте його в `App.js` під заголовком.
3. Зробіть коміт `P1: greeting component` і завантажте репозиторій на GitHub.

## Що здати

- Скриншот застосунку, запущеного на **емуляторі** (видно рамку емулятора та вітальний екран).
- Скриншот (або фото) застосунку на **телефоні** в Expo Go (якщо є смартфон).
- Скриншот терміналу з `npx expo start` і виведеним `console.log`.
- Посилання на GitHub-репозиторій `my-places` з комітами цієї роботи.
- Короткий звіт: які проблеми виникли під час налаштування і як ви їх розв'язали; відповіді на контрольні питання.
