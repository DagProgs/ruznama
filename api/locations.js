// api/locations.js
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const filePath = path.join(process.cwd(), 'db', 'cities-areas.json');
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(data);
    res.status(200).json({
      cities: json.cities || [],
      areas: json.areas || []
    });
  } catch (err) {
    res.status(500).json({ error: 'Не удалось прочитать файл', details: err.message });
  }
}