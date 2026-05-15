---
name: feature-flagging
description: Standards for bypassing logic via feature flags to satisfy strict TSC unreachable code checks and maintain code maintainability.
tags:
  - architecture
  - type-safety
  - feature-flags
---

# Reusable Skill: Feature Flagging & Logic Bypassing

## Overview
This skill documents the preferred patterns for temporarily or permanently disabling logic within the Eyas codebase. It specifically addresses the friction caused by strict TypeScript compiler settings regarding unreachable code and type narrowing.

## When to Use
- Trigger when asked to "temporarily disable" a feature or UI element.
- Trigger when investigating logic flow by bypassing specific sections of code.
- Trigger when implementing "coming soon" features that should be merged but not active.

## Instructions

### 1. Avoid Early Returns for Disabling
In the Eyas codebase, the TypeScript compiler (`tsc -b`) is often configured to flag errors in unreachable code. 
- **The Problem**: If you `return` early, the compiler still type-checks the remaining code. If that code relies on type-narrowing performed *after* your return, it will fail.
- **The Solution**: Use a boolean flag or block comments.

### 2. Implementation Patterns

#### A. The Boolean Toggle (Preferred for Development)
Use a clearly named boolean to control flow. This allows the compiler to see the code as "reachable" but ensures it never executes.

```typescript
// BAD: Causes TSC errors in the rest of the function
function getMnemonic(text: string) {
  return text; // Early return disables underlining
  
  // ERROR: item might be undefined here because narrowing was skipped
  const parts = text.split(item.shortcut); 
  return parts;
}

// GOOD: Bypasses logic without breaking TSC narrowing
function getMnemonic(text: string) {
  const IS_MNEMONIC_ENABLED = false;
  if (!IS_MNEMONIC_ENABLED) {
    return text;
  }
  
  // Logic remains syntactically valid and type-safe
  const parts = text.split(item.shortcut);
  return parts;
}
```

#### B. Block Comments (Preferred for Clean Diffs)
If the code is purely visual or static and you want to ensure ZERO runtime overhead, use block comments. This is cleaner for the `npm run check` script as the compiler ignores the commented code entirely.

```typescript
/* TEMPORARY DISABLE: Mnemonics hidden until engine is ready
const parts = text.split(item.shortcut);
return parts;
*/
return text;
```

### 3. Centralizing Permanent Flags
If a feature is being developed over multiple PRs, create or update a feature registry in `src/types/features.ts` (create if missing) to maintain a single source of truth for the application's active state.

### 4. Cleanup Requirement
Every feature flag or bypass MUST be accompanied by a `TODO` or a reference to a ticket to ensure it does not become permanent technical debt.
