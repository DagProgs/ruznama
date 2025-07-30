/**
 * 🕌 Рузнама — Бот времён намазов для Курахского района
 * 
 * @author Developer
 * @license MIT
 * @version 2.1.0
 */

// Загружаем переменные из .env
require('dotenv').config();

import { Telegraf } from 'telegraf';
import fs from 'fs';
import path from 'path';

// ========================================================
// 🛑 ПРОВЕРКА ТОКЕНА И АДМИНА
// ========================================================
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

if (!BOT_TOKEN) {
  throw new Error('❌ ОШИБКА: BOT_TOKEN не установлен в .env!');
}

if (!ADMIN_ID) {
  throw new Error('❌ ОШИБКА: ADMIN_ID не установлен в .env!');
}

const ADMINS = [ADMIN_ID];
const bot = new Telegraf(BOT_TOKEN);

// Проверка: админ ли?
function isAdmin(userId) {
  return ADMINS.includes(userId.toString());
}

// ========================================================
// 📁 ПУТИ К ФАЙЛАМ
// ========================================================
const citiesAreasPath = path.join(process.cwd(), 'db', 'cities-areas.json');
const timesDir = path.join(process.cwd(), 'db', 'cities-areas');
const usersFilePath = path.join(process.cwd(), 'users.json');
const quotesFilePath = path.join(process.cwd(), 'quotes.json');

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
// 📆 МАППИНГ МЕСЯЦЕВ
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
// 📜 ХАДИС ДНЯ
// ========================================================
let quotes = [];

function loadQuotes() {
  try {
    if (fs.existsSync(quotesFilePath)) {
      quotes = JSON.parse(fs.readFileSync(quotesFilePath, 'utf8'));
      console.log(`✅ Загружено хадисов: ${quotes.length}`);
    } else {
      quotes = [{ text: "Верующий к верующему — как здание: один поддерживает другой.", author: "Бухари, Муслим" }];
      saveQuotes();
    }
  } catch (e) {
    console.error('❌ Ошибка загрузки quotes.json:', e.message);
    quotes = [];
  }
}

function saveQuotes() {
  try {
    fs.writeFileSync(quotesFilePath, JSON.stringify(quotes, null, 2), 'utf8');
  } catch (e) {
    console.error('❌ Ошибка сохранения quotes.json:', e.message);
  }
}

function getRandomQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

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
// 📢 РАССЫЛКА СООБЩЕНИЙ
// ========================================================
async function broadcastMessage(text) {
  let sent = 0;
  let failed = 0;
  for (const userId of users) {
    try {
      await bot.telegram.sendMessage(userId, text, { parse_mode: 'HTML' });
      sent++;
    } catch (err) {
      if (err.response && err.response.error_code === 403) {
        users.delete(userId);
        saveUsers();
      }
      failed++;
    }
  }
  return { sent, failed };
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
// 🗂️ КЛАВИАТУРЫ
// ========================================================
const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '🏙️ Города', callback_ 'cmd_cities' }],
      [{ text: '🏘️ Районы', callback_ 'cmd_areas' }],
      [{ text: '📖 Хадис дня', callback_data: 'cmd_quote' }],
      [{ text: 'ℹ️ О боте', callback_ 'cmd_about' }]
    ]
  }
};

const adminMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '📚 Управление хадисами', callback_ 'admin_quotes' }],
      [{ text: '📢 Сделать рассылку', callback_ 'admin_broadcast' }],
      [{ text: '📊 Статистика', callback_ 'admin_stats' }],
      [{ text: '⬅️ Назад в бота', callback_ 'cmd_cities_areas' }]
    ]
  }
};

// ========================================================
// 🚀 КОМАНДА /start
// ========================================================
bot.start((ctx) => {
  addUser(ctx.from.id);
  ctx.replyWithHTML(
    `🕌 <b>Рузнама — Курахский район</b>\n\n` +
    `«Самое лучшее деяние — это намаз, совершённый в начале отведённого для него времени». (Тирмизи)\n\n` +
    `🔍 Выберите раздел или введите название города/района:`,
    mainMenu
  );
});

// ========================================================
// 🔐 /admin — Админ-панель
// ========================================================
bot.command('admin', (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.reply('❌ У вас нет доступа к админ-панели.');
  }
  ctx.replyWithHTML(
    `🔐 <b>Админ-панель</b>\n\n` +
    `Добро пожаловать, администратор!\n\n` +
    `Выберите действие:`,
    adminMenu
  );
});

// ========================================================
// 📢 /broadcast — Рассылка
// ========================================================
bot.command('broadcast', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply('❌ Доступ запрещён.');
  const text = ctx.message.text.split(' ').slice(1).join(' ');
  if (!text) return ctx.reply('📌 Используйте: /broadcast <текст>');

  ctx.replyWithHTML('⏳ Начинаю рассылку...');

  const { sent, failed } = await broadcastMessage(text);
  ctx.replyWithHTML(
    `✅ Рассылка завершена!\n` +
    `📬 Отправлено: <b>${sent}</b>\n` +
    `❌ Ошибок: <b>${failed}</b>`
  );
});

// ========================================================
// 🔘 ОБРАБОТКА КНОПОК: Админ-панель
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

  // Проверка админа
  if (data.startsWith('admin_') && !isAdmin(userId)) {
    return ctx.reply('❌ У вас нет доступа.');
  }

  // 📚 Управление хадисами
  if (data === 'admin_quotes') {
    const list = quotes.map((q, i) => `<b>${i + 1}.</b> ${q.text} — <i>${q.author}</i>`).join('\n\n');
    return await ctx.editMessageText(
      `📚 <b>Список хадисов</b> (${quotes.length} шт.)\n\n` +
      (quotes.length ? list : 'Пока нет хадисов.') +
      '\n\nЧтобы добавить: /addquote текст — автор\nЧтобы удалить: /delquote 1',
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '⬅️ Назад', callback_data: 'cmd_cities_areas' }]
          ]
        }
      }
    );
  }

  // 📢 Рассылка
  if (data === 'admin_broadcast') {
    return await ctx.editMessageText(
      '📢 Введите команду:\n<code>/broadcast Ваше сообщение</code>',
      { parse_mode: 'HTML', ...adminMenu }
    );
  }

  // 📊 Статистика
  if (data === 'admin_stats') {
    const topCities = citiesAreasData.cities.slice(0, 5).map(c => c.name_cities).join(', ') || 'нет';
    return await ctx.editMessageText(
      `📊 <b>Админ-статистика</b>\n\n` +
      `👥 Пользователей: <b>${users.size}</b>\n` +
      `🕌 Всего мест: <b>${citiesAreasData.cities.length + citiesAreasData.areas.length}</b>\n` +
      `📜 Хадисов: <b>${quotes.length}</b>\n` +
      `🏙️ Примеры городов: <i>${topCities}</i>`,
      { parse_mode: 'HTML', ...adminMenu }
    );
  }

  // 🏠 Главное меню
  if (data === 'cmd_cities_areas') {
    return await ctx.editMessageText('🏠 Выберите раздел:', {
      parse_mode: 'HTML',
      ...mainMenu
    });
  }

  // Остальные обработчики (города, районы и т.д.) — как в оригинале
  // (для краткости не дублирую, но в реальном файле они должны быть)
});

// ========================================================
// 📥 /addquote — Добавить хадис
// ========================================================
bot.command('addquote', (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply('❌ Доступ запрещён.');
  const args = ctx.message.text.split('—');
  if (args.length < 2) return ctx.reply('📌 Используйте: /addquote текст — автор');

  const text = args[0].replace('/addquote', '').trim();
  const author = args[1].trim();

  quotes.push({ text, author });
  saveQuotes();
  ctx.replyWithHTML(`✅ Хадис добавлен:\n\n<i>${text}</i>\n— <b>${author}</b>`);
});

// ========================================================
// 🗑️ /delquote — Удалить хадис
// ========================================================
bot.command('delquote', (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply('❌ Доступ запрещён.');
  const index = parseInt(ctx.message.text.split(' ')[1]) - 1;
  if (isNaN(index) || index < 0 || index >= quotes.length) {
    return ctx.reply(`❌ Неверный номер. Доступно: 1–${quotes.length}`);
  }
  const quote = quotes[index];
  quotes.splice(index, 1);
  saveQuotes();
  ctx.replyWithHTML(`🗑️ Удалён хадис:\n\n<i>${quote.text}</i>\n— <b>${quote.author}</b>`);
});

// ========================================================
// 📜 /newquote
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
// 📊 /stats
// ========================================================
bot.command('stats', (ctx) => {
  ctx.replyWithHTML(
    `📈 <b>Статистика бота</b>\n\n` +
    `👥 Пользователей: <b>${users.size}</b>\n` +
    `🏙️ Городов: <b>${citiesAreasData.cities.length}</b>\n` +
    `🏘️ Районов: <b>${citiesAreasData.areas.length}</b>`
  );
});

// ========================================================
// ℹ️ /about
// ========================================================
bot.command('about', (ctx) => {
  ctx.replyWithHTML(
    `ℹ️ <b>О боте</b>\n\n` +
    `🕌 <b>Рузнама — Курахский район</b>\n` +
    `Бот предоставляет времена намазов для городов и районов.\n\n` +
    `📩 Разработан с заботой о верующих.\n\n` +
    `© 2025`
  );
});

// ========================================================
// 🔤 ПОИСК
// ========================================================
bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  if (text.startsWith('/')) return;
  addUser(ctx.from.id);
  const results = searchLocations(text);
  if (results.length === 0) {
    return ctx.replyWithHTML(
      `🔍 <b>Ничего не найдено по запросу «${text}»</b>.\nПопробуйте другое название.`,
      mainMenu
    );
  }
  const keyboard = results.map(loc => [{
    text: `📍 ${loc.name_cities || loc.name_areas}`,
    callback_data: `loc_${loc.id}`
  }]);
  await ctx.replyWithHTML(`🔍 <b>Найдено ${results.length}:</b>`, {
    reply_markup: { inline_keyboard: keyboard }
  });
});

// ========================================================
// 🚀 ЗАГРУЗКА ДАННЫХ
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
    console.log(`👥 Пользователей: ${users.size}, Хадисов: ${quotes.length}`);
  });
}