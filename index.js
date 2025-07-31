/**
 * 🕌 Рузнама — Бот времён намазов
 *
 * @author Developer
 * @license MIT
 * @version 1.4.0 (с едином стиле без HTML)
 */
import { Telegraf } from 'telegraf';
import fs from 'fs';
import path from 'path';

// ========================================================
// 🛑 ПРОВЕРКА ТОКЕНА
// ========================================================
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('❌ ОШИБКА: BOT_TOKEN не установлен в переменных окружения!');
}
const bot = new Telegraf(BOT_TOKEN);

// ========================================================
// 📁 ПУТИ К ФАЙЛАМ
// ========================================================
const citiesAreasPath = path.join(process.cwd(), 'db', 'cities-areas.json');
const timesDir = path.join(process.cwd(), 'db', 'cities-areas');
const usersFilePath = path.join(process.cwd(), 'users.json');

// ========================================================
// 🌍 ЗАГРУЗКА ДАННЫХ: Города и районы
// ========================================================
let citiesAreasData = { cities: [], areas: [] };
try {
  if (fs.existsSync(citiesAreasPath)) {
    citiesAreasData = JSON.parse(fs.readFileSync(citiesAreasPath, 'utf8'));
    console.log(`✅ Загружено: ${citiesAreasData.cities.length} городов и ${citiesAreasData.areas.length} районов`);
  } else {
    console.warn('⚠️ Файл cities-areas.json не найден');
  }
} catch (e) {
  console.error('❌ Ошибка чтения cities-areas.json:', e.message);
}

// ========================================================
// 📆 МАППИНГ МЕСЯЦЕВ: Рус → Англ
// ========================================================
const russianToEnglishMonth = {
  январь: 'January',
  февраль: 'February',
  март: 'March',
  апрель: 'April',
  май: 'May',
  июнь: 'June',
  июль: 'July',
  август: 'August',
  сентябрь: 'September',
  октябрь: 'October',
  ноябрь: 'November',
  декабрь: 'December',
};

function getEnglishMonthName(ruMonth) {
  if (ruMonth === 'now') {
    return new Date().toLocaleString('en-GB', { month: 'long' });
  }
  const lower = ruMonth.toLowerCase().trim();
  return russianToEnglishMonth[lower] || null;
}

function getRussianMonthName(enMonth) {
  const entry = Object.entries(russianToEnglishMonth).find(([, eng]) => eng === enMonth);
  return entry ? entry[0] : enMonth;
}

// ========================================================
// 🕰️ ЗАГРУЗКА ВРЕМЁН ПО ID
// ========================================================
function loadTimesById(id) {
  const filePath = path.join(timesDir, `${id}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(data);
      return Object.keys(parsed).length ? parsed : null;
    }
    return null;
  } catch (e) {
    console.error(`❌ Ошибка загрузки ${filePath}:`, e.message);
    return null;
  }
}

// ========================================================
// 🕐 ФОРМАТИРОВАНИЕ ВРЕМЕНИ (чистый текст)
// ========================================================
function fmt(time) {
  return Array.isArray(time) && time.length >= 2
    ? `${String(time[0]).padStart(2, '0')}:${String(time[1]).padStart(2, '0')}`
    : '—';
}

// ========================================================
// 📅 ВРЕМЕНА НА СЕГОДНЯ (новый стиль)
// ========================================================
function getPrayerTimesForToday(timesData, locationName) {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const monthEn = now.toLocaleString('en-GB', { month: 'long' });
  const monthRu = getRussianMonthName(monthEn);
  const monthRuCap = monthRu.charAt(0).toUpperCase() + monthRu.slice(1);
  const monthData = timesData[monthEn];
  if (!monthData) return `❌ Нет данных за ${monthRuCap}`;
  const dayData = monthData[day];
  if (!dayData) return `❌ Нет данных на ${day} ${monthRuCap}`;

  return `
📍 ${locationName}

✨ Времена намазов на сегодня
📅 ${day} ${monthRuCap}

🕌 Фаджр   —  ${fmt(dayData.Fajr)}
🌅 Шурук   —  ${fmt(dayData.Sunrise)}
☀️ Зухр    —  ${fmt(dayData.Dhuhr)}
🌇 Аср     —  ${fmt(dayData.Asr)}
🌆 Магриб  —  ${fmt(dayData.Maghrib)}
🌙 Иша     —  ${fmt(dayData.Isha)}

🕋 Да будет ваша молитва услышана и принята
`.trim();
}

// ========================================================
// 🗓️ КЛАВИАТУРА: Выбор месяца (3 в строку)
// ========================================================
function getMonthsList(locationId) {
  const keyboard = Object.keys(russianToEnglishMonth)
    .map((month) => ({
      text: capitalize(month),
      callback_data: `select_month_${month}_${locationId}`,
    }))
    .reduce((acc, btn, idx) => {
      if (idx % 3 === 0) acc.push([]);
      acc[acc.length - 1].push(btn);
      return acc;
    }, []);
  keyboard.push([{ text: '⬅️ Назад', callback_data: `back_to_loc_${locationId}` }]);
  return { reply_markup: { inline_keyboard: keyboard } };
}

// ========================================================
// 📍 МЕНЮ МЕСТА
// ========================================================
function getLocationMenu(locationId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🕌 Сегодня', callback_data: `day_${locationId}` }],
        [{ text: '📅 Текущий месяц', callback_data: `month_${locationId}` }],
        [{ text: '🗓️ Выбрать месяц', callback_data: `year_${locationId}` }],
        [],
        [{ text: '⬅️ Назад к списку', callback_data: 'cmd_cities_areas' }],
      ],
    },
  };
}

// ========================================================
// 🏠 ГЛАВНОЕ МЕНЮ (с кнопкой последнего места)
// ========================================================
function getMainMenu(lastLocationId = null) {
  const keyboard = [
    [
      { text: '🏙️ Города', callback_data: 'cmd_cities' },
      { text: '🏘️ Районы', callback_data: 'cmd_areas' },
    ],
    [{ text: '📖 Хадис дня', callback_data: 'cmd_quote' }],
    [
      { text: 'ℹ️ О боте', callback_data: 'cmd_about' },
      { text: '📊 Статистика', callback_data: 'cmd_stats' },
    ],
  ];
  if (lastLocationId) {
    const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == lastLocationId);
    if (location) {
      keyboard.unshift([{
        text: `📌 Последнее: ${location.name_cities || location.name_areas}`,
        callback_data: `loc_${lastLocationId}`
      }]);
    }
  }
  return { reply_markup: { inline_keyboard: keyboard } };
}

// ========================================================
// 👥 РАБОТА С ПОЛЬЗОВАТЕЛЯМИ
// ========================================================
let users = new Map();

function loadUsers() {
  try {
    if (fs.existsSync(usersFilePath)) {
      const loaded = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
      users = new Map(loaded);
      console.log(`✅ Пользователей загружено: ${users.size}`);
    }
  } catch (e) {
    console.error('❌ Ошибка загрузки users.json:', e.message);
  }
}

function saveUsers() {
  try {
    const serializable = Array.from(users.entries());
    fs.writeFileSync(usersFilePath, JSON.stringify(serializable), 'utf8');
  } catch (e) {
    console.error('❌ Ошибка сохранения users.json:', e.message);
  }
}

function addUser(userId) {
  const id = userId.toString();
  if (!users.has(id)) {
    users.set(id, { last_location_id: null });
    saveUsers();
    console.log(`🆕 Новый пользователь: ${id} | Всего: ${users.size}`);
  }
}

function setUserLocation(userId, locationId) {
  const id = userId.toString();
  addUser(id);
  users.get(id).last_location_id = locationId;
  saveUsers();
}

function getUserLastLocation(userId) {
  const id = userId.toString();
  const user = users.get(id);
  return user ? user.last_location_id : null;
}

// ========================================================
// 📜 ХАДИС ДНЯ
// ========================================================
let quotes = [];
function loadQuotes() {
  try {
    const quotesPath = path.join(process.cwd(), 'quotes.json');
    if (fs.existsSync(quotesPath)) {
      quotes = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
    } else {
      quotes = [{
        text: 'Посланник Аллаха (мир ему и благословение) сказал: «Аллах доволен рабом, когда он восхваляет Его после еды и питья».',
        author: 'Передал имам Муслим'
      }];
    }
  } catch (e) {
    quotes = [{
      text: 'Посланник Аллаха (мир ему и благословение) сказал: «Аллах доволен рабом, когда он восхваляет Его после еды и питья».',
      author: 'Передал имам Муслим'
    }];
  }
}

function getRandomQuote() {
  return quotes.length ? quotes[Math.floor(Math.random() * quotes.length)] : {
    text: 'Посланник Аллаха (мир ему и благословение) сказал: «Аллах доволен рабом, когда он восхваляет Его после еды и питья».',
    author: 'Передал имам Муслим'
  };
}

// ========================================================
// 📚 ХАДИС ДНЯ (в новом стиле)
// ========================================================
function getQuoteMessage() {
  const q = getRandomQuote();
  return `
📘 Хадис дня

❝ ${q.text} ❞

— ${q.author}
`.trim();
}

// ========================================================
// ℹ️ О БОТЕ (в новом стиле)
// ========================================================
function getAboutMessage() {
  return `
ℹ️ О боте «Рузнама»

🕌 Предоставляет точные времена намазов для городов и районов РД.

📩 Создан с заботой о верующих.

© 2025 | Разработан с искренним намерением
`.trim();
}

// ========================================================
// 📊 СТАТИСТИКА (в новом стиле)
// ========================================================
function getStatsMessage() {
  const total = citiesAreasData.cities.length + citiesAreasData.areas.length;
  return `
📊 Статистика бота

👥 Пользователей: 1

🏙️ Городов: 10
🏘️ Районов: 35

🕌 Всего мест: ${total}
`.trim();
}

// ========================================================
// 🔍 ПОИСК ПО НАЗВАНИЮ
// ========================================================
function searchLocations(query) {
  const allLocations = [...citiesAreasData.cities, ...citiesAreasData.areas];
  const lowerQuery = query.toLowerCase().trim();
  return allLocations
    .filter((loc) => (loc.name_cities || loc.name_areas || '').toLowerCase().includes(lowerQuery))
    .slice(0, 10);
}

// ========================================================
// 🛠️ Утилита: Заглавная буква
// ========================================================
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ========================================================
// 🚀 КОМАНДА /start
// ========================================================
bot.start((ctx) => {
  const userId = ctx.from.id;
  addUser(userId);
  const lastLocationId = getUserLastLocation(userId);
  return ctx.reply(
    `🕌 Добро пожаловать в «Рузнама»

«Самое лучшее деяние — это намаз, совершённый в начале отведённого для него времени». (Тирмизи)

📍 Выберите раздел или введите название населённого пункта.

🕋 Благодать начинается с намерения.`,
    getMainMenu(lastLocationId)
  ).catch(console.error);
});

// ========================================================
// 🆘 /help
// ========================================================
bot.command('help', (ctx) => {
  return ctx.reply(
    `📘 Справка по боту

• /start — Главное меню
• /help — Помощь
• /stats — Статистика
• /about — О проекте
• /newquote — Новый хадис
• /day — Времена намазов на сегодня
• /month — Таблица на месяц`
  ).catch(console.error);
});

// ========================================================
// 📊 /stats
// ========================================================
bot.command('stats', (ctx) => {
  return ctx.reply(getStatsMessage(), getMainMenu(getUserLastLocation(ctx.from.id)))
    .catch(console.error);
});

// ========================================================
// ℹ️ /about
// ========================================================
bot.command('about', (ctx) => {
  return ctx.reply(getAboutMessage(), getMainMenu(getUserLastLocation(ctx.from.id)))
    .catch(console.error);
});

// ========================================================
// 🆕 /newquote
// ========================================================
bot.command('newquote', (ctx) => {
  return ctx.reply(getQuoteMessage())
    .catch(console.error);
});

// ========================================================
// 🕐 /day — заглушка
// ========================================================
bot.command('day', (ctx) => {
  return ctx.reply(
    '⏳ Чтобы увидеть времена намазов на сегодня — выберите место через меню или введите название.',
    getMainMenu(getUserLastLocation(ctx.from.id))
  ).catch(console.error);
});

// ========================================================
// 🔤 ОБРАБОТКА ТЕКСТА (поиск)
// ========================================================
bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  if (text.startsWith('/')) return;
  const userId = ctx.from.id;
  addUser(userId);
  const results = searchLocations(text);
  if (results.length === 0) {
    return ctx.reply(
      `🔍 По запросу «${text}» ничего не найдено.
Проверьте написание или попробуйте другой вариант.`,
      getMainMenu(getUserLastLocation(userId))
    ).catch(console.error);
  }
  const keyboard = results.map((loc) => [
    {
      text: `${loc.name_cities ? '🏙️' : '🏘️'} ${loc.name_cities || loc.name_areas}`,
      callback_data: `loc_${loc.id}`,
    },
  ]);
  await ctx.reply(
    `🔍 Найдено ${results.length}:`,
    { reply_markup: { inline_keyboard: keyboard } }
  ).catch(console.error);
});

// ========================================================
// 🔘 ОБРАБОТКА КНОПОК
// ========================================================
bot.on('callback_query', async (ctx) => {
  if (!ctx.callbackQuery || !ctx.callbackQuery.data) return;
  const data = ctx.callbackQuery.data;
  const userId = ctx.callbackQuery.from.id;
  addUser(userId);
  try {
    await ctx.answerCbQuery().catch(() => {});
  } catch (err) {
    console.warn('⚠️ Не удалось ответить на callback:', err.message);
  }
  try {
    // 🏠 Главное меню
    if (data === 'cmd_cities_areas') {
      return await ctx.editMessageText('🏠 Выберите раздел:', {
        ...getMainMenu(getUserLastLocation(userId)),
      });
    }

    // 🏙️ Города
    if (data === 'cmd_cities') {
      if (!citiesAreasData.cities.length) {
        return await ctx.editMessageText('📭 Нет доступных городов.', {
          ...getMainMenu(getUserLastLocation(userId)),
        });
      }
      const keyboard = citiesAreasData.cities.map((c) => [
        { text: `🏙️ ${c.name_cities}`, callback_data: `loc_${c.id}` },
      ]);
      keyboard.push([{ text: '⬅️ Назад', callback_data: 'cmd_cities_areas' }]);
      return await ctx.editMessageText('🌆 Города', {
        reply_markup: { inline_keyboard: keyboard },
      });
    }

    // 🏘️ Районы
    if (data === 'cmd_areas') {
      if (!citiesAreasData.areas.length) {
        return await ctx.editMessageText('📭 Нет доступных районов.', {
          ...getMainMenu(getUserLastLocation(userId)),
        });
      }
      const keyboard = citiesAreasData.areas.map((a) => [
        { text: `🏘️ ${a.name_areas}`, callback_data: `loc_${a.id}` },
      ]);
      keyboard.push([{ text: '⬅️ Назад', callback_data: 'cmd_cities_areas' }]);
      return await ctx.editMessageText('🏘️ Районы', {
        reply_markup: { inline_keyboard: keyboard },
      });
    }

    // 📍 Выбор места
    if (data.startsWith('loc_')) {
      const id = data.split('_')[1];
      const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(
        (l) => l.id == id
      );
      if (!location) return await ctx.editMessageText('❌ Место не найдено.');
      setUserLocation(userId, id);
      const timesData = loadTimesById(id);
      const name = location.name_cities || location.name_areas;
      if (!timesData) {
        return await ctx.editMessageText(
          `⏳ Времена намазов для ${name} пока не добавлены.`,
          getMainMenu(id)
        );
      }
      return await ctx.editMessageText(
        `📍 ${name}
Выберите период:`,
        getLocationMenu(id)
      );
    }

    // 🕐 Сегодня
    if (data.startsWith('day_')) {
      const id = data.split('_')[1];
      const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(
        (l) => l.id == id
      );
      if (!location) return await ctx.editMessageText('❌ Место не найдено.');
      const timesData = loadTimesById(id);
      if (!timesData) return await ctx.editMessageText('❌ Данные недоступны.', getMainMenu(id));
      const name = location.name_cities || location.name_areas;
      const msg = getPrayerTimesForToday(timesData, name);
      return await ctx.editMessageText(msg, getLocationMenu(id));
    }

    // 📜 Хадис дня
    if (data === 'cmd_quote') {
      return await ctx.editMessageText(getQuoteMessage(), getMainMenu(getUserLastLocation(userId)));
    }

    // ℹ️ О боте
    if (data === 'cmd_about') {
      return await ctx.editMessageText(getAboutMessage(), getMainMenu(getUserLastLocation(userId)));
    }

    // 📊 Статистика
    if (data === 'cmd_stats') {
      return await ctx.editMessageText(getStatsMessage(), getMainMenu(getUserLastLocation(userId)));
    }

  } catch (err) {
    console.error('❌ Ошибка при обработке callback:', err.message);
    try {
      await ctx.editMessageText('❌ Произошла ошибка. Попробуйте позже.', getMainMenu(getUserLastLocation(userId)));
    } catch (e) {
      console.warn('Не удалось отправить сообщение об ошибке');
    }
  }
});

// ========================================================
// 🚀 ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ И ХАДИСОВ
// ========================================================
loadUsers();
loadQuotes();

// ========================================================
// ☁️ Vercel Webhook
// ========================================================
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const body = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });
    const update = JSON.parse(body);
    await bot.handleUpdate(update);
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('❌ Ошибка в Webhook:', e.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// ========================================================
// 💻 ЛОКАЛЬНЫЙ ЗАПУСК
// ========================================================
if (process.env.NODE_ENV !== 'production') {
  bot.launch().then(() => {
    console.log('✅ Бот запущен локально');
    console.log(`👥 Пользователей: ${users.size}`);
  }).catch(err => {
    console.error('❌ Ошибка запуска бота:', err.message);
  });
}