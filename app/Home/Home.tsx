import type { Route } from '../routes/+types/home';
import { useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import { highlighter } from './highlighter';
import { setupKeyListener } from './setupKeyListener';
import { ShowQuote } from './ShowQuote';
import { applyFilter, Tags } from './Tags';

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
                            setUrl(w.location.pathname);

                            setupKeyListener(w, latest, fetcher);
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
                                <ShowQuote k={k} iframe={ref} v={v} loaderData={loaderData} fetcher={fetcher} />
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export const hasClass = (node: Node, classNames: string[]) => {
    return node.nodeType === node.ELEMENT_NODE && classNames.some((className) => (node as HTMLElement).classList.contains(className));
};
