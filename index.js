/**
 * 🕌 Рузнама — Бот времён намазов
 *
 * @author Developer
 * @license MIT
 * @version 1.4.0 (с запоминанием последнего места)
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
// 🕐 ФОРМАТИРОВАНИЕ ВРЕМЕНИ (без HTML)
// ========================================================
function fmt(time) {
  return Array.isArray(time) && time.length >= 2
    ? `${String(time[0]).padStart(2, '0')}:${String(time[1]).padStart(2, '0')}`
    : '—';
}

// ========================================================
// 📅 ВРЕМЕНА НА СЕГОДНЯ (новый формат)
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
// 📆 ТАБЛИЦА НА МЕСЯЦ (остаётся без изменений)
// ========================================================
function getPrayerTimesTableForMonth(timesData, monthEn) {
  const monthData = timesData[monthEn];
  if (!monthData) return `❌ Нет данных за <b>${monthEn}</b>`;
  const monthRu = getRussianMonthName(monthEn);
  const monthRuCap = monthRu.charAt(0).toUpperCase() + monthRu.slice(1);
  const col = { day: 2, time: 5 };
  let table = `<pre style="font-family: monospace; white-space: pre;">`;
  table += `Д`.padEnd(col.day + 1) +
           `Фадж.`.padEnd(col.time + 1) +
           `Шур.`.padEnd(col.time + 1) +
           `Зухр`.padEnd(col.time + 1) +
           `Аср`.padEnd(col.time + 1) +
           `Магр.`.padEnd(col.time + 1) +
           `Иша`.padEnd(col.time + 1) + '\n';
  table += '─'.repeat(col.day + col.time * 6 + 6) + '\n';
  for (let d = 1; d <= 31; d++) {
    const dayStr = String(d).padStart(2, '0');
    const dayData = monthData[dayStr];
    let row = d.toString().padEnd(col.day + 1);
    if (dayData) {
      const cleanFmt = (t) => fmt(t).replace(/<\/?code>/g, '').trim();
      row += cleanFmt(dayData.Fajr).padEnd(col.time + 1) +
             cleanFmt(dayData.Sunrise).padEnd(col.time + 1) +
             cleanFmt(dayData.Dhuhr).padEnd(col.time + 1) +
             cleanFmt(dayData.Asr).padEnd(col.time + 1) +
             cleanFmt(dayData.Maghrib).padEnd(col.time + 1) +
             cleanFmt(dayData.Isha).padEnd(col.time + 1);
    } else {
      row += ' '.repeat(col.time * 6 + 6);
    }
    table += row + '\n';
  }
  table += '</pre>';
  return `
🗓️ <b>Намазы — ${monthRuCap}</b>
${table}
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
  // Если есть последнее место — добавляем кнопку
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
// 👥 РАБОТА С ПОЛЬЗОВАТЕЛЯМИ (с last_location_id)
// ========================================================
let users = new Map(); // id → { last_location_id }

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
  addUser(id); // гарантируем наличие
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
      console.log(`✅ Загружено хадисов: ${quotes.length}`);
    } else {
      console.error('❌ quotes.json не найден!');
      quotes = [{ text: 'Хадис временно недоступен.', author: 'Администрация' }];
    }
  } catch (e) {
    console.error('❌ Ошибка загрузки quotes.json:', e.message);
    quotes = [{ text: 'Ошибка загрузки хадиса.', author: 'Администрация' }];
  }
}

function getRandomQuote() {
  if (!quotes.length) return { text: 'Нет доступных хадисов.', author: 'Система' };
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
// 🚀 КОМАНДА /start
// ========================================================
bot.start((ctx) => {
  const userId = ctx.from.id;
  addUser(userId);
  const lastLocationId = getUserLastLocation(userId);
  return ctx.replyWithHTML(
    `🕌 <b>Добро пожаловать в «Рузнама»</b>\n` +
      `«Самое лучшее деяние — это намаз, совершённый в начале отведённого для него времени». (Тирмизи)\n` +
      `📍 Выберите раздел или введите название населённого пункта.\n` +
      `🕋 Благодать начинается с намерения.`,
    getMainMenu(lastLocationId)
  ).catch(console.error);
});

// ========================================================
// 🆘 /help
// ========================================================
bot.command('help', (ctx) => {
  return ctx.replyWithHTML(
    `📘 <b>Справка по боту</b>\n` +
    `• <b>/start</b> — Главное меню\n` +
    `• <b>/help</b> — Помощь\n` +
    `• <b>/stats</b> — Статистика\n` +
    `• <b>/about</b> — О проекте\n` +
    `• <b>/newquote</b> — Новый хадис\n` +
    `• <b>/day</b> — Времена намазов на сегодня\n` +
    `• <b>/month</b> — Таблица на месяц`
  ).catch(console.error);
});

// ========================================================
// 📊 /stats
// ========================================================
bot.command('stats', (ctx) => {
  return ctx.replyWithHTML(
    `📊 <b>Статистика бота</b>\n` +
    `👥 <b>Пользователей:</b> <code>${users.size}</code>\n` +
    `🏙️ <b>Городов:</b> <code>${citiesAreasData.cities.length}</code>\n` +
    `🏘️ <b>Районов:</b> <code>${citiesAreasData.areas.length}</code>\n` +
    `🕌 <b>Всего мест:</b> <code>${citiesAreasData.cities.length + citiesAreasData.areas.length}</code>`
  ).catch(console.error);
});

// ========================================================
// ℹ️ /about
// ========================================================
bot.command('about', (ctx) => {
  return ctx.replyWithHTML(
    `ℹ️ <b>О боте «Рузнама»</b>\n` +
    `🕌 Предоставляет точные времена намазов для городов и районов.\n` +
    `📩 Создан с заботой о верующих.\n` +
    `© 2025 | Разработан с искренним намерением`
  ).catch(console.error);
});

// ========================================================
// 🆕 /newquote
// ========================================================
bot.command('newquote', (ctx) => {
  const q = getRandomQuote();
  return ctx.replyWithHTML(
    `📘 <b>Хадис дня</b>\n` +
    `❝ <i>${q.text}</i> ❞\n` +
    `— <b>${q.author}</b>`
  ).catch(console.error);
});

// ========================================================
// 🕐 /day — заглушка
// ========================================================
bot.command('day', (ctx) => {
  return ctx.replyWithHTML(
    '⏳ Чтобы увидеть времена намазов на сегодня — выберите место через меню или введите название.',
    getMainMenu(getUserLastLocation(ctx.from.id))
  ).catch(console.error);
});

// ========================================================
// 📅 /month — заглушка
// ========================================================
bot.command('month', (ctx) => {
  return ctx.replyWithHTML(
    '📅 Показывает таблицу на текущий месяц. Сначала выберите место.',
    getMainMenu(getUserLastLocation(ctx.from.id))
  ).catch(console.error);
});

// ========================================================
// 🗓️ /year — заглушка
// ========================================================
bot.command('year', (ctx) => {
  return ctx.replyWithHTML('🗓️ Выберите месяц. Сначала укажите место.', getMainMenu(getUserLastLocation(ctx.from.id)))
    .catch(console.error);
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
    return ctx.replyWithHTML(
      `🔍 <b>По запросу «${text}» ничего не найдено.</b>\n` +
      `Проверьте написание или попробуйте другой вариант.`,
      getMainMenu(getUserLastLocation(userId))
    ).catch(console.error);
  }
  const keyboard = results.map((loc) => [
    {
      text: `${loc.name_cities ? '🏙️' : '🏘️'} ${loc.name_cities || loc.name_areas}`,
      callback_data: `loc_${loc.id}`,
    },
  ]);
  await ctx.replyWithHTML(
    `🔍 <b>Найдено ${results.length}:</b>`,
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
        parse_mode: 'HTML',
        ...getMainMenu(getUserLastLocation(userId)),
      });
    }

    // 🏙️ Города
    if (data === 'cmd_cities') {
      if (!citiesAreasData.cities.length) {
        return await ctx.editMessageText('📭 Нет доступных городов.', {
          parse_mode: 'HTML',
          ...getMainMenu(getUserLastLocation(userId)),
        });
      }
      const keyboard = citiesAreasData.cities.map((c) => [
        { text: `🏙️ ${c.name_cities}`, callback_data: `loc_${c.id}` },
      ]);
      keyboard.push([{ text: '⬅️ Назад', callback_data: 'cmd_cities_areas' }]);
      return await ctx.editMessageText('<b>🌆 Города</b>', {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard },
      });
    }

    // 🏘️ Районы
    if (data === 'cmd_areas') {
      if (!citiesAreasData.areas.length) {
        return await ctx.editMessageText('📭 Нет доступных районов.', {
          parse_mode: 'HTML',
          ...getMainMenu(getUserLastLocation(userId)),
        });
      }
      const keyboard = citiesAreasData.areas.map((a) => [
        { text: `🏘️ ${a.name_areas}`, callback_data: `loc_${a.id}` },
      ]);
      keyboard.push([{ text: '⬅️ Назад', callback_data: 'cmd_cities_areas' }]);
      return await ctx.editMessageText('<b>🏘️ Районы</b>', {
        parse_mode: 'HTML',
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
          `⏳ Времена намазов для <b>${name}</b> пока не добавлены.`,
          { parse_mode: 'HTML', ...getMainMenu(id) }
        );
      }
      return await ctx.editMessageText(
        `📍 <b>${name}</b>\nВыберите период:`,
        {
          parse_mode: 'HTML',
          ...getLocationMenu(id),
        }
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
      return await ctx.editMessageText(msg, {
        parse_mode: 'HTML',
        ...getLocationMenu(id),
      });
    }

    // 📅 Месяц (текущий)
    if (data.startsWith('month_')) {
      const id = data.split('_')[1];
      const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(
        (l) => l.id == id
      );
      if (!location) return await ctx.editMessageText('❌ Место не найдено.');
      const timesData = loadTimesById(id);
      if (!timesData) return await ctx.editMessageText('❌ Данные недоступны.', getMainMenu(id));
      const monthEn = getEnglishMonthName('now');
      const msg = getPrayerTimesTableForMonth(timesData, monthEn);
      const name = location.name_cities || location.name_areas;
      return await ctx.editMessageText(
        `📍 <b>${name}</b>\n${msg}`,
        {
          parse_mode: 'HTML',
          ...getLocationMenu(id),
        }
      );
    }

    // 🗓️ Год → выбор месяца
    if (data.startsWith('year_')) {
      const id = data.split('_')[1];
      const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(
        (l) => l.id == id
      );
      if (!location) return await ctx.editMessageText('❌ Место не найдено.');
      const timesData = loadTimesById(id);
      if (!timesData) return await ctx.editMessageText('❌ Данные недоступны.', getMainMenu(id));
      return await ctx.editMessageText('🗓️ Выберите месяц:', getMonthsList(id));
    }

    // 📅 Выбор месяца
    if (data.startsWith('select_month_')) {
      const parts = data.split('_');
      const ruMonth = parts.slice(2, -1).join('_');
      const locationId = parts[parts.length - 1];
      const enMonth = getEnglishMonthName(ruMonth);
      if (!enMonth) return await ctx.editMessageText('❌ Месяц не распознан.', getLocationMenu(locationId));
      const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(
        (l) => l.id == locationId
      );
      if (!location) return await ctx.editMessageText('❌ Место не найдено.');
      const timesData = loadTimesById(locationId);
      if (!timesData) return await ctx.editMessageText('❌ Данные недоступны.', getMainMenu(locationId));
      const msg = getPrayerTimesTableForMonth(timesData, enMonth);
      const name = location.name_cities || location.name_areas;
      return await ctx.editMessageText(
        `📍 <b>${name}</b>\n${msg}`,
        {
          parse_mode: 'HTML',
          ...getLocationMenu(locationId),
        }
      );
    }

    // 🔙 Назад к месту
    if (data.startsWith('back_to_loc_')) {
      const id = data.split('_')[3];
      const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(
        (l) => l.id == id
      );
      if (!location) return await ctx.editMessageText('❌ Место не найдено.');
      const timesData = loadTimesById(id);
      if (!timesData) return await ctx.editMessageText('❌ Данные недоступны.', getMainMenu(id));
      const name = location.name_cities || location.name_areas;
      return await ctx.editMessageText(
        `📍 <b>${name}</b>\nВыберите период:`,
        {
          parse_mode: 'HTML',
          ...getLocationMenu(id),
        }
      );
    }

    // 📜 Хадис дня
    if (data === 'cmd_quote') {
      const q = getRandomQuote();
      return await ctx.editMessageText(
        `📘 <b>Хадис дня</b>\n` +
        `❝ <i>${q.text}</i> ❞\n` +
        `— <b>${q.author}</b>`,
        {
          parse_mode: 'HTML',
          ...getMainMenu(getUserLastLocation(userId)),
        }
      );
    }

    // ℹ️ О боте
    if (data === 'cmd_about') {
      return await ctx.editMessageText(
        `ℹ️ О боте «Рузнама»\n` +

        `🕌 Предоставляет точные времена намазов для городов и районов РД.\n` +
        `📩 Создан с заботой о верующих.\n` +

        `© 2025 | Разработан с искренним намерением`,
        {
          parse_mode: 'HTML',
          ...getMainMenu(getUserLastLocation(userId)),
        }
      );
    }

    // 📊 Статистика
    if (data === 'cmd_stats') {
      return await ctx.editMessageText(
        `📊 <b>Статистика бота</b>\n` +
        `👥 <b>Пользователей:</b> <code>${users.size}</code>\n` +
        `🏙️ <b>Городов:</b> <code>${citiesAreasData.cities.length}</code>\n` +
        `🏘️ <b>Районов:</b> <code>${citiesAreasData.areas.length}</code>\n` +
        `🕌 <b>Всего мест:</b> <code>${citiesAreasData.cities.length + citiesAreasData.areas.length}</code>`,
        {
          parse_mode: 'HTML',
          ...getMainMenu(getUserLastLocation(userId)),
        }
      );
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