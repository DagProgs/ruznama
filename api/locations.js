import { citiesAreasData, searchLocations } from '../utils';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  const results = searchLocations(query);
  res.status(200).json({ results });
}