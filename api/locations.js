import fs from 'fs';
import path from 'path';

const citiesAreasPath = path.join(process.cwd(), 'db', 'cities-areas.json');

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!fs.existsSync(citiesAreasPath)) {
      return res.status(500).json({ error: 'Файл cities-areas.json не найден' });
    }

    const data = JSON.parse(fs.readFileSync(citiesAreasPath, 'utf8'));
    const locations = [
      ...data.cities.map(c => ({ ...c, type: 'city' })),
      ...data.areas.map(a => ({ ...a, type: 'area' }))
    ];

    res.status(200).json({ locations });
  } catch (e) {
    console.error('Ошибка загрузки локаций:', e.message);
    res.status(500).json({ error: 'Не удалось загрузить данные' });
  }
}