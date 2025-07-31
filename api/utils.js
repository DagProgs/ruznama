import fs from 'fs';
import path from 'path';

const citiesAreasPath = path.join(process.cwd(), 'db', 'cities-areas.json');
const timesDir = path.join(process.cwd(), 'db', 'cities-areas');
const quotesPath = path.join(process.cwd(), 'quotes.json');

export let citiesAreasData = { cities: [], areas: [] };

try {
  if (fs.existsSync(citiesAreasPath)) {
    citiesAreasData = JSON.parse(fs.readFileSync(citiesAreasPath, 'utf8'));
  }
} catch (e) {
  console.error('Error reading cities-areas.json:', e.message);
}

// Функции поиска и загрузки
export function searchLocations(query) {
  const allLocations = [...citiesAreasData.cities, ...citiesAreasData.areas];
  const lowerQuery = query.toLowerCase().trim();
  return allLocations
    .filter((loc) => (loc.name_cities || loc.name_areas || '').toLowerCase().includes(lowerQuery))
    .slice(0, 10);
}

export function loadTimesById(id) {
  const filePath = path.join(timesDir, `${id}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(data);
      return Object.keys(parsed).length ? parsed : null;
    }
    return null;
  } catch (e) {
    console.error(`Error loading ${filePath}:`, e.message);
    return null;
  }
}

export let quotes = [];

export function loadQuotes() {
  try {
    if (fs.existsSync(quotesPath)) {
      quotes = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
    } else {
      quotes = [{ text: 'Хадис временно недоступен.', author: 'Администрация' }];
    }
  } catch (e) {
    console.error('Error loading quotes.json:', e.message);
    quotes = [{ text: 'Ошибка загрузки хадиса.', author: 'Администрация' }];
  }
}

export function getRandomQuote() {
  if (!quotes.length) return { text: 'Нет доступных хадисов.', author: 'Система' };
  return quotes[Math.floor(Math.random() * quotes.length)];
}