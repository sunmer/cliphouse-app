import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {TickerBeat} from '../../src/poc/tickerbeat/TickerBeat';
import {tickerBeatMeta as m} from '../../src/poc/tickerbeat/meta';

const Root: React.FC = () => <Composition id="tickerbeat" component={TickerBeat as React.FC<never>} width={m.width} height={m.height} fps={m.fps}
  durationInFrames={m.durationInFrames} defaultProps={{} as never} />;
registerRoot(Root);
