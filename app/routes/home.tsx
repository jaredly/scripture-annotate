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

export async function loader({ params }: Route.LoaderArgs): Promise<{ data: Data }> {
    return { data: getData() };
}

const _dataPath = './data.json';
const initial: Data = { version: 1, quotes: {}, tags: {}, users: {} };

const getData = () => {
    if (!existsSync(_dataPath)) {
        return initial;
    }
    const data = JSON.parse(readFileSync(_dataPath, 'utf-8'));
    if (!data.users) data.users = {};
    if (!data.version) data.version = 1;
    return data;
};

const setData = (data: Data) => {
    writeFileSync(_dataPath, JSON.stringify(data));
};

const upData = (f: (d: Data) => void) => {
    const data = getData();
    f(data);
    setData(data);
};

const colors = ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#ffff99', '#b15928'];

export async function action({ request }: Route.ActionArgs) {
    let formData = await request.formData();
    const type = formData.get('type');
    if (type === 'add-tag') {
        const quote = formData.get('quote');
        const tag = formData.get('tag');
        if (typeof quote === 'string' && typeof tag === 'string') {
            upData((data) => {
                data.quotes[quote].tags.push(tag);
                data.quotes[quote].updated = Date.now();
            });
            return true;
        }
    }
    if (type === 'rm-tag') {
        const quote = formData.get('quote');
        const tag = formData.get('tag');
        if (typeof quote === 'string' && typeof tag === 'string') {
            upData((data) => {
                data.quotes[quote].tags = data.quotes[quote].tags.filter((t) => t !== tag);
                data.quotes[quote].updated = Date.now();
            });
            return true;
        }
    }
    if (type === 'tag') {
        const tag: Tag | string = JSON.parse(formData.get('tag') as string);
        upData((data) => {
            if (typeof tag === 'string') {
                delete data.tags[tag];
            } else {
                tag.updated = Date.now();
                data.tags[tag.id] = tag;
            }
        });
        return true;
    }

    const remove = formData.get('remove');
    if (typeof remove === 'string') {
        upData((data) => {
            delete data.quotes[remove];
        });
        return true;
    }
    const newTag = formData.get('newTag');
    if (typeof newTag === 'string') {
        upData((data) => {
            const id = genId();
            const n = Object.keys(data.tags).length;
            data.tags[id] = { id, title: newTag, color: colors[n % colors.length], key: n + 1 + '', created: Date.now(), updated: Date.now() };
        });
        return true;
    }
    let quote: Quote = JSON.parse(formData.get('quote') as string);

    upData((data) => {
        quote.updated = Date.now();
        data.quotes[quote.id] = quote;
    });
    return true;
}
