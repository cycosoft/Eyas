---
name: type-registry-standards
description: Single source of truth guidelines for type definitions, naming conventions, and file organization within the Eyas type registry.
tags:
  - types
  - registry
  - architecture
---

# Reusable Skill: Type Registry Standards

## Overview
The type registry is the single source of truth for all data structures in Eyas. It ensures consistency across the core process and the interface.

## When to Use
- Trigger when creating new data models, IPC payloads, or Vue component state definitions.
- Trigger when refactoring existing interfaces in `src/types/`.

## Instructions

### 1. Naming Conventions
- **PascalCase**: All types and interfaces must use PascalCase.
- **Semantic Aliases**: Avoid using raw primitives (`string`, `number`, `boolean`) in business logic. Use semantic aliases from `primitives.ts`.
  - *Correct*: `startTime: Timestamp`
  - *Incorrect*: `startTime: number`
- **VM Suffix**: ViewModels or state objects used by Vue components should be suffixed with `VM`.

### 2. File Organization
- **Domain-Based**: Group types by domain (e.g., `menu.ts`, `test-server.ts`).
- **Primitives**: Base semantic aliases reside in `primitives.ts`.
- **Component Registry**: Interface-specific structures reside in `components.ts`.
- **Test-Specific Types**: Types used exclusively for testing (e.g., mocks, stubs) must reside in the `tests/types/` directory to ensure complete physical isolation from production definitions.

### 3. Rules & Constraints
- **Registry-First**: Before defining an inline object in a component or function, check if a type already exists in `src/types/`. If not, create it.
- **No Circular Imports**: Types should not import from code files (`.ts` or `.vue`). They should only import from other type files.
- **Alphabetical Sorting**: Properties within interfaces and exports within files should be sorted alphabetically to maintain scannability.
