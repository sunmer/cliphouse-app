// Renders the Ticker Beat mix off the main thread with the same code any export uses.
import {renderTicker, tickerPlan} from './sound';

self.onmessage = (event: MessageEvent<{id: number; count: number}>) => {
  const {left, right} = renderTicker(tickerPlan(event.data.count));
  (self as unknown as Worker).postMessage({id: event.data.id, left, right}, [left.buffer, right.buffer]);
};
