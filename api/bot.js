// api/bot.js
require('dotenv').config();
const { Telegraf } = require('telegraf');

const botToken = process.env.BOT_TOKEN;

if (!botToken) {
    console.error('Ошибка: Не найден токен бота в переменных окружения (.env). Убедитесь, что переменная BOT_TOKEN установлена.');
    process.exit(1);
}

const bot = new Telegraf(botToken);

// Логирование
bot.use((ctx, next) => {
    const now = new Date().toLocaleString();
    console.log(`${now} - Пользователь ${ctx.from.id} (${ctx.from.username}): ${ctx.message?.text || ctx.updateType}`);
    return next();
});

// Обработчики команд
bot.start((ctx) => {
    ctx.reply(`Привет, ${ctx.from.first_name}! Я бот, работающий на Vercel!`);
});

bot.help((ctx) => {
    ctx.reply('Я простой бот.  Используйте /start.');
});

// Обработчик текстовых сообщений
bot.on('text', (ctx) => {
    ctx.reply(`Вы написали: ${ctx.message.text}`);
});

// Обработка ошибок
bot.catch((err, ctx) => {
    console.error(`Ошибка при обработке обновления ${ctx.update.update_id}:`, err);
    ctx.reply('Упс! Произошла ошибка. Попробуйте позже.');
});

// Функция для установки вебхука (вызывается только один раз)
const setupWebhook = async (bot, vercelUrl) => {
    try {
        if (!vercelUrl) {
            console.warn('VERCEL_URL не определена.  Невозможно установить вебхук.');
            return;
        }

        const webhookUrl = `https://${vercelUrl}/api/bot`;
        await bot.telegram.setWebhook(webhookUrl);
        console.log(`Вебхук установлен на ${webhookUrl}`);
    } catch (error) {
        console.error('Ошибка при установке вебхука:', error);
    }
};

// Экспортируем обработчик для Vercel
module.exports = async (req, res) => {
    try {
        // Получаем VERCEL_URL из переменных окружения (Vercel устанавливает ее)
        const vercelUrl = process.env.VERCEL_URL;

        // Проверяем, нужно ли установить вебхук (только при первом развертывании)
        if (req.method === 'GET') {  // Проверка GET-запроса
            await setupWebhook(bot, vercelUrl); // Устанавливаем webhook только при GET запросе
            return res.status(200).send('Webhook установлен');
        }

        // Обрабатываем входящий запрос от Telegram
        await bot.handleUpdate(req.body, res);

        return res.status(200).send('OK');

    } catch (error) {
        console.error('Ошибка при обработке запроса:', error);
        return res.status(500).send('Internal Server Error');
    }
};
