import type {TemplateMeta} from '../../videos/vocab.ts';
import {tickerMeta} from '../../videos/ticker/meta.ts';
import type {ListGroup} from '../lists.ts';

// Gate 1: the current Ticker design, unchanged except that its board is a list of one to three items.
export const tickerList: ListGroup = {id: 'offers', label: 'Board items', storage: {kind: 'roles', roles: ['point1', 'point2', 'point3']}, min: 1, max: 3, itemMax: 16};

export const tickerListMeta: TemplateMeta = {...tickerMeta, id: 'tickerlist', name: 'Ticker (list)'};
