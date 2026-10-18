import React from 'react';
import {AbsoluteFill, Composition} from 'remotion';
import {EffectsDemo} from './EffectsDemo';

const Label: React.FC<{text: string}> = ({text}) => (
  <div style={{position: 'absolute', left: 28, top: 28, padding: '10px 16px', borderRadius: 6, background: 'rgba(0,0,0,0.72)', color: 'white', font: '700 30px Arial'}}>{text}</div>
);

const Compare: React.FC = () => (
  <AbsoluteFill style={{flexDirection: 'row', background: 'black'}}>
    {(['before', 'after'] as const).map((mode) => (
      <div key={mode} style={{position: 'relative', width: 1080, height: 1080, overflow: 'hidden'}}>
        <EffectsDemo mode={mode} />
        <Label text={mode.toUpperCase()} />
      </div>
    ))}
  </AbsoluteFill>
);

// Review-only compositions. They are not in the public catalog.
export const EffectsDemoRoot: React.FC = () => (
  <>
    <Composition id="effects-before" component={EffectsDemo} width={1080} height={1080} fps={30} durationInFrames={300} defaultProps={{mode: 'before' as const}} />
    <Composition id="effects-after" component={EffectsDemo} width={1080} height={1080} fps={30} durationInFrames={300} defaultProps={{mode: 'after' as const}} />
    <Composition id="effects-compare" component={Compare} width={2160} height={1080} fps={30} durationInFrames={300} />
  </>
);
