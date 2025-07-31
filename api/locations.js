import fs from 'fs';
import path from 'path';

const citiesAreasPath = path.join(process.cwd(), 'db', 'cities-areas.json');

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не разрешён' });
  }

  try {
    const data = fs.readFileSync(citiesAreasPath, 'utf8');
    const locations = JSON.parse(data);

    const allLocations = [
      ...locations.cities.map(c => ({ id: c.id, name: c.name_cities, type: 'city' })),
      ...locations.areas.map(a => ({ id: a.id, name: a.name_areas, type: 'area' }))
    ];

    res.status(200).json(allLocations);
  } catch (error) {
    console.error('Ошибка /api/locations:', error);
    res.status(500).json({ error: 'Не удалось загрузить данные' });
  }
}