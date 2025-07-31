// api/times-today.js
import { loadTimesById } from '../../index.js'; // или импортируйте из вашего файла

export default async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Например, передавайте ID города/района через параметры
  const locationId = req.query.id || 'some-default-id';

  const timesData = loadTimesById(locationId);
  if (!timesData) {
    return res.status(404).json({ error: 'Times not found' });
  }

  // Возвращайте данные в удобном формате
  const todayTimes = getPrayerTimesForToday(timesData);
  const quote = getRandomQuote().text;

  res.json({ times: todayTimes, quote });
};