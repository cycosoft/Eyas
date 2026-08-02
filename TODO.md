# TODO

- manually test eyas:// links with multiple instances
- repro command: npm run dev -- "C:\Users\Eric\Desktop\Client Viewer - 62178-redirect-auth.9314fec1d.eyas"

# Future

- record modifier state on KeyDownStep so chords replay as chords (today the character half of Ctrl+A is recorded as a bare `a` and replay only infers the held Control from the preceding step)
- the contenteditable corrector snaps to plain text, so a heal flattens both rich markup and line structure (a recorded `"Line 1\nLine 2"` becomes one text node); innerHTML would restore them but executes inline handlers out of recorded page content. The drift check collapses whitespace on both sides, so a paragraphs-lost editor also reads as no-drift on the next heal
