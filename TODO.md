# TODO

- doesn't detect character inputs — replay fix in place, pending manual verification in the q-editor
- manually test eyas:// links with multiple instances


# Future

- record modifier state on KeyDownStep so chords replay as chords (today the character half of Ctrl+A is recorded as a bare `a` and replay only infers the held Control from the preceding step)
- e2e coverage for typing into a contenteditable root — needs a rich-text fixture in the demo app, which doesn't exist yet
- no self-healing corrector for contenteditable replay: there's no `change` step to snap to a final value, so keystroke drift is silently wrong


"Could not locate click target "aria/Properties" on the page"

npm run dev -- "C:\Users\Eric\Desktop\Client Viewer - 62178-redirect-auth.9314fec1d.eyas"