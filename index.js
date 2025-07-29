const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');

// === ТОКЕН ===
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN не установлен');
const bot = new Telegraf(BOT_TOKEN);

// === ПУТИ К ФАЙЛАМ ===
const citiesAreasPath = path.join(__dirname, 'db', 'cities-areas.json');
const timesDir = path.join(__dirname, 'db', 'cities-areas');
const usersFilePath = path.join(__dirname, 'users.json');

// === ЗАГРУЗКА ГОРОДОВ И РАЙОНОВ ===
let citiesAreasData = { cities: [], areas: [] };
try {
  if (fs.existsSync(citiesAreasPath)) {
    citiesAreasData = JSON.parse(fs.readFileSync(citiesAreasPath, 'utf8'));
  } else {
    console.warn('Файл cities-areas.json не найден');
  }
} catch (e) {
  console.error('Ошибка чтения cities-areas.json:', e);
}

// === МАППИНГ МЕСЯЦЕВ ===
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

// === ЗАГРУЗКА ВРЕМЁН ПО ID ===
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
    console.error(`Ошибка загрузки ${filePath}:`, e);
    return null;
  }
}

// === ФОРМАТИРОВАНИЕ ВРЕМЕНИ ===
function fmt(time) {
  return Array.isArray(time) && time.length >= 2
    ? `${String(time[0]).padStart(2, '0')}:${String(time[1]).padStart(2, '0')}`
    : '--:--';
}

// === ВРЕМЕНА НА СЕГОДНЯ ===
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
Фаджр: ${fmt(dayData.Fajr)}
Восход: ${fmt(dayData.Sunrise)}
Зухр: ${fmt(dayData.Dhuhr)}
Аср: ${fmt(dayData.Asr)}
Магриб: ${fmt(dayData.Maghrib)}
Иша: ${fmt(dayData.Isha)}
  `.trim();
}

// === ТАБЛИЦА НА МЕСЯЦ ===
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

// === СПИСОК МЕСЯЦЕВ (с ID места) ===
function getMonthsList(locationId) {
  const keyboard = Object.keys(russianToEnglishMonth)
    .reduce((acc, month, index) => {
      if (index % 3 === 0) acc.push([]);
      const row = acc[acc.length - 1];
      row.push({
        text: month.charAt(0).toUpperCase() + month.slice(1),
        callback_data: `select_month_${month}_${locationId}`
      });
      return acc;
    }, []);
  keyboard.push([{ text: '⬅️ Назад', callback_data: `back_to_loc_${locationId}` }]);
  return { reply_markup: { inline_keyboard: keyboard } };
}

// === КЛАВИАТУРА ДЛЯ МЕСТА ===
function getLocationMenu(locationId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'День', callback_data: `day_${locationId}` }],
        [{ text: 'Месяц', callback_data: `month_${locationId}` }],
        [{ text: 'Год', callback_data: `year_${locationId}` }],
        [{ text: '⬅️ Назад', callback_data: 'cmd_cities_areas' }]
      ]
    }
  };
}

// === ГЛАВНОЕ МЕНЮ ===
const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: 'Города', callback_data: 'cmd_cities' }],
      [{ text: 'Районы', callback_data: 'cmd_areas' }],
      [{ text: 'Хадис', callback_data: 'cmd_quote' }]
    ]
  }
};

// === РАБОТА С ПОЛЬЗОВАТЕЛЯМИ ===
let users = new Set();

function loadUsers() {
  try {
    if (fs.existsSync(usersFilePath)) {
      users = new Set(JSON.parse(fs.readFileSync(usersFilePath, 'utf8')));
    }
  } catch (e) {
    console.error('Ошибка загрузки users.json:', e);
  }
}

function saveUsers() {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify([...users]), 'utf8');
  } catch (e) {
    console.error('Ошибка сохранения users.json:', e);
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

// === ХАДИС ===
const quotes = require('./quotes.json');
function getRandomQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

// === СТАРТ ===
bot.start((ctx) => {
  addUser(ctx.from.id);
  ctx.reply(
    '📅⏰ Рузнама - Курахский район\n«Самое лучшее деяние — это намаз, совершённый в начале отведённого для него времени». (Тирмизи и аль-Хаким)\n\nВыберите команду ниже:',
    mainMenu
  );
});

// === ОБРАБОТКА КНОПОК ===
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.callbackQuery.from.id;
  addUser(userId);

  try {
    await ctx.answerCbQuery();
  } catch (e) {
    console.warn('Не удалось answerCbQuery:', e);
  }

  // === Назад в главное меню ===
  if (data === 'cmd_cities_areas') {
    return await ctx.editMessageText('Выберите:', mainMenu);
  }

  // === Показать города ===
  if (data === 'cmd_cities') {
    const keyboard = citiesAreasData.cities.map(c => [{
      text: `${c.name_cities} (${c.id})`,
      callback_data: `loc_${c.id}`
    }]);
    keyboard.push([{ text: '⬅️ Назад', callback_data: 'cmd_cities_areas' }]);
    return await ctx.editMessageText('<b>Список городов:</b>', {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // === Показать районы ===
  if (data === 'cmd_areas') {
    const keyboard = citiesAreasData.areas.map(a => [{
      text: `${a.name_areas} (${a.id})`,
      callback_data: `loc_${a.id}`
    }]);
    keyboard.push([{ text: '⬅️ Назад', callback_data: 'cmd_cities_areas' }]);
    return await ctx.editMessageText('<b>Список районов:</b>', {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // === Выбор места (город/район) ===
  if (data.startsWith('loc_')) {
    const id = data.split('_')[1];
    const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
    if (!location) return await ctx.editMessageText('❌ Место не найдено.');

    const timesData = loadTimesById(id);
    if (!timesData) {
      return await ctx.editMessageText(
        `❌ Времена намазов для "${location.name_cities || location.name_areas}" пока не добавлены.`,
        mainMenu
      );
    }

    const name = location.name_cities || location.name_areas;
    return await ctx.editMessageText(
      `📍 Вы выбрали: <b>${name}</b>\nВыберите период:`,
      {
        parse_mode: 'HTML',
        ...getLocationMenu(id)
      }
    );
  }

  // === Время на день ===
  if (data.startsWith('day_')) {
    const id = data.split('_')[1];
    const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
    if (!location) return await ctx.editMessageText('❌ Место не найдено.');

    const timesData = loadTimesById(id);
    if (!timesData) {
      return await ctx.editMessageText('❌ Данные недоступны.', mainMenu);
    }

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

  // === Время на месяц (текущий) ===
  if (data === `month_${data.split('_')[1]}` && data.startsWith('month_')) {
    const id = data.split('_')[1];
    const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
    if (!location) return await ctx.editMessageText('❌ Место не найдено.');

    const timesData = loadTimesById(id);
    if (!timesData) {
      return await ctx.editMessageText('❌ Данные недоступны.', mainMenu);
    }

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

  // === Год — выбор месяца ===
  if (data.startsWith('year_')) {
    const id = data.split('_')[1];
    const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
    if (!location) return await ctx.editMessageText('❌ Место не найдено.');

    const timesData = loadTimesById(id);
    if (!timesData) {
      return await ctx.editMessageText('❌ Данные недоступны.', mainMenu);
    }

    return await ctx.editMessageText('📅 Выберите месяц:', getMonthsList(id));
  }

  // === Выбор месяца ===
  if (data.startsWith('select_month_')) {
    const [_, __, ruMonth, locationId] = data.split('_');
    const enMonth = getEnglishMonthName(ruMonth);
    if (!enMonth) return await ctx.editMessageText('❌ Месяц не найден.', getLocationMenu(locationId));

    const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == locationId);
    if (!location) return await ctx.editMessageText('❌ Место не найдено.');

    const timesData = loadTimesById(locationId);
    if (!timesData) {
      return await ctx.editMessageText('❌ Данные недоступны.', mainMenu);
    }

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

  // === Назад к месту ===
  if (data.startsWith('back_to_loc_')) {
    const id = data.split('_')[3];
    const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == id);
    if (!location) return await ctx.editMessageText('❌ Место не найдено.');

    const timesData = loadTimesById(id);
    if (!timesData) {
      return await ctx.editMessageText('❌ Данные недоступны.', mainMenu);
    }

    const name = location.name_cities || location.name_areas;
    return await ctx.editMessageText(
      `📍 Вы выбрали: <b>${name}</b>\nВыберите период:`,
      {
        parse_mode: 'HTML',
        ...getLocationMenu(id)
      }
    );
  }

  // === Хадис ===
  if (data === 'cmd_quote') {
    const q = getRandomQuote();
    return await ctx.editMessageText(`❝ ${q.text} ❞\n— ${q.author}`, mainMenu);
  }
});

// === ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ ===
loadUsers();

// === VERCCEL WEBHOOK ===
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
    console.error('Ошибка в Webhook:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// === ЛОКАЛЬНЫЙ ЗАПУСК ===
if (process.env.NODE_ENV !== 'production') {
  bot.launch().then(() => {
    console.log('Бот запущен локально');
    console.log(`Пользователей: ${users.size}`);
  });
}