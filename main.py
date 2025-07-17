import os
from fastapi import FastAPI, Request
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import ApplicationBuilder, CallbackQueryHandler, CommandHandler, ContextTypes
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("TELEGRAM_TOKEN")
app = FastAPI()

# Обработчик команды /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [
            InlineKeyboardButton("Открыть страницу 1", callback_data='page1'),
            InlineKeyboardButton("Открыть страницу 2", callback_data='page2')
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text("Выберите страницу:", reply_markup=reply_markup)

# Обработчик нажатий на кнопки
async def button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    if query.data == 'page1':
        url = "/page1.html"
    elif query.data == 'page2':
        url = "/page2.html"
    else:
        url = "/"

    # Отправляем сообщение с ссылкой
    await query.edit_message_text(text=f"Перейти по ссылке: {url}")

# Обработчик команд
async def handle_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.text == "/start":
        await start(update, context)

# Инициализация бота
application = ApplicationBuilder().token(TOKEN).build()
application.add_handler(CommandHandler("start", start))
application.add_handler(CallbackQueryHandler(button))

# Вебхуки или polling (здесь использую polling для Vercel)
@app.on_event("startup")
async def startup_event():
    # Запускаем бота в фоне
    application.run_polling()

# Для Vercel создадим маршруты
@app.get("/")
async def root():
    return {"message": "Bot is running"}

# Обслуживание страниц
@app.get("/{page_name}")
async def serve_page(page_name: str):
    if page_name == "page1":
        return await serve_html("page1.html")
    elif page_name == "page2":
        return await serve_html("page2.html")
    else:
        return {"error": "Page not found"}

async def serve_html(filename: str):
    with open(filename, "r", encoding="utf-8") as f:
        content = f.read()
    return HTMLResponse(content=content)

from starlette.responses import HTMLResponse
