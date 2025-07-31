import fs from 'fs';
import path from 'path';

const timesDir = path.join(process.cwd(), 'db', 'cities-areas');

export default function handler(req, res) {
  const { id } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const filePath = path.join(timesDir, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Данные не найдены' });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.status(200).json(data);
  } catch (e) {
    console.error(`Ошибка загрузки времён для ${id}:`, e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}