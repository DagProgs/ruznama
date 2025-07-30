/**
 * 🕌 Рузнама — Бот времён намазов для Курахского района
 * 
 * @author Developer
 * @license MIT
 * @version 1.2.0 (с рассылкой)
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
const preferencesPath = path.join(process.cwd(), 'users-preferences.json');

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
  return {
    Fajr: dayData.Fajr,
    Sunrise: dayData.Sunrise,
    Dhuhr: dayData.Dhuhr,
    Asr: dayData.Asr,
    Maghrib: dayData.Maghrib,
    Isha: dayData.Isha
  };
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
        [{ text: '🔔 Подписаться', callback_data: `subscribe_${locationId}` }],
        [{ text: '🚫 Отписаться', callback_data: `unsubscribe_${locationId}` }],
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
let userPreferences = new Map(); // userId → { locationId, subscribed }

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
// 🎯 РАБОТА С ПРЕФЕРАНСАМИ (место + подписка)
// ========================================================
function loadPreferences() {
  try {
    if (fs.existsSync(preferencesPath)) {
      const loaded = JSON.parse(fs.readFileSync(preferencesPath, 'utf8'));
      userPreferences = new Map(loaded);
      console.log(`✅ Настройки пользователей загружены: ${userPreferences.size}`);
    }
  } catch (e) {
    console.error('❌ Ошибка загрузки preferences.json:', e.message);
  }
}

function savePreferences() {
  try {
    const serialized = Array.from(userPreferences.entries()).map(([k, v]) => [k, v]);
    fs.writeFileSync(preferencesPath, JSON.stringify(serialized), 'utf8');
  } catch (e) {
    console.error('❌ Ошибка сохранения preferences.json:', e.message);
  }
}

function setPreference(userId, locationId) {
  const id = userId.toString();
  userPreferences.set(id, { locationId, subscribed: true });
  savePreferences();
}

function unsubscribeUser(userId) {
  const id = userId.toString();
  if (userPreferences.has(id)) {
    userPreferences.get(id).subscribed = false;
    savePreferences();
  }
}

function subscribeUser(userId) {
  const id = userId.toString();
  if (userPreferences.has(id)) {
    userPreferences.get(id).subscribed = true;
    savePreferences();
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
// 🚀 КОМАНДА /start
// ========================================================
bot.start((ctx) => {
  addUser(ctx.from.id);
  ctx.replyWithHTML(
    `🕌 <b>Добро пожаловать в «Рузнама»</b>
` +
    `«Самое лучшее деяние — это намаз, совершённый в начале отведённого для него времени». (Тирмизи)
` +
    `📍 Выберите интересующий вас раздел или введите название населённого пункта.`,
    mainMenu
  );
});

// ========================================================
// 🔔 /subscribe
// ========================================================
bot.command('subscribe', (ctx) => {
  const userId = ctx.from.id.toString();
  const pref = userPreferences.get(userId);
  if (!pref || !pref.locationId) {
    return ctx.replyWithHTML('❌ Сначала выберите место через меню.', mainMenu);
  }
  subscribeUser(userId);
  ctx.replyWithHTML('✅ Вы подписались на уведомления за 10 минут до намаза!');
});

// ========================================================
// 🚫 /unsubscribe
// ========================================================
bot.command('unsubscribe', (ctx) => {
  unsubscribeUser(ctx.from.id);
  ctx.replyWithHTML('🔕 Вы отписались от уведомлений.');
});

// ========================================================
// 🆘 /help
// ========================================================
bot.command('help', (ctx) => {
  ctx.replyWithHTML(
    `📘 <b>Справка по боту</b>
` +
    `• /start — Главное меню
` +
    `• /help — Помощь
` +
    `• /stats — Статистика
` +
    `• /about — О проекте
` +
    `• /newquote — Новый хадис
` +
    `• /subscribe — Подписаться на уведомления
` +
    `• /unsubscribe — Отписаться`
  );
});

// ========================================================
// 📊 /stats
// ========================================================
bot.command('stats', (ctx) => {
  ctx.replyWithHTML(
    `📊 <b>Статистика бота</b>
` +
    `👥 Пользователей: <b>${users.size}</b>
` +
    `🏙️ Городов: <b>${citiesAreasData.cities.length}</b>
` +
    `🏘️ Районов: <b>${citiesAreasData.areas.length}</b>
` +
    `🕌 Всего мест: <b>${citiesAreasData.cities.length + citiesAreasData.areas.length}</b>`
  );
});

// ========================================================
// ℹ️ /about
// ========================================================
bot.command('about', (ctx) => {
  ctx.replyWithHTML(
    `ℹ️ <b>О боте «Рузнама»</b>
` +
    `🕌 Предоставляет точные времена намазов для городов и районов Курахского района.
` +
    `📩 Создан с заботой о верующих.
` +
    `© 2025 | Разработан с искренним намерением`
  );
});

// ========================================================
// 🆕 /newquote
// ========================================================
bot.command('newquote', (ctx) => {
  const q = getRandomQuote();
  ctx.replyWithHTML(
    `📘 <b>Хадис дня</b>
` +
    `❝ <i>${q.text}</i> ❞
` +
    `— <b>${q.author}</b>`
  );
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
      `🔍 <b>По запросу «${text}» ничего не найдено.</b>
` +
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
    setPreference(userId, id);
    const name = location.name_cities || location.name_areas;
    return await ctx.editMessageText(
      `📍 <b>${name}</b>
Выберите период:`,
      {
        parse_mode: 'HTML',
        ...getLocationMenu(id)
      }
    );
  }

  // 🔔 Подписаться
  if (data.startsWith('subscribe_')) {
    const id = data.split('_')[1];
    setPreference(userId, id);
    return ctx.editMessageText(`✅ Вы подписались на уведомления.`, getLocationMenu(id));
  }

  // 🚫 Отписаться
  if (data.startsWith('unsubscribe_')) {
    unsubscribeUser(userId);
    const id = data.split('_')[1];
    return ctx.editMessageText(`🔕 Вы отписались.`, getLocationMenu(id));
  }

  // 🕐 Сегодня
  if (data.startsWith('day_')) {
    const id = data.split('_')[1];
    const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
    if (!location) return await ctx.editMessageText('❌ Место не найдено.');
    const timesData = loadTimesById(id);
    if (!timesData) return await ctx.editMessageText('❌ Данные недоступны.', mainMenu);
    const msg = getPrayerTimesForToday(timesData);
    const name = location.name_cities || location.name_areas;
    const text = `
📍 <b>${name}</b>
📅 <b>${new Date().getDate()} ${getRussianMonthName(new Date().toLocaleString('en-GB', { month: 'long' })).replace(/^\w/, c => c.toUpperCase())}</b>
🕌 <b>Фаджр</b>:    <code>${fmt(msg.Fajr)}</code>
🌅 <b>Восход</b>:   <code>${fmt(msg.Sunrise)}</code>
☀️ <b>Зухр</b>:     <code>${fmt(msg.Dhuhr)}</code>
🌇 <b>Аср</b>:      <code>${fmt(msg.Asr)}</code>
🌆 <b>Магриб</b>:   <code>${fmt(msg.Maghrib)}</code>
🌙 <b>Иша</b>:      <code>${fmt(msg.Isha)}</code>
`.trim();
    return await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      ...getLocationMenu(id)
    });
  }

  // 📅 Месяц (текущий)
  if (data.startsWith('month_')) {
    const id = data.split('_')[1];
    const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
    const timesData = loadTimesById(id);
    const monthEn = getEnglishMonthName('now');
    const msg = getPrayerTimesTableForMonth(timesData, monthEn);
    const name = location.name_cities || location.name_areas;
    return await ctx.editMessageText(
      `📍 <b>${name}</b>
${msg}`,
      {
        parse_mode: 'HTML',
        ...getLocationMenu(id)
      }
    );
  }

  // 🗓️ Год → выбор месяца
  if (data.startsWith('year_')) {
    const id = data.split('_')[1];
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
    const timesData = loadTimesById(locationId);
    const msg = getPrayerTimesTableForMonth(timesData, enMonth);
    const name = location.name_cities || location.name_areas;
    return await ctx.editMessageText(
      `📍 <b>${name}</b>
${msg}`,
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
    const name = location.name_cities || location.name_areas;
    return await ctx.editMessageText(
      `📍 <b>${name}</b>
Выберите период:`,
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
      `📘 <b>Хадис дня</b>
` +
      `❝ <i>${q.text}</i> ❞
` +
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
      `ℹ️ <b>О боте «Рузнама»</b>
` +
      `🕌 Предоставляет точные времена намазов для городов и районов Курахского района.
` +
      `📩 Создан с заботой о верующих.
` +
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
      `📊 <b>Статистика бота</b>
` +
      `👥 Пользователей: <b>${users.size}</b>
` +
      `🏙️ Городов: <b>${citiesAreasData.cities.length}</b>
` +
      `🏘️ Районов: <b>${citiesAreasData.areas.length}</b>
` +
      `🕌 Всего мест: <b>${citiesAreasData.cities.length + citiesAreasData.areas.length}</b>`,
      {
        parse_mode: 'HTML',
        ...mainMenu
      }
    );
  }
});

// ========================================================
// 🕰️ РАССЫЛКА ПЕРЕД НАМАЗОМ
// ========================================================
function scheduleDailyNotifications() {
  setInterval(async () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentKey = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    for (const [userId, pref] of userPreferences) {
      if (!pref.subscribed) continue;

      const timesData = loadTimesById(pref.locationId);
      if (!timesData) continue;

      const todayTimes = getPrayerTimesForToday(timesData);
      if (!todayTimes) continue;

      const prayers = {
        'Фаджр': todayTimes.Fajr,
        'Зухр': todayTimes.Dhuhr,
        'Аср': todayTimes.Asr,
        'Магриб': todayTimes.Maghrib,
        'Иша': todayTimes.Isha
      };

      for (const [name, time] of Object.entries(prayers)) {
        if (!time || !Array.isArray(time)) continue;
        const prayerTime = `${String(time[0]).padStart(2, '0')}:${String(time[1]).padStart(2, '0')}`;
        const [pH, pM] = prayerTime.split(':').map(Number);
        const notifyTime = new Date(now);
        notifyTime.setHours(pH, pM - 10, 0, 0); // за 10 минут
        const notifyKey = `${String(notifyTime.getHours()).padStart(2, '0')}:${String(notifyTime.getMinutes()).padStart(2, '0')}`;

        if (currentKey === notifyKey) {
          const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == pref.locationId);
          const locName = location?.name_cities || location?.name_areas || 'Ваше место';
          try {
            await bot.telegram.sendMessage(
              userId,
              `🔔 <b>Через 10 минут ${name}</b>
📍 <i>${locName}</i>
🕰️ Время намаза: <code>${prayerTime}</code>`,
              { parse_mode: 'HTML' }
            );
          } catch (e) {
            console.warn(`⚠️ Не удалось отправить сообщение пользователю ${userId}:`, e.message);
            if (e.description?.includes('blocked')) {
              userPreferences.delete(userId);
              savePreferences();
            }
          }
        }
      }
    }
  }, 60000); // Каждую минуту
}

// ========================================================
// 🚀 ЗАГРУЗКА И ЗАПУСК
// ========================================================
loadUsers();
loadPreferences();
scheduleDailyNotifications();

// ☁️ Vercel Webhook
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

// 💻 ЛОКАЛЬНЫЙ ЗАПУСК
if (process.env.NODE_ENV !== 'production') {
  bot.launch().then(() => {
    console.log('✅ Бот запущен локально');
    console.log(`👥 Пользователей: ${users.size}`);
  });
}