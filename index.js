/**
 * 🕌 Рузнама — Бот времён намазов для Дагестана
 *
 * @author Developer
 * @license MIT
 * @version 2.0.0 (полный редизайн + память мест)
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
const ROOT = process.cwd();
const DB_DIR = path.join(ROOT, 'db');
const CITIES_AREAS_PATH = path.join(DB_DIR, 'cities-areas.json');
const TIMES_DIR = path.join(DB_DIR, 'cities-areas');
const USERS_FILE = path.join(ROOT, 'users.json');

// ========================================================
// 🧠 ГЛОБАЛЬНОЕ СОСТОЯНИЕ: Пользователи и их последние места
// ========================================================
const userState = new Map(); // { userId: { lastLocationId } }

// Загрузка пользователей и их состояний
function loadUserData() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      for (const [id, state] of Object.entries(data)) {
        userState.set(id, state);
      }
      console.log(`✅ Загружено состояний пользователей: ${userState.size}`);
    }
  } catch (e) {
    console.error('❌ Ошибка загрузки users.json:', e.message);
  }
}

function saveUserData() {
  try {
    const serializable = {};
    for (const [id, state] of userState.entries()) {
      serializable[id] = state;
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(serializable, null, 2), 'utf8');
  } catch (e) {
    console.error('❌ Ошибка сохранения users.json:', e.message);
  }
}

function setLastLocation(userId, locationId) {
  const id = userId.toString();
  if (!userState.has(id)) userState.set(id, {});
  userState.get(id).lastLocationId = locationId;
  saveUserData();
}

function getLastLocation(userId) {
  const id = userId.toString();
  return userState.has(id) ? userState.get(id).lastLocationId : null;
}

// ========================================================
// 🌍 ЗАГРУЗКА ГОРОДОВ И РАЙОНОВ
// ========================================================
let citiesAreasData = { cities: [], areas: [] };

function loadCitiesAreas() {
  try {
    if (fs.existsSync(CITIES_AREAS_PATH)) {
      citiesAreasData = JSON.parse(fs.readFileSync(CITIES_AREAS_PATH, 'utf8'));
      console.log(`✅ Загружено: ${citiesAreasData.cities.length} городов и ${citiesAreasData.areas.length} районов`);
    } else {
      console.warn('⚠️ cities-areas.json не найден');
    }
  } catch (e) {
    console.error('❌ Ошибка загрузки cities-areas.json:', e.message);
  }
}

// ========================================================
// 📆 МЕСЯЦЫ: Рус ↔ Англ
// ========================================================
const MONTH_MAP = {
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

function toEnglishMonth(ru) {
  if (ru === 'now') return new Date().toLocaleString('en-GB', { month: 'long' });
  return MONTH_MAP[ru.toLowerCase().trim()] || null;
}

function toRussianMonth(en) {
  const entry = Object.entries(MONTH_MAP).find(([, eng]) => eng === en);
  return entry ? entry[0] : en;
}

// ========================================================
// 🕰️ ЗАГРУЗКА ВРЕМЁН ПО ID
// ========================================================
function loadPrayerTimes(id) {
  const file = path.join(TIMES_DIR, `${id}.json`);
  try {
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      return Object.keys(data).length ? data : null;
    }
    return null;
  } catch (e) {
    console.error(`❌ Ошибка чтения времён для ID ${id}:`, e.message);
    return null;
  }
}

// ========================================================
// 🕐 ФОРМАТИРОВАНИЕ ВРЕМЕНИ
// ========================================================
function formatTime(time) {
  if (Array.isArray(time) && time.length >= 2) {
    const h = String(time[0]).padStart(2, '0');
    const m = String(time[1]).padStart(2, '0');
    return `<code>${h}:${m}</code>`;
  }
  return '<code>—</code>';
}

// ========================================================
// 📅 ВРЕМЕНА НА СЕГОДНЯ
// ========================================================
function todayMessage(times, locationName) {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const monthEn = now.toLocaleString('en-GB', { month: 'long' });
  const monthRu = toRussianMonth(monthEn);
  const monthRuCap = capitalize(monthRu);

  const monthData = times[monthEn];
  if (!monthData) return `❌ Нет данных за <b>${monthRuCap}</b>`;
  const dayData = monthData[day];
  if (!dayData) return `❌ Нет данных на <b>${day} ${monthRuCap}</b>`;

  return `
✨ <b>Времена намазов на сегодня</b>
📍 <i>${locationName}</i> • ${day} ${monthRuCap}
────────────────────
🕌 <b>Фаджр</b>   —  ${formatTime(dayData.Fajr)}
🌅 <b>Шурук</b>   —  ${formatTime(dayData.Sunrise)}
☀️ <b>Зухр</b>    —  ${formatTime(dayData.Dhuhr)}
🌇 <b>Аср</b>     —  ${formatTime(dayData.Asr)}
🌆 <b>Магриб</b>  —  ${formatTime(dayData.Maghrib)}
🌙 <b>Иша</b>     —  ${formatTime(dayData.Isha)}
────────────────────
🕋 Пусть ваш намаз будет принят.
`.trim();
}

// ========================================================
// 📆 ТАБЛИЦА НА МЕСЯЦ (компактная)
// ========================================================
function monthTableMessage(times, locationName, monthEn) {
  const monthData = times[monthEn];
  if (!monthData) return `❌ Нет данных за <b>${toRussianMonth(monthEn)}</b>`;

  const monthRu = toRussianMonth(monthEn);
  const monthRuCap = capitalize(monthRu);

  const cols = { day: 2, time: 5 };
  let table = `<pre style="font-family: monospace; white-space: pre;">`;
  table += `Д`.padEnd(cols.day + 1) +
           `Фадж.`.padEnd(cols.time + 1) +
           `Шур.`.padEnd(cols.time + 1) +
           `Зухр`.padEnd(cols.time + 1) +
           `Аср`.padEnd(cols.time + 1) +
           `Магр.`.padEnd(cols.time + 1) +
           `Иша`.padEnd(cols.time + 1) + '\n';
  table += '─'.repeat(cols.day + cols.time * 6 + 6) + '\n';

  for (let d = 1; d <= 31; d++) {
    const dayStr = d.toString().padStart(2, '0');
    const dayData = monthData[dayStr];
    let row = d.toString().padEnd(cols.day + 1);

    if (dayData) {
      const clean = t => formatTime(t).replace(/<\/?code>/g, '').trim();
      row += clean(dayData.Fajr).padEnd(cols.time + 1) +
             clean(dayData.Sunrise).padEnd(cols.time + 1) +
             clean(dayData.Dhuhr).padEnd(cols.time + 1) +
             clean(dayData.Asr).padEnd(cols.time + 1) +
             clean(dayData.Maghrib).padEnd(cols.time + 1) +
             clean(dayData.Isha).padEnd(cols.time + 1);
    } else {
      row += ' '.repeat(cols.time * 6 + 6);
    }
    table += row + '\n';
  }
  table += '</pre>';

  return `
🗓️ <b>Намазы — ${monthRuCap}</b>
📍 <i>${locationName}</i>
${table}
`.trim();
}

// ========================================================
// 🗺️ КНОПКИ: Все города или районы
// ========================================================
function locationListKeyboard(items, backData = 'main_menu') {
  if (items.length === 0) return mainMenu;
  const keyboard = items.map(item => [
    {
      text: `${item.name_cities ? '🏙️' : '🏘️'} ${item.name_cities || item.name_areas}`,
      callback_data: `loc_${item.id}`,
    },
  ]);
  keyboard.push([{ text: '⬅️ Назад', callback_data: backData }]);
  return { reply_markup: { inline_keyboard: keyboard } };
}

// ========================================================
// 📍 МЕНЮ КОНКРЕТНОГО МЕСТА
// ========================================================
function locationMenu(locationId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🕌 Сегодня', callback_data: `today_${locationId}` }],
        [{ text: '📅 Текущий месяц', callback_data: `cur_month_${locationId}` }],
        [{ text: '🗓️ Выбрать месяц', callback_data: `pick_month_${locationId}` }],
        [],
        [{ text: '⬅️ Назад к списку', callback_data: 'main_menu' }],
      ],
    },
  };
}

// ========================================================
// 🗓️ КЛАВИАТУРА ВЫБОРА МЕСЯЦА
// ========================================================
function monthPickerKeyboard(locationId) {
  const keyboard = Object.keys(MONTH_MAP).map(month => ({
    text: capitalize(month),
    callback_data: `month_${month}_${locationId}`,
  })).reduce((acc, btn, i) => {
    if (i % 3 === 0) acc.push([]);
    acc[acc.length - 1].push(btn);
    return acc;
  }, []);
  keyboard.push([{ text: '⬅️ Назад', callback_data: `back_to_loc_${locationId}` }]);
  return { reply_markup: { inline_keyboard: keyboard } };
}

// ========================================================
// 🏠 ГЛАВНОЕ МЕНЮ
// ========================================================
const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '🏙️ Города', callback_data: 'cities' },
        { text: '🏘️ Районы', callback_data: 'areas' },
      ],
      [{ text: '📖 Хадис дня', callback_data: 'quote' }],
      [
        { text: 'ℹ️ О боте', callback_data: 'about' },
        { text: '📊 Статистика', callback_data: 'stats' },
      ],
    ],
  },
};

// ========================================================
// 📜 ХАДИСЫ
// ========================================================
let hadiths = [];

function loadHadiths() {
  try {
    const file = path.join(ROOT, 'quotes.json');
    if (fs.existsSync(file)) {
      hadiths = JSON.parse(fs.readFileSync(file, 'utf8'));
      console.log(`✅ Загружено хадисов: ${hadiths.length}`);
    } else {
      hadiths = [{ text: 'Хадис временно недоступен.', author: 'Администрация' }];
    }
  } catch (e) {
    console.error('❌ Ошибка quotes.json:', e.message);
    hadiths = [{ text: 'Ошибка загрузки хадиса.', author: 'Система' }];
  }
}

function randomHadith() {
  return hadiths[Math.floor(Math.random() * hadiths.length)];
}

// ========================================================
// 🔍 ПОИСК
// ========================================================
function searchLocations(query) {
  const all = [...citiesAreasData.cities, ...citiesAreasData.areas];
  const q = query.toLowerCase().trim();
  return all.filter(loc => (loc.name_cities || loc.name_areas || '').toLowerCase().includes(q)).slice(0, 10);
}

// ========================================================
// 🛠️ Утилиты
// ========================================================
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getLocationById(id) {
  return [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
}

// ========================================================
// 🚀 КОМАНДЫ
// ========================================================
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const lastLocId = getLastLocation(userId);
  let welcome = `🕌 <b>Добро пожаловать в «Рузнама»</b>\n`;
  welcome += `«Самое лучшее деяние — это намаз, совершённый в начале отведённого для него времени». (Тирмизи)\n\n`;
  welcome += `📍 Выберите раздел или введите название места.`;

  if (lastLocId) {
    const loc = getLocationById(lastLocId);
    if (loc) {
      const name = loc.name_cities || loc.name_areas;
      welcome += `\n\n🔖 Последнее место: <b>${name}</b>`;
    }
  }

  await ctx.replyWithHTML(welcome, mainMenu).catch(console.error);
});

bot.command('help', (ctx) => ctx.replyWithHTML(`
📘 <b>Справка</b>
/start — Главное меню
/help — Эта справка
/day — Намазы на сегодня
/month — Таблица на месяц
/stats — Статистика
/about — О боте
/newquote — Новый хадис
`).catch(console.error));

bot.command('stats', (ctx) => ctx.replyWithHTML(`
📊 <b>Статистика</b>
👥 Пользователей: <code>${userState.size}</code>
🏙️ Городов: <code>${citiesAreasData.cities.length}</code>
🏘️ Районов: <code>${citiesAreasData.areas.length}</code>
🕌 Всего мест: <code>${citiesAreasData.cities.length + citiesAreasData.areas.length}</code>
`).catch(console.error));

bot.command('about', (ctx) => ctx.replyWithHTML(`
ℹ️ <b>О боте «Рузнама»</b>
🕌 Точный расчёт времён намазов для Дагестана.
📩 Создан с заботой о верующих.
© 2025 | С искренним намерением
`).catch(console.error));

bot.command('newquote', (ctx) => {
  const q = randomHadith();
  return ctx.replyWithHTML(`
📘 <b>Хадис дня</b>
❝ <i>${q.text}</i> ❞
— <b>${q.author}</b>
  `).catch(console.error);
});

bot.command('day', async (ctx) => {
  const userId = ctx.from.id;
  const lastLocId = getLastLocation(userId);
  if (!lastLocId) {
    return ctx.replyWithHTML('⏳ Сначала выберите место через меню или поиск.', mainMenu);
  }
  const location = getLocationById(lastLocId);
  if (!location) return ctx.reply('❌ Место не найдено.');
  const times = loadPrayerTimes(lastLocId);
  if (!times) return ctx.reply('❌ Данные недоступны.');
  const name = location.name_cities || location.name_areas;
  await ctx.replyWithHTML(todayMessage(times, name), locationMenu(lastLocId));
});

bot.command('month', async (ctx) => {
  const userId = ctx.from.id;
  const lastLocId = getLastLocation(userId);
  if (!lastLocId) {
    return ctx.replyWithHTML('📅 Сначала выберите место.', mainMenu);
  }
  const location = getLocationById(lastLocId);
  if (!location) return ctx.reply('❌ Место не найдено.');
  const times = loadPrayerTimes(lastLocId);
  if (!times) return ctx.reply('❌ Данные недоступны.');
  const name = location.name_cities || location.name_areas;
  const monthEn = toEnglishMonth('now');
  await ctx.replyWithHTML(monthTableMessage(times, name, monthEn), locationMenu(lastLocId));
});

// ========================================================
// 🔤 ПОИСК ПО НАЗВАНИЮ
// ========================================================
bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  if (text.startsWith('/')) return;

  const results = searchLocations(text);
  if (results.length === 0) {
    return ctx.replyWithHTML(`🔍 <b>Ничего не найдено по запросу «${text}».</b>`, mainMenu);
  }

  const keyboard = results.map(loc => [{
    text: `${loc.name_cities ? '🏙️' : '🏘️'} ${loc.name_cities || loc.name_areas}`,
    callback_data: `loc_${loc.id}`,
  }]);
  await ctx.replyWithHTML(`🔍 Найдено ${results.length}:`, { reply_markup: { inline_keyboard: keyboard } });
});

// ========================================================
// 🔘 ОБРАБОТКА КНОПОК
// ========================================================
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from.id;

  try {
    await ctx.answerCbQuery();
  } catch (e) {
    console.warn('Callback answer failed:', e.message);
  }

  // Запоминаем пользователя
  if (!userState.has(userId.toString())) {
    userState.set(userId.toString(), {});
  }

  try {
    // 🏠 Главное меню
    if (data === 'main_menu') {
      return await ctx.editMessageText('🏠 Выберите раздел:', { parse_mode: 'HTML', ...mainMenu });
    }

    // 🏙️ Города
    if (data === 'cities') {
      return await ctx.editMessageText('<b>🌆 Города</b>', locationListKeyboard(citiesAreasData.cities, 'main_menu'));
    }

    // 🏘️ Районы
    if (data === 'areas') {
      return await ctx.editMessageText('<b>🏘️ Районы</b>', locationListKeyboard(citiesAreasData.areas, 'main_menu'));
    }

    // 📍 Выбор места
    if (data.startsWith('loc_')) {
      const id = data.split('_')[1];
      const location = getLocationById(id);
      if (!location) return await ctx.editMessageText('❌ Место не найдено.');
      const name = location.name_cities || location.name_areas;
      setLastLocation(userId, id);
      const times = loadPrayerTimes(id);
      if (!times) {
        return await ctx.editMessageText(
          `⏳ Времена намазов для <b>${name}</b> пока не добавлены.`,
          { parse_mode: 'HTML', ...mainMenu }
        );
      }
      return await ctx.editMessageText(`📍 <b>${name}</b>\nВыберите период:`, locationMenu(id));
    }

    // 🕐 Сегодня
    if (data.startsWith('today_')) {
      const id = data.split('_')[1];
      const location = getLocationById(id);
      if (!location) return await ctx.editMessageText('❌ Место не найдено.');
      const times = loadPrayerTimes(id);
      if (!times) return await ctx.editMessageText('❌ Данные недоступны.', mainMenu);
      const name = location.name_cities || location.name_areas;
      return await ctx.editMessageText(todayMessage(times, name), locationMenu(id));
    }

    // 📅 Текущий месяц
    if (data.startsWith('cur_month_')) {
      const id = data.split('_')[2];
      const location = getLocationById(id);
      if (!location) return await ctx.editMessageText('❌ Место не найдено.');
      const times = loadPrayerTimes(id);
      if (!times) return await ctx.editMessageText('❌ Данные недоступны.', mainMenu);
      const name = location.name_cities || location.name_areas;
      const monthEn = toEnglishMonth('now');
      return await ctx.editMessageText(monthTableMessage(times, name, monthEn), locationMenu(id));
    }

    // 🗓️ Выбрать месяц
    if (data === 'pick_month_' || data.startsWith('pick_month_')) {
      const id = data.split('_')[2];
      return await ctx.editMessageText('🗓️ Выберите месяц:', monthPickerKeyboard(id));
    }

    // 📅 Конкретный месяц
    if (data.startsWith('month_')) {
      const parts = data.split('_');
      const ruMonth = parts.slice(1, -1).join('_');
      const id = parts[parts.length - 1];
      const enMonth = toEnglishMonth(ruMonth);
      const location = getLocationById(id);
      if (!location || !enMonth) return await ctx.editMessageText('❌ Ошибка.', locationMenu(id));
      const times = loadPrayerTimes(id);
      if (!times) return await ctx.editMessageText('❌ Данные недоступны.', mainMenu);
      const name = location.name_cities || location.name_areas;
      return await ctx.editMessageText(monthTableMessage(times, name, enMonth), locationMenu(id));
    }

    // 🔙 Назад к месту
    if (data.startsWith('back_to_loc_')) {
      const id = data.split('_')[3];
      const location = getLocationById(id);
      if (!location) return await ctx.editMessageText('❌ Место не найдено.');
      const name = location.name_cities || location.name_areas;
      return await ctx.editMessageText(`📍 <b>${name}</b>\nВыберите период:`, locationMenu(id));
    }

    // 📜 Хадис
    if (data === 'quote') {
      const q = randomHadith();
      return await ctx.editMessageText(`
📘 <b>Хадис дня</b>
❝ <i>${q.text}</i> ❞
— <b>${q.author}</b>
      `.trim(), mainMenu);
    }

    // ℹ️ О боте
    if (data === 'about') {
      return await ctx.editMessageText(`
ℹ️ <b>О боте «Рузнама»</b>
🕌 Точный расчёт времён намазов для Дагестана.
📩 Создан с заботой о верующих.
© 2025 | С искренним намерением
      `.trim(), mainMenu);
    }

    // 📊 Статистика
    if (data === 'stats') {
      return await ctx.editMessageText(`
📊 <b>Статистика</b>
👥 Пользователей: <code>${userState.size}</code>
🏙️ Городов: <code>${citiesAreasData.cities.length}</code>
🏘️ Районов: <code>${citiesAreasData.areas.length}</code>
🕌 Всего мест: <code>${citiesAreasData.cities.length + citiesAreasData.areas.length}</code>
      `.trim(), mainMenu);
    }
  } catch (err) {
    console.error('❌ Ошибка в callback:', err.message);
    await ctx.editMessageText('❌ Ошибка. Попробуйте позже.', mainMenu).catch(() => {});
  }
});

// ========================================================
// 🚀 ЗАГРУЗКА ДАННЫХ ПРИ СТАРТЕ
// ========================================================
loadCitiesAreas();
loadHadiths();
loadUserData();

// ========================================================
// ☁️ Vercel Webhook
// ========================================================
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => (data += chunk));
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });

    await bot.handleUpdate(JSON.parse(body));
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('❌ Webhook ошибка:', e.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// 💻 Локальный запуск
if (process.env.NODE_ENV !== 'production') {
  bot.launch().then(() => {
    console.log('✅ Бот запущен локально');
    console.log(`👥 Пользователей: ${userState.size}`);
  }).catch(err => console.error('❌ Ошибка запуска:', err.message));
}