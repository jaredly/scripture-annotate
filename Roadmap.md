
# Data structuring

- "Tags"
  - a color
  - a shortcut key
  - a title
- "Quote"
  - location (href, start+end(anchor/offset))
  - raw html
  - edited html
  - notes
  - tag(s)

In the sidebar, you can view
1) annotations for the current file
2) all annotations for a given tag
3) ... the X (5?10?) most recent annotations


# Basic plan:

- have the epub in an iframe
- select some text
  - press a button (hotkey 1-5 or sth) to "label" that bunch of whatsit
  - we then cloneContents() on the range, as well as isolating a way to reproduce the range.
    by like ... ancestry or whatever.
    yeah, a 'get unique path to node' function, will be great.
    then, ~show the highlight, maybe with a line on the side? idk.
    Anddd plop up the new Labeled section in the right sidebar, where you can style it too,
    because it is `contentEditable`. gotta retain the 'original source' to revert to if needed.
  anywhoooo then you can also like make notes about the selection.

  thennn when `onLoad` of the iframe triggers, we
  - look up the annotations for that src
  - draw relevant highlights
  - add listeners too


ALSO gotta have [prev] [next] buttons, so you can navigate


# Scriptures n such

- get the nrsvue pls


hrmmm what if I made it ~generic epub compatible?
could be fun idk.


OK Yeah.
so
we're workin with epubs.

Data will be something like:

- [epub ]

getSelection().getRangeAt(0).cloneContents()


