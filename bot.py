import os
import logging
from flask import Flask, request, Response

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    ContextTypes,
)
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла
load_dotenv()

# Получаем токен бота из переменной окружения
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
if not TELEGRAM_BOT_TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN не найден в .env файле. Пожалуйста, установите его.")

# --- КОНФИГУРАЦИЯ ---
# Укажите реальные URL, по которым будут доступны ваши HTML файлы.
# Если вы планируете размещать их в Vercel в папке public, то URL будет примерно таким:
# https://{your-vercel-app-url}/page1.html
# Замените {your-vercel-app-url} на домен вашего Vercel проекта, который вы получите ПОСЛЕ развертывания.
# Если файлы будут доступны по другому адресу, укажите его.
PAGE1_URL = "https://example.com/page1.html" # <<< ЗАМЕНИТЕ ЭТОТ URL
PAGE2_URL = "https://example.com/page2.html" # <<< ЗАМЕНИТЕ ЭТОТ URL
# --------------------

# Настройка логирования
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# Обработчик команды /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Отправляет приветственное сообщение и кнопки."""
    keyboard = [
        [
            InlineKeyboardButton("Открыть Страницу 1", callback_data="open_page1"),
            InlineKeyboardButton("Открыть Страницу 2", callback_data="open_page2"),
        ],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text("Выберите страницу:", reply_markup=reply_markup)

# Обработчик нажатий на кнопки (CallbackQuery)
async def button(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обрабатывает нажатия на inline кнопки."""
    query = update.callback_query
    await query.answer()  # Отвечаем Telegram, что нажатие обработано

    if query.data == "open_page1":
        url_to_open = PAGE1_URL
        text_message = f"Вот ссылка на Страницу 1: {url_to_open}"
    elif query.data == "open_page2":
        url_to_open = PAGE2_URL
        text_message = f"Вот ссылка на Страницу 2: {url_to_open}"
    else:
        text_message = "Неизвестная команда."
        url_to_open = None # Не добавляем ссылку, если команда неизвестна

    # Отправляем пользователю сообщение со ссылкой
    if url_to_open:
        # Inline клавиатура для возврата к главному меню
        keyboard = [
            [InlineKeyboardButton("Назад к выбору", callback_data="back_to_menu")],
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text=text_message, reply_markup=reply_markup)
    else:
        await query.edit_message_text(text=text_message)


# Обработчик для возврата к главному меню
async def back_to_menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Возвращает пользователя к главному меню."""
    query = update.callback_query
    await query.answer()

    keyboard = [
        [
            InlineKeyboardButton("Открыть Страницу 1", callback_data="open_page1"),
            InlineKeyboardButton("Открыть Страницу 2", callback_data="open_page2"),
        ],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await query.edit_message_text("Выберите страницу:", reply_markup=reply_markup)


# --- Настройка Flask приложения для Vercel ---
app = Flask(__name__)

# API Endpoint для Telegram Webhook
@app.route(f'/webhook/{TELEGRAM_BOT_TOKEN}', methods=['GET', 'POST'])
async def webhook_handler():
    if request.method == "POST":
        update_data = request.json
        logger.info(f"Received update: {update_data}")

        # Создаем ApplicationBuilder и передаем ему update_data
        # Внимание: ApplicationBuilder создает новый экземпляр Application для каждого запроса,
        # что не очень эффективно, но является стандартным способом для Flask/Vercel.
        # Более продвинутые варианты могут использовать один экземпляр Application.
        app_builder = Application.builder().token(TELEGRAM_BOT_TOKEN)
        application = await app_builder.build()

        # Создаем объект Update из полученных данных
        update = Update.de_json(update_data, application.bot)

        # Передаем Update обработчикам
        await application.process_update(update)

        return Response("OK", status=200)
    else: # GET запрос для проверки работоспособности webhook
        return Response("Hello from Telegram Bot Webhook!", status=200)

@app.route('/')
def index():
    # Это для проверки, что Vercel приложение работает
    return "Telegram bot is running. Webhook is configured at /webhook/{TELEGRAM_BOT_TOKEN}"


# --- Инициализация и запуск бота (только для локальной разработки) ---
def main_local():
    """Запускает бота локально."""
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

    # Регистрируем обработчики
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(button, pattern='^open_page')) # Обрабатываем кнопки, начинающиеся с 'open_page'
    application.add_handler(CallbackQueryHandler(back_to_menu, pattern='^back_to_menu$')) # Обрабатываем кнопку возврата

    logger.info("Bot started locally and polling...")
    # Запускаем бота в режиме polling (для локальной разработки)
    application.run_polling(poll_interval=3)

if __name__ == "__main__":
    # При запуске скрипта напрямую, мы можем выбрать запуск локально
    # или полагаться на Flask/Vercel.
    # Для Vercel, Flask приложение запускается автоматически.
    # Для локальной разработки, раскомментируйте строку ниже:
    # main_local()

    # Этот блок кода будет выполнен, когда Vercel запустит Flask приложение
    # Если вы запускаете скрипт локально, вам нужно будет запустить
    # Flask приложение отдельно (например, flask run) или раскомментировать main_local()
    logger.info("Flask app started for Vercel deployment.")
    # В продакшене (Vercel), Flask будет запущен Vercel'ом.
    # Локально можно запустить так:
    # from waitress import serve
    # serve(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
    # Или просто: flask --app bot run --debug
    pass