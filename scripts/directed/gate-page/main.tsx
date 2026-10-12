// Direction-gate harness: renders one Remotion composition at its full size and exposes an exact seek.
import {Player, type PlayerRef} from '@remotion/player';
import {createRoot} from 'react-dom/client';
import {useEffect, useRef} from 'react';
import {remotionCompositions} from '../../../src/videos/remotionRegistry';

declare global { interface Window { gateSeek?: (frame: number) => Promise<void>; gateReady?: boolean } }
const q = new URLSearchParams(location.search);
const c = remotionCompositions[q.get('id')!];
const props = JSON.parse(q.get('props')!);

function App() {
  const ref = useRef<PlayerRef>(null);
  useEffect(() => {
    window.gateSeek = async (frame) => {
      ref.current!.seekTo(frame);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await document.fonts.ready;
    };
    window.gateReady = true;
  }, []);
  return <Player ref={ref} component={c.component} inputProps={props} durationInFrames={c.durationInFrames} fps={c.fps}
    compositionWidth={c.width} compositionHeight={c.height} style={{width: c.width, height: c.height}} acknowledgeRemotionLicense />;
}
createRoot(document.getElementById('root')!).render(<App />);
