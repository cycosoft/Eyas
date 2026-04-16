# AI Agent Instructions: Core (Electron/Node)

## 1. Technology Stack
- **Environment**: Electron (Main/Preload).
- **Resolution**: NodeNext ESM. All local imports MUST use `.js` extension.
- **Testing**: Vitest (Node environment). Run targeted tests with `npx vitest <file> --config vitest.config.electron.js`.

## 2. Operations
- **System Access**: When performing migrations from `.js` to `.ts`, use `mv` or `git mv` to preserve history.
- **Stability**: Prioritize non-breaking path resolution (built files in prod vs source in dev).
