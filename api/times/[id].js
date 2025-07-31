// api/times/[id].js
import fs from 'fs';
import path from 'path';

const timesDir = path.join(process.cwd(), 'db', 'cities-areas');

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не разрешён' });
  }

  const { id } = req.query;

  if (!id || !/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Неверный ID' });
  }

  const filePath = path.join(timesDir, `${id}.json`);

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Расписание не найдено' });
    }

    const data = fs.readFileSync(filePath, 'utf8');
    const times = JSON.parse(data);

    res.status(200).json(times);
  } catch (error) {
    console.error(`Ошибка загрузки расписания ${id}:`, error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}