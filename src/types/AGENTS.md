# Type Registry Standards

## Core Philosophy
The type registry is the single source of truth for all data structures in Eyas. It ensures consistency across the core process and the interface.

## Naming Conventions
- **PascalCase**: All types and interfaces must use PascalCase.
- **Semantic Aliases**: Avoid using raw primitives (`string`, `number`, `boolean`) in business logic. Use semantic aliases from `primitives.ts`.
    - *Correct*: `startTime: Timestamp`
    - *Incorrect*: `startTime: number`
- **VM Suffix**: ViewModels or state objects used by Vue components should be suffixed with `VM`.

## File Organization
- **Domain-Based**: Group types by domain (e.g., `menu.ts`, `test-server.ts`).
- **Primitives**: Base semantic aliases reside in `primitives.ts`.
- **Component Registry**: Interface-specific structures reside in `components.ts`.

## Rules & Constraints
- **Registry-First**: Before defining an inline object in a component or function, check if a type already exists in `src/types/`. If not, create it.
- **No Circular Imports**: Types should not import from code files (`.ts` or `.vue`). They should only import from other type files.
- **Alphabetical Sorting**: Properties within interfaces and exports within files should be sorted alphabetically to maintain scannability.
- **Mandatory Imports**: Use `.js` extensions in all imports (e.g., `import type { T } from './primitives.js'`).
