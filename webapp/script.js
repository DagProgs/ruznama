// Telegram WebApp
const tg = window.Telegram?.WebApp;
tg.ready();

// Тема
document.body.classList.toggle('theme-dark', tg.colorScheme === 'dark');

// Элементы
const app = document.getElementById('app');
const locationsScreen = document.getElementById('locations-screen');
const prayerScreen = document.getElementById('prayer-screen');
const searchInput = document.getElementById('search-input');
const locationsList = document.getElementById('locations-list');
const backBtn = document.getElementById('back-btn');
const locationTitle = document.getElementById('location-title');

// Tabs
const tabs = document.querySelectorAll('.tab');
const tabContents = {
  today: document.getElementById('today-tab'),
  month: document.getElementById('month-tab'),
  quote: document.getElementById('quote-tab'),
};

// Текущее состояние
let selectedLocation = null;
let currentMonthOffset = 0; // 0 = текущий месяц

// Загрузка локаций
async function loadLocations() {
  try {
    const res = await fetch('/api/locations');
    const { locations } = await res.json();
    renderLocations(locations);
  } catch (e) {
    locationsList.innerHTML = '<p>Ошибка загрузки данных</p>';
  }
}

function renderLocations(locations) {
  locationsList.innerHTML = '';
  locations.forEach(loc => {
    const el = document.createElement('div');
    el.className = 'location-item';
    el.innerHTML = `<b>${loc.name_cities || loc.name_areas}</b>`;
    el.onclick = () => selectLocation(loc);
    locationsList.appendChild(el);
  });
}

// Поиск
searchInput.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('.location-item').forEach(el => {
    const text = el.textContent.toLowerCase();
    el.style.display = text.includes(q) ? 'block' : 'none';
  });
});

// Выбор локации
function selectLocation(loc) {
  selectedLocation = loc;
  locationTitle.textContent = loc.name_cities || loc.name_areas;
  locationsScreen.classList.remove('active');
  prayerScreen.classList.add('active');
  loadTodayTimes();
  loadCurrentMonth();
  loadQuote();
}

// Назад
backBtn.onclick = () => {
  prayerScreen.classList.remove('active');
  locationsScreen.classList.add('active');
};

// Времена на сегодня
async function loadTodayTimes() {
  try {
    const res = await fetch(`/api/times/${selectedLocation.id}`);
    const data = await res.json();

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const monthEn = now.toLocaleString('en-GB', { month: 'long' });
    const monthData = data[monthEn];
    const dayData = monthData?.[day];

    if (dayData) {
      document.getElementById('fajr').textContent = formatTime(dayData.Fajr);
      document.getElementById('sunrise').textContent = formatTime(dayData.Sunrise);
      document.getElementById('dhuhr').textContent = formatTime(dayData.Dhuhr);
      document.getElementById('asr').textContent = formatTime(dayData.Asr);
      document.getElementById('maghrib').textContent = formatTime(dayData.Maghrib);
      document.getElementById('isha').textContent = formatTime(dayData.Isha);
    }
  } catch (e) {
    console.error('Ошибка загрузки времён:', e);
  }
}

function formatTime(time) {
  return Array.isArray(time) ? `${String(time[0]).padStart(2, '0')}:${String(time[1]).padStart(2, '0')}` : '—';
}

// Таблица на месяц
async function loadCurrentMonth() {
  const now = new Date();
  now.setMonth(now.getMonth() + currentMonthOffset);
  const monthEn = now.toLocaleString('en-GB', { month: 'long' });
  const year = now.getFullYear();

  document.getElementById('month-title').textContent = `${monthEn} ${year}`;

  try {
    const res = await fetch(`/api/times/${selectedLocation.id}`);
    const data = await res.json();
    const monthData = data[monthEn];
    if (!monthData) {
      document.getElementById('month-table').innerHTML = 'Нет данных';
      return;
    }

    let table = `Д  Фадж. Шур. Зухр Аср  Магр. Иша\n`;
    table += '─'.repeat(40) + '\n';

    for (let d = 1; d <= 31; d++) {
      const dayStr = String(d).padStart(2, '0');
      const dayData = monthData[dayStr];
      const row = [
        String(d).padEnd(2),
        dayData ? formatTime(dayData.Fajr).slice(0, 4) : '    ',
        dayData ? formatTime(dayData.Sunrise).slice(0, 4) : '    ',
        dayData ? formatTime(dayData.Dhuhr).slice(0, 4) : '    ',
        dayData ? formatTime(dayData.Asr).slice(0, 4) : '    ',
        dayData ? formatTime(dayData.Maghrib).slice(0, 4) : '    ',
        dayData ? formatTime(dayData.Isha).slice(0, 4) : '    ',
      ].join(' ');
      table += row + '\n';
    }

    document.getElementById('month-table').innerHTML = `<pre>${table}</pre>`;
  } catch (e) {
    document.getElementById('month-table').innerHTML = 'Ошибка';
  }
}

// Навигация по месяцам
document.getElementById('prev-month').onclick = () => {
  currentMonthOffset--;
  loadCurrentMonth();
};
document.getElementById('next-month').onclick = () => {
  currentMonthOffset++;
  loadCurrentMonth();
};

// Хадис дня
async function loadQuote() {
  try {
    const res = await fetch('/api/quote');
    const quote = await res.json();
    document.getElementById('quote-text').textContent = quote.text;
    document.getElementById('quote-author').textContent = quote.author;
  } catch (e) {
    document.getElementById('quote-text').textContent = 'Не удалось загрузить хадис.';
    document.getElementById('quote-author').textContent = 'Система';
  }
}

// Переключение вкладок
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    Object.values(tabContents).forEach(tc => tc.classList.add('hidden'));
    
    tab.classList.add('active');
    const tabId = tab.dataset.tab;
    tabContents[tabId].classList.remove('hidden');
    
    if (tabId === 'month') loadCurrentMonth();
    if (tabId === 'quote') loadQuote();
  });
});

// Запуск
loadLocations();