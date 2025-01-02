import { existsSync, readFileSync, writeFileSync } from 'fs';
import type { Route } from './+types/home';
// import { Welcome } from '../welcome/welcome';
// import AdmZip from 'adm-zip';
// import { parse } from 'node-html-parser';
import { useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';

export function meta({}: Route.MetaArgs) {
    return [{ title: 'New React Router App' }, { name: 'description', content: 'Welcome to React Router!' }];
}

type NodePath =
    | { type: 'id'; id: string }
    | { type: 'tag'; tag: string; index: number }
    | { type: 'class'; class: string; index: number }
    | { type: 'child'; index: number };

type NodeLoc = { anchor: NodePath[]; offset: number };
type Location = { href: string; start: NodeLoc; end: NodeLoc };

type Data = {
    tags: Record<string, { id: string; color: string; key: string; title: string }>;
    quotes: Record<string, { id: string; location: Location; raw: string; edited: string; notes: string; tags: string[] }>;
};

const resolveNodePath = (path: NodePath[], document: Document) => {
    let at: Element | Text | Document = document;
    for (let item of path) {
        switch (item.type) {
            case 'id':
                at = document.getElementById(item.id)!;
                continue;
            case 'tag':
                at = document.querySelectorAll(item.tag).item(item.index);
                continue;
            case 'class':
                at = document.querySelectorAll(item.class).item(item.index);
                continue;
            case 'child':
                at = at.childNodes[item.index] as Element;
                continue;
        }
    }
    return at;
};

const getNodePath = (node: Node): NodePath[] => {
    if (node instanceof node.ownerDocument!.defaultView!.Text) {
        if (!node.parentElement) throw new Error('no parent');
        const parent = getNodePath(node.parentElement);
        const at = [...node.parentElement.childNodes].indexOf(node);
        if (at === -1) {
            throw new Error(`not a child of parent`);
        }
        return [...parent, { type: 'child', index: at }];
    }
    if (node instanceof node.ownerDocument!.defaultView!.Element) {
        if (node.id != '') {
            const got = node.ownerDocument.getElementById(node.id);
            if (got === node) return [{ type: 'id', id: node.id }];
            console.log('bad id?', node.id);
        }
        if (node.className != '') {
            const qry = node.className
                .split(' ')
                .map((n) => '.' + n)
                .join('');
            const others = node.ownerDocument.querySelectorAll(qry);
            const at = [...others].indexOf(node);
            if (at !== -1) {
                return [{ type: 'class', class: qry, index: at }];
            }
            console.log('bad cls?', qry);
        }
        const others = node.ownerDocument.querySelectorAll(node.tagName);
        const at = [...others].indexOf(node);
        if (at !== -1) return [{ type: 'tag', index: at, tag: node.tagName }];
        console.log('bad tag?', at);
    }
    if (!node.parentElement) throw new Error(`no parent`);

    const parent = getNodePath(node.parentElement);
    const at = [...node.parentElement.childNodes].indexOf(node as ChildNode);
    if (at === -1) {
        throw new Error(`not a child of parent`);
    }
    return [...parent, { type: 'child', index: at }];
};

const fp = './data.json';
const initial: Data = { quotes: {}, tags: {} };
export async function loader({ params }: Route.LoaderArgs): Promise<Data> {
    if (!existsSync(fp)) {
        return initial;
    }
    const data = JSON.parse(readFileSync(fp, 'utf-8'));
    return data;
}

export async function action({ request }: Route.ActionArgs) {
    let formData = await request.formData();
    const remove = await formData.get('remove');
    if (typeof remove === 'string') {
        const data: Data = existsSync(fp) ? JSON.parse(readFileSync(fp, 'utf-8')) : initial;
        delete data.quotes[remove];
        writeFileSync(fp, JSON.stringify(data));
        return true;
    }
    let quote = JSON.parse((await formData.get('quote')) as string);

    const data: Data = existsSync(fp) ? JSON.parse(readFileSync(fp, 'utf-8')) : initial;

    data.quotes[quote.id] = quote;

    writeFileSync(fp, JSON.stringify(data));
    return true;
}

const useLatest = <T,>(v: T): { current: T } => {
    const ref = useRef(v);
    ref.current = v;
    return ref;
};

export default function Home({ loaderData }: Route.ComponentProps) {
    const [url, setUrl] = useState<undefined | string>(undefined);
    const ref = useRef<HTMLIFrameElement>(null);
    const fetcher = useFetcher();

    const latest = useLatest(loaderData);

    useEffect(() => {
        const w = ref.current?.contentWindow;
        if (w) {
            highlighter(latest, w.location.pathname, w);
        }
    }, [loaderData]);

    return (
        <div>
            <div
                style={{
                    // background: 'white',
                    // color: 'black',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'stretch',
                    position: 'absolute',
                    inset: 0,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        flex: 1,
                    }}
                >
                    <div className="p-2 gap-2 flex">
                        <button
                            onClick={() => {
                                if (!ref.current) return;
                                const loc = ref.current.contentWindow!.location;
                                loc.search = '?go=prev';
                            }}
                            className="bg-orange-300 px-2 rounded cursor-pointer flex-1"
                        >
                            Prev
                        </button>
                        <button
                            className="bg-orange-300 px-2 rounded cursor-pointer flex-1"
                            onClick={() => {
                                if (!ref.current) return;
                                const loc = ref.current.contentWindow!.location;
                                loc.search = '?go=next';
                            }}
                        >
                            Next
                        </button>
                    </div>
                    <iframe
                        ref={ref}
                        style={{
                            // top: '10vh',
                            // bottom: '10vh',
                            // left: '10vw',
                            // right: '10vw',
                            // position: 'absolute',
                            // width: '80vw',
                            // height: '80vh',
                            flex: 1,
                            padding: 24,
                        }}
                        src={`/epub/nrsvue.epub/`}
                        onLoad={(evt) => {
                            const w = evt.currentTarget.contentWindow!;
                            const pathname = w.location.pathname;
                            setUrl(pathname);

                            highlighter(latest, pathname, w);

                            w.document.addEventListener('mouseup', () => {
                                console.log('sel change');
                                const s = w.document.getSelection();
                                if (!s || s.rangeCount === 0) return;
                                if (s.isCollapsed) return;
                                const range = s.getRangeAt(0);

                                // reify stuff
                                iterateRangeNodes(range, w.document, (node) => {
                                    if (node instanceof w.self.HTMLElement) {
                                        const styles = getCustomizedStyles(node);
                                        Object.entries(styles).forEach(([key, value]) => {
                                            node.style.setProperty(key, value);
                                        });
                                    }
                                });

                                const outer = w.document.createElement('div');
                                outer.append(range.cloneContents());
                                const raw = outer.innerHTML;

                                if (!raw.trim().length) return;

                                const start = getNodePath(range.startContainer);
                                const end = getNodePath(range.endContainer);
                                if (range.startContainer !== resolveNodePath(start, w.document)) {
                                    throw new Error('didnt go back start');
                                }
                                if (range.endContainer !== resolveNodePath(end, w.document)) {
                                    throw new Error('didnt go back start');
                                }
                                const id = genId();
                                const quote: Data['quotes'][''] = {
                                    id,
                                    edited: raw,
                                    raw,
                                    location: {
                                        href: w.location.pathname,
                                        start: {
                                            anchor: start,
                                            offset: range.startOffset,
                                        },
                                        end: { anchor: end, offset: range.endOffset },
                                    },
                                    notes: '',
                                    tags: [],
                                };

                                // const data = { ...loaderData };
                                // data.quotes = { ...data.quotes, [quote.id]: quote };

                                fetcher.submit({ quote: JSON.stringify(quote) }, { method: 'post' }).then(() => {
                                    s.removeAllRanges();
                                    highlighter(latest, pathname, w);
                                });
                            });
                            // alert('hi');
                        }}
                    />
                </div>
                <div style={{ flex: 1, padding: 24 }}>
                    Sidebar here
                    <div>{url}</div>
                    {Object.entries(loaderData.quotes).map(([k, v]) => (
                        <div key={k} className="bg-slate-300 p-2 mb-4">
                            {v.id}
                            <div dangerouslySetInnerHTML={{ __html: v.raw }} />
                            <button
                                onClick={() => {
                                    fetcher.submit({ remove: v.id }, { method: 'post' });
                                }}
                                style={{ background: 'red' }}
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
                {/* <div dangerouslySetInnerHTML={{ __html: loaderData }} /> */}
            </div>
            {/* <Welcome /> */}
        </div>
    );
}

export const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

function highlighter(latest: { current: Data }, pathname: string, w: Window) {
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
            backgroundColor: 'red',
            opacity: 0.1,
        });
        h.append(node);
    });
    w.document.body.append(h);
}

function getCustomizedStyles(element: HTMLElement) {
    // Get computed styles for the element
    const computedStyles = element.ownerDocument.defaultView!.getComputedStyle(element);

    // Create a temporary default element of the same type
    const defaultElement = element.ownerDocument.createElement(element.tagName);
    element.ownerDocument.body.appendChild(defaultElement);
    const defaultStyles = element.ownerDocument.defaultView!.getComputedStyle(defaultElement);

    // Compare computed styles with default styles
    const customizedStyles: Record<string, string> = {};
    for (let property of computedStyles) {
        if (['transform-origin', 'width', 'height', 'perspective-origin', 'inline-size', 'block-size'].includes(property)) continue;
        const computedValue = computedStyles.getPropertyValue(property);
        const defaultValue = defaultStyles.getPropertyValue(property);

        // Add to customized styles if the value differs
        if (computedValue !== defaultValue) {
            customizedStyles[property] = computedValue;
        }
    }

    // Remove the temporary element
    element.ownerDocument.body.removeChild(defaultElement);

    return customizedStyles;
}

const getRaw = (contents: DocumentFragment, parent: HTMLElement) => {
    const at = parent.childElementCount;
    parent.append(contents);
};

function iterateRangeNodes(range: Range, document: Document, callback: (n: Node) => void) {
    // Create a TreeWalker to traverse nodes within the range
    const treeWalker = document.createTreeWalker(
        range.commonAncestorContainer, // Root node for traversal
        NodeFilter.SHOW_ALL, // Include all node types
        {
            acceptNode(node) {
                // Only accept nodes that are fully or partially within the range
                if (range.intersectsNode(node)) {
                    return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_REJECT;
            },
        },
    );

    // Traverse the nodes and apply the callback
    let currentNode: Node | null = treeWalker.currentNode;
    while (currentNode) {
        callback(currentNode);
        currentNode = treeWalker.nextNode();
    }
}
