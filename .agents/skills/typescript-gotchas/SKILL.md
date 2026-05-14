---
name: typescript-gotchas
description: Advanced TypeScript engineering standards and edge-case mechanics covering type leaks, event listener mocking narrowing, and API migration test awareness.
tags:
  - typescript
  - testing
  - type-safety
---

# Reusable Skill: Advanced TypeScript & Test Mocking Gotchas

## Overview
This skill documents advanced TypeScript constraints and test mocking workarounds required to maintain strict type safety and prevent narrowing errors across the Eyas codebase.

## When to Use
- Trigger when encountering TypeScript narrowing errors (`never`) during unit test mocking.
- Trigger when refactoring complex type structures or migrating internal APIs.

## Instructions

### 1. Preventing Type Leaks
Avoid anonymous object structures even within casting syntax (e.g., `as { default: T }`). These are considered "Type Leaks." Always use a named meta-type from `src/types/` (e.g., `ModuleWithDefault<T>`) to wrap these structures.

### 2. Test Narrowing Safety
When mocking event-driven callbacks (e.g., IPC listeners) that are assigned inside the mock, TypeScript may narrow the callback variable to `never` at the call site. Use explicit type assertions (e.g., `(callback as any)(...)`) or `// eslint-disable-line` to bypass these narrowing errors in test flows.

### 3. API Migration Awareness
When migrating to newer internal or external APIs, prioritize updating all dependent unit tests immediately. Common failures occur when tests mock specific method names that have been renamed or relocated (e.g., `webContents.goBack` to `webContents.navigationHistory.goBack`).
