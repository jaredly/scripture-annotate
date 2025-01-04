import { useState } from 'react';
import type { Tag } from './types';

export const TagModal = ({ tag, onClose, onSubmit }: { tag: Tag; onClose: () => void; onSubmit: (tag: Tag | null) => void }) => {
    const [tmp, setTmp] = useState(tag);
    return (
        <div onClick={(evt) => evt.stopPropagation()} className="py-1 px-2 flex flex-col">
            <label>
                Title
                <input className="rounded px-1 ml-1 w-32" value={tmp.title} onChange={(evt) => setTmp({ ...tmp, title: evt.target.value })} />
            </label>
            <label className="mt-2">
                Key
                <input className="rounded text-center px-1 w-10 ml-1" value={tmp.key} onChange={(evt) => setTmp({ ...tmp, key: evt.target.value })} />
            </label>

            <div className="flex flex-row mt-2">
                <button className="bg-green-200 px-2 mr-2 py-1 rounded" onClick={() => onSubmit(tmp)}>
                    Update
                </button>
                <button className="bg-red-400 px-2 mr-2 py-1 rounded" onClick={onClose}>
                    Cancel
                </button>
                <button className="bg-red-800 text-white px-2 mr-2 py-1 rounded" onClick={() => onSubmit(null)}>
                    Delete
                </button>
            </div>
        </div>
    );
};
