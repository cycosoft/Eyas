# Scripts Module Rules

## Testing
- **Location**: Tests for these scripts are located in `tests/electron/`.
- **Execution**: Always use the electron vitest config.
  - `npx vitest tests/electron/<filename>.test.ts --config vitest.config.electron.js`

## Entry Points
- **IIFEs**: When using an async IIFE to run a script, you MUST provide an explicit return type to satisfy the linter.
  - Correct: `(async (): Promise<void> => { ... })();`
