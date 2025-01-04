import type { Route } from './+types/epub';
import AdmZip from 'adm-zip';
import { parse } from 'node-html-parser';
import { dirname, join, relative } from 'path';

export const getChapterNames = (doc: string) => {
    const v = new AdmZip('./bible/' + doc);
    const titles: Record<string, string> = {};

    v.getEntries().forEach((entry) => {
        if (entry.name.startsWith('part') && entry.name.endsWith('.html')) {
            const text = entry.getData().toString('utf-8');
            const dom = parse(text);
            const title = dom.querySelector('.ctfm')?.textContent;
            if (title) {
                titles[entry.entryName] = title;
            }
        }
    });

    return titles;
};

const cache = {};
let loaded = false;
export const cachedChapterNames = () => {
    if (loaded) return cache;
    const titles = getChapterNames('nrsvue.epub');
    Object.assign(cache, titles);
    loaded = true;
    return cache;
};

const zipCache: Record<string, AdmZip> = {};
const getZip = (name: string) => {
    if (!zipCache[name]) zipCache[name] = new AdmZip('./bible/' + name);
    return zipCache[name];
};

export async function loader({ params, request }: Route.LoaderArgs) {
    const v = getZip(params.doc);

    if (params['*'] === '') {
        const content = v.getEntry('content.opf');
        if (!content) return 'no content';
        const text = content.getData().toString('utf-8');
        const dom = parse(text);
        const got = dom.querySelector('reference[type="toc"]');
        if (!got) return 'no toc';
        const href = got.getAttribute('href');
        if (!href) return 'no href';
        return new Response('', {
            status: 302,
            headers: {
                Location: href,
            },
        });
    }
    const name = params['*'];

    const url = new URL(request.url);
    const go = url.searchParams.get('go');
    if (go === 'prev' || go === 'next') {
        const content = v.getEntry('content.opf');
        if (!content) return 'no content';
        const text = content.getData().toString('utf-8');
        const dom = parse(text);
        const hrefs = dom
            .querySelectorAll('manifest > item')
            .map((item) => item.getAttribute('href'))
            .filter((f) => f && f.endsWith('.html'));
        const at = hrefs.indexOf(name);
        if (at === -1) return new Response('ont in the list ' + name, { status: 404 });

        if (at !== (go === 'prev' ? 0 : hrefs.length - 1)) {
            const next = hrefs[at + (go === 'prev' ? -1 : 1)]!;
            const rel = relative(name, next);
            return new Response('', { status: 302, headers: { Location: join(url.pathname, rel) } });
        }
    }

    const content = v.getEntry(name);
    if (!content) return new Response(`no ${params['*']}`, { status: 404 });
    return new Response(content.getData().toString('utf-8'), {
        headers: {
            'Content-Type': name.endsWith('.html') ? 'text/html' : 'text/css',
        },
    });
}
