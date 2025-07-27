const { Telegraf } = require('telegraf');
const quotes = require('./quotes.json');
const timesDb = require('./times_db.json');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN не установлен в переменных окружения');
}

const bot = new Telegraf(BOT_TOKEN);

// --- Маппинг русских названий месяцев на английские ---
const russianToEnglishMonth = {
  'январь': 'January',
  'февраль': 'February',
  'март': 'March',
  'апрель': 'April',
  'май': 'May',
  'июнь': 'June',
  'июль': 'July',
  'август': 'August',
  'сентябрь': 'September',
  'октябрь': 'October',
  'ноябрь': 'November',
  'декабрь': 'December'
};

function getEnglishMonthName(russianNameOrNow = 'now') {
  if (russianNameOrNow === 'now') {
    const now = new Date();
    return now.toLocaleString('en-GB', { month: 'long' });
  } else {
    const lowerRussianName = russianNameOrNow.toLowerCase();
    for (const [ru, en] of Object.entries(russianToEnglishMonth)) {
      if (ru.toLowerCase() === lowerRussianName) {
        return en;
      }
    }
    return null;
  }
}

function getRussianMonthName(englishName) {
  for (const [ru, en] of Object.entries(russianToEnglishMonth)) {
    if (en === englishName) {
      return ru;
    }
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
  } catch (error) {
    console.error('Ошибка при загрузке пользователей:', error);
  }
  return new Set();
}

function saveUsers(users) {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify([...users]), 'utf8');
  } catch (error) {
    console.error('Ошибка при сохранении пользователей:', error);
  }
}

let users = loadUsers();

function addUser(userId) {
  const userCountBefore = users.size;
  users.add(userId.toString());
  if (users.size > userCountBefore) {
    saveUsers(users);
    console.log(`Новый пользователь добавлен. Всего пользователей: ${users.size}`);
  }
}

function getUserCount() {
  return users.size;
}

function getRandomQuote() {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  return quotes[randomIndex];
}

function getPrayerTimesForToday() {
  const now = new Date();
  const monthNameEnglish = now.toLocaleString('en-GB', { month: 'long' });
  const day = String(now.getDate()).padStart(2, '0');
  const monthNameRussian = now.toLocaleString('ru-RU', { month: 'long' });
  const monthNameRussianCapitalized = monthNameRussian.charAt(0).toUpperCase() + monthNameRussian.slice(1);

  const monthData = timesDb[monthNameEnglish];
  if (!monthData) {
    return `Ошибка: данные для месяца "${monthNameEnglish}" не найдены.`;
  }

  const dayData = monthData[day];
  if (!dayData) {
    return `Ошибка: данные для ${day} ${monthNameRussianCapitalized} не найдены.`;
  }

  const formatTime = (timeArray) => `${String(timeArray[0]).padStart(2, '0')}:${String(timeArray[1]).padStart(2, '0')}`;

  return `
📅 ${day} ${monthNameRussianCapitalized}

🏙 Фаджр: ${formatTime(dayData.Fajr)}
🌅 Восход: ${formatTime(dayData.Sunrise)}
🌇 Зухр: ${formatTime(dayData.Dhuhr)}
🌆 Аср: ${formatTime(dayData.Asr)}
🏙 Магриб: ${formatTime(dayData.Maghrib)}
🌃 Иша: ${formatTime(dayData.Isha)}
`;
}

function getPrayerTimesTableForMonth(monthNameEnglish) {
  const monthData = timesDb[monthNameEnglish];
  if (!monthData) {
    return `Ошибка: данные для месяца "${monthNameEnglish}" не найдены.`;
  }

  const monthNameRussian = getRussianMonthName(monthNameEnglish);
  const monthNameRussianCapitalized = monthNameRussian ? (monthNameRussian.charAt(0).toUpperCase() + monthNameRussian.slice(1)) : monthNameEnglish;

  const formatTime = (timeArray) => {
    if (!timeArray || timeArray.length < 2) return "--:--";
    return `${String(timeArray[0]).padStart(2, '0')}:${String(timeArray[1]).padStart(2, '0')}`;
  };

  const dayWidth = 4;
  const timeWidth = 5;

  const header = `Времена намазов на ${monthNameRussianCapitalized}\n\n`;
  const columnHeader = `<pre>` +
    `День`.padEnd(dayWidth, ' ') + '│' +
    `Фаджр`.padEnd(timeWidth, ' ') + '│' +
    `Восх.`.padEnd(timeWidth, ' ') + '│' +
    `Зухр`.padEnd(timeWidth, ' ') + '│' +
    `Аср`.padEnd(timeWidth, ' ') + '│' +
    `Магр.`.padEnd(timeWidth, ' ') + '│' +
    `Иша`.padEnd(timeWidth, ' ') + '\n' +
    ''.padEnd(dayWidth + 1 + timeWidth * 6 + 6, '─') + '\n';

  let tableBody = '';

  for (let day = 1; day <= 31; day++) {
    const dayStr = day.toString().padStart(2, '0');
    const dayData = monthData[dayStr];

    let row = day.toString().padEnd(dayWidth, ' ') + '│';

    if (dayData) {
      row += formatTime(dayData.Fajr).padEnd(timeWidth, ' ') + '│';
      row += formatTime(dayData.Sunrise).padEnd(timeWidth, ' ') + '│';
      row += formatTime(dayData.Dhuhr).padEnd(timeWidth, ' ') + '│';
      row += formatTime(dayData.Asr).padEnd(timeWidth, ' ') + '│';
      row += formatTime(dayData.Maghrib).padEnd(timeWidth, ' ') + '│';
      row += formatTime(dayData.Isha).padEnd(timeWidth, ' ');
    } else {
      row += ''.padEnd((timeWidth + 1) * 6 - 1, ' ');
    }
    tableBody += row + '\n';
  }

  const footer = `</pre>`;
  return header + columnHeader + tableBody + footer;
}

function getMonthsList() {
  const russianMonths = Object.keys(russianToEnglishMonth);
  const keyboard = [];
  for (let i = 0; i < russianMonths.length; i += 3) {
    const row = russianMonths.slice(i, i + 3).map(russianMonth => ({
      text: russianMonth.charAt(0).toUpperCase() + russianMonth.slice(1),
      callback_data: `month_${russianMonth}`
    }));
    keyboard.push(row);
  }
  return {
    reply_markup: {
      inline_keyboard: keyboard
    }
  };
}

// --- Inline меню с командами ---
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
		{ text: 'ℹ️ About /about', callback_data: 'cmd_about' },
        { text: '❓ Помощь /help', callback_data: 'cmd_help' }
      ],
	  [
		{ text: '📊 Статистика /stats', callback_data: 'cmd_stats' }
	  ]
    ]
  }
};

// --- Обработчики команд ---

bot.start((ctx) => {
  addUser(ctx.from.id);

  const welcomeMessage = `
🌟 Рузнама - Курахский район

«Самое лучшее деяние — это намаз, совершённый в начале отведённого для него времени». (Тирмизи и аль-Хаким)

Выберите команду ниже:
  `;

  ctx.reply(welcomeMessage, inlineMenu);
});

bot.help((ctx) => {
  addUser(ctx.from.id);

  ctx.reply(`
📖 Цитатный Бот

Команды доступны в меню ниже.
  `, inlineMenu);
});

bot.command('about', (ctx) => {
  addUser(ctx.from.id);

  ctx.reply(`
🤖 Рузнама Бот v1.1
🕌 Времена намазов доступны
📚 Хадис в базе: ${quotes.length}
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

  const quote = getRandomQuote();
  const message = `❝ ${quote.text} ❞\n\n— ${quote.author}`;
  ctx.reply(message, inlineMenu);
});

bot.command('day', (ctx) => {
  addUser(ctx.from.id);

  const prayerTimesMessage = getPrayerTimesForToday();
  ctx.reply(prayerTimesMessage, { parse_mode: 'HTML', ...inlineMenu });
});

bot.command('month', (ctx) => {
  addUser(ctx.from.id);

  const now = new Date();
  const monthNameEnglish = now.toLocaleString('en-GB', { month: 'long' });

  const tableMessage = getPrayerTimesTableForMonth(monthNameEnglish);
  ctx.reply(tableMessage, { parse_mode: 'HTML', ...inlineMenu });
});

bot.command('year', (ctx) => {
  addUser(ctx.from.id);

  ctx.reply('Выберите месяц:', getMonthsList());
});

bot.on('text', (ctx) => {
  addUser(ctx.from.id);

  const text = ctx.message.text.toLowerCase();

  // Здесь можно добавить обработку текстовых команд как раньше, но проще пользоваться кнопками
  ctx.reply('Пожалуйста, используйте кнопки меню для выбора команды.', inlineMenu);
});

// --- Обработка callback-запросов ---

bot.on('callback_query', async (ctx) => {
  const userId = ctx.callbackQuery.from.id;
  addUser(userId);

  const data = ctx.callbackQuery.data;

  try {
    if (data === 'cmd_day') {
      await ctx.answerCbQuery();
      const dayMessage = getPrayerTimesForToday();
      await ctx.editMessageText(dayMessage, { parse_mode: 'HTML', ...inlineMenu });
    } else if (data === 'cmd_month') {
      await ctx.answerCbQuery();
      const now = new Date();
      const monthNameEnglish = now.toLocaleString('en-GB', { month: 'long' });
      const monthMessage = getPrayerTimesTableForMonth(monthNameEnglish);
      await ctx.editMessageText(monthMessage, { parse_mode: 'HTML', ...inlineMenu });
    } else if (data === 'cmd_year') {
      await ctx.answerCbQuery();
      await ctx.editMessageText('Выберите месяц:', getMonthsList());
    } else if (data === 'cmd_newquote') {
      await ctx.answerCbQuery();
      const quote = getRandomQuote();
      const quoteMsg = `❝ ${quote.text} ❞\n\n— ${quote.author}`;
      await ctx.editMessageText(quoteMsg, inlineMenu);
    } else if (data === 'cmd_stats') {
      await ctx.answerCbQuery();
      const statsMsg = `
📊 Статистика бота:
👥 Пользователей: ${getUserCount()}
📚 Цитат в базе: ${quotes.length}
🕌 Месяцев с временами намазов: ${Object.keys(timesDb).length}
      `;
      await ctx.editMessageText(statsMsg, inlineMenu);
    } else if (data === 'cmd_help') {
      await ctx.answerCbQuery();
      await ctx.editMessageText(`
📖 Цитатный Бот

Команды доступны в меню.
      `, inlineMenu);
    } else if (data.startsWith('month_')) {
      // Выбор месяца из меню /year
      const selectedRussianMonth = data.split('_')[1];
      const selectedEnglishMonth = getEnglishMonthName(selectedRussianMonth);

      if (!selectedEnglishMonth) {
        await ctx.answerCbQuery('Ошибка: Месяц не найден', { show_alert: true });
        return;
      }

      const tableMessage = getPrayerTimesTableForMonth(selectedEnglishMonth);

      await ctx.answerCbQuery();
      await ctx.editMessageText(tableMessage, { parse_mode: 'HTML', ...inlineMenu });
    } else {
      await ctx.answerCbQuery('Неизвестная команда', { show_alert: true });
    }
  } catch (err) {
    console.error('Ошибка в callback_query:', err);
    await ctx.answerCbQuery('Произошла ошибка', { show_alert: true });
  }
});

// --- Регистрируем команды в Telegram для удобства ---
bot.telegram.setMyCommands([
  { command: 'day', description: 'Времена намазов на сегодня 🕌' },
  { command: 'month', description: 'Текущий месяц' },
  { command: 'year', description: 'Выбрать месяц' },
  { command: 'newquote', description: 'Случайная цитата' },
  { command: 'about', description: 'About' },
  { command: 'help', description: 'Помощь' },
  { command: 'stats', description: 'Статистика бота' }
]);

// Webhook handler для Vercel
module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling update:', error);
    res.status(500).send('Error');
  }
};

// Локальный запуск
if (process.env.NODE_ENV !== 'production') {
  bot.launch();
  console.log('Бот запущен локально!');
  console.log(`Текущее количество пользователей: ${getUserCount()}`);
}
