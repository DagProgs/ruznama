/**
 * 🕌 Рузнама — Бот времён намазов РД
 *
 * @author Developer
 * @license MIT
 * @version 1.3.1 (с исправлением запоминания)
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
🌅 <b>Фаджр</b>   —  ${fmt(dayData.Fajr)}
🏞 <b>Шурук</b>   —  ${fmt(dayData.Sunrise)}
🌇 <b>Зухр</b>    —  ${fmt(dayData.Dhuhr)}
🌆 <b>Аср</b>     —  ${fmt(dayData.Asr)}
🌄 <b>Магриб</b>  —  ${fmt(dayData.Maghrib)}
🌃 <b>Иша</b>     —  ${fmt(dayData.Isha)}
🕋 Пусть ваш намаз будет принят.
`.trim();
}

// ========================================================
// 📆 ТАБЛИЦА НА МЕСЯЦ (компактная, узкая, под мобильные)
// ========================================================
function getPrayerTimesTableForMonth(timesData, monthEn) {
  const monthData = timesData[monthEn];
  if (!monthData) return `❌ Нет данных за <b>${monthEn}</b>`;
  const monthRu = getRussianMonthName(monthEn);
  const monthRuCap = monthRu.charAt(0).toUpperCase() + monthRu.slice(1);
  const col = { day: 2, time: 5 }; // Узкие колонки
  let table = `<pre style="font-family: monospace; white-space: pre;">`;
  // Заголовки
  table += `Д`.padEnd(col.day + 1) +
           `Фадж.`.padEnd(col.time + 1) +
           `Шур.`.padEnd(col.time + 1) +
           `Зухр`.padEnd(col.time + 1) +
           `Аср`.padEnd(col.time + 1) +
           `Магр.`.padEnd(col.time + 1) +
           `Иша`.padEnd(col.time + 1) + '\n';
  // Разделитель
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
        [{ text: '📱 Mini App', web_app: { url: 'https://ruznama-hazel.vercel.app/webapp/index.html' } }],
        [{ text: '⬅️ Назад к списку', callback_data: 'cmd_cities_areas' }],
      ],
    },
  };
}

// ========================================================
// 🏠 ГЛАВНОЕ МЕНЮ
// ========================================================
function getMainMenu(userId) {
  const user = [...users].find(u => u.id === userId.toString());
  const lastLocation = user?.last_location;

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

  // Кнопка "Последнее место"
  if (lastLocation) {
    const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == lastLocation);
    if (location) {
      keyboard.unshift([{
        text: `📍 Последнее: ${location.name_cities || location.name_areas}`,
        callback_data: `loc_${lastLocation}`
      }]);
    }
  }

  // Mini App
  keyboard.push([{ text: '📱 Открыть Mini App', web_app: { url: 'https://ruznama-hazel.vercel.app/webapp/index.html' } }]);

  return { reply_markup: { inline_keyboard: keyboard } };
}

// ========================================================
// 👥 РАБОТА С ПОЛЬЗОВАТЕЛЯМИ
// ========================================================
let users = new Set();

function loadUsers() {
  try {
    if (fs.existsSync(usersFilePath)) {
      const loaded = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
      // Если старые данные — это массив строк, конвертируем
      const normalized = loaded.map(u => typeof u === 'string' ? { id: u } : u);
      users = new Set(normalized);
      console.log(`✅ Пользователей загружено: ${users.size}`);
    }
  } catch (e) {
    console.error('❌ Ошибка загрузки users.json:', e.message);
  }
}

function saveUsers() {
  try {
    const serializable = [...users].map(u => typeof u === 'object' ? u : { id: u });
    fs.writeFileSync(usersFilePath, JSON.stringify(serializable, null, 2), 'utf8');
  } catch (e) {
    console.error('❌ Ошибка сохранения users.json:', e.message);
  }
}

function addUser(userId) {
  const id = userId.toString();
  const existing = [...users].find(u => u.id === id);
  if (!existing) {
    users.add({ id });
    console.log(`🆕 Новый пользователь: ${id}`);
    saveUsers();
  }
  return existing || { id };
}

function setLastLocation(userId, locationId) {
  const id = userId.toString();
  const userArray = [...users];
  const user = userArray.find(u => u.id === id);
  if (user) {
    user.last_location = locationId;
  } else {
    users.add({ id, last_location: locationId });
  }
  saveUsers();
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
  const user = addUser(ctx.from.id);
  return ctx.replyWithHTML(
    `🕌 <b>Добро пожаловать в «Рузнама»</b>
` +
      `«Самое лучшее деяние — это намаз, совершённый в начале отведённого для него времени». (Тирмизи)
` +
      `📍 Выберите раздел или введите название населённого пункта.
` +
      `🕋 Благодать начинается с намерения.`,
    getMainMenu(ctx.from.id)
  ).catch(console.error);
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
Проверьте написание или попробуйте другой вариант.`,
      getMainMenu(ctx.from.id)
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
  const user = addUser(userId);

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
        ...getMainMenu(userId),
      });
    }

    // 🏙️ Города
    if (data === 'cmd_cities') {
      if (!citiesAreasData.cities.length) {
        return await ctx.editMessageText('📭 Нет доступных городов.', {
          parse_mode: 'HTML',
          ...getMainMenu(userId),
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
          ...getMainMenu(userId),
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
      const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
      if (!location) return await ctx.editMessageText('❌ Место не найдено.');

      setLastLocation(userId, id); // ✅ Сохраняем

      const timesData = loadTimesById(id);
      const name = location.name_cities || location.name_areas;
      if (!timesData) {
        return await ctx.editMessageText(
          `⏳ Времена намазов для <b>${name}</b> пока не добавлены.`,
          { parse_mode: 'HTML', ...getMainMenu(userId) }
        );
      }
      return await ctx.editMessageText(
        `📍 <b>${name}</b>
Выберите период:`,
        {
          parse_mode: 'HTML',
          ...getLocationMenu(id),
        }
      );
    }

    // 🕐 Сегодня
    if (data.startsWith('day_')) {
      const id = data.split('_')[1];
      setLastLocation(userId, id); // ✅ Сохраняем

      const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
      if (!location) return await ctx.editMessageText('❌ Место не найдено.');
      const timesData = loadTimesById(id);
      if (!timesData) return await ctx.editMessageText('❌ Данные недоступны.', getMainMenu(userId));

      const msg = getPrayerTimesForToday(timesData);
      const name = location.name_cities || location.name_areas;
      return await ctx.editMessageText(
        `📍 <b>${name}</b>
${msg}`,
        {
          parse_mode: 'HTML',
          ...getLocationMenu(id),
        }
      );
    }

    // 📅 Месяц (текущий)
    if (data.startsWith('month_')) {
      const id = data.split('_')[1];
      setLastLocation(userId, id); // ✅ Сохраняем

      const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
      if (!location) return await ctx.editMessageText('❌ Место не найдено.');
      const timesData = loadTimesById(id);
      if (!timesData) return await ctx.editMessageText('❌ Данные недоступны.', getMainMenu(userId));

      const monthEn = getEnglishMonthName('now');
      const msg = getPrayerTimesTableForMonth(timesData, monthEn);
      const name = location.name_cities || location.name_areas;
      return await ctx.editMessageText(
        `📍 <b>${name}</b>
${msg}`,
        {
          parse_mode: 'HTML',
          ...getLocationMenu(id),
        }
      );
    }

    // 🗓️ Год → выбор месяца
    if (data.startsWith('year_')) {
      const id = data.split('_')[1];
      const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
      if (!location) return await ctx.editMessageText('❌ Место не найдено.');
      const timesData = loadTimesById(id);
      if (!timesData) return await ctx.editMessageText('❌ Данные недоступны.', getMainMenu(userId));
      return await ctx.editMessageText('🗓️ Выберите месяц:', getMonthsList(id));
    }

    // 📅 Выбор месяца
    if (data.startsWith('select_month_')) {
      const parts = data.split('_');
      const ruMonth = parts.slice(2, -1).join('_');
      const locationId = parts[parts.length - 1];
      setLastLocation(userId, locationId); // ✅ Сохраняем

      const enMonth = getEnglishMonthName(ruMonth);
      if (!enMonth) return await ctx.editMessageText('❌ Месяц не распознан.', getLocationMenu(locationId));

      const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == locationId);
      if (!location) return await ctx.editMessageText('❌ Место не найдено.');
      const timesData = loadTimesById(locationId);
      if (!timesData) return await ctx.editMessageText('❌ Данные недоступны.', getMainMenu(userId));

      const msg = getPrayerTimesTableForMonth(timesData, enMonth);
      const name = location.name_cities || location.name_areas;
      return await ctx.editMessageText(
        `📍 <b>${name}</b>
${msg}`,
        {
          parse_mode: 'HTML',
          ...getLocationMenu(locationId),
        }
      );
    }

    // 🔙 Назад к месту
    if (data.startsWith('back_to_loc_')) {
      const id = data.split('_')[3];
      const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
      if (!location) return await ctx.editMessageText('❌ Место не найдено.');
      const timesData = loadTimesById(id);
      if (!timesData) return await ctx.editMessageText('❌ Данные недоступны.', getMainMenu(userId));

      const name = location.name_cities || location.name_areas;
      return await ctx.editMessageText(
        `📍 <b>${name}</b>
Выберите период:`,
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
        `📘 <b>Хадис дня</b>
❝ <i>${q.text}</i> ❞
— <b>${q.author}</b>`,
        {
          parse_mode: 'HTML',
          ...getMainMenu(userId),
        }
      );
    }

    // ℹ️ О боте
    if (data === 'cmd_about') {
      return await ctx.editMessageText(
        `ℹ️ <b>О боте «Рузнама»</b>
🕌 Предоставляет точные времена намазов для городов и районов РД.
📩 Создан с заботой о верующих.
© 2025 | Разработан с искренним намерением`,
        {
          parse_mode: 'HTML',
          ...getMainMenu(userId),
        }
      );
    }

    // 📊 Статистика
    if (data === 'cmd_stats') {
      return await ctx.editMessageText(
        `📊 <b>Статистика бота</b>
👥 <b>Пользователей:</b> <code>${users.size}</code>
🏙️ <b>Городов:</b> <code>${citiesAreasData.cities.length}</code>
🏘️ <b>Районов:</b> <code>${citiesAreasData.areas.length}</code>
🕌 <b>Всего мест:</b> <code>${citiesAreasData.cities.length + citiesAreasData.areas.length}</code>`,
        {
          parse_mode: 'HTML',
          ...getMainMenu(userId),
        }
      );
    }

  } catch (err) {
    console.error('❌ Ошибка при обработке callback:', err.message);
    try {
      await ctx.editMessageText('❌ Произошла ошибка. Попробуйте позже.', getMainMenu(userId));
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