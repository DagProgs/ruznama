const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');

// === 🛑 ПРОВЕРКА ТОКЕНА ===
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error('❌ ОШИБКА: BOT_TOKEN не установлен в переменных окружения!');

const bot = new Telegraf(BOT_TOKEN);

// === 📁 ПУТИ К ФАЙЛАМ ===
const citiesAreasPath = path.join(__dirname, 'db', 'cities-areas.json');
const timesDir = path.join(__dirname, 'db', 'cities-areas');
const usersFilePath = path.join(__dirname, 'users.json');

// === 🌍 ДАННЫЕ ГОРОДОВ И РАЙОНОВ ===
let citiesAreasData = { cities: [], areas: [] };
try {
  if (fs.existsSync(citiesAreasPath)) {
    citiesAreasData = JSON.parse(fs.readFileSync(citiesAreasPath, 'utf8'));
  } else {
    console.warn('⚠️ Файл cities-areas.json не найден');
  }
} catch (e) {
  console.error('❌ Ошибка чтения cities-areas.json:', e.message);
}

// === 📆 МАППИНГ МЕСЯЦЕВ (РУС → АНГЛ) ===
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
  const entry = Object.entries(russianToEnglishMonth).find(([_, en]) => en === enMonth);
  return entry ? entry[0] : enMonth;
}

// === 🕰️ ЗАГРУЗКА ВРЕМЁН ПО ID ===
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

// === 🕐 ФОРМАТИРОВАНИЕ ВРЕМЕНИ ===
function fmt(time) {
  return Array.isArray(time) && time.length >= 2
    ? `${String(time[0]).padStart(2, '0')}:${String(time[1]).padStart(2, '0')}`
    : '—';
}

// === 📅 ВРЕМЕНА НА СЕГОДНЯ ===
function getPrayerTimesForToday(timesData) {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const monthEn = now.toLocaleString('en-GB', { month: 'long' });
  const monthRu = getRussianMonthName(monthEn);
  const monthRuCap = monthRu.charAt(0).toUpperCase() + monthRu.slice(1);

  const monthData = timesData[monthEn];
  if (!monthData) return `❌ Нет данных за ${monthEn}`;

  const dayData = monthData[day];
  if (!dayData) return `❌ Нет данных на ${day} ${monthRuCap}`;

  return `
🕌 <b>Времена намазов на сегодня</b>
📅 <i>${day} ${monthRuCap}</i>

🕋 <b>Фаджр</b>:    <code>${fmt(dayData.Fajr)}</code>
🌅 <b>Восход</b>:   <code>${fmt(dayData.Sunrise)}</code>
☀️ <b>Зухр</b>:     <code>${fmt(dayData.Dhuhr)}</code>
🌇 <b>Аср</b>:      <code>${fmt(dayData.Asr)}</code>
🌆 <b>Магриб</b>:   <code>${fmt(dayData.Maghrib)}</code>
🌙 <b>Иша</b>:      <code>${fmt(dayData.Isha)}</code>
`;
}

// === 📆 ТАБЛИЦА НА МЕСЯЦ ===
function getPrayerTimesTableForMonth(timesData, monthEn) {
  const monthData = timesData[monthEn];
  if (!monthData) return `❌ Нет данных за ${monthEn}`;

  const monthRu = getRussianMonthName(monthEn);
  const monthRuCap = monthRu.charAt(0).toUpperCase() + monthRu.slice(1);

  const dayW = 3;
  const timeW = 5;

  let header = `🕌 Времена намазов\n📅 <b>${monthRuCap}</b>\n\n`;

  let table = `<pre>`;
  table += `День`.padEnd(dayW + 1, ' ') +
           `Фаджр`.padEnd(timeW + 1, ' ') +
           `Восх`.padEnd(timeW + 1, ' ') +
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
  return header + table;
}

// === 🗓️ КЛАВИАТУРА: СПИСОК МЕСЯЦЕВ (с ID) ===
function getMonthsList(locationId) {
  const keyboard = Object.keys(russianToEnglishMonth)
    .map(month => ({
      text: month.charAt(0).toUpperCase() + month.slice(1),
      callback_data: `select_month_${month}_${locationId}`
    }))
    .reduce((acc, btn, index) => {
      if (index % 3 === 0) acc.push([]);
      acc[acc.length - 1].push(btn);
      return acc;
    }, []);

  keyboard.push([{ text: '⬅️ Назад', callback_data: `back_to_loc_${locationId}` }]);

  return { reply_markup: { inline_keyboard: keyboard } };
}

// === 📍 КЛАВИАТУРА МЕСТА ===
function getLocationMenu(locationId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🕌 Сегодня', callback_data: `day_${locationId}` }],
        [{ text: '📅 Месяц', callback_data: `month_${locationId}` }],
        [{ text: '🗓️ Год', callback_data: `year_${locationId}` }],
        [{ text: '⬅️ Назад', callback_data: 'cmd_cities_areas' }]
      ]
    }
  };
}

// === 🏠 ГЛАВНОЕ МЕНЮ ===
const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '🏙️ Города', callback_data: 'cmd_cities' }],
      [{ text: '🏘️ Районы', callback_data: 'cmd_areas' }],
      [{ text: '📖 Хадис дня', callback_data: 'cmd_quote' }]
    ]
  }
};

// === 👥 РАБОТА С ПОЛЬЗОВАТЕЛЯМИ ===
let users = new Set();

function loadUsers() {
  try {
    if (fs.existsSync(usersFilePath)) {
      users = new Set(JSON.parse(fs.readFileSync(usersFilePath, 'utf8')));
      console.log(`✅ Загружено пользователей: ${users.size}`);
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

// === 📜 ХАДИС ===
const quotes = require('./quotes.json');

function getRandomQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

// === 🔍 ПОИСК ГОРОДА/РАЙОНА ===
function searchLocations(query) {
  const allLocations = [...citiesAreasData.cities, ...citiesAreasData.areas];
  const lowerQuery = query.toLowerCase().trim();
  return allLocations
    .filter(loc => {
      const name = (loc.name_cities || loc.name_areas || '').toLowerCase();
      return name.includes(lowerQuery);
    })
    .slice(0, 10);
}

// === 🚀 КОМАНДА /start ===
bot.start((ctx) => {
  addUser(ctx.from.id);
  ctx.replyWithHTML(
    `🕌 <b>Рузнама — Курахский район</b>\n\n` +
    `«Самое лучшее деяние — это намаз, совершённый в начале отведённого для него времени». (Тирмизи)\n\n` +
    `🔍 Выберите команду или введите название города/района:`,
    mainMenu
  );
});

// === 🔤 ОБРАБОТКА ТЕКСТА (ПОИСК) ===
bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  const userId = ctx.from.id;

  if (text.startsWith('/')) return;

  addUser(userId);

  const results = searchLocations(text);
  if (results.length === 0) {
    return ctx.replyWithHTML(
      `🔍 <b>По запросу «${text}» ничего не найдено.</b>\n` +
      `Попробуйте ввести другое название.`,
      mainMenu
    );
  }

  const keyboard = results.map(loc => [{
    text: `📍 ${loc.name_cities || loc.name_areas}`,
    callback_data: `loc_${loc.id}`
  }]);

  keyboard.push([{ text: '🏠 Главное меню', callback_data: 'cmd_cities_areas' }]);

  await ctx.replyWithHTML(
    `🔍 <b>Найдено ${results.length} результатов:</b>`,
    { reply_markup: { inline_keyboard: keyboard } }
  );
});

// === 🔘 ОБРАБОТКА КНОПОК ===
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.callbackQuery.from.id;

  addUser(userId);

  try {
    await ctx.answerCbQuery();
  } catch (e) {
    console.warn('⚠️ Не удалось ответить на callback:', e.message);
  }

  // === 🔙 Главное меню ===
  if (data === 'cmd_cities_areas') {
    return await ctx.editMessageText('🏠 Выберите раздел:', mainMenu);
  }

  // === 🏙️ Города ===
  if (data === 'cmd_cities') {
    if (!citiesAreasData.cities.length) {
      return await ctx.editMessageText('📭 Нет доступных городов.', mainMenu);
    }

    const keyboard = citiesAreasData.cities.map(c => [{
      text: `🏙️ ${c.name_cities}`,
      callback_data: `loc_${c.id}`
    }]);
    keyboard.push([{ text: '⬅️ Назад', callback_data: 'cmd_cities_areas' }]);

    return await ctx.editMessageText('<b>🌆 Список городов:</b>', {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // === 🏘️ Районы ===
  if (data === 'cmd_areas') {
    if (!citiesAreasData.areas.length) {
      return await ctx.editMessageText('📭 Нет доступных районов.', mainMenu);
    }

    const keyboard = citiesAreasData.areas.map(a => [{
      text: `🏘️ ${a.name_areas}`,
      callback_data: `loc_${a.id}`
    }]);
    keyboard.push([{ text: '⬅️ Назад', callback_data: 'cmd_cities_areas' }]);

    return await ctx.editMessageText('<b>🏘️ Список районов:</b>', {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // === 📍 Выбор места ===
  if (data.startsWith('loc_')) {
    const id = data.split('_')[1];
    const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
    if (!location) return await ctx.editMessageText('❌ Место не найдено.');

    const timesData = loadTimesById(id);
    if (!timesData) {
      return await ctx.editMessageText(
        `⏳ Времена намазов для <b>${location.name_cities || location.name_areas}</b> пока не добавлены.`,
        mainMenu
      );
    }

    const name = location.name_cities || location.name_areas;
    return await ctx.editMessageText(
      `📍 <b>Вы выбрали: ${name}</b>\nВыберите период:`,
      {
        parse_mode: 'HTML',
        ...getLocationMenu(id)
      }
    );
  }

  // === 🕐 Сегодня ===
  if (data.startsWith('day_')) {
    const id = data.split('_')[1];
    const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
    if (!location) return await ctx.editMessageText('❌ Место не найдено.');

    const timesData = loadTimesById(id);
    if (!timesData) return await ctx.editMessageText('❌ Данные недоступны.', mainMenu);

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

  // === 📅 Месяц (текущий) ===
  if (data.startsWith('month_')) {
    const id = data.split('_')[1];
    const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
    if (!location) return await ctx.editMessageText('❌ Место не найдено.');

    const timesData = loadTimesById(id);
    if (!timesData) return await ctx.editMessageText('❌ Данные недоступны.', mainMenu);

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

  // === 🗓️ Год — выбор месяца ===
  if (data.startsWith('year_')) {
    const id = data.split('_')[1];
    const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
    if (!location) return await ctx.editMessageText('❌ Место не найдено.');

    const timesData = loadTimesById(id);
    if (!timesData) return await ctx.editMessageText('❌ Данные недоступны.', mainMenu);

    return await ctx.editMessageText('🗓️ Выберите месяц:', getMonthsList(id));
  }

  // === 📅 Выбор месяца ===
  if (data.startsWith('select_month_')) {
    const parts = data.split('_');
    const ruMonth = parts.slice(2, -1).join('_'); // поддержка составных имён (например, "ноябрь")
    const locationId = parts[parts.length - 1];

    const enMonth = getEnglishMonthName(ruMonth);
    if (!enMonth) return await ctx.editMessageText('❌ Месяц не распознан.', getLocationMenu(locationId));

    const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == locationId);
    if (!location) return await ctx.editMessageText('❌ Место не найдено.');

    const timesData = loadTimesById(locationId);
    if (!timesData) return await ctx.editMessageText('❌ Данные недоступны.', mainMenu);

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

  // === 🔙 Назад к месту ===
  if (data.startsWith('back_to_loc_')) {
    const id = data.split('_')[3];
    const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
    if (!location) return await ctx.editMessageText('❌ Место не найдено.');

    const timesData = loadTimesById(id);
    if (!timesData) return await ctx.editMessageText('❌ Данные недоступны.', mainMenu);

    const name = location.name_cities || location.name_areas;
    return await ctx.editMessageText(
      `📍 <b>${name}</b>\nВыберите период:`,
      {
        parse_mode: 'HTML',
        ...getLocationMenu(id)
      }
    );
  }

  // === 📜 Хадис дня ===
  if (data === 'cmd_quote') {
    const q = getRandomQuote();
    return await ctx.editMessageText(
      `📘 <b>Хадис дня</b>\n\n❝ ${q.text} ❞\n\n— <i>${q.author}</i>`,
      mainMenu
    );
  }
});

// === 🚀 ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ ===
loadUsers();

// === ☁️ Vercel Webhook ===
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const body = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => data += chunk);
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
};

// === 💻 ЛОКАЛЬНЫЙ ЗАПУСК ===
if (process.env.NODE_ENV !== 'production') {
  bot.launch().then(() => {
    console.log('✅ Бот запущен локально');
    console.log(`👥 Пользователей: ${users.size}`);
  });
}