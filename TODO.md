# TODO

- manually test eyas:// links with multiple instances
- repro command: npm run dev -- "C:\Users\Eric\Desktop\Client Viewer - 62178-redirect-auth.9314fec1d.eyas"

# Future

- record caret offsets for contenteditable keystrokes, as a character offset flattened across the root's text nodes rather than a node path (a node path is only valid if replay reproduced identical DOM structure, which is exactly what can't be assumed). Only buys the click-into-the-middle-and-keep-typing case; linear typing works without it
- nothing reads `eyasSchemaVersion` to guard a session recorded by a *newer* build than the one replaying it — it would silently skip step types it doesn't know (1.2.0 sessions replay a rich-text editor empty on a 1.1.0 build). A read-side check that warns instead of degrading silently is what makes the version field worth having
- IME and dead-key text isn't recorded from the input event: `insertCompositionText` fires repeatedly with the whole in-progress string, each firing replacing the last, so it can't be recorded as a sequence of insertions the way `insertText`/`insertFromPaste` can (verified against Chromium). Those keystrokes are kept rather than retracted, so an accented character replays as whatever `key` reported — no worse than before, but not right either. Needs `compositionend` capture
- spellcheck/autocorrect (`insertReplacementText`) isn't recorded either: it replaces a range the user never selected, and the range exists only on `beforeinput`'s `getTargetRanges()`. Recording it as a caret insertion would turn "teh"→"the" into "tehthe". Needs `beforeinput` with target ranges
- the contenteditable assertion reports rich-text mismatches but can't tell replay infidelity apart from a genuine app regression — both read as "expected X, found Y". Improving capture (input events, modifiers, caret) is what shrinks the first category
