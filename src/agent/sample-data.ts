// Fixed numbers that some templates draw and no prop can change. Agents avoid these templates when the
// project has no matching facts, because the video would show made-up data next to the user's brand.
// Kept here, not in the template meta, so listing a template does not change its source package.
export const FIXED_SAMPLE_DATA: Record<string, string[]> = {
  bento: ['A "Score" tile that counts to 99', 'An "Adoption" ring that fills to 82%'],
  pulse: ['A chart badge that counts to +84%', 'Bars labeled 48%, 72%, and 94%'],
  poll: ['A vote split between 52% and 72%'],
};

export const fixedSampleData = (template: string) => FIXED_SAMPLE_DATA[template] ?? [];
