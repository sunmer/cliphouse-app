import type {VideoSchema} from './contract.ts';
import {bentoSchema} from './bento/schema.ts';
import {blackfridaySchema} from './blackfriday/schema.ts';
import {collageSchema} from './collage/schema.ts';
import {countdownSchema} from './countdown/schema.ts';
import {cursorSchema} from './cursor/schema.ts';
import {endscreenSchema} from './endscreen/schema.ts';
import {flexSchema} from './flex/schema.ts';
import {folioSchema} from './folio/schema.ts';
import {glassSchema} from './glass/schema.ts';
import {kineticSchema} from './kinetic/schema.ts';
import {lowerthirdSchema} from './lowerthird/schema.ts';
import {podcastSchema} from './podcast/schema.ts';
import {prismSchema} from './prism/schema.ts';
import {pulseSchema} from './pulse/schema.ts';
import {risoSchema} from './riso/schema.ts';
import {showreelSchema} from './showreel/schema.ts';
import {sliceSchema} from './slice/schema.ts';
import {spotlightSchema} from './spotlight/schema.ts';
import {stackSchema} from './stack/schema.ts';
import {swissSchema} from './swiss/schema.ts';
import {terminalSchema} from './terminal/schema.ts';
import {testimonialSchema} from './testimonial/schema.ts';
import {tickerSchema} from './ticker/schema.ts';
import {wordmarkSchema} from './wordmark/schema.ts';
import {wrappedSchema} from './wrapped/schema.ts';
import {ytintroSchema} from './ytintro/schema.ts';
import {hiringSchema} from './hiring/schema.ts';
import {livestreamSchema} from './livestream/schema.ts';
import {barchartSchema} from './barchart/schema.ts';
import {counterSchema} from './counter/schema.ts';
import {cybermondaySchema} from './cybermonday/schema.ts';
import {apppromoSchema} from './apppromo/schema.ts';
import {pricingSchema} from './pricing/schema.ts';
import {casestudySchema} from './casestudy/schema.ts';
import {featureSchema} from './feature/schema.ts';
import {quotecardSchema} from './quotecard/schema.ts';
import {linechartSchema} from './linechart/schema.ts';
import {flashsaleSchema} from './flashsale/schema.ts';
import {comingsoonSchema} from './comingsoon/schema.ts';
import {announcementSchema} from './announcement/schema.ts';
import {teamintroSchema} from './teamintro/schema.ts';
import {partnershipSchema} from './partnership/schema.ts';
import {newsletterSchema} from './newsletter/schema.ts';
import {anniversarySchema} from './anniversary/schema.ts';
import {grandopeningSchema} from './grandopening/schema.ts';
import {beforeafterSchema} from './beforeafter/schema.ts';
import {timelineSchema} from './timeline/schema.ts';
import {quizSchema} from './quiz/schema.ts';
import {toplistSchema} from './toplist/schema.ts';
import {pollSchema} from './poll/schema.ts';
import {progressSchema} from './progress/schema.ts';
import {comparisonSchema} from './comparison/schema.ts';
import {newyearSchema} from './newyear/schema.ts';
import {creditsSchema} from './credits/schema.ts';
import {titlecardSchema} from './titlecard/schema.ts';
import {subscribeSchema} from './subscribe/schema.ts';
import {thankyouSchema} from './thankyou/schema.ts';
import {birthdaySchema} from './birthday/schema.ts';
import {valentinesSchema} from './valentines/schema.ts';
import {giveawaySchema} from './giveaway/schema.ts';
import {channeltrailerSchema} from './channeltrailer/schema.ts';
import {gamingintroSchema} from './gamingintro/schema.ts';
import {speakerSchema} from './speaker/schema.ts';
import {agendaSchema} from './agenda/schema.ts';
import {ticketsSchema} from './tickets/schema.ts';
import {webinarSchema} from './webinar/schema.ts';
import {orbit3dSchema} from './orbit3d/schema.ts';
import {phototitleSchema} from './phototitle/schema.ts';
import {portraitcardSchema} from './portraitcard/schema.ts';
import {travelintroSchema} from './travelintro/schema.ts';
import {beforeafterphotoSchema} from './beforeafterphoto/schema.ts';
import {slideshowSchema} from './slideshow/schema.ts';
import {photolowerSchema} from './photolower/schema.ts';
import {glitchSchema} from './glitch/schema.ts';
import {liquidSchema} from './liquid/schema.ts';
import {magazineSchema} from './magazine/schema.ts';
import {doodleSchema} from './doodle/schema.ts';
import {pixelSchema} from './pixel/schema.ts';
import {papercutSchema} from './papercut/schema.ts';
import {claySchema} from './clay/schema.ts';
import {iso3dSchema} from './iso3d/schema.ts';
import {chrome3dSchema} from './chrome3d/schema.ts';
import {countdown3dSchema} from './countdown3d/schema.ts';
import {turntableSchema} from './turntable/schema.ts';
import {title3dSchema} from './title3d/schema.ts';
import {photoquoteSchema} from './photoquote/schema.ts';
import {vhsintroSchema} from './vhsintro/schema.ts';
import {logo3dSchema} from './logo3d/schema.ts';
import {signalSchema} from './signal/schema.ts';
import {ringstatSchema} from './ringstat/schema.ts';
import {eventpassSchema} from './eventpass/schema.ts';
import {pullquoteSchema} from './pullquote/schema.ts';
import {pricedropSchema} from './pricedrop/schema.ts';

// Schemas without React components, so build scripts and the share server can validate props.
export const schemas = {
  bento: bentoSchema, blackfriday: blackfridaySchema, collage: collageSchema, countdown: countdownSchema,
  cursor: cursorSchema, endscreen: endscreenSchema, flex: flexSchema, folio: folioSchema, glass: glassSchema,
  kinetic: kineticSchema, lowerthird: lowerthirdSchema, podcast: podcastSchema, prism: prismSchema,
  pulse: pulseSchema, riso: risoSchema, showreel: showreelSchema, slice: sliceSchema, spotlight: spotlightSchema,
  stack: stackSchema, swiss: swissSchema, terminal: terminalSchema, testimonial: testimonialSchema,
  ticker: tickerSchema, wordmark: wordmarkSchema, wrapped: wrappedSchema, ytintro: ytintroSchema,
  hiring: hiringSchema, livestream: livestreamSchema, barchart: barchartSchema, counter: counterSchema, cybermonday: cybermondaySchema,
  apppromo: apppromoSchema,
  pricing: pricingSchema,
  casestudy: casestudySchema,
  feature: featureSchema,
  quotecard: quotecardSchema,
  linechart: linechartSchema,
  flashsale: flashsaleSchema,
  comingsoon: comingsoonSchema, announcement: announcementSchema, teamintro: teamintroSchema, partnership: partnershipSchema,
  newsletter: newsletterSchema, anniversary: anniversarySchema, grandopening: grandopeningSchema,
  beforeafter: beforeafterSchema, timeline: timelineSchema, quiz: quizSchema, toplist: toplistSchema, poll: pollSchema,
  progress: progressSchema, comparison: comparisonSchema,
  newyear: newyearSchema, credits: creditsSchema, titlecard: titlecardSchema, subscribe: subscribeSchema,
  thankyou: thankyouSchema, birthday: birthdaySchema, valentines: valentinesSchema,
  giveaway: giveawaySchema,
  channeltrailer: channeltrailerSchema,
  gamingintro: gamingintroSchema,
  speaker: speakerSchema,
  agenda: agendaSchema,
  tickets: ticketsSchema,
  webinar: webinarSchema,
  orbit3d: orbit3dSchema,
  phototitle: phototitleSchema,
  portraitcard: portraitcardSchema,
  travelintro: travelintroSchema,
  beforeafterphoto: beforeafterphotoSchema,
  slideshow: slideshowSchema,
  photolower: photolowerSchema,
  glitch: glitchSchema,
  liquid: liquidSchema,
  magazine: magazineSchema,
  doodle: doodleSchema,
  pixel: pixelSchema,
  papercut: papercutSchema,
  clay: claySchema,
  iso3d: iso3dSchema,
  chrome3d: chrome3dSchema,
  countdown3d: countdown3dSchema,
  turntable: turntableSchema,
  title3d: title3dSchema,
  photoquote: photoquoteSchema,
  vhsintro: vhsintroSchema,
  logo3d: logo3dSchema,
  signal: signalSchema,
  ringstat: ringstatSchema,
  eventpass: eventpassSchema,
  pullquote: pullquoteSchema,
  pricedrop: pricedropSchema,
} as unknown as Record<string, VideoSchema>;
