import { hasClass, undefined } from './Home';

function findClosestPreviousWithClass(element: Node, classNames: string[]): void | Element {
    const lastChild = (element: Node) => {
        if (element.lastChild) return lastChild(element.lastChild);
        return element;
    };

    const prev = (element: Node) => {
        if (element.previousSibling) {
            return lastChild(element.previousSibling);
        }
        if (element.parentElement) return element.parentElement;
    };

    if (hasClass(element, classNames)) return element as Element;

    let current = prev(element);

    while (current) {
        if (hasClass(current, classNames)) {
            return current as Element;
        }
        current = prev(current);
    }
}

export const getVerse = (node: Node) => {
    const v = findClosestPreviousWithClass(node, ['ver', 'ver-f']);
    return v ? Number(v.textContent) : undefined;
};
