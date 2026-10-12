import type {Score} from '../music/score.ts';
import json from './score.json' with {type: 'json'};

export const featuredropScore = json as Score;
