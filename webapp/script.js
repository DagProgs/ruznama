const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

document.body.classList.toggle('dark', tg.themeParams.bg_color?.startsWith('#121212'));

const API_BASE = '/api';
const searchInput = document.getElementById('search');
const resultsEl = document.getElementById('results');
const timesEl = document.getElementById('times');

searchInput.addEventListener('input', async (e) => {
  const query = e.target.value.trim();
  if (query.length < 2) {
    resultsEl.innerHTML = '';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/locations`);
    const locations = await res.json();
    const filtered = locations.filter(loc =>
      loc.name.toLowerCase().includes(query.toLowerCase())
    );

    resultsEl.innerHTML = filtered.map(loc => `
      <div class="location-item" data-id="${loc.id}">
        ${loc.type === 'city' ? '🏙️' : '🏘️'} ${loc.name}
      </div>
    `).join('');

    document.querySelectorAll('.location-item').forEach(item => {
      item.addEventListener('click', () => loadTimes(item.dataset.id, item.textContent.trim().replace(/^.\s/, '')));
    });
  } catch (err) {
    resultsEl.innerHTML = '<div class="error">Ошибка загрузки</div>';
  }
});

async function loadTimes(id, name) {
  try {
    const [timesRes, quoteRes] = await Promise.all([
      fetch(`${API_BASE}/times/${id}`).then(r => r.json()),
      fetch(`${API_BASE}/quote`).then(r => r.json())
    ]);

    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = today.toLocaleString('en-GB', { month: 'long' });
    const monthData = timesRes[month];
    const dayData = monthData?.[day];

    if (!dayData) {
      timesEl.innerHTML = `❌ Нет данных на ${day} ${month}`;
      return;
    }

    const format = (t) => t ? `${String(t[0]).padStart(2, '0')}:${String(t[1]).padStart(2, '0')}` : '—';

    timesEl.innerHTML = `
📍 <b>${name}</b>

✨ <b>Сегодня</b>
${day} ${month}

🕌 Фаджр   —  ${format(dayData.Fajr)}
🌅 Шурук   —  ${format(dayData.Sunrise)}
☀️ Зухр    —  ${format(dayData.Dhuhr)}
🌇 Аср     —  ${format(dayData.Asr)}
🌆 Магриб  —  ${format(dayData.Maghrib)}
🌙 Иша     —  ${format(dayData.Isha)}

📘 <b>Хадис дня</b>
❝ ${quoteRes.text} ❞
— ${quoteRes.author}
    `.trim();
  } catch (err) {
    timesEl.innerHTML = '❌ Ошибка загрузки расписания';
  }
}