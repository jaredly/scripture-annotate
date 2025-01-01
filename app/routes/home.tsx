import type { Route } from './+types/home';
// import { Welcome } from '../welcome/welcome';
// import AdmZip from 'adm-zip';
// import { parse } from 'node-html-parser';
import { useEffect, useRef, useState } from 'react';

export function meta({}: Route.MetaArgs) {
    return [{ title: 'New React Router App' }, { name: 'description', content: 'Welcome to React Router!' }];
}

// export async function loader({ params }: Route.LoaderArgs) {
//     const v = new AdmZip('./bible/nrsvue.epub');
//     const content = v.getEntry('content.opf');
//     if (!content) return 'no content';
//     const text = content.getData().toString('utf-8');
//     const dom = parse(text);
//     const got = dom.querySelector('reference[type="toc"]');
//     if (!got) return 'no toc';
//     const href = got.getAttribute('href');
//     if (!href) return 'no href';
//     const path = href.split('#')[0];
//     const toc = v.getEntry(path);
//     if (!toc) return 'no toc file';
//     return toc.getData().toString('utf-8');
// }

export default function Home({ loaderData }: Route.ComponentProps) {
    const [url, setUrl] = useState<undefined | string>(undefined);
    const ref = useRef<HTMLIFrameElement>(null);
    // useEffect(() => {
    //     ref.current?.addEventListener('io')
    // }, [])
    return (
        <div>
            <div
                style={{
                    // background: 'white',
                    // color: 'black',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'stretch',
                    position: 'absolute',
                    inset: 0,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                    }}
                >
                    <div>
                        <button
                            onClick={() => {
                                if (!ref.current) return;
                                const loc = ref.current.contentWindow!.location;
                                loc.search = '?go=prev';
                            }}
                        >
                            Prev
                        </button>
                        <button
                            onClick={() => {
                                if (!ref.current) return;
                                const loc = ref.current.contentWindow!.location;
                                loc.search = '?go=next';
                            }}
                        >
                            Next
                        </button>
                    </div>
                    <iframe
                        ref={ref}
                        style={{
                            // top: '10vh',
                            // bottom: '10vh',
                            // left: '10vw',
                            // right: '10vw',
                            // position: 'absolute',
                            // width: '80vw',
                            // height: '80vh',
                            flex: 1,
                            padding: 24,
                        }}
                        src={`/epub/nrsvue.epub/`}
                        onLoad={(evt) => {
                            setUrl(evt.currentTarget.contentWindow?.location.pathname);
                            const w = evt.currentTarget.contentWindow!;
                            w.document.addEventListener('mouseup', () => {
                                console.log('sel change');
                                const s = w.document.getSelection();
                                if (s && s?.rangeCount > 0) {
                                    console.log(s.getRangeAt(0).cloneContents().textContent);
                                }
                            });
                            // alert('hi');
                        }}
                    />
                </div>
                <div style={{ flex: 1, padding: 24 }}>
                    Sidebar here
                    <div>{url}</div>
                </div>
                {/* <div dangerouslySetInnerHTML={{ __html: loaderData }} /> */}
            </div>
            {/* <Welcome /> */}
        </div>
    );
}
