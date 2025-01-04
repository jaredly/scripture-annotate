import { existsSync, readFileSync, writeFileSync } from 'fs';
import type { Route } from './+types/home';
// import { Welcome } from '../welcome/welcome';
// import AdmZip from 'adm-zip';
// import { parse } from 'node-html-parser';
import { useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import { genId } from './genId';
import type { Data, Quote, Tag } from '~/Home/types';
import { Home } from '~/Home/Home';

export default Home;

export function meta({}: Route.MetaArgs) {
    return [{ title: 'Scripture Annotation' }, { name: 'description', content: 'A tool for annotating scriptures' }];
}

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
