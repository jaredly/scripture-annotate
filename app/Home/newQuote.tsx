import { genId } from '~/routes/genId';
import type { NodePath, Quote } from './types';
import { getVerse } from './findClosestPreviousWithClass';

export function newQuote(raw: string, w: Window, start: NodePath[], range: Range, end: NodePath[], chapter: string) {
    const id = genId();
    const quote: Quote = {
        id,
        edited: raw,
        created: Date.now(),
        updated: Date.now(),
        raw,
        location: {
            href: w.location.pathname,
            start: {
                anchor: start,
                offset: range.startOffset,
                verse: getVerse(range.startContainer),
            },
            end: { anchor: end, offset: range.endOffset, verse: getVerse(range.endContainer) },
            chapter,
        },
        notes: '',
        tags: [],
    };
    return quote;
}
