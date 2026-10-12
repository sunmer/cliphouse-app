import {musicMeta} from '../music/schema.ts';
import {eventcountdownScore} from './score.ts';

export const eventcountdownMeta = musicMeta({
  id: 'eventcountdown', name: 'Event Countdown', width: 1080, height: 1350, posterFrame: 96,
  motion: ['Ticket stub', 'Countdown timer', 'Stagger list', 'Stamp'],
}, eventcountdownScore);
