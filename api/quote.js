import fs from 'fs';
import path from 'path';

const quotesPath = path.join(process.cwd(), 'db', 'quotes.json');

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!fs.existsSync(quotesPath)) {
      return res.status(500).json({ text: 'Хадис временно недоступен.', author: 'Администрация' });
    }

    const quotes = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
    const random = quotes[Math.floor(Math.random() * quotes.length)];
    res.status(200).json(random);
  } catch (e) {
    console.error('Ошибка загрузки хадиса:', e.message);
    res.status(500).json({ text: 'Ошибка загрузки хадиса.', author: 'Администрация' });
  }
}