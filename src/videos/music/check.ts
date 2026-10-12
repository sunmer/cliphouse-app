// Validation rules for scores. Kept apart from score.ts so the browser runtime stays small.
import {ROLES, SCENE_TYPES} from '../vocab.ts';
import {LAYERS, REQUIRED_ROLES, SCALES, VOICES, durationSeconds, scoreRoles, totalBeats, type Score} from './score.ts';
import type {Role} from '../vocab.ts';

const eighth = (n: number) => Number.isInteger(n * 2);

/** Every rule a score must satisfy. An empty list means the score is valid. */
export function scoreErrors(s: Score): string[] {
  const errors: string[] = [];
  if (!(s.bpm >= 60 && s.bpm <= 180)) errors.push('bpm must be between 60 and 180');
  if (s.meter !== 4) errors.push('meter must be 4 (4/4)');
  if (s.fps !== 30) errors.push('fps must be 30');
  if (!Number.isInteger(s.root) || s.root < 36 || s.root > 72) errors.push('root must be a MIDI note from 36 to 72');
  if (!Object.hasOwn(SCALES, s.scale)) errors.push('unknown scale');
  if (!s.progression.length || s.progression.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) errors.push('progression must list scale degrees 0-6');
  if (!s.scenes.length) errors.push('score needs at least one scene');
  const frames = durationSeconds(s) * s.fps;
  if (Math.abs(frames - Math.round(frames)) > 1e-9) errors.push(`duration is ${frames} frames, not a whole number`);
  const roles = scoreRoles(s);
  s.scenes.forEach((scene, i) => {
    if (!Object.hasOwn(SCENE_TYPES, scene.type)) errors.push(`scene ${i}: unknown type ${scene.type}`);
    if (!Number.isInteger(scene.bars) || scene.bars < 1) errors.push(`scene ${i}: bars must be a whole number`);
    if (!eighth(scene.focusBeat) || scene.focusBeat < 0 || scene.focusBeat >= scene.bars * s.meter) errors.push(`scene ${i}: focusBeat is outside the scene`);
    if (scene.layers.some((l) => !(LAYERS as readonly string[]).includes(l))) errors.push(`scene ${i}: unknown layer`);
  });
  s.scenes.forEach((scene, i) => { if (new Set(scene.roles).size !== scene.roles.length) errors.push(`scene ${i}: a role repeats`); });
  for (const role of roles) if (!Object.hasOwn(ROLES, role)) errors.push(`unknown role ${role}`);
  for (const role of REQUIRED_ROLES) if (!roles.includes(role)) errors.push(`${role} must appear in a scene`);
  for (const role of s.optional) {
    if ((REQUIRED_ROLES as readonly string[]).includes(role)) errors.push(`${role} cannot be optional`);
    if (!roles.includes(role)) errors.push(`optional role ${role} is not in a scene`);
  }
  if (new Set(s.optional).size !== s.optional.length) errors.push('optional roles repeat');
  const seen = new Set<Role>();
  for (const slot of s.slots) {
    const scene = s.scenes[slot.scene];
    const at = `slot ${slot.role}`;
    if (seen.has(slot.role)) errors.push(`${at}: one slot per role`);
    seen.add(slot.role);
    if (!scene) { errors.push(`${at}: unknown scene ${slot.scene}`); continue; }
    if (!scene.roles.includes(slot.role)) errors.push(`${at}: role is not in scene ${slot.scene}`);
    if (!eighth(slot.beat) || !eighth(slot.beats)) errors.push(`${at}: use eighth-note positions`);
    if (slot.beat < 0 || slot.beats < 1 || slot.beat + slot.beats > scene.bars * s.meter) errors.push(`${at}: window is outside its scene`);
    if (!Number.isInteger(slot.maxHits) || slot.maxHits < 1 || slot.maxHits > slot.beats * 2) errors.push(`${at}: maxHits must fit eighth notes in the window`);
    if (!(VOICES as readonly string[]).includes(slot.voice)) errors.push(`${at}: unknown voice`);
  }
  for (const role of roles) if (!seen.has(role)) errors.push(`role ${role} has no accent slot`);
  const total = totalBeats(s);
  for (const r of s.risers) if (!eighth(r.beat) || r.beat < 0 || r.beats < 1 || r.beat + r.beats > total) errors.push('riser is outside the score');
  for (const b of s.impacts) if (!eighth(b) || b < 0 || b >= total) errors.push('impact is outside the score');
  if (!s.impacts.some((b) => b >= total * 2 / 3)) errors.push('one impact must sit in the last third');
  return errors;
}
