/**
 * 🕌 Рузнама — Бот с рассылкой из mytext.json
 */
import { Telegraf } from 'telegraf';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// ========================================================
// 🛑 ПРОВЕРКА ТОКЕНОВ
// ========================================================
const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('❌ Не хватает переменных окружения: BOT_TOKEN, SUPABASE_URL, SUPABASE_ANON_KEY');
}

const bot = new Telegraf(BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========================================================
// 📁 ПУТИ К ФАЙЛАМ
// ========================================================
const citiesAreasPath = path.join(process.cwd(), 'db', 'cities-areas.json');
const timesDir = path.join(process.cwd(), 'db', 'cities-areas');
const myTextPath = path.join(process.cwd(), 'mytext.json');

// ========================================================
// 📄 ЗАГРУЗКА ТЕКСТА ИЗ mytext.json
// ========================================================
let customMessage = '📜 Сообщение не загружено.';
try {
  if (fs.existsSync(myTextPath)) {
    const data = JSON.parse(fs.readFileSync(myTextPath, 'utf8'));
    customMessage = data.message || customMessage;
    console.log('✅ Текст из mytext.json загружен');
  } else {
    console.warn('⚠️ Файл mytext.json не найден');
  }
} catch (e) {
  console.error('❌ Ошибка чтения mytext.json:', e.message);
}

// ========================================================
// 🌍 ЗАГРУЗКА ДАННЫХ: Города и районы
// ========================================================
let citiesAreasData = { cities: [], areas: [] };
try {
  if (fs.existsSync(citiesAreasPath)) {
    citiesAreasData = JSON.parse(fs.readFileSync(citiesAreasPath, 'utf8'));
    console.log(`✅ Загружено: ${citiesAreasData.cities.length} городов и ${citiesAreasData.areas.length} районов`);
  }
} catch (e) {
  console.error('❌ Ошибка чтения cities-areas.json:', e.message);
}

// ========================================================
// 🕰️ ЗАГРУЗКА ВРЕМЁН ПО ID
// ========================================================
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
    console.error(`❌ Ошибка загрузки ${filePath}:`, e.message);
    return null;
  }
}

// ========================================================
// 📅 ВРЕМЕНА НА СЕГОДНЯ
// ========================================================
function getPrayerTimesForToday(timesData) {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const monthEn = now.toLocaleString('en-GB', { month: 'long' });
  const monthRu = getRussianMonthName(monthEn);
  const monthRuCap = monthRu.charAt(0).toUpperCase() + monthRu.slice(1);
  const monthData = timesData[monthEn];
  if (!monthData) return `❌ Нет данных за ${monthRuCap}`;
  const dayData = monthData[day];
  if (!dayData) return `❌ Нет данных на ${day} ${monthRuCap}`;
  return {
    Fajr: dayData.Fajr,
    Sunrise: dayData.Sunrise,
    Dhuhr: dayData.Dhuhr,
    Asr: dayData.Asr,
    Maghrib: dayData.Maghrib,
    Isha: dayData.Isha
  };
}

// ========================================================
// 📆 МАППИНГ МЕСЯЦЕВ
// ========================================================
const russianToEnglishMonth = {
  январь: 'January', февраль: 'February', март: 'March', апрель: 'April',
  май: 'May', июнь: 'June', июль: 'July', август: 'August',
  сентябрь: 'September', октябрь: 'October', ноябрь: 'November', декабрь: 'December'
};

function getEnglishMonthName(ruMonth) {
  if (ruMonth === 'now') return new Date().toLocaleString('en-GB', { month: 'long' });
  const lower = ruMonth.toLowerCase().trim();
  return russianToEnglishMonth[lower] || null;
}

function getRussianMonthName(enMonth) {
  const entry = Object.entries(russianToEnglishMonth).find(([, eng]) => eng === enMonth);
  return entry ? entry[0] : enMonth;
}

// ========================================================
// 📍 МЕНЮ МЕСТА
// ========================================================
function getLocationMenu(locationId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🕌 Сегодня', callback_data: `day_${locationId}` }],
        [{ text: '📅 Текущий месяц', callback_data: `month_${locationId}` }],
        [{ text: '🗓️ Выбрать месяц', callback_data: `year_${locationId}` }],
        [],
        [{ text: '🔔 Подписаться', callback_data: `subscribe_${locationId}` }],
        [{ text: '🚫 Отписаться', callback_data: `unsubscribe_${locationId}` }],
        [{ text: '⬅️ Назад к списку', callback_data: 'cmd_cities_areas' }]
      ]
    }
  };
}

// ========================================================
// 🏠 ГЛАВНОЕ МЕНЮ
// ========================================================
const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '🏙️ Города', callback_data: 'cmd_cities' }, { text: '🏘️ Районы', callback_data: 'cmd_areas' }],
      [{ text: '📖 Хадис дня', callback_data: 'cmd_quote' }],
      [{ text: 'ℹ️ О боте', callback_data: 'cmd_about' }, { text: '📊 Статистика', callback_data: 'cmd_stats' }]
    ]
  }
};

// ========================================================
// 🚀 /start
// ========================================================
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const { error } } = await supabase.from('user_preferences').upsert({ id: userId, subscribed: true }, { onConflict: 'id' });
  if (error) console.error('❌ Supabase upsert:', error.message);

  ctx.replyWithHTML(
    `🕌 <b>Добро пожаловать в «Рузнама»</b>
«Самое лучшее деяние — это намаз, совершённый в начале отведённого для него времени». (Тирмизи)
📍 Выберите раздел или введите название.`,
    mainMenu
  );
});

// ========================================================
// 🔔 Подписка
// ========================================================
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from.id;
  await ctx.answerCbQuery();

  if (data.startsWith('subscribe_')) {
    const locationId = data.split('_')[1];
    await supabase.from('user_preferences').upsert({ id: userId, location_id: parseInt(locationId), subscribed: true });
    return ctx.editMessageText('✅ Вы подписались!', getLocationMenu(locationId));
  }

  if (data.startsWith('unsubscribe_')) {
    await supabase.from('user_preferences').update({ subscribed: false }).eq('id', userId);
    const locationId = data.split('_')[1];
    return ctx.editMessageText('🔕 Вы отписались.', getLocationMenu(locationId));
  }

  // ... остальные обработчики (для краткости опущены)
});

// ========================================================
// 📨 РАССЫЛКА ТЕКСТА ИЗ mytext.json (в 10:00)
// ========================================================
function scheduleCustomMessage() {
  setInterval(async () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // 🕰️ Время рассылки: 10:00
    if (currentHour === 12 && currentMinute === 32) {
      console.log('📤 Запущена рассылка из mytext.json');

      const { data: users, error } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('subscribed', true);

      if (error) {
        console.error('❌ Ошибка загрузки пользователей:', error.message);
        return;
      }

      for (const user of users) {
        try {
          await bot.telegram.sendMessage(user.id, customMessage, { parse_mode: 'HTML' });
        } catch (e) {
          console.warn(`⚠️ Не удалось отправить пользователю ${user.id}:`, e.message);
          if (e.description?.includes('blocked')) {
            await supabase.from('user_preferences').delete().eq('id', user.id);
          }
        }
      }

      console.log(`✅ Рассылка завершена: ${users.length} пользователей`);
    }
  }, 60000); // Проверка каждую минуту
}

// ========================================================
// 🕰️ РАССЫЛКА ЗА 2 МИНУТЫ ДО НАМАЗА
// ========================================================
function schedulePrayerNotifications() {
  setInterval(async () => {
    const now = new Date();
    const currentKey = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const { data: users, error } = await supabase
      .from('user_preferences')
      .select('id, location_id')
      .eq('subscribed', true);

    if (error || !users) return;

    for (const user of users) {
      const { id: userId, location_id } = user;
      const timesData = loadTimesById(location_id);
      if (!timesData) continue;

      const todayTimes = getPrayerTimesForToday(timesData);
      if (!todayTimes) continue;

      const prayers = {
        'Фаджр': todayTimes.Fajr,
        'Зухр': todayTimes.Dhuhr,
        'Аср': todayTimes.Asr,
        'Магриб': todayTimes.Maghrib,
        'Иша': todayTimes.Isha
      };

      for (const [name, time] of Object.entries(prayers)) {
        if (!time || !Array.isArray(time)) continue;
        const [pH, pM] = time;
        const notifyTime = new Date(now);
        notifyTime.setHours(pH, pM - 2, 0, 0);
        const notifyKey = `${notifyTime.getHours().toString().padStart(2, '0')}:${notifyTime.getMinutes().toString().padStart(2, '0')}`;

        if (currentKey === notifyKey) {
          const location = [...citiesAreasData.cities, ...citiesAreasData.areas].find(l => l.id == location_id);
          const locName = location?.name_cities || location?.name_areas || 'ваше место';
          try {
            await bot.telegram.sendMessage(
              userId,
              `🔔 <b>Через 2 минуты — ${name}</b>
📍 <i>${locName}</i>
🕰️ Время намаза: <code>${String(pH).padStart(2, '0')}:${String(pM).padStart(2, '0')}</code>`,
              { parse_mode: 'HTML' }
            );
          } catch (e) {
            if (e.description?.includes('blocked')) {
              await supabase.from('user_preferences').delete().eq('id', userId);
            }
          }
        }
      }
    }
  }, 60000);
}

// ========================================================
// 🚀 ЗАПУСК ВСЕХ ФУНКЦИЙ
// ========================================================
scheduleCustomMessage();       // Рассылка из mytext.json в 10:00
schedulePrayerNotifications(); // Уведомления за 2 мин до намаза

// ========================================================
// ☁️ Vercel Webhook
// ========================================================
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const body = await new Promise((resolve, reject) => {
      let data = ''; req.on('data', chunk => data += chunk); req.on('end', () => resolve(data)); req.on('error', reject);
    });
    await bot.handleUpdate(JSON.parse(body));
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('❌ Webhook error:', e.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

if (process.env.NODE_ENV !== 'production') {
  bot.launch().then(() => console.log('✅ Бот запущен локально'));
}