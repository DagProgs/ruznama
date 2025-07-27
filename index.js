const { Telegraf } = require('telegraf');
const quotes = require('./quotes.json');
const timesDb = require('./times_db.json');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN не установлен');
}

const bot = new Telegraf(BOT_TOKEN);

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

const usersFilePath = path.join(__dirname, 'users.json');

function loadUsers() {
  try {
    if (fs.existsSync(usersFilePath)) {
      const data = fs.readFileSync(usersFilePath, 'utf8');
      return new Set(JSON.parse(data));
    }
  } catch (e) {
    console.error('Ошибка загрузки пользователей:', e);
  }
  return new Set();
}

function saveUsers(users) {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify([...users]), 'utf8');
  } catch (e) {
    console.error('Ошибка сохранения пользователей:', e);
  }
}

let users = loadUsers();

function addUser(userId) {
  const before = users.size;
  users.add(userId.toString());
  if (users.size > before) {
    saveUsers(users);
    console.log(`Новый пользователь добавлен. Всего: ${users.size}`);
  }
}

function getUserCount() {
  return users.size;
}

function getRandomQuote() {
  const idx = Math.floor(Math.random() * quotes.length);
  return quotes[idx];
}

function getPrayerTimesForToday() {
  const now = new Date();
  const monthEn = now.toLocaleString('en-GB', { month: 'long' });
  const day = String(now.getDate()).padStart(2, '0');
  const monthRu = now.toLocaleString('ru-RU', { month: 'long' });
  const monthRuCap = monthRu.charAt(0).toUpperCase() + monthRu.slice(1);

  const monthData = timesDb[monthEn];
  if (!monthData) return `Ошибка: данных для месяца "${monthEn}" нет.`;

  const dayData = monthData[day];
  if (!dayData) return `Ошибка: данных для ${day} ${monthRuCap} нет.`;

  const fmt = (arr) => `${String(arr[0]).padStart(2,'0')}:${String(arr[1]).padStart(2,'0')}`;

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

function getPrayerTimesTableForMonth(monthEn) {
  const monthData = timesDb[monthEn];
  if (!monthData) return `Ошибка: данных для месяца "${monthEn}" нет.`;

  const monthRu = getRussianMonthName(monthEn);
  const monthRuCap = monthRu.charAt(0).toUpperCase() + monthRu.slice(1);

  const fmt = (arr) => arr && arr.length >= 2 ? `${String(arr[0]).padStart(2,'0')}:${String(arr[1]).padStart(2,'0')}` : '--:--';

  const dayW = 4;
  const timeW = 5;

  let header = `Времена намазов на ${monthRuCap}\n\n`;
  let colHeader = `<pre>` +
    'День'.padEnd(dayW,' ') + '│' +
    'Фаджр'.padEnd(timeW,' ') + '│' +
    'Восх.'.padEnd(timeW,' ') + '│' +
    'Зухр'.padEnd(timeW,' ') + '│' +
    'Аср'.padEnd(timeW,' ') + '│' +
    'Магр.'.padEnd(timeW,' ') + '│' +
    'Иша'.padEnd(timeW,' ') + '\n' +
    ''.padEnd(dayW + 1 + timeW*6 + 6, '─') + '\n';

  let body = '';
  for(let d=1; d<=31; d++) {
    const dayStr = String(d).padStart(2,'0');
    const dayData = monthData[dayStr];
    let row = d.toString().padEnd(dayW,' ') + '│';
    if(dayData) {
      row += fmt(dayData.Fajr).padEnd(timeW,' ') + '│' +
             fmt(dayData.Sunrise).padEnd(timeW,' ') + '│' +
             fmt(dayData.Dhuhr).padEnd(timeW,' ') + '│' +
             fmt(dayData.Asr).padEnd(timeW,' ') + '│' +
             fmt(dayData.Maghrib).padEnd(timeW,' ') + '│' +
             fmt(dayData.Isha).padEnd(timeW,' ');
    } else {
      row += ''.padEnd((timeW+1)*6-1,' ');
    }
    body += row + '\n';
  }

  return header + colHeader + body + '</pre>';
}

function getMonthsList() {
  const ruMonths = Object.keys(russianToEnglishMonth);
  const keyboard = [];
  for(let i=0; i<ruMonths.length; i+=3) {
    const row = ruMonths.slice(i,i+3).map(m => ({
      text: m.charAt(0).toUpperCase() + m.slice(1),
      callback_data: `month_${m}`
    }));
    keyboard.push(row);
  }
  return { reply_markup: { inline_keyboard: keyboard } };
}

const inlineMenu = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '🕌 Времена на сегодня /day', callback_data: 'cmd_day' },
        { text: '📅 Текущий месяц /month', callback_data: 'cmd_month' }
      ],
      [
        { text: '🗓️ Выбрать месяц /year', callback_data: 'cmd_year' },
        { text: '💬 Новая цитата /newquote', callback_data: 'cmd_newquote' }
      ],
      [
        { text: '📊 Статистика /stats', callback_data: 'cmd_stats' },
        { text: 'ℹ️ About /about', callback_data: 'cmd_about' }
      ],
      [
        { text: '❓ Помощь /help', callback_data: 'cmd_help' }
      ]
    ]
  }
};

bot.start((ctx) => {
  addUser(ctx.from.id);
  const welcome = `
📅⏰ Рузнама - Курахский район

«Самое лучшее деяние — это намаз, совершённый в начале отведённого для него времени». (Тирмизи и аль-Хаким)

Выберите команду ниже:
  `;
  ctx.reply(welcome, inlineMenu);
});

bot.help((ctx) => {
  addUser(ctx.from.id);
  ctx.reply(`📖 Цитатный Бот\n\nИспользуйте кнопки меню для выбора команды.`, inlineMenu);
});

bot.command('about', (ctx) => {
  addUser(ctx.from.id);
  ctx.reply(`
🤖 Рузнама Бот v1.1
🕌 Времена намазов доступны
📚 Цитат в базе: ${quotes.length}
  `, inlineMenu);
});

bot.command('stats', (ctx) => {
  addUser(ctx.from.id);
  ctx.reply(`
📊 Статистика бота:
👥 Пользователей: ${getUserCount()}
📚 Цитат в базе: ${quotes.length}
🕌 Месяцев с временами намазов: ${Object.keys(timesDb).length}
  `, inlineMenu);
});

bot.command('newquote', (ctx) => {
  addUser(ctx.from.id);
  const q = getRandomQuote();
  ctx.reply(`❝ ${q.text} ❞\n\n— ${q.author}`, inlineMenu);
});

bot.command('day', (ctx) => {
  addUser(ctx.from.id);
  const msg = getPrayerTimesForToday();
  ctx.reply(msg, { parse_mode: 'HTML', ...inlineMenu });
});

bot.command('month', (ctx) => {
  addUser(ctx.from.id);
  const now = new Date();
  const monthEn = now.toLocaleString('en-GB', { month: 'long' });
  const msg = getPrayerTimesTableForMonth(monthEn);
  ctx.reply(msg, { parse_mode: 'HTML', ...inlineMenu });
});

bot.command('year', (ctx) => {
  addUser(ctx.from.id);
  ctx.reply('Выберите месяц:', getMonthsList());
});

bot.on('text', (ctx) => {
  addUser(ctx.from.id);
  ctx.reply('Пожалуйста, используйте кнопки меню для выбора команды.', inlineMenu);
});

bot.on('callback_query', async (ctx) => {
  addUser(ctx.callbackQuery.from.id);
  const data = ctx.callbackQuery.data;

  try {
    if (data === 'cmd_day') {
      await ctx.answerCbQuery();
      const msg = getPrayerTimesForToday();
      await ctx.editMessageText(msg, { parse_mode: 'HTML', ...inlineMenu });
    } else if (data === 'cmd_month') {
      await ctx.answerCbQuery();
      const now = new Date();
      const monthEn = now.toLocaleString('en-GB', { month: 'long' });
      const msg = getPrayerTimesTableForMonth(monthEn);
      await ctx.editMessageText(msg, { parse_mode: 'HTML', ...inlineMenu });
    } else if (data === 'cmd_year') {
      await ctx.answerCbQuery();
      await ctx.editMessageText('Выберите месяц:', getMonthsList());
    } else if (data === 'cmd_newquote') {
      await ctx.answerCbQuery();
      const q = getRandomQuote();
      const msg = `❝ ${q.text} ❞\n\n— ${q.author}`;
      await ctx.editMessageText(msg, inlineMenu);
    } else if (data === 'cmd_stats') {
      await ctx.answerCbQuery();
      const msg = `
📊 Статистика бота:
👥 Пользователей: ${getUserCount()}
📚 Цитат в базе: ${quotes.length}
🕌 Месяцев с временами намазов: ${Object.keys(timesDb).length}
      `;
      await ctx.editMessageText(msg, inlineMenu);
    } else if (data === 'cmd_about') {
      await ctx.answerCbQuery();
      const msg = `
🤖 Рузнама Бот v1.0
🕌 Времена намазов доступны
📚 Хадис в базе: ${quotes.length}
      `;
      await ctx.editMessageText(msg, inlineMenu);
    } else if (data === 'cmd_help') {
      await ctx.answerCbQuery();
      await ctx.editMessageText(`📖 Цитатный Бот\n\nИспользуйте кнопки меню для выбора команды.`, inlineMenu);
    } else if (data.startsWith('month_')) {
      const ruMonth = data.split('_')[1];
      const enMonth = getEnglishMonthName(ruMonth);
      if (!enMonth) {
        await ctx.answerCbQuery('Ошибка: месяц не найден', { show_alert: true });
        return;
      }
      const msg = getPrayerTimesTableForMonth(enMonth);
      await ctx.answerCbQuery();
      await ctx.editMessageText(msg, { parse_mode: 'HTML', ...inlineMenu });
    } else {
      await ctx.answerCbQuery('Неизвестная команда', { show_alert: true });
    }
  } catch (e) {
    console.error('Ошибка callback_query:', e);
    await ctx.answerCbQuery('Произошла ошибка', { show_alert: true });
  }
});

// Регистрируем команды Telegram
bot.telegram.setMyCommands([
  { command: 'day', description: 'Времена намазов на сегодня 🕌' },
  { command: 'month', description: 'Текущий месяц' },
  { command: 'year', description: 'Выбрать месяц' },
  { command: 'newquote', description: 'Случайная цитата' },
  { command: 'stats', description: 'Статистика бота' },
  { command: 'about', description: 'О боте' },
  { command: 'help', description: 'Помощь' }
]);

// Вебхук для Vercel
module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } catch (e) {
    console.error('Ошибка update:', e);
    res.status(500).send('Error');
  }
};

// Локальный запуск
if (process.env.NODE_ENV !== 'production') {
  bot.launch();
  console.log('Бот запущен локально');
  console.log(`Пользователей: ${getUserCount()}`);
}
