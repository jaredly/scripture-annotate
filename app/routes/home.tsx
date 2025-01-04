import { existsSync, readFileSync, writeFileSync } from 'fs';
import type { Route } from './+types/home';
// import { Welcome } from '../welcome/welcome';
// import AdmZip from 'adm-zip';
// import { parse } from 'node-html-parser';
import { useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import { genId } from './genId';

export function meta({}: Route.MetaArgs) {
    return [{ title: 'Scripture Annotation' }, { name: 'description', content: 'A tool for annotating scriptures' }];
}

type NodePath =
    | { type: 'id'; id: string }
    | { type: 'tag'; tag: string; index: number }
    | { type: 'class'; class: string; index: number }
    | { type: 'child'; index: number };

// TODO: work backwards from the start to find what verse we're in
type NodeLoc = { anchor: NodePath[]; offset: number; verse?: number };
type Location = {
    href: string;
    start: NodeLoc;
    end: NodeLoc;
    chapter: string;
};

type Quote = {
    id: string;
    location: Location;
    raw: string;
    edited: string;
    notes: string;
    tags: string[];
    created: number;
    updated: number;
};
type Tag = { id: string; color: string; key: string; title: string; created: number; updated: number };
type Data = {
    tags: Record<string, Tag>;
    quotes: Record<string, Quote>;
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

const hasClass = (node: Node, classNames: string[]) => {
    return node.nodeType === node.ELEMENT_NODE && classNames.some((className) => (node as HTMLElement).classList.contains(className));
};

function findClosestPreviousWithClass(element: Node, classNames: string[]): void | Element {
    const lastChild = (element: Node) => {
        if (element.lastChild) return lastChild(element.lastChild);
        return element;
    };

    const prev = (element: Node) => {
        if (element.previousSibling) {
            return lastChild(element.previousSibling);
        }
        if (element.parentElement) return element.parentElement;
    };

    if (hasClass(element, classNames)) return element as Element;

    let current = prev(element);

    while (current) {
        if (hasClass(current, classNames)) {
            return current as Element;
        }
        current = prev(current);
    }
}

const getVerse = (node: Node) => {
    const v = findClosestPreviousWithClass(node, ['ver', 'ver-f']);
    return v ? Number(v.textContent) : undefined;
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
export async function loader({ params }: Route.LoaderArgs): Promise<{ data: Data }> {
    if (!existsSync(fp)) {
        return { data: initial };
    }
    const data = JSON.parse(readFileSync(fp, 'utf-8'));
    return { data };
}

const colors = ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#ffff99', '#b15928'];

export async function action({ request }: Route.ActionArgs) {
    let formData = await request.formData();
    const type = formData.get('type');
    if (type === 'add-tag') {
        const quote = formData.get('quote');
        const tag = formData.get('tag');
        if (typeof quote === 'string' && typeof tag === 'string') {
            const data: Data = existsSync(fp) ? JSON.parse(readFileSync(fp, 'utf-8')) : initial;
            data.quotes[quote].tags.push(tag);
            data.quotes[quote].updated = Date.now();
            writeFileSync(fp, JSON.stringify(data));
            return true;
        }
    }
    if (type === 'rm-tag') {
        const quote = formData.get('quote');
        const tag = formData.get('tag');
        if (typeof quote === 'string' && typeof tag === 'string') {
            const data: Data = existsSync(fp) ? JSON.parse(readFileSync(fp, 'utf-8')) : initial;
            data.quotes[quote].tags = data.quotes[quote].tags.filter((t) => t !== tag);
            data.quotes[quote].updated = Date.now();
            writeFileSync(fp, JSON.stringify(data));
            return true;
        }
    }
    if (type === 'tag') {
        const tag: Tag | string = JSON.parse(formData.get('tag') as string);
        const data: Data = existsSync(fp) ? JSON.parse(readFileSync(fp, 'utf-8')) : initial;
        if (typeof tag === 'string') {
            delete data.tags[tag];
        } else {
            tag.updated = Date.now();
            data.tags[tag.id] = tag;
        }
        writeFileSync(fp, JSON.stringify(data));
        return true;
    }

    const remove = formData.get('remove');
    if (typeof remove === 'string') {
        const data: Data = existsSync(fp) ? JSON.parse(readFileSync(fp, 'utf-8')) : initial;
        delete data.quotes[remove];
        writeFileSync(fp, JSON.stringify(data));
        return true;
    }
    const newTag = formData.get('newTag');
    if (typeof newTag === 'string') {
        const data: Data = existsSync(fp) ? JSON.parse(readFileSync(fp, 'utf-8')) : initial;
        const id = genId();
        const n = Object.keys(data.tags).length;
        data.tags[id] = { id, title: newTag, color: colors[n % colors.length], key: n + 1 + '', created: Date.now(), updated: Date.now() };
        writeFileSync(fp, JSON.stringify(data));
        return true;
    }
    let quote: Quote = JSON.parse(formData.get('quote') as string);

    const data: Data = existsSync(fp) ? JSON.parse(readFileSync(fp, 'utf-8')) : initial;

    quote.updated = Date.now();
    data.quotes[quote.id] = quote;

    writeFileSync(fp, JSON.stringify(data));
    return true;
}

const useLatest = <T,>(v: T): { current: T } => {
    const ref = useRef(v);
    ref.current = v;
    return ref;
};

type Filters = {
    thisChapter: boolean;
    tags: Record<string, boolean>;
};

export default function Home({ loaderData }: Route.ComponentProps) {
    const [url, setUrl] = useState<undefined | string>(undefined);
    const ref = useRef<HTMLIFrameElement>(null);
    const fetcher = useFetcher();

    const latest = useLatest(loaderData.data);

    useEffect(() => {
        const w = ref.current?.contentWindow;
        if (w) {
            highlighter(latest, w.location.pathname, w);
        }
    }, [loaderData]);

    const [filters, setFilters] = useState<Filters>({ thisChapter: false, tags: {} });

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
                            flex: 1,
                            padding: 24,
                        }}
                        src={`/epub/nrsvue.epub/`}
                        onLoad={(evt) => {
                            const w = evt.currentTarget.contentWindow!;
                            const pathname = w.location.pathname;
                            setUrl(pathname);

                            highlighter(latest, pathname, w);

                            // .ctfm for chapter
                            // .ver,.ver-f for verse

                            const chapter = w.document.querySelector('.ctfm')?.textContent!;
                            if (!chapter) {
                                console.error('no chapter title');
                                return;
                            }

                            const addQuote = (tags: string[]) => {
                                const s = w.document.getSelection();
                                if (!s || s.rangeCount === 0) return;
                                if (s.isCollapsed) return;
                                const range = s.getRangeAt(0);

                                // reify stuff
                                const raw = getReifiedRaw(range, w);

                                if (!raw.trim().length) return;

                                const start = getNodePath(range.startContainer);
                                const end = getNodePath(range.endContainer);
                                if (range.startContainer !== resolveNodePath(start, w.document)) {
                                    throw new Error('didnt go back start');
                                }
                                if (range.endContainer !== resolveNodePath(end, w.document)) {
                                    throw new Error('didnt go back start');
                                }
                                const quote = newQuote(raw, w, start, range, end, chapter);
                                quote.tags = tags;

                                fetcher.submit({ quote: JSON.stringify(quote) }, { method: 'post' }).then(() => {
                                    s.removeAllRanges();
                                    highlighter(latest, pathname, w);
                                });
                            };

                            const byKey: Record<string, string> = {};
                            Object.values(loaderData.data.tags).forEach((tag) => {
                                byKey[tag.key] = tag.id;
                            });

                            w.document.addEventListener('keydown', (evt) => {
                                switch (evt.key) {
                                    case 'Enter': {
                                        console.log('sel change');
                                        addQuote([]);
                                        return;
                                    }
                                    default:
                                        const id = byKey[evt.key];
                                        if (id) {
                                            addQuote([id]);
                                        }
                                        return;
                                }
                            });
                        }}
                    />
                </div>
                <div style={{ flex: 1, padding: 24 }} className="min-h-0 flex flex-col">
                    <div className="flex flex-row items-center">
                        <label>
                            All Chapters
                            <input
                                type="checkbox"
                                className="ml-2"
                                checked={!filters.thisChapter}
                                onChange={(evt) => setFilters({ ...filters, thisChapter: !evt.target.checked })}
                            />
                        </label>
                        <Tags data={loaderData.data} filters={filters.tags} setFilters={(tags) => setFilters({ ...filters, tags })} />
                    </div>
                    <div className="flex-1 flex-col flex min-h-0 overflow-auto">
                        {Object.entries(loaderData.data.quotes)
                            .filter(applyFilter(filters, url ?? ''))
                            .map(([k, v]) => (
                                <div key={k} className="border-slate-300 border rounded-lg p-2 mb-4 relative">
                                    <div className="flex flex-row">
                                        <button
                                            className="cursor-pointer mr-2 mx-2 py-1 underline"
                                            onClick={() => {
                                                ref.current!.contentWindow!.location.href = v.location.href;
                                            }}
                                        >
                                            {v.location.chapter}:{v.location.start.verse + '-' + v.location.end.verse}
                                        </button>
                                        <div className="flex flex-row">
                                            {v.tags.map((t) =>
                                                loaderData.data.tags[t] ? (
                                                    <div
                                                        key={t}
                                                        style={{
                                                            background: loaderData.data.tags[t].color,
                                                        }}
                                                        className="px-2 py-1 mr-2 rounded"
                                                    >
                                                        {loaderData.data.tags[t].title}
                                                        <button
                                                            className="cursor-pointer ml-2"
                                                            onClick={() => {
                                                                fetcher.submit({ type: 'rm-tag', quote: k, tag: t }, { method: 'post' });
                                                            }}
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                ) : null,
                                            )}
                                        </div>
                                        <select
                                            onChange={(evt) => {
                                                console.log(evt.target.value);
                                                fetcher.submit(
                                                    {
                                                        type: 'add-tag',
                                                        quote: k,
                                                        tag: evt.target.value,
                                                    },
                                                    { method: 'post' },
                                                );
                                            }}
                                            value=""
                                        >
                                            <option value="" disabled>
                                                Add a tag
                                            </option>
                                            {Object.values(loaderData.data.tags)
                                                .sort((a, b) => cmp(a.title, b.title))
                                                .map((tag) => (
                                                    <option key={tag.id} value={tag.id}>
                                                        {tag.title}
                                                    </option>
                                                ))}
                                        </select>
                                        <div className="flex-1" />

                                        <button
                                            onClick={() => {
                                                if (confirm('Really delete?')) {
                                                    fetcher.submit({ remove: v.id }, { method: 'post' });
                                                }
                                            }}
                                            className="px-1 absolute text-red-700 text-xs rounded-lg mt-2 top-0 right-2"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                    <div dangerouslySetInnerHTML={{ __html: v.raw }} />
                                </div>
                            ))}
                    </div>
                </div>
                {/* <div dangerouslySetInnerHTML={{ __html: loaderData }} /> */}
            </div>
            {/* <Welcome /> */}
        </div>
    );
}

const TagModal = ({ tag, onClose, onSubmit }: { tag: Tag; onClose: () => void; onSubmit: (tag: Tag | null) => void }) => {
    const [tmp, setTmp] = useState(tag);
    return (
        <div onClick={(evt) => evt.stopPropagation()} className="py-1 px-2 flex flex-col">
            <label>
                Title
                <input className="rounded px-1 ml-1 w-32" value={tmp.title} onChange={(evt) => setTmp({ ...tmp, title: evt.target.value })} />
            </label>
            <label className="mt-2">
                Key
                <input className="rounded text-center px-1 w-10 ml-1" value={tmp.key} onChange={(evt) => setTmp({ ...tmp, key: evt.target.value })} />
            </label>

            <div className="flex flex-row mt-2">
                <button className="bg-green-200 px-2 mr-2 py-1 rounded" onClick={() => onSubmit(tmp)}>
                    Update
                </button>
                <button className="bg-red-400 px-2 mr-2 py-1 rounded" onClick={onClose}>
                    Cancel
                </button>
                <button className="bg-red-800 text-white px-2 mr-2 py-1 rounded" onClick={() => onSubmit(null)}>
                    Delete
                </button>
            </div>
        </div>
    );
};

const applyFilter =
    (filters: Filters, href: string) =>
    ([id, quote]: [string, Quote]) => {
        const on = Object.keys(filters.tags).filter((t) => filters.tags[t]);
        if (on.length) {
            if (!on.every((t) => quote.tags.includes(t))) return false;
        }
        if (filters.thisChapter && quote.location.href !== href) return false;
        return true;
    };

const Tags = ({
    data,
    filters,
    setFilters,
}: {
    data: Data;
    filters: Record<string, boolean>;
    setFilters: (filters: Record<string, boolean>) => void;
}) => {
    const fetcher = useFetcher();
    const [text, setText] = useState(null as null | string);
    const [modal, setModal] = useState(null as null | string);
    return (
        <div className="flex p-3">
            {Object.values(data.tags).map((tag) => (
                <div
                    key={tag.id}
                    className="px-2 py-1 rounded mr-2 relative cursor-pointer"
                    style={{
                        backgroundColor: tag.color,
                    }}
                    onClick={() => (modal === tag.id ? setModal(null) : setModal(tag.id))}
                >
                    <input
                        type="checkbox"
                        checked={!!filters[tag.id]}
                        className="mr-1"
                        onClick={(evt) => evt.stopPropagation()}
                        onChange={(evt) => {
                            const f = { ...filters };
                            f[tag.id] = evt.target.checked;
                            setFilters(f);
                        }}
                    />
                    {tag.title} <span className="px-1 bg-slate-100 rounded-md">{tag.key}</span>
                    {modal === tag.id ? (
                        <div className="border rounded absolute z-10 top-full mt-2 bg-orange-200">
                            <TagModal
                                tag={tag}
                                onClose={() => setModal(null)}
                                onSubmit={(nw) => {
                                    fetcher.submit({ type: 'tag', tag: JSON.stringify(nw === null ? tag.id : nw) }, { method: 'post' });
                                    setModal(null);
                                }}
                            />
                        </div>
                    ) : null}
                </div>
            ))}
            {text != null ? (
                <>
                    <input className="border" value={text} onChange={(evt) => setText(evt.target.value)} />
                    <button
                        onClick={() => {
                            fetcher.submit(
                                {
                                    newTag: text,
                                },
                                { method: 'post' },
                            );
                            setText(null);
                        }}
                    >
                        Create Tag
                    </button>
                </>
            ) : (
                <button className="px-2 ml-2 bg-slate-300 rounded" onClick={() => setText('')}>
                    Add
                </button>
            )}
        </div>
    );
};

function newQuote(raw: string, w: Window, start: NodePath[], range: Range, end: NodePath[], chapter: string) {
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

function getReifiedRaw(range: Range, w: Window) {
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
    outer.querySelectorAll('a').forEach((a) => a.remove());
    const raw = outer.innerHTML;
    return raw;
}

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

const cmp = (a: any, b: any) => (a < b ? -1 : a > b ? 1 : 0);
