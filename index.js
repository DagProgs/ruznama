const { Telegraf } = require('telegraf');
const quotes = require('./quotes.json');
const timesDb = require('./times_db.json'); // Загружаем times_db.json
const fs = require('fs');
const path = require('path');

// Проверяем, есть ли токен
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

// Получить английское название месяца по русскому или текущему
function getEnglishMonthName(russianNameOrNow = 'now') {
  if (russianNameOrNow === 'now') {
    const now = new Date();
    return now.toLocaleString('en-GB', { month: 'long' }); // Получаем английское название текущего месяца
  } else {
    // Приводим к нижнему регистру для сравнения
    const lowerRussianName = russianNameOrNow.toLowerCase();
    for (const [ru, en] of Object.entries(russianToEnglishMonth)) {
      if (ru.toLowerCase() === lowerRussianName) {
        return en;
      }
    }
    return null; // Месяц не найден
  }
}

// Получить русское название месяца по английскому
function getRussianMonthName(englishName) {
    for (const [ru, en] of Object.entries(russianToEnglishMonth)) {
      if (en === englishName) {
        return ru;
      }
    }
    return englishName; // Если не найдено, возвращаем оригинальное (на случай ошибок)
}

// Путь к файлу с пользователями
const usersFilePath = path.join(__dirname, 'users.json');

// Загружаем список пользователей из файла
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

// Сохраняем список пользователей в файл
function saveUsers(users) {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify([...users]), 'utf8');
  } catch (error) {
    console.error('Ошибка при сохранении пользователей:', error);
  }
}

// Инициализируем список пользователей
let users = loadUsers();

// Функция для добавления пользователя
function addUser(userId) {
  const userCountBefore = users.size;
  users.add(userId.toString()); // Преобразуем в строку для единообразия
  if (users.size > userCountBefore) {
    saveUsers(users);
    console.log(`Новый пользователь добавлен. Всего пользователей: ${users.size}`);
  }
}

// Функция для получения количества пользователей
function getUserCount() {
  return users.size;
}

// Функция для получения случайной цитаты
function getRandomQuote() {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  return quotes[randomIndex];
}

// --- Функции для работы с временами намазов ---

// Получить время намазов на сегодня
function getPrayerTimesForToday() {
    const now = new Date();
    // Получаем английское название текущего месяца
    const monthNameEnglish = now.toLocaleString('en-GB', { month: 'long' });
    const day = String(now.getDate()).padStart(2, '0');
    const monthNameRussian = now.toLocaleString('ru-RU', { month: 'long' });
    const monthNameRussianCapitalized = monthNameRussian.charAt(0).toUpperCase() + monthNameRussian.slice(1);

    const monthData = timesDb[monthNameEnglish]; // Используем английское имя
    if (!monthData) {
        return `Ошибка: данные для месяца "${monthNameEnglish}" не найдены.`;
    }

    const dayData = monthData[day];
    if (!dayData) {
        return `Ошибка: данные для ${day} ${monthNameRussianCapitalized} не найдены.`;
    }

    // Форматируем время в HH:MM
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

// Получить таблицу времен намазов за месяц (улучшенная верстка)
function getPrayerTimesTableForMonth(monthNameEnglish) {
    const monthData = timesDb[monthNameEnglish];
    if (!monthData) {
        return `Ошибка: данные для месяца "${monthNameEnglish}" не найдены.`;
    }

    // Получаем русское название для заголовка
    const monthNameRussian = getRussianMonthName(monthNameEnglish);
    const monthNameRussianCapitalized = monthNameRussian ? (monthNameRussian.charAt(0).toUpperCase() + monthNameRussian.slice(1)) : monthNameEnglish;

    // Форматируем время в HH:MM
    const formatTime = (timeArray) => {
         if (!timeArray || timeArray.length < 2) return "--:--"; // Обработка отсутствующих данных
         return `${String(timeArray[0]).padStart(2, '0')}:${String(timeArray[1]).padStart(2, '0')}`;
    };

    // Определяем максимальную ширину для каждого столбца (в символах моноширинного шрифта)
    const dayWidth = 4; // "День"
    const timeWidth = 5; // "ЧЧ:MM"

    // Создаем заголовок таблицы
    const header = `Времена намазов на ${monthNameRussianCapitalized}\n\n`;
    const columnHeader = `<pre>` +
        `День`.padEnd(dayWidth, ' ') + '│' +
        `Фаджр`.padEnd(timeWidth, ' ') + '│' +
        `Восх.`.padEnd(timeWidth, ' ') + '│' +
        `Зухр`.padEnd(timeWidth, ' ') + '│' +
        `Аср`.padEnd(timeWidth, ' ') + '│' +
        `Магр.`.padEnd(timeWidth, ' ') + '│' +
        `Иша`.padEnd(timeWidth, ' ') + '\n' +
        ''.padEnd(dayWidth + 1 + timeWidth * 6 + 6, '─') + '\n'; // Линия под заголовком

    let tableBody = '';

    // Проходим по всем дням от 1 до 31
    for (let day = 1; day <= 31; day++) {
        const dayStr = day.toString().padStart(2, '0');
        const dayData = monthData[dayStr];

        let row = day.toString().padEnd(dayWidth, ' ') + '│'; // Номер дня слева

        if (dayData) {
            // Если данные есть, добавляем их
            row += formatTime(dayData.Fajr).padEnd(timeWidth, ' ') + '│';
            row += formatTime(dayData.Sunrise).padEnd(timeWidth, ' ') + '│';
            row += formatTime(dayData.Dhuhr).padEnd(timeWidth, ' ') + '│';
            row += formatTime(dayData.Asr).padEnd(timeWidth, ' ') + '│';
            row += formatTime(dayData.Maghrib).padEnd(timeWidth, ' ') + '│';
            row += formatTime(dayData.Isha).padEnd(timeWidth, ' ');
        } else {
            // Если данных нет (например, 31 февраля), заполняем "--:--"
             row += ''.padEnd((timeWidth + 1) * 6 - 1, ' '); // Заполняем всю оставшуюся строку пробелами
        }
        tableBody += row + '\n';
    }

    const footer = `</pre>`;
    return header + columnHeader + tableBody + footer;
}


// Получить список месяцев с кнопками (на русском)
function getMonthsList() {
    const russianMonths = Object.keys(russianToEnglishMonth);
    const keyboard = [];
    // Разбиваем на строки по 3 месяца
    for (let i = 0; i < russianMonths.length; i += 3) {
        const row = russianMonths.slice(i, i + 3).map(russianMonth => ({
            text: russianMonth.charAt(0).toUpperCase() + russianMonth.slice(1), // С большой буквы
            callback_data: `month_${russianMonth}` // Callback с русским названием
        }));
        keyboard.push(row);
    }
    return {
        reply_markup: {
            inline_keyboard: keyboard
        }
    };
}

// --- Обработчики команд ---

// Команда /start
bot.start((ctx) => {
  const userId = ctx.from.id;
  addUser(userId); // Добавляем пользователя при первом взаимодействии

  const welcomeMessage = `
🌟 Добро пожаловать в Цитатный Бот!

Я отправляю случайные вдохновляющие цитаты и времена намазов.

Команды:
/newquote - Получить новую цитату
/help - Помощь
/about - О боте
/stats - Статистика бота 📊
/day - Времена намазов на сегодня 🕌
/month - Таблица времен намазов на текущий месяц 📅
/year - Выбрать месяц для таблицы времен намазов 🗓️
  `;
  ctx.reply(welcomeMessage);
});

// Команда /help
bot.help((ctx) => {
  const userId = ctx.from.id;
  addUser(userId);

  ctx.reply(`
📖 Цитатный Бот

/newquote - Получить случайную цитату
/about - Информация о боте
/stats - Статистика бота 📊
/day - Времена намазов на сегодня 🕌
/month - Таблица времен намазов на текущий месяц 📅
/year - Выбрать месяц для таблицы времен намазов 🗓️
/start - Начать заново
  `);
});

// Команда /about
bot.command('about', (ctx) => {
  const userId = ctx.from.id;
  addUser(userId);

  ctx.reply(`
🤖 Цитатный Бот v1.0
📚 Цитат в базе: ${quotes.length}
🕌 Времена намазов доступны
💡 Источник: JSON файлы
🚀 Развернут на Vercel
  `);
});

// Новая команда /stats для просмотра статистики
bot.command('stats', (ctx) => {
  const userId = ctx.from.id;
  addUser(userId);

  ctx.reply(`
📊 Статистика бота:
👥 Пользователей: ${getUserCount()}
📚 Цитат в базе: ${quotes.length}
🕌 Месяцев с временами намазов: ${Object.keys(timesDb).length}
  `);
});

// Команда /newquote
bot.command('newquote', (ctx) => {
  const userId = ctx.from.id;
  addUser(userId);

  const quote = getRandomQuote();
  const message = `❝ ${quote.text} ❞\n\n— ${quote.author}`;
  ctx.reply(message);
});

// --- Новые команды для времен намазов ---

// Команда /day
bot.command('day', (ctx) => {
    const userId = ctx.from.id;
    addUser(userId);

    const prayerTimesMessage = getPrayerTimesForToday();
    ctx.reply(prayerTimesMessage, { parse_mode: 'HTML' });
});

// Команда /month
bot.command('month', (ctx) => {
    const userId = ctx.from.id;
    addUser(userId);

    const now = new Date();
    // Получаем английское название текущего месяца для поиска в timesDb
    const monthNameEnglish = now.toLocaleString('en-GB', { month: 'long' });

    const tableMessage = getPrayerTimesTableForMonth(monthNameEnglish);
    // Используем HTML для форматирования таблицы
    ctx.reply(tableMessage, { parse_mode: 'HTML' });
});

// Команда /year
bot.command('year', (ctx) => {
    const userId = ctx.from.id;
    addUser(userId);

    ctx.reply('Выберите месяц:', getMonthsList());
});

// Обработка текстовых сообщений
bot.on('text', (ctx) => {
  const userId = ctx.from.id;
  addUser(userId);

  const text = ctx.message.text.toLowerCase();

  if (text === 'цитата' || text === 'quote') {
    const quote = getRandomQuote();
    const message = `❝ ${quote.text} ❞\n\n— ${quote.author}`;
    ctx.reply(message);
  } else if (text === 'помощь' || text === 'help') {
    ctx.reply(`
📖 Цитатный Бот

/newquote - Получить случайную цитату
/about - Информация о боте
/stats - Статистика бота 📊
/day - Времена намазов на сегодня 🕌
/month - Таблица времен намазов на текущий месяц 📅
/year - Выбрать месяц для таблицы времен намазов 🗓️
/start - Начать заново
    `);
  } else if (text === 'статистика' || text === 'stats') {
    ctx.reply(`
📊 Статистика бота:
👥 Пользователей: ${getUserCount()}
📚 Цитат в базе: ${quotes.length}
🕌 Месяцев с временами намазов: ${Object.keys(timesDb).length}
    `);
  } else if (text === 'день' || text === 'day') {
      const prayerTimesMessage = getPrayerTimesForToday();
      ctx.reply(prayerTimesMessage, { parse_mode: 'HTML' });
  } else if (text === 'месяц' || text === 'month') {
      const now = new Date();
      const monthNameEnglish = now.toLocaleString('en-GB', { month: 'long' });

      const tableMessage = getPrayerTimesTableForMonth(monthNameEnglish);
      ctx.reply(tableMessage, { parse_mode: 'HTML' });
  } else if (text === 'год' || text === 'year') {
      ctx.reply('Выберите месяц:', getMonthsList());
  } else {
    ctx.reply('Отправь "цитата" или используй команду /newquote для получения случайной цитаты!\nИли /stats для просмотра статистики 📊\nИли /day, /month, /year для времен намазов 🕌');
  }
});

// Обработка callback-запросов
bot.on('callback_query', async (ctx) => {
  const userId = ctx.callbackQuery.from.id;
  addUser(userId);

  const data = ctx.callbackQuery.data;

  if (data === 'new_quote') {
    const quote = getRandomQuote();
    const message = `❝ ${quote.text} ❞\n\n— ${quote.author}`;

    await ctx.answerCbQuery();
    await ctx.editMessageText(message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Еще цитату', callback_data: 'new_quote' }]
        ]
      }
    });
  } else if (data.startsWith('month_')) {
      // Обработка выбора месяца из /year
      const selectedRussianMonth = data.split('_')[1];
      // Преобразуем русское название в английское
      const selectedEnglishMonth = getEnglishMonthName(selectedRussianMonth);

      if (!selectedEnglishMonth) {
           await ctx.answerCbQuery('Ошибка: Месяц не найден', { show_alert: true });
           return;
      }

      const tableMessage = getPrayerTimesTableForMonth(selectedEnglishMonth);

      await ctx.answerCbQuery(); // Подтверждаем callback
      // Отправляем таблицу как новое сообщение
       await ctx.reply(tableMessage, { parse_mode: 'HTML' });
      // Или редактируем предыдущее сообщение с кнопками:
      // await ctx.editMessageText(tableMessage, { parse_mode: 'HTML' });
  }
});

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

// Для локальной разработки (необязательно)
if (process.env.NODE_ENV !== 'production') {
  bot.launch();
  console.log('Бот запущен локально!');
  console.log(`Текущее количество пользователей: ${getUserCount()}`);
}