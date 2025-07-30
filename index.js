/**
 * 🕌 Рузнама — Бот времён намазов
 *
 * @author Developer
 * @license MIT
 * @version 1.4.0 (с уведомлениями)
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
// 🕐 ФОРМАТИРОВАНИЕ ВРЕМЕНИ
// ========================================================
function fmt(time) {
  return Array.isArray(time) && time.length >= 2
    ? `<code>${String(time[0]).padStart(2, '0')}:${String(time[1]).padStart(2, '0')}</code>`
    : '<code>—</code>';
}

// ========================================================
// 📅 ВРЕМЕНА НА СЕГОДНЯ (с красивым оформлением)
// ========================================================
function getPrayerTimesForToday(timesData) {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const monthEn = now.toLocaleString('en-GB', { month: 'long' });
  const monthRu = getRussianMonthName(monthEn);
  const monthRuCap = monthRu.charAt(0).toUpperCase() + monthRu.slice(1);

  const monthData = timesData[monthEn];
  if (!monthData) return `❌ Нет данных за <b>${monthRuCap}</b>`;

  const dayData = monthData[day];
  if (!dayData) return `❌ Нет данных на <b>${day} ${monthRuCap}</b>`;

  return `
✨ <b>Времена намазов на сегодня</b>
📅 <i>${day} ${monthRuCap}</i>

🕌 <b>Фаджр</b>   —  ${fmt(dayData.Fajr)}
🌅 <b>Шурук</b>   —  ${fmt(dayData.Sunrise)}
☀️ <b>Зухр</b>    —  ${fmt(dayData.Dhuhr)}
🌇 <b>Аср</b>     —  ${fmt(dayData.Asr)}
🌆 <b>Магриб</b>  —  ${fmt(dayData.Maghrib)}
🌙 <b>Иша</b>     —  ${fmt(dayData.Isha)}

🕋 Пусть ваш намаз будет принят.
`.trim();
}

// ========================================================
// 📆 ТАБЛИЦА НА МЕСЯЦ (красиво выровненная)
// ========================================================
function getPrayerTimesTableForMonth(timesData, monthEn) {
  const monthData = timesData[monthEn];
  if (!monthData) return `❌ Нет данных за <b>${monthEn}</b>`;

  const monthRu = getRussianMonthName(monthEn);
  const monthRuCap = monthRu.charAt(0).toUpperCase() + monthRu.slice(1);

  const col = { day: 3, time: 6 };
  let table = `<pre>`;
  table += `Д`.padEnd(col.day + 1) +
           `Фаджр`.padEnd(col.time + 1) +
           `Шурук`.padEnd(col.time + 1) +
           `Зухр`.padEnd(col.time + 1) +
           `Аср`.padEnd(col.time + 1) +
           `Магр`.padEnd(col.time + 1) +
           `Иша`.padEnd(col.time + 1) + '\n';
  table += '─'.repeat(col.day + col.time * 6 + 6) + '\n';

  for (let d = 1; d <= 31; d++) {
    const dayStr = String(d).padStart(2, '0');
    const dayData = monthData[dayStr];
    let row = d.toString().padEnd(col.day + 1);

    if (dayData) {
      row += fmt(dayData.Fajr).replace(/<\/?code>/g, '').padEnd(col.time + 1) +
             fmt(dayData.Sunrise).replace(/<\/?code>/g, '').padEnd(col.time + 1) +
             fmt(dayData.Dhuhr).replace(/<\/?code>/g, '').padEnd(col.time + 1) +
             fmt(dayData.Asr).replace(/<\/?code>/g, '').padEnd(col.time + 1) +
             fmt(dayData.Maghrib).replace(/<\/?code>/g, '').padEnd(col.time + 1) +
             fmt(dayData.Isha).replace(/<\/?code>/g, '').padEnd(col.time + 1);
    } else {
      row += ' '.repeat(col.time * 6 + 5);
    }
    table += row + '\n';
  }
  table += '</pre>';

  return `
🗓️ <b>Таблица намазов — ${monthRuCap}</b>

${table}

🕌 Времена указаны по месту. <i>Точность — залог правильности.</i>
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
// 📍 МЕНЮ МЕСТА (с разделителями и иконками)
// ========================================================
function getLocationMenu(locationId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🕌 Сегодня', callback_data: `day_${locationId}` }],
        [{ text: '📅 Текущий месяц', callback_data: `month_${locationId}` }],
        [{ text: '🗓️ Выбрать месяц', callback_data: `year_${locationId}` }],
        [],
        [{ text: '🔔 Уведомления', callback_data: `notify_setup_${locationId}` }],
        [{ text: '⬅️ Назад к списку', callback_data: 'cmd_cities_areas' }],
      ],
    },
  };
}

// ========================================================
// 📣 МЕНЮ УВЕДОМЛЕНИЙ
// ========================================================
function getNotifyMenu(locationId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Включить уведомления', callback_data: `notify_on_${locationId}` }],
        [{ text: '❌ Выключить уведомления', callback_data: `notify_off_${locationId}` }],
        [{ text: '⬅️ Назад', callback_data: `loc_${locationId}` }],
      ],
    },
  };
}

// ========================================================
// 🏠 ГЛАВНОЕ МЕНЮ (с выравниванием и пробелами)
// ========================================================
const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '🏙️ Города', callback_data: 'cmd_cities' },
        { text: '🏘️ Районы', callback_data: 'cmd_areas' },
      ],
      [{ text: '📖 Хадис дня', callback_data: 'cmd_quote' }],
      [
        { text: 'ℹ️ О боте', callback_data: 'cmd_about' },
        { text: '📊 Статистика', callback_data: 'cmd_stats' },
      ],
    ],
  },
};

// ========================================================
// 👥 РАБОТА С ПОЛЬЗОВАТЕЛЯМИ
// ========================================================
let users = new Set();
let userSettings = {}; // { userId: { notify: true, locationId: 123 } }
let activeTimers = {}; // { userId: { Fajr: timer, Dhuhr: timer, ... } }

function loadUsers() {
  try {
    if (fs.existsSync(usersFilePath)) {
      const loaded = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
      users = new Set(loaded.users || []);
      userSettings = loaded.settings || {};
      console.log(`✅ Пользователей: ${users.size}, Настроек: ${Object.keys(userSettings).length}`);
    }
  } catch (e) {
    console.error('❌ Ошибка загрузки users.json:', e.message);
  }
}

function saveUsers() {
  try {
    const data = {
      users: [...users],
      settings: userSettings,
    };
    fs.writeFileSync(usersFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('❌ Ошибка сохранения users.json:', e.message);
  }
}

function addUser(userId) {
  const id = userId.toString();
  if (!users.has(id)) {
    users.add(id);
    userSettings[id] = { notify: false, locationId: null };
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
// 🕰️ Утилита: Преобразование времени в Date
// ========================================================
function timeToDate(dayTime, date = new Date()) {
  if (!Array.isArray(dayTime) || dayTime.length < 2) return null;
  const [hours, minutes] = dayTime;
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

// ========================================================
// ⏰ УСТАНОВКА УВЕДОМЛЕНИЙ
// ========================================================
function scheduleNotifications(userId, locationId) {
  const timesData = loadTimesById(locationId);
  if (!timesData) return;

  const now = new Date();
  const monthEn = now.toLocaleString('en-GB', { month: 'long' });
  const day = String(now.getDate()).padStart(2, '0');
  const monthData = timesData[monthEn];
  const dayData = monthData?.[day];
  if (!dayData) return;

  // Очищаем старые таймеры
  if (activeTimers[userId]) {
    Object.values(activeTimers[userId]).forEach(clearTimeout);
  }
  activeTimers[userId] = {};

  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == locationId);
  const name = location?.name_cities || location?.name_areas || 'вашем месте';

  prayers.forEach(prayer => {
    const time = dayData[prayer];
    if (!time || !Array.isArray(time)) return;

    const prayerTime = timeToDate(time, now);
    const notifyTime = new Date(prayerTime.getTime() - 5 * 60 * 1000); // за 5 минут
    if (notifyTime < now) return; // уже прошло

    const timer = setTimeout(async () => {
      try {
        await bot.telegram.sendMessage(
          userId,
          `🔔 <b>Уведомление о намазе</b>\n\n` +
          `🕌 Скоро начнётся <b>${prayerName(prayer)}</b> в <b>${name}</b>!\n` +
          `⏰ Время: <code>${fmt(time)}</code>\n\n` +
          `🕋 Приготовьтесь к совершению намаза.`,
          { parse_mode: 'HTML' }
        );
      } catch (err) {
        console.error(`❌ Ошибка отправки уведомления ${userId}:`, err.message);
        userSettings[userId].notify = false;
        saveUsers();
      }
    }, notifyTime - now);

    activeTimers[userId][prayer] = timer;
  });

  console.log(`✅ Уведомления запланированы для пользователя ${userId}`);
}

// Утилита: название намаза
function prayerName(key) {
  return {
    Fajr: 'Фаджр',
    Sunrise: 'Шурук',
    Dhuhr: 'Зухр',
    Asr: 'Аср',
    Maghrib: 'Магриб',
    Isha: 'Иша'
  }[key] || key;
}

// ========================================================
// 🚀 КОМАНДА /start
// ========================================================
bot.start((ctx) => {
  addUser(ctx.from.id);
  return ctx.replyWithHTML(
    `🕌 <b>Добро пожаловать в «Рузнама»</b>\n\n` +
      `«Самое лучшее деяние — это намаз, совершённый в начале отведённого для него времени». (Тирмизи)\n\n` +
      `📍 Выберите раздел или введите название населённого пункта.\n\n` +
      `🕋 Благодать начинается с намерения.`,
    mainMenu
  ).catch(console.error);
});

// ========================================================
// 🆘 /help
// ========================================================
bot.command('help', (ctx) => {
  return ctx.replyWithHTML(
    `📘 <b>Справка по боту</b>\n\n` +
      `• <b>/start</b> — Главное меню\n` +
      `• <b>/help</b> — Помощь\n` +
      `• <b>/stats</b> — Статистика\n` +
      `• <b>/about</b> — О проекте\n` +
      `• <b>/newquote</b> — Новый хадис\n` +
      `• <b>/day</b> — Времена намазов на сегодня\n` +
      `• <b>/month</b> — Таблица на месяц\n` +
      `• <b>/notify</b> — Управление уведомлениями`
  ).catch(console.error);
});

// ========================================================
// 📣 /notify — Управление уведомлениями
// ========================================================
bot.command('notify', (ctx) => {
  addUser(ctx.from.id);
  const userId = ctx.from.id.toString();
  const setting = userSettings[userId] || { notify: false, locationId: null };

  let msg = `🔔 <b>Управление уведомлениями</b>\n\n`;
  if (setting.notify && setting.locationId) {
    const loc = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == setting.locationId);
    const name = loc?.name_cities || loc?.name_areas || 'неизвестно';
    msg += `✅ Уведомления <b>включены</b> для:\n📍 <b>${name}</b>`;
  } else {
    msg += `❌ Уведомления <b>выключены</b>.`;
  }

  return ctx.replyWithHTML(msg, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📍 Выбрать место', callback_data: 'cmd_cities_areas_notify' }],
        [{ text: '⬅️ Назад в меню', callback_data: 'cmd_cities_areas' }],
      ],
    },
  }).catch(console.error);
});

// ========================================================
// 🔔 ОБРАБОТКА УВЕДОМЛЕНИЙ
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
    // 📍 Установка уведомлений
    if (data === 'cmd_cities_areas_notify') {
      return await ctx.editMessageText('📍 Выберите место для уведомлений:', {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏙️ Города', callback_data: 'cmd_cities_notify' }],
            [{ text: '🏘️ Районы', callback_data: 'cmd_areas_notify' }],
            [{ text: '⬅️ Назад', callback_data: 'cmd_cities_areas' }],
          ],
        },
      });
    }

    if (data === 'cmd_cities_notify') {
      const keyboard = citiesAreasData.cities.map((c) => [
        { text: `🏙️ ${c.name_cities}`, callback_data: `notify_loc_${c.id}` },
      ]);
      keyboard.push([{ text: '⬅️ Назад', callback_data: 'cmd_cities_areas_notify' }]);
      return await ctx.editMessageText('<b>🌆 Города</b>', {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard },
      });
    }

    if (data === 'cmd_areas_notify') {
      const keyboard = citiesAreasData.areas.map((a) => [
        { text: `🏘️ ${a.name_areas}`, callback_data: `notify_loc_${a.id}` },
      ]);
      keyboard.push([{ text: '⬅️ Назад', callback_data: 'cmd_cities_areas_notify' }]);
      return await ctx.editMessageText('<b>🏘️ Районы</b>', {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard },
      });
    }

    if (data.startsWith('notify_loc_')) {
      const id = data.split('_')[2];
      const userIdStr = userId.toString();
      userSettings[userIdStr] = { ...userSettings[userIdStr], locationId: id };
      saveUsers();

      return await ctx.editMessageText(
        `📍 Место установлено. Что дальше?`,
        getNotifyMenu(id)
      );
    }

    if (data.startsWith('notify_setup_')) {
      const id = data.split('_')[2];
      return await ctx.editMessageText(
        `🔔 Управление уведомлениями для этого места`,
        getNotifyMenu(id)
      );
    }

    if (data.startsWith('notify_on_')) {
      const id = data.split('_')[2];
      const userIdStr = userId.toString();
      userSettings[userIdStr] = { notify: true, locationId: id };
      saveUsers();
      scheduleNotifications(userId, id);

      return await ctx.editMessageText(
        `✅ Уведомления включены! Вы будете получать напоминания за 5 минут до каждого намаза.`,
        getLocationMenu(id)
      );
    }

    if (data.startsWith('notify_off_')) {
      const id = data.split('_')[2];
      const userIdStr = userId.toString();
      userSettings[userIdStr] = { ...userSettings[userIdStr], notify: false };
      saveUsers();

      if (activeTimers[userIdStr]) {
        Object.values(activeTimers[userIdStr]).forEach(clearTimeout);
        delete activeTimers[userIdStr];
      }

      return await ctx.editMessageText(
        `❌ Уведомления выключены.`,
        getLocationMenu(id)
      );
    }

    // Остальные обработчики (ваш существующий код)
    // ... (остальные if-блоки остаются без изменений)

  } catch (err) {
    console.error('❌ Ошибка при обработке callback:', err.message);
    try {
      await ctx.editMessageText('❌ Произошла ошибка. Попробуйте позже.', mainMenu);
    } catch (e) {
      console.warn('Не удалось отправить сообщение об ошибке');
    }
  }
});

// ========================================================
// 🚀 ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ
// ========================================================
loadUsers();

// 🔄 Перезапуск уведомлений при старте
Object.keys(userSettings).forEach(userId => {
  if (userSettings[userId].notify && userSettings[userId].locationId) {
    scheduleNotifications(userId, userSettings[userId].locationId);
  }
});

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