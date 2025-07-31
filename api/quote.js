import fs from 'fs';
import path from 'path';

const quotesPath = path.join(process.cwd(), 'quotes.json');
let quotes = [];

function loadQuotes() {
  try {
    if (fs.existsSync(quotesPath)) {
      quotes = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
    } else {
      quotes = [{ text: 'Хадис временно недоступен.', author: 'Администрация' }];
    }
  } catch (e) {
    quotes = [{ text: 'Ошибка загрузки хадиса.', author: 'Администрация' }];
  }
}

loadQuotes();

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не разрешён' });
  }

  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  res.status(200).json(quote);
}