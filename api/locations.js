import fs from 'fs';
import path from 'path';

const citiesAreasPath = path.join(process.cwd(), 'db', 'cities-areas.json');

export default function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).end();

    const data = JSON.parse(fs.readFileSync(citiesAreasPath, 'utf8'));
    const locations = [
      ...data.cities.map(c => ({ id: c.id, name: c.name_cities, type: 'city' })),
      ...data.areas.map(a => ({ id: a.id, name: a.name_areas, type: 'area' }))
    ];

    res.json(locations);
  } catch (e) {
    res.status(500).json({ error: 'Не удалось загрузить локации' });
  }
}