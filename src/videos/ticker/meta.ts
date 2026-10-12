import {beatMeta} from '../beat/schema.ts';
import {tickerScore} from './score.ts';

export const tickerMeta = beatMeta({
  id: 'ticker', name: 'Ticker', width: 1080, height: 1080, posterFrame: 150,
  motion: ['Marquee', 'Split-flap', 'Stamp', 'Kinetic type'],
}, tickerScore);
