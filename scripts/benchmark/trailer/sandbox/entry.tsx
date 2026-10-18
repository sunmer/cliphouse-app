import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Trailer} from './submission';
import './font.css';

registerRoot(() => <Composition id="Trailer" component={Trailer} width={1920} height={1080} fps={30} durationInFrames={390} />);
