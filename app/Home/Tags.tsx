import { useState } from 'react';
import { useFetcher } from 'react-router';

import { TagModal } from './TagModal';

import type { Filters } from './Home';
import type { Data, Quote } from './types';

export const applyFilter =
    (filters: Filters, href: string) =>
    ([id, quote]: [string, Quote]) => {
        const on = Object.keys(filters.tags).filter((t) => filters.tags[t]);
        if (on.length) {
            if (!on.every((t) => quote.tags.includes(t))) return false;
        }
        if (filters.thisChapter && quote.location.href !== href) return false;
        return true;
    };

export const Tags = ({
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
                    <input className="border p-1" value={text} onChange={(evt) => setText(evt.target.value)} />
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
                        className="px-2 ml-2 bg-lime-200 rounded"
                        disabled={!text.trim()}
                    >
                        Create Tag
                    </button>
                    <button className="px-2 ml-2 bg-slate-300 rounded" onClick={() => setText(null)}>
                        Cancel
                    </button>
                </>
            ) : (
                <button className="px-2 ml-2 bg-slate-300 rounded" onClick={() => setText('')}>
                    Add Tag
                </button>
            )}
        </div>
    );
};
