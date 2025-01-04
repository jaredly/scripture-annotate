import { resolveNodePath } from './Home';
import { Data } from './types';

export function highlighter(latest: { current: Data }, pathname: string, w: Window) {
    const relevant = Object.values(latest.current.quotes).filter((q) => q.location.href === pathname);
    const hls: DOMRect[] = [];
    relevant.forEach((quote) => {
        const s = w.getSelection()!;
        s.removeAllRanges();
        s.addRange(new w.self.Range());
        const r = s.getRangeAt(0);
        r.setStart(resolveNodePath(quote.location.start.anchor, w.document), quote.location.start.offset);
        r.setEnd(resolveNodePath(quote.location.end.anchor, w.document), quote.location.end.offset);
        hls.push(...r.getClientRects());
        s.removeAllRanges();
    });
    const id = 'jesus-highlights';
    const already = w.document.getElementById(id);
    if (already) already.remove();
    const h = w.document.createElement('div');
    h.id = id;
    hls.forEach((box) => {
        const node = w.document.createElement('div');
        Object.assign(node.style, {
            position: 'absolute',
            left: box.left + 'px',
            top: box.top + 'px',
            width: box.width + 'px',
            height: box.height + 'px',
            backgroundColor: '#ffd786',
            outline: '2px solid #ffd786',
            borderRadius: '3px',
            // opacity: 0.1,
            zIndex: 0,
        });
        h.append(node);
    });
    w.document.body.childNodes.forEach((node) => {
        if (node instanceof w.self.HTMLElement) {
            node.style.position = 'relative';
            node.style.zIndex = '10';
        }
    });
    w.document.body.append(h);
}
