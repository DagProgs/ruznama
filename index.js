/**
 * 🕌 Рузнама — Бот времён намазов
 * 
 * @author Developer
 * @license MIT
 * @version 1.1.0
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
// 📆 МАППИНГ МЕСЯЦЕВ: Русские → Английские
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
  декабрь: 'December'
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
// 🕐 ФОРМАТИРОВАНИЕ ВРЕМЕНИ
// ========================================================
function fmt(time) {
  return Array.isArray(time) && time.length >= 2
    ? `${String(time[0]).padStart(2, '0')}:${String(time[1]).padStart(2, '0')}`
    : '—';
}

// ========================================================
// 📅 ВРЕМЕНА НА СЕГОДНЯ
// ========================================================
function getPrayerTimesForToday(timesData) {
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
📅 <b>${day} ${monthRuCap}</b>
🕌 <b>Фаджр</b>:    <code>${fmt(dayData.Fajr)}</code>
🌅 <b>Восход</b>:   <code>${fmt(dayData.Sunrise)}</code>
☀️ <b>Зухр</b>:     <code>${fmt(dayData.Dhuhr)}</code>
🌇 <b>Аср</b>:      <code>${fmt(dayData.Asr)}</code>
🌆 <b>Магриб</b>:   <code>${fmt(dayData.Maghrib)}</code>
🌙 <b>Иша</b>:      <code>${fmt(dayData.Isha)}</code>
`.trim();
}

// ========================================================
// 📆 ТАБЛИЦА НА МЕСЯЦ
// ========================================================
function getPrayerTimesTableForMonth(timesData, monthEn) {
  const monthData = timesData[monthEn];
  if (!monthData) return `❌ Нет данных за ${monthEn}`;

  const monthRu = getRussianMonthName(monthEn);
  const monthRuCap = monthRu.charAt(0).toUpperCase() + monthRu.slice(1);
  const dayW = 3, timeW = 5;

  let table = `<pre>`;
  table += `Д`.padEnd(dayW + 1, ' ') +
           `Фаджр`.padEnd(timeW + 1, ' ') +
           `Шурук`.padEnd(timeW + 1, ' ') +
           `Зухр`.padEnd(timeW + 1, ' ') +
           `Аср`.padEnd(timeW + 1, ' ') +
           `Магр`.padEnd(timeW + 1, ' ') +
           `Иша`.padEnd(timeW + 1, ' ') + '\n';
  table += '─'.repeat(dayW + timeW * 6 + 6) + '\n';

  for (let d = 1; d <= 31; d++) {
    const dayStr = String(d).padStart(2, '0');
    const dayData = monthData[dayStr];
    let row = d.toString().padEnd(dayW + 1, ' ');

    if (dayData) {
      row += fmt(dayData.Fajr).padEnd(timeW + 1, ' ') +
             fmt(dayData.Sunrise).padEnd(timeW + 1, ' ') +
             fmt(dayData.Dhuhr).padEnd(timeW + 1, ' ') +
             fmt(dayData.Asr).padEnd(timeW + 1, ' ') +
             fmt(dayData.Maghrib).padEnd(timeW + 1, ' ') +
             fmt(dayData.Isha).padEnd(timeW + 1, ' ');
    } else {
      row += ' '.repeat(timeW * 6 + 5);
    }

    table += row + '\n';
  }
  table += '</pre>';

  return `🕌 <b>Времена намазов — ${monthRuCap}</b>\n${table}`;
}

// ========================================================
// 🗓️ КЛАВИАТУРА: Выбор месяца (3 колонки)
// ========================================================
function getMonthsList(locationId) {
  const keyboard = Object.keys(russianToEnglishMonth)
    .map(month => ({
      text: capitalize(month),
      callback_data: `select_month_${month}_${locationId}`
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
// 📍 МЕНЮ МЕСТА (красивое, с иконками)
// ========================================================
function getLocationMenu(locationId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🕌 Сегодня', callback_data: `day_${locationId}` }],
        [{ text: '📅 Текущий месяц', callback_data: `month_${locationId}` }],
        [{ text: '🗓️ Выбрать месяц', callback_data: `year_${locationId}` }],
        [],
        [{ text: '⬅️ Назад к списку', callback_data: 'cmd_cities_areas' }]
      ]
    }
  };
}

// ========================================================
// 🏠 ГЛАВНОЕ МЕНЮ (красивое, с крупными кнопками)
// ========================================================
const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '🏙️ Города', callback_data: 'cmd_cities' },
        { text: '🏘️ Районы', callback_data: 'cmd_areas' }
      ],
      [
        { text: '📖 Хадис дня', callback_data: 'cmd_quote' }
      ],
      [
        { text: 'ℹ️ О боте', callback_data: 'cmd_about' },
        { text: '📊 Статистика', callback_data: 'cmd_stats' }
      ]
    ]
  }
};

// ========================================================
// 👥 РАБОТА С ПОЛЬЗОВАТЕЛЯМИ
// ========================================================
let users = new Set();

function loadUsers() {
  try {
    if (fs.existsSync(usersFilePath)) {
      const loaded = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
      users = new Set(loaded);
      console.log(`✅ Пользователей загружено: ${users.size}`);
    }
  } catch (e) {
    console.error('❌ Ошибка загрузки users.json:', e.message);
  }
}

function saveUsers() {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify([...users]), 'utf8');
  } catch (e) {
    console.error('❌ Ошибка сохранения users.json:', e.message);
  }
}

function addUser(userId) {
  const id = userId.toString();
  if (!users.has(id)) {
    users.add(id);
    saveUsers();
    console.log(`🆕 Новый пользователь: ${id} | Всего: ${users.size}`);
  }
}

// ========================================================
// 📜 ХАДИС ДНЯ
// ========================================================
const quotes = require('./quotes.json');

function getRandomQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

// ========================================================
// 🔍 ПОИСК ПО НАЗВАНИЮ
// ========================================================
function searchLocations(query) {
  const allLocations = [...citiesAreasData.cities, ...citiesAreasData.areas];
  const lowerQuery = query.toLowerCase().trim();
  return allLocations
    .filter(loc => (loc.name_cities || loc.name_areas || '').toLowerCase().includes(lowerQuery))
    .slice(0, 10);
}

// ========================================================
// 🛠️ Утилита: Заглавная буква
// ========================================================
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ========================================================
// 🚀 КОМАНДА /start (с красивым дизайном)
// ========================================================
bot.start((ctx) => {
  addUser(ctx.from.id);
  ctx.replyWithHTML(
    `🕌 <b>Добро пожаловать в «Рузнама»</b>\n\n` +
    `«Самое лучшее деяние — это намаз, совершённый в начале отведённого для него времени». (Тирмизи)\n\n` +
    `📍 Выберите интересующий вас раздел или введите название населённого пункта.`,
    mainMenu
  );
});

// ========================================================
// 🆘 /help
// ========================================================
bot.command('help', (ctx) => {
  ctx.replyWithHTML(
    `📘 <b>Справка по боту</b>\n\n` +
    `• /start — Главное меню\n` +
    `• /help — Помощь\n` +
    `• /stats — Статистика\n` +
    `• /about — О проекте\n` +
    `• /newquote — Новый хадис\n` +
    `• /day — Времена намазов на сегодня\n` +
    `• /month — Таблица на месяц`
  );
});

// ========================================================
// 📊 /stats
// ========================================================
bot.command('stats', (ctx) => {
  ctx.replyWithHTML(
    `📊 <b>Статистика бота</b>\n\n` +
    `👥 Пользователей: <b>${users.size}</b>\n` +
    `🏙️ Городов: <b>${citiesAreasData.cities.length}</b>\n` +
    `🏘️ Районов: <b>${citiesAreasData.areas.length}</b>\n` +
    `🕌 Всего мест: <b>${citiesAreasData.cities.length + citiesAreasData.areas.length}</b>`
  );
});

// ========================================================
// ℹ️ /about
// ========================================================
bot.command('about', (ctx) => {
  ctx.replyWithHTML(
    `ℹ️ <b>О боте «Рузнама»</b>\n\n` +
    `🕌 Предоставляет точные времена намазов для городов и районов Курахского района.\n\n` +
    `📩 Создан с заботой о верующих.\n\n` +
    `© 2025 | Разработан с искренним намерением`
  );
});

// ========================================================
// 🆕 /newquote
// ========================================================
bot.command('newquote', (ctx) => {
  const q = getRandomQuote();
  ctx.replyWithHTML(
    `📘 <b>Хадис дня</b>\n\n` +
    `❝ <i>${q.text}</i> ❞\n\n` +
    `— <b>${q.author}</b>`
  );
});

// ========================================================
// 🕐 /day — заглушка
// ========================================================
bot.command('day', (ctx) => {
  ctx.replyWithHTML(
    '⏳ Чтобы увидеть времена намазов на сегодня — выберите место через меню или введите название.',
    mainMenu
  );
});

// ========================================================
// 📅 /month — заглушка
// ========================================================
bot.command('month', (ctx) => {
  ctx.replyWithHTML(
    '📅 Показывает таблицу на текущий месяц. Сначала выберите место.',
    mainMenu
  );
});

// ========================================================
// 🗓️ /year — заглушка
// ========================================================
bot.command('year', (ctx) => {
  ctx.replyWithHTML('🗓️ Выберите месяц. Сначала укажите место.', mainMenu);
});

// ========================================================
// 🔤 ОБРАБОТКА ТЕКСТА (поиск)
// ========================================================
bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  if (text.startsWith('/')) return;

  addUser(ctx.from.id);
  const results = searchLocations(text);

  if (results.length === 0) {
    return ctx.replyWithHTML(
      `🔍 <b>По запросу «${text}» ничего не найдено.</b>\n\n` +
      `Проверьте написание или попробуйте другой вариант.`,
      mainMenu
    );
  }

  const keyboard = results.map(loc => [{
    text: `${loc.name_cities ? '🏙️' : '🏘️'} ${loc.name_cities || loc.name_areas}`,
    callback_data: `loc_${loc.id}`
  }]);

  await ctx.replyWithHTML(
    `🔍 <b>Найдено ${results.length}:</b>`,
    { reply_markup: { inline_keyboard: keyboard } }
  );
});

// ========================================================
// 🔘 ОБРАБОТКА КНОПОК
// ========================================================
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.callbackQuery.from.id;

  addUser(userId);
  try {
    await ctx.answerCbQuery();
  } catch (e) {
    console.warn('⚠️ Не удалось ответить на callback:', e.message);
  }

  // 🏠 Главное меню
  if (data === 'cmd_cities_areas') {
    return await ctx.editMessageText('🏠 Выберите раздел:', {
      parse_mode: 'HTML',
      ...mainMenu
    });
  }

  // 🏙️ Города
  if (data === 'cmd_cities') {
    if (!citiesAreasData.cities.length) {
      return await ctx.editMessageText('📭 Нет доступных городов.', {
        parse_mode: 'HTML',
        ...mainMenu
      });
    }
    const keyboard = citiesAreasData.cities.map(c => [{
      text: `🏙️ ${c.name_cities}`,
      callback_data: `loc_${c.id}`
    }]);
    keyboard.push([{ text: '⬅️ Назад', callback_data: 'cmd_cities_areas' }]);
    return await ctx.editMessageText('<b>🌆 Города</b>', {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // 🏘️ Районы
  if (data === 'cmd_areas') {
    if (!citiesAreasData.areas.length) {
      return await ctx.editMessageText('📭 Нет доступных районов.', {
        parse_mode: 'HTML',
        ...mainMenu
      });
    }
    const keyboard = citiesAreasData.areas.map(a => [{
      text: `🏘️ ${a.name_areas}`,
      callback_data: `loc_${a.id}`
    }]);
    keyboard.push([{ text: '⬅️ Назад', callback_data: 'cmd_cities_areas' }]);
    return await ctx.editMessageText('<b>🏘️ Районы</b>', {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // 📍 Выбор места
  if (data.startsWith('loc_')) {
    const id = data.split('_')[1];
    const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
    if (!location) return await ctx.editMessageText('❌ Место не найдено.');

    const timesData = loadTimesById(id);
    if (!timesData) {
      const name = location.name_cities || location.name_areas;
      return await ctx.editMessageText(
        `⏳ Времена намазов для <b>${name}</b> пока не добавлены.`,
        { parse_mode: 'HTML', ...mainMenu }
      );
    }

    const name = location.name_cities || location.name_areas;
    return await ctx.editMessageText(
      `📍 <b>${name}</b>\nВыберите период:`,
      {
        parse_mode: 'HTML',
        ...getLocationMenu(id)
      }
    );
  }

  // 🕐 Сегодня
  if (data.startsWith('day_')) {
    const id = data.split('_')[1];
    const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
    if (!location) return await ctx.editMessageText('❌ Место не найдено.');

    const timesData = loadTimesById(id);
    if (!timesData) return await ctx.editMessageText('❌ Данные недоступны.', {
      parse_mode: 'HTML',
      ...mainMenu
    });

    const msg = getPrayerTimesForToday(timesData);
    const name = location.name_cities || location.name_areas;
    return await ctx.editMessageText(
      `📍 <b>${name}</b>\n${msg}`,
      {
        parse_mode: 'HTML',
        ...getLocationMenu(id)
      }
    );
  }

  // 📅 Месяц (текущий)
  if (data.startsWith('month_')) {
    const id = data.split('_')[1];
    const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
    if (!location) return await ctx.editMessageText('❌ Место не найдено.');

    const timesData = loadTimesById(id);
    if (!timesData) return await ctx.editMessageText('❌ Данные недоступны.', {
      parse_mode: 'HTML',
      ...mainMenu
    });

    const monthEn = getEnglishMonthName('now');
    const msg = getPrayerTimesTableForMonth(timesData, monthEn);
    const name = location.name_cities || location.name_areas;
    return await ctx.editMessageText(
      `📍 <b>${name}</b>\n${msg}`,
      {
        parse_mode: 'HTML',
        ...getLocationMenu(id)
      }
    );
  }

  // 🗓️ Год → выбор месяца
  if (data.startsWith('year_')) {
    const id = data.split('_')[1];
    const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
    if (!location) return await ctx.editMessageText('❌ Место не найдено.');

    const timesData = loadTimesById(id);
    if (!timesData) return await ctx.editMessageText('❌ Данные недоступны.', {
      parse_mode: 'HTML',
      ...mainMenu
    });

    return await ctx.editMessageText('🗓️ Выберите месяц:', getMonthsList(id));
  }

  // 📅 Выбор месяца
  if (data.startsWith('select_month_')) {
    const parts = data.split('_');
    const ruMonth = parts.slice(2, -1).join('_');
    const locationId = parts[parts.length - 1];
    const enMonth = getEnglishMonthName(ruMonth);
    if (!enMonth) return await ctx.editMessageText('❌ Месяц не распознан.', getLocationMenu(locationId));

    const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == locationId);
    if (!location) return await ctx.editMessageText('❌ Место не найдено.');

    const timesData = loadTimesById(locationId);
    if (!timesData) return await ctx.editMessageText('❌ Данные недоступны.', {
      parse_mode: 'HTML',
      ...mainMenu
    });

    const msg = getPrayerTimesTableForMonth(timesData, enMonth);
    const name = location.name_cities || location.name_areas;
    return await ctx.editMessageText(
      `📍 <b>${name}</b>\n${msg}`,
      {
        parse_mode: 'HTML',
        ...getLocationMenu(locationId)
      }
    );
  }

  // 🔙 Назад к месту
  if (data.startsWith('back_to_loc_')) {
    const id = data.split('_')[3];
    const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
    if (!location) return await ctx.editMessageText('❌ Место не найдено.');

    const timesData = loadTimesById(id);
    if (!timesData) return await ctx.editMessageText('❌ Данные недоступны.', {
      parse_mode: 'HTML',
      ...mainMenu
    });

    const name = location.name_cities || location.name_areas;
    return await ctx.editMessageText(
      `📍 <b>${name}</b>\nВыберите период:`,
      {
        parse_mode: 'HTML',
        ...getLocationMenu(id)
      }
    );
  }

  // 📜 Хадис дня
  if (data === 'cmd_quote') {
    const q = getRandomQuote();
    return await ctx.editMessageText(
      `📘 <b>Хадис дня</b>\n\n` +
      `❝ <i>${q.text}</i> ❞\n\n` +
      `— <b>${q.author}</b>`,
      {
        parse_mode: 'HTML',
        ...mainMenu
      }
    );
  }

  // ℹ️ О боте
  if (data === 'cmd_about') {
    return await ctx.editMessageText(
      `ℹ️ <b>О боте «Рузнама»</b>\n\n` +
      `🕌 Предоставляет точные времена намазов для городов и районов РД.\n\n` +
      `📩 Создан с заботой о верующих.\n\n` +
      `© 2025 | Разработан с искренним намерением`,
      {
        parse_mode: 'HTML',
        ...mainMenu
      }
    );
  }

  // 📊 Статистика
  if (data === 'cmd_stats') {
    return await ctx.editMessageText(
      `📊 <b>Статистика бота</b>\n\n` +
      `👥 Пользователей: <b>${users.size}</b>\n` +
      `🏙️ Городов: <b>${citiesAreasData.cities.length}</b>\n` +
      `🏘️ Районов: <b>${citiesAreasData.areas.length}</b>\n` +
      `🕌 Всего мест: <b>${citiesAreasData.cities.length + citiesAreasData.areas.length}</b>`,
      {
        parse_mode: 'HTML',
        ...mainMenu
      }
    );
  }
});

// ========================================================
// 🚀 ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ
// ========================================================
loadUsers();

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
  });
}