import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Versus, durationInFrames} from './Versus';
import './font.css';

registerRoot(() => <Composition id="Versus" component={Versus} width={1080} height={1920} fps={30} durationInFrames={durationInFrames} />);
