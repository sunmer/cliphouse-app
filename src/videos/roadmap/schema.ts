import type {z} from 'zod';
import {librarySchema} from '../../music/schema.ts';
import {roadmapScore} from './score.ts';

// Sound comes from the music library: audio is {enabled, track}.
export const roadmapSchema = librarySchema(roadmapScore, ['brand','headline','date','list','cta'] as const);
export type RoadmapProps = z.infer<typeof roadmapSchema>;
