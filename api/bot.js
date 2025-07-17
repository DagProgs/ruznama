// api/bot.js
require('dotenv').config();
const { Telegraf } = require('telegraf');

const botToken = process.env.BOT_TOKEN;

if (!botToken) {
  console.error('Ошибка: Не найден токен бота в переменных окружения (.env).');
  process.exit(1);
}

const bot = new Telegraf(botToken);

// Устанавливаем webhook (важно для Vercel)
const webhookUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/bot` : undefined;

// Код вашего бота (обработчики команд, сообщений и т.д.)
bot.start((ctx) => ctx.reply('Привет! Я ваш Telegram-бот, запущенный на Vercel!'));
bot.help((ctx) => ctx.reply('Я отвечаю на /start и /help.'));
bot.on('text', (ctx) => ctx.reply(`Вы написали: ${ctx.message.text}`));
bot.on('message', (ctx) => console.log('Необработанное сообщение:', ctx.message));
bot.catch((err, ctx) => {
  console.error(`Ошибка при обработке обновления ${ctx.update.update_id}:`, err);
  ctx.reply('Упс! Произошла ошибка. Попробуйте позже.');
});


// Экспортируем обработчик для Vercel
module.exports = async (req, res) => {
  try {
    if (webhookUrl) {
      await bot.telegram.setWebhook(webhookUrl);
    }

    // Обрабатываем входящий запрос от Telegram
    await bot.handleUpdate(req.body, res);
    res.status(200).send('OK'); // Vercel требует ответ 200 OK

  } catch (error) {
    console.error('Ошибка при обработке запроса:', error);
    res.status(500).send('Internal Server Error');
  }
};
