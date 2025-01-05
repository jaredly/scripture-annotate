export type NodePath =
    | { type: 'id'; id: string }
    | { type: 'tag'; tag: string; index: number }
    | { type: 'class'; class: string; index: number }
    | { type: 'child'; index: number };
// TODO: work backwards from the start to find what verse we're in

export type NodeLoc = { anchor: NodePath[]; offset: number; verse?: number };
export type Location = {
    href: string;
    start: NodeLoc;
    end: NodeLoc;
    chapter: string;
};

export type Quote = {
    id: string;
    location: Location;
    raw: string;
    edited: string;
    notes: string;
    tags: string[];
    created: number;
    updated: number;
};

export type Tag = { id: string; color: string; key: string; title: string; created: number; updated: number };
export type Data = {
    version: 1;
    tags: Record<string, Tag>;
    quotes: Record<string, Quote>;
    users: Record<string, User>;
};

export type User = {
    id: string;
    name: string;
};
