# TODO

- manually test eyas:// links with multiple instances
- e2e coverage for keystroke replay into the recording fixture's rich-text / textarea / input targets
- repro command: npm run dev -- "C:\Users\Eric\Desktop\Client Viewer - 62178-redirect-auth.9314fec1d.eyas"


# Future

- record modifier state on KeyDownStep so chords replay as chords (today the character half of Ctrl+A is recorded as a bare `a` and replay only infers the held Control from the preceding step)
- no self-healing corrector for contenteditable replay: there's no `change` step to snap to a final value, so keystroke drift is silently wrong
