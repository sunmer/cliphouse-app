import React from 'react';
import {Composition} from 'remotion';
import {remotionCompositions} from '../videos/remotionRegistry';
import manifest from '../catalog/manifest.json';

export const RemotionRoot: React.FC = () => (
  <>
    {Object.entries(remotionCompositions).map(([id, c]) => (
      <Composition
        key={id}
        id={id}
        component={c.component}
        schema={c.schema}
        width={c.width}
        height={c.height}
        fps={c.fps}
        durationInFrames={c.durationInFrames}
        defaultProps={manifest.variants.find((v) => v.template === id)!.props as never}
      />
    ))}
  </>
);
