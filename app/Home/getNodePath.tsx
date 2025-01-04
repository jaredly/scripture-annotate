import type { NodePath } from './types';

export const getNodePath = (node: Node): NodePath[] => {
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
