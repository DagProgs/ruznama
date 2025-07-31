import fs from 'fs';
import path from 'path';

const timesDir = path.join(process.cwd(), 'db', 'cities-areas');

export default function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).end();

    const { id } = req.query;
    const filePath = path.join(timesDir, `${id}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Данные не найдены' });
    }

    const data = fs.readFileSync(filePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (e) {
    res.status(500).json({ error: 'Ошибка чтения времён' });
  }
}