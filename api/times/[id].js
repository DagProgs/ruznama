import { loadTimesById } from '../../utils';

export default function handler(req, res) {
  const { id } = req.query;
  const data = loadTimesById(id);
  if (!data) {
    return res.status(404).json({ error: 'Times not found' });
  }
  res.status(200).json(data);
}