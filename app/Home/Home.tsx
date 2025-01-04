import { existsSync, readFileSync, writeFileSync } from 'fs';
import type { Route } from '../routes/+types/home';
// import { Welcome } from '../welcome/welcome';
// import AdmZip from 'adm-zip';
// import { parse } from 'node-html-parser';
import { useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import { TagModal } from './TagModal';
import { applyFilter, Tags } from './Tags';
import { newQuote } from './newQuote';
import { highlighter } from './highlighter';
import { getNodePath } from './getNodePath';
import type { NodePath } from './types';

const useLatest = <T,>(v: T): { current: T } => {
    const ref = useRef(v);
    ref.current = v;
    return ref;
};

export type Filters = {
    thisChapter: boolean;
    tags: Record<string, boolean>;
};

export function Home({ loaderData }: Route.ComponentProps) {
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

export const resolveNodePath = (path: NodePath[], document: Document) => {
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

export const hasClass = (node: Node, classNames: string[]) => {
    return node.nodeType === node.ELEMENT_NODE && classNames.some((className) => (node as HTMLElement).classList.contains(className));
};
