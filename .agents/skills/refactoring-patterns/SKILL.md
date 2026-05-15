---
name: refactoring-patterns
description: Architectural guidelines and refactoring patterns for scaling codebase maintainability, resolving linter constraints (max-lines), and maintaining behavioral parity.
tags:
  - refactoring
  - architecture
  - patterns
---

# Reusable Skill: Refactoring & Codebase Scaling Patterns

## Overview
This skill outlines standard architectural patterns for refactoring complex modules, resolving linter line limits (`max-lines`), and preserving public API/VM contracts to ensure stability and type safety.

## When to Use
- Trigger when refactoring modules that exceed `max-lines` or `max-lines-per-block`.
- Trigger when extracting business logic or state from large orchestrators or Vue components.

## Instructions

### 1. Proxy Pattern
When refactoring to satisfy linter rules (e.g., `max-lines`), prioritize keeping the public API/VM of a component or function intact. If logic is moved to a helper or utility, the original entry point should "proxy" the calls to maintain behavioral parity and test stability.

### 2. Logic Extraction
Favor moving pure logic (calculations, formatting) to a sibling `.utils.ts` or `.logic.ts` file over structural changes that break the VM/interface contract.

### 3. State-First Extraction
When splitting a large orchestrator, prioritize moving global state variables into a shared state module or class BEFORE extracting logic. This prevents complex dependency injection chains.

### 4. Explicit Lambda Wrapping
When injecting dependencies via a factory context (e.g., `getCoreContext`), always wrap function calls in lambdas (e.g., `() => helper(ctx)`) to ensure the correct context is bound at invocation time.

### 5. Incremental Verification
Do not attempt to move entire logical domains in a single pass. Break them into smaller, testable sub-modules and verify at each step.

### 6. Proactive Component Extraction
When adding state or complex handlers to a Vue component, proactively move logic to a sibling `.logic.ts` file if the script block approaches 120 lines. This prevents "linting spirals" where a final verification fails due to the 150-line `max-lines-per-block` rule.

### 7. Domain-First Splitting
When a service or orchestrator exceeds `max-lines`, avoid generic `utils.ts` files. Split by logical domain using descriptive suffixes to maintain discoverability.
- **Example**: `window.service.ts` -> `window.shortcuts.ts`, `window.resize.ts`.
- **Enforcement**: If a file is at >90% of its line limit, plan for a domain-split *before* adding new features.

### 8. Platform Utility Abstraction
Avoid direct `process.platform` checks in business logic. Abstract OS-level detection into descriptive boolean constants (`isMac`, `isWindows`) within a central `platform-utils.ts` module. This improves readability and provides a single point of failure/mocking for tests.
- **Example**: Replace `if (process.platform === 'darwin')` with `if (isMac)`.
