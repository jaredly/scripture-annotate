import { existsSync, readFileSync, writeFileSync } from 'fs';
import type { Route } from '../routes/+types/home';
// import { Welcome } from '../welcome/welcome';
// import AdmZip from 'adm-zip';
// import { parse } from 'node-html-parser';
import { useEffect, useRef, useState } from 'react';
import { useFetcher, type FetcherWithComponents } from 'react-router';
import { TagModal } from './TagModal';
import { applyFilter, Tags } from './Tags';
import { newQuote } from './newQuote';
import { highlighter } from './highlighter';
import { getNodePath } from './getNodePath';
import type { Data, NodePath, Quote } from './types';
import { getCustomizedStyles } from './getCustomizedStyles';
import { setupKeyListener } from './setupKeyListener';

export function ShowQuote({
    k,
    iframe,
    v,
    loaderData,
    fetcher,
}: {
    k: string;
    iframe: React.RefObject<HTMLIFrameElement | null>;
    v: Quote;
    loaderData: { data: Data };
    fetcher: FetcherWithComponents<any>;
}) {
    return (
        <div key={k} className="border-slate-300 border rounded-lg p-2 mb-4 relative">
            <div className="flex flex-row">
                <button
                    className="cursor-pointer mr-2 mx-2 py-1 underline"
                    onClick={() => {
                        iframe.current!.contentWindow!.location.href = v.location.href;
                    }}
                >
                    {v.location.chapter}:{v.location.start.verse + '-' + v.location.end.verse}
                </button>
                <TagsRow v={v} loaderData={loaderData} fetcher={fetcher} k={k} />
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
    );
}

function TagsRow({ v, loaderData, fetcher, k }: { v: Quote; loaderData: { data: Data }; fetcher: FetcherWithComponents<any>; k: string }) {
    return (
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
    );
}
const cmp = (a: any, b: any) => (a < b ? -1 : a > b ? 1 : 0);
