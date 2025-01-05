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
import type { Data, NodePath } from './types';
import { getCustomizedStyles } from './getCustomizedStyles';

export const setupKeyListener = (w: Window, latest: { current: Data }, fetcher: FetcherWithComponents<any>) => {
    const pathname = w.location.pathname;
    highlighter(latest, pathname, w);
    const chapter = w.document.querySelector('.ctfm')?.textContent!;
    if (!chapter) {
        console.error('no chapter title');
        return;
    }

    const byKey: Record<string, string> = {};
    Object.values(latest.current.tags).forEach((tag) => {
        byKey[tag.key] = tag.id;
    });

    w.document.addEventListener('keydown', (evt) => {
        switch (evt.key) {
            case 'Enter': {
                console.log('sel change');
                addQuote(w, chapter, fetcher, latest, pathname, []);
                return;
            }
            default:
                const id = byKey[evt.key];
                if (id) {
                    addQuote(w, chapter, fetcher, latest, pathname, [id]);
                }
                return;
        }
    });
};

function addQuote(
    w: Window,
    chapter: string,
    fetcher: FetcherWithComponents<any>,
    latest: { current: import('/Users/jared/clone/apps/jesus/app/Home/types').Data },
    pathname: string,
    tags: string[],
) {
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
