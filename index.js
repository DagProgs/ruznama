const { Telegraf } = require('telegraf');
const quotes = require('./quotes.json');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN не установлен');
}

const bot = new Telegraf(BOT_TOKEN);

// Загрузка данных городов и районов
const citiesAreasPath = path.join(__dirname, 'db', 'cities-areas.json');
let citiesAreasData = { cities: [], areas: [] };

try {
  if (fs.existsSync(citiesAreasPath)) {
    const data = fs.readFileSync(citiesAreasPath, 'utf8');
    citiesAreasData = JSON.parse(data);
  } else {
    console.warn('Файл cities-areas.json не найден в папке db');
  }
} catch (e) {
  console.error('Ошибка чтения cities-areas.json:', e);
}

// Маппинг месяцев
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

function getEnglishMonthName(russianNameOrNow = 'now') {
  if (russianNameOrNow === 'now') {
    const now = new Date();
    return now.toLocaleString('en-GB', { month: 'long' });
  } else {
    const lower = russianNameOrNow.toLowerCase();
    for (const [ru, en] of Object.entries(russianToEnglishMonth)) {
      if (ru === lower) return en;
    }
    return null;
  }
}

function getRussianMonthName(englishName) {
  for (const [ru, en] of Object.entries(russianToEnglishMonth)) {
    if (en === englishName) return ru;
  }
  return englishName;
}

// Путь к папке с временами по ID
const timesDir = path.join(__dirname, 'db', 'cities-areas');

function loadTimesById(id) {
  const filePath = path.join(timesDir, `${id}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } else {
      return null;
    }
  } catch (e) {
    console.error(`Ошибка загрузки данных для ID ${id}:`, e);
    return null;
  }
}

// Формат времени
function fmt(timeArr) {
  return timeArr && timeArr.length >= 2
    ? `${String(timeArr[0]).padStart(2, '0')}:${String(timeArr[1]).padStart(2, '0')}`
    : '--:--';
}

// Время на сегодня
function getPrayerTimesForToday(timesData) {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const monthEn = now.toLocaleString('en-GB', { month: 'long' });
  const monthRu = now.toLocaleString('ru-RU', { month: 'long' });
  const monthRuCap = monthRu.charAt(0).toUpperCase() + monthRu.slice(1);

  const monthData = timesData[monthEn];
  if (!monthData) return `❌ Нет данных за ${monthEn}`;
  const dayData = monthData[day];
  if (!dayData) return `❌ Нет данных на ${day} ${monthRuCap}`;

  return `
📅 ${day} ${monthRuCap}
🏙 Фаджр: ${fmt(dayData.Fajr)}
🌅 Восход: ${fmt(dayData.Sunrise)}
🌇 Зухр: ${fmt(dayData.Dhuhr)}
🌆 Аср: ${fmt(dayData.Asr)}
🏙 Магриб: ${fmt(dayData.Maghrib)}
🌃 Иша: ${fmt(dayData.Isha)}
  `;
}

// Таблица на месяц
function getPrayerTimesTableForMonth(timesData, monthEn) {
  const monthData = timesData[monthEn];
  if (!monthData) return `❌ Нет данных за ${monthEn}`;
  const monthRu = getRussianMonthName(monthEn);
  const monthRuCap = monthRu.charAt(0).toUpperCase() + monthRu.slice(1);
  const dayW = 4;
  const timeW = 5;

  let header = `Времена намазов на ${monthRuCap}\n`;
  let colHeader = `<pre>` +
    'День'.padEnd(dayW, ' ') + '│' +
    'Фаджр'.padEnd(timeW, ' ') + '│' +
    'Восх.'.padEnd(timeW, ' ') + '│' +
    'Зухр'.padEnd(timeW, ' ') + '│' +
    'Аср'.padEnd(timeW, ' ') + '│' +
    'Магр.'.padEnd(timeW, ' ') + '│' +
    'Иша'.padEnd(timeW, ' ') + '\n' +
    ''.padEnd(dayW + 1 + timeW * 6 + 6, '─') + '\n';

  let body = '';
  for (let d = 1; d <= 31; d++) {
    const dayStr = String(d).padStart(2, '0');
    const dayData = monthData[dayStr];
    let row = d.toString().padEnd(dayW, ' ') + '│';
    if (dayData) {
      row += fmt(dayData.Fajr).padEnd(timeW, ' ') + '│' +
             fmt(dayData.Sunrise).padEnd(timeW, ' ') + '│' +
             fmt(dayData.Dhuhr).padEnd(timeW, ' ') + '│' +
             fmt(dayData.Asr).padEnd(timeW, ' ') + '│' +
             fmt(dayData.Maghrib).padEnd(timeW, ' ') + '│' +
             fmt(dayData.Isha).padEnd(timeW, ' ');
    } else {
      row += ''.padEnd((timeW + 1) * 6 - 1, ' ');
    }
    body += row + '\n';
  }

  return header + colHeader + body + '</pre>';
}

// Список месяцев
function getMonthsList() {
  const ruMonths = Object.keys(russianToEnglishMonth);
  const keyboard = [];
  for (let i = 0; i < ruMonths.length; i += 3) {
    const row = ruMonths.slice(i, i + 3).map(m => ({
      text: m.charAt(0).toUpperCase() + m.slice(1),
      callback_data: `select_month_${m}`
    }));
    keyboard.push(row);
  }
  return { reply_markup: { inline_keyboard: keyboard } };
}

// Главное меню
const inlineMenu = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '🏙 Города', callback_data: 'cmd_cities' },
        { text: '🏘 Районы', callback_data: 'cmd_areas' }
      ],
      [
        { text: '💬 Хадис', callback_data: 'cmd_newquote' },
        { text: '📊 Статистика', callback_data: 'cmd_stats' }
      ]
    ]
  }
};

// Клавиатура для выбранного места
function getLocationMenu(locationName, locationId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🕌 День', callback_data: `day_${locationId}` }],
        [{ text: '📅 Месяц', callback_data: `month_${locationId}` }],
        [{ text: '🗓️ Год', callback_data: `year_${locationId}` }],
        [{ text: '⬅️ Назад', callback_data: 'back_to_main' }]
      ]
    }
  };
}

// Загрузка пользователей
const usersFilePath = path.join(__dirname, 'users.json');
let users = new Set();

function loadUsers() {
  try {
    if (fs.existsSync(usersFilePath)) {
      const data = fs.readFileSync(usersFilePath, 'utf8');
      const loaded = JSON.parse(data);
      users = new Set(loaded);
    }
  } catch (e) {
    console.error('Ошибка загрузки пользователей:', e);
  }
}

function saveUsers() {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify([...users]), 'utf8');
  } catch (e) {
    console.error('Ошибка сохранения пользователей:', e);
  }
}

function addUser(userId) {
  const id = userId.toString();
  if (!users.has(id)) {
    users.add(id);
    saveUsers();
    console.log(`Новый пользователь: ${id}. Всего: ${users.size}`);
  }
}

function getUserCount() {
  return users.size;
}

// Хадис
function getRandomQuote() {
  const idx = Math.floor(Math.random() * quotes.length);
  return quotes[idx];
}

// Обработка команд
bot.start((ctx) => {
  addUser(ctx.from.id);
  ctx.reply('📅⏰ Рузнама - Курахский район\n«Самое лучшее деяние — это намаз, совершённый в начале отведённого для него времени». (Тирмизи и аль-Хаким)\nВыберите команду ниже:', inlineMenu);
});

bot.command('stats', (ctx) => {
  addUser(ctx.from.id);
  ctx.reply(`📊 Статистика:\n👥 Пользователей: ${getUserCount()}`, inlineMenu);
});

bot.command('newquote', (ctx) => {
  addUser(ctx.from.id);
  const q = getRandomQuote();
  ctx.reply(`❝ ${q.text} ❞\n— ${q.author}`, inlineMenu);
});

// Обработка callback'ов
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.callbackQuery.from.id;
  addUser(userId);

  try {
    await ctx.answerCbQuery();

    // Главное меню
    if (data === 'back_to_main') {
      return await ctx.editMessageText('Выберите команду ниже:', inlineMenu);
    }

    // Показать города
    if (data === 'cmd_cities') {
      const citiesList = citiesAreasData.cities
        .map(c => `🏙 <b>${c.name_cities}</b> — /city_${c.id}`)
        .join('\n');
      const msg = `📋 <b>Список городов:</b>\n\n${citiesList}\n\nВыберите один из них, нажав на кнопку ниже.`;
      const keyboard = citiesAreasData.cities.map(c => [
        { text: c.name_cities, callback_data: `loc_${c.id}` }
      ]);
      keyboard.push([{ text: '⬅️ Назад', callback_data: 'back_to_main' }]);
      return await ctx.editMessageText(msg, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    }

    // Показать районы
    if (data === 'cmd_areas') {
      const areasList = citiesAreasData.areas
        .map(a => `🏘 <b>${a.name_areas}</b> — /area_${a.id}`)
        .join('\n');
      const msg = `📋 <b>Список районов:</b>\n\n${areasList}\n\nВыберите один из них.`;
      const keyboard = citiesAreasData.areas.map(a => [
        { text: a.name_areas, callback_data: `loc_${a.id}` }
      ]);
      keyboard.push([{ text: '⬅️ Назад', callback_data: 'back_to_main' }]);
      return await ctx.editMessageText(msg, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    }

    // Выбор места (город или район)
    if (data.startsWith('loc_')) {
      const id = data.split('_')[1];
      const allLocations = [...citiesAreasData.cities, ...citiesAreasData.areas];
      const location = allLocations.find(l => l.id == id);
      if (!location) return await ctx.editMessageText('❌ Место не найдено.');

      const timesData = loadTimesById(id);
      if (!timesData) {
        return await ctx.editMessageText(
          `⚠️ Нет данных о времени намазов для "${location.name_cities || location.name_areas}"`,
          inlineMenu
        );
      }

      const name = location.name_cities || location.name_areas;
      return await ctx.editMessageText(
        `📍 Вы выбрали: <b>${name}</b>\nВыберите период:`,
        {
          parse_mode: 'HTML',
          ...getLocationMenu(name, id)
        }
      );
    }

    // Время на день
    if (data.startsWith('day_')) {
      const id = data.split('_')[1];
      const timesData = loadTimesById(id);
      if (!timesData) return await ctx.editMessageText('❌ Данные не найдены.');
      const msg = getPrayerTimesForToday(timesData);
      return await ctx.editMessageText(msg, {
        parse_mode: 'HTML',
        ...getLocationMenu('', id)
      });
    }

    // Время на месяц
    if (data.startsWith('month_') && !data.includes('select_month')) {
      const id = data.split('_')[1];
      const timesData = loadTimesById(id);
      if (!timesData) return await ctx.editMessageText('❌ Данные не найдены.');
      const monthEn = getEnglishMonthName('now');
      const msg = getPrayerTimesTableForMonth(timesData, monthEn);
      return await ctx.editMessageText(msg, {
        parse_mode: 'HTML',
        ...getLocationMenu('', id)
      });
    }

    // Год — выбор месяца
    if (data.startsWith('year_')) {
      const id = data.split('_')[1];
      const tempMsg = `📅 Выберите месяц для <b>ID ${id}</b>`;
      const keyboard = getMonthsList().reply_markup.inline_keyboard;
      keyboard.push([{ text: '⬅️ Назад', callback_data: `loc_${id}` }]);
      return await ctx.editMessageText(tempMsg, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    }

    // Выбор месяца после "Год"
    if (data.startsWith('select_month_')) {
      const ruMonth = data.split('_')[2];
      const enMonth = getEnglishMonthName(ruMonth);
      const backId = ctx.callbackQuery.message.reply_markup.inline_keyboard[0][0].callback_data;
      const id = backId.split('_')[1];

      const timesData = loadTimesById(id);
      if (!timesData) return await ctx.editMessageText('❌ Данные не найдены.');
      const msg = getPrayerTimesTableForMonth(timesData, enMonth);
      return await ctx.editMessageText(msg, {
        parse_mode: 'HTML',
        ...getLocationMenu('', id)
      });
    }

    // Хадис
    if (data === 'cmd_newquote') {
      const q = getRandomQuote();
      const msg = `❝ ${q.text} ❞\n— ${q.author}`;
      return await ctx.editMessageText(msg, inlineMenu);
    }

    // Статистика
    if (data === 'cmd_stats') {
      const msg = `
📊 Статистика бота:
👥 Пользователей: ${getUserCount()}
📚 Хадис в базе: ${quotes.length}
🏙 Городов: ${citiesAreasData.cities.length}
🏘 Районов: ${citiesAreasData.areas.length}
      `;
      return await ctx.editMessageText(msg, inlineMenu);
    }

  } catch (e) {
    console.error('Ошибка в callback:', e);
    await ctx.editMessageText('Произошла ошибка. Попробуйте позже.', inlineMenu);
  }
});

// Регистрация команд
bot.telegram.setMyCommands([
  { command: 'start', description: 'Главное меню' },
  { command: 'stats', description: 'Статистика' },
  { command: 'newquote', description: 'Случайный хадис' }
]);

// Vercel Webhook
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const update = JSON.parse(body);
      await bot.handleUpdate(update);
      res.status(200).send('OK');
    } catch (e) {
      console.error('Ошибка update:', e);
      res.status(500).send('Error');
    }
  });
};

// Локальный запуск
loadUsers();
if (process.env.NODE_ENV !== 'production') {
  bot.launch();
  console.log('Бот запущен локально');
  console.log(`Пользователей: ${getUserCount()}`);
}