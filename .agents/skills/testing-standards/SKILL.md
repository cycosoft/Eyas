---
name: testing-standards
description: TDD philosophy, test categorization, and execution standards across unit, integration, and E2E suites in Eyas.
tags:
  - testing
  - tdd
  - vitest
---

# Reusable Skill: Testing Standards

## Overview
We follow a strict TDD-First approach. Tests are not just verification; they are the living documentation of intended behavior and architectural contracts.

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
