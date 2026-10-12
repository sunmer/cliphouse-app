import baseCss from '../hyperframes/shared/base.css?raw';
import baseJs from '../hyperframes/shared/base.js?raw';
import signal from '../hyperframes/signal/index.html?raw';
import ringstat from '../hyperframes/ringstat/index.html?raw';
import eventpass from '../hyperframes/eventpass/index.html?raw';
import pullquote from '../hyperframes/pullquote/index.html?raw';
import pricedrop from '../hyperframes/pricedrop/index.html?raw';
import featuredrop from '../hyperframes/featuredrop/index.html?raw';
import eventcountdown from '../hyperframes/eventcountdown/index.html?raw';
import musicJs from '../hyperframes/shared/music.js?raw';

const withShared = (html: string) => html.replace('__BASE_CSS__', baseCss).replace('__BASE_JS__', baseJs).replace('__MUSIC_JS__', () => musicJs);

export const hyperframesSources: Record<string, string> = {
  signal: withShared(signal),
  ringstat: withShared(ringstat),
  eventpass: withShared(eventpass),
  pullquote: withShared(pullquote),
  pricedrop: withShared(pricedrop),
  featuredrop: withShared(featuredrop),
  eventcountdown: withShared(eventcountdown),
};
