---
description: BDD philosophy, test categorization, and execution standards across unit, integration, and E2E suites in Eyas.
when_to_use: Use when initiating any feature development or bug fix across the repository, or when selecting Vitest configuration files or isolating test execution.
allowed-tools: Read,Edit,Bash
paths:
  - "**/*.{spec,test}.{ts,mts}"
---

# Reusable Skill: Testing Standards

## Overview
We follow a strict BDD-First approach. Tests are not just verification; they are the living documentation of system behavior and architectural contracts, describing how the application should behave under specific conditions.

## When to Use
- Trigger when initiating any feature development or bug fix across the repository.
- Trigger when selecting Vitest configuration files or isolating test execution.

## Instructions

### 1. Test Categories
- **Unit Tests (`tests/unit/`)**: Test pure functions and individual components in isolation.
- **Integration Tests (`tests/integration/`)**: Test the interaction between multiple modules or the integration of core logic with the test server.
- **Electron/E2E Tests (`tests/electron/`)**: Test the full application lifecycle, including IPC and native window behavior.

### 2. Execution Standards & Config Selection
Run only the relevant test file to save time and reduce token output overhead.
- **Interface/Vue Tests**:
  ```bash
  npx vitest run path/to/test.ts --config vitest.config.interface.ts
  ```
- **Electron Core Tests**:
  ```bash
  npx vitest run path/to/test.ts --config vitest.config.electron.ts
  ```
- **Demo Tests**:
  ```bash
  npx vitest run path/to/test.ts --config vitest.config.demo.ts
  ```

### 3. Rules & Constraints
- **VM Integrity**: When testing Vue components, always cast the wrapper VM to its registry-defined interface (e.g., `as TestServerActiveModalVM`).
- **Mocking**:
  - Use `vi.mock()` for external dependencies (e.g., `electron`, `fs`).
  - Never mock the logic you are testing.
- **Behavioral Parity**: When refactoring code to satisfy linter rules (like `max-lines`), verify that existing tests pass BEFORE and AFTER the change.
- **Negative & Inverse Assertions**: Always explicitly test what the system *should not* do (e.g., it must not leak resources, trigger unnecessary side effects, or execute unauthorized operations) to thoroughly define unhappy path boundaries.

### 4. Electron WebContents Mocks (REQUIRED)
Any Vitest mock that stubs an Electron `webContents` object **MUST** include `isDestroyed`. Production guards in `src/eyas-core/` call `webContents.isDestroyed()` before every send/focus operation. Omitting it causes:
```
TypeError: ctx.$eyasLayer.webContents.isDestroyed is not a function
```

**Correct mock shape:**
```ts
webContents: {
    focus: vi.fn(),
    send: vi.fn(),
    isDestroyed: vi.fn().mockReturnValue(false),  // ← ALWAYS include, default false
}
```

Default `false` = healthy object. To test the destroyed-guard path, override in-test:
```ts
vi.mocked(ctx.$eyasLayer.webContents.isDestroyed).mockReturnValue(true);
```

### 5. Verification Order for `src/eyas-core/` Changes
Always follow this sequence to catch mock gaps before the slow E2E build cycle:
```bash
# 1. Fast unit check (~200ms)
npx vitest run --config vitest.config.electron.ts tests/electron/<service>.test.ts
# 2. Lint check
npx eslint src/eyas-core/<service>.ts --max-warnings=0
# 3. Targeted E2E only after units are green (~2 min)
npx playwright test tests/e2e/<relevant>.spec.mjs
```
