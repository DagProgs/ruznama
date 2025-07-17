// index.js
require('dotenv').config(); // Загружаем переменные окружения из .env

const { Telegraf } = require('telegraf');

// Получаем токен бота из переменной окружения
const botToken = process.env.BOT_TOKEN;

// Обработка ошибки, если токен отсутствует
if (!botToken) {
    console.error('Ошибка: Не найден токен бота в переменных окружения (.env).  Убедитесь, что переменная BOT_TOKEN установлена.');
    process.exit(1); // Завершаем процесс с кодом ошибки
}

// Создаем экземпляр бота
const bot = new Telegraf(botToken);

// Обработчик команды /start
bot.start((ctx) => {
    console.log(`Пользователь ${ctx.from.id} запустил бота`); // Логируем запуск
    ctx.reply('Привет! Я ваш Telegram-бот. Напишите что-нибудь!');
});

// Обработчик команды /help
bot.help((ctx) => {
    ctx.reply('Я реагирую на команды /start и /help, а также на любые текстовые сообщения.');
});

// Обработчик текстовых сообщений
bot.on('text', (ctx) => {
    const userId = ctx.from.id;
    const messageText = ctx.message.text;

    console.log(`Пользователь ${userId} написал: ${messageText}`); // Логируем сообщение

    // Эхо-ответ
    ctx.reply(`Вы написали: ${messageText}`);
});

// Обработка любых других обновлений (опционально, но полезно для отладки)
bot.on('message', (ctx) => {
    console.log('Необработанное сообщение:', ctx.message);
});

// Обработчик ошибок
bot.catch((err, ctx) => {
    console.error(`Ошибка при обработке обновления ${ctx.update.update_id}:`, err);
    ctx.reply('Упс! Произошла ошибка. Попробуйте позже.'); // Сообщаем пользователю
});

// Запуск бота
bot.launch()
    .then(() => {
        console.log('Бот успешно запущен!');
    })
    .catch((err) => {
        console.error('Ошибка при запуске бота:', err);
    });

// Включаем graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));