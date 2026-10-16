import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {howitworksScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const howitworksSchema = librarySchema(howitworksScore, ['brand','headline','list','cta'] as const);
export type HowitworksProps = z.infer<typeof howitworksSchema>;
