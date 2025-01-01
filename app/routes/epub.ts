import type { Route } from './+types/epub';
import AdmZip from 'adm-zip';
import { parse } from 'node-html-parser';
import { dirname, join, relative } from 'path';

export async function loader({ params, request }: Route.LoaderArgs) {
    const v = new AdmZip('./bible/' + params.doc);

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
