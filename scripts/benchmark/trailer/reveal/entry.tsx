import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Reveal} from './Reveal';
import './font.css';

registerRoot(() => <Composition id="Reveal" component={Reveal} width={1080} height={1920} fps={30} durationInFrames={480} />);
