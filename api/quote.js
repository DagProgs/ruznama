import fs from 'fs';
import path from 'path';

const quotesPath = path.join(process.cwd(), 'quotes.json');

export default function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).end();

    const quotes = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
    const quote = quotes[Math.floor(Math.random() * quotes.length)];

    res.json(quote);
  } catch (e) {
    res.status(500).json({ text: 'Хадис временно недоступен', author: 'Администрация' });
  }
}