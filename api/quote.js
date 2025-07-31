import { getRandomQuote } from '../../utils';

export default function handler(req, res) {
  const quote = getRandomQuote();
  res.status(200).json(quote);
}