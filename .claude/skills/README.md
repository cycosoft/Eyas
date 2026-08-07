# Claude Code Skills for Eyas

This directory contains 7 project-specific Claude Code skills for the Eyas project. Generic, project-agnostic skills that used to live here have moved to the user level (`~/.claude/skills/`) so they apply across all repos — see "Moved to User Level" below.

## Skill Sourcing

- **`.claude/skills/` (this directory)** — Claude Code-authoritative skill definitions with full YAML frontmatter and documentation
- **`.agents/skills/`** — Shared source of truth for other agent systems in the project; updated manually when `.claude/skills` changes

These are kept in sync by explicit manual updates, not automation. If you modify `.agents/skills` for other tools, plan to reflect those changes into `.claude/skills/`.

## Skills Index

### Development & Implementation

- **`/vue-interface-standards`** — Vue 3 Components & Composition API
  - **Purpose**: Component patterns, state management, and testing standards for the Vue 3 frontend interface
  - **Use when**: Building or refactoring Vue components in `src/eyas-interface/`, or managing UI state via Pinia/Vuetify
  - **Applies to**: `src/eyas-interface/**/*.vue`
  - **Provides**: Component patterns, prop design, state management, Vitest execution

- **`/electron-core-standards`** — Electron Main Process Architecture
  - **Purpose**: Architectural standards and IPC communication patterns for the Electron main process
  - **Use when**: Implementing or modifying main-process logic in `src/eyas-core/`, or designing new IPC channels
  - **Applies to**: `src/eyas-core/**/*.ts`
  - **Provides**: IPC patterns, functional module organization, error handling, object liveness guards (CRITICAL)

### Testing & Quality

- **`/testing-standards`** — BDD Testing Protocols & Execution
  - **Purpose**: BDD testing patterns, Vitest execution, mocking protocols, and test organization standards
  - **Use when**: Writing tests, debugging test failures, reviewing test code, or running Vitest
  - **Applies to**: `**/*.{spec,test}.{ts,mts}`
  - **Provides**: Test categories, config selection, mocking patterns, Electron webContents mock requirements, verification order

- **`/type-registry-standards`** — Type Safety & Centralized Definitions
  - **Purpose**: Single source of truth guidelines for type definitions, naming conventions, and file organization
  - **Use when**: Creating new data models, IPC payloads, or Vue component state definitions
  - **Applies to**: `src/types/**/*.ts`
  - **Provides**: Naming conventions, file organization, registry-first strategy, alphabetical sorting

### Platform & Tooling

- **`/electron-e2e-testing`** — Playwright E2E Test Strategies
  - **Purpose**: Operational procedures and synchronization strategies for writing and debugging Playwright E2E tests
  - **Use when**: Writing or debugging E2E test suites in `tests/e2e/`, or encountering resource lock errors
  - **Applies to**: `tests/e2e/**/*.spec.mjs`
  - **Provides**: Process management, first-run modal handling, event-driven testing, macOS window resize gotchas

- **`/active-test-content-gating`** — Active Test Content Visibility (Post-Mortem)
  - **Purpose**: Architectural post-mortem and operational guidelines for implementing active test content visibility gating in UI components
  - **Use when**: Debugging or extending AppHeader/AppHeaderOmniHub, handling Electron IPC payloads, or troubleshooting Vitest state leaks
  - **Provides**: Production code efficiency patterns, test state isolation mandatory pattern, token reduction strategies

## Moved to User Level

These were generic enough to apply beyond Eyas and now live in `~/.claude/skills/` (some merged with equivalents from other projects):

- `/cognitive-pre-processor`, `/efficiency-tiers`, `/config-audit`, `/directory-semantics`, `/claude-code-standards`, `/bdd-philosophy` — moved as-is (project-agnostic already)
- `/bdd-planning`, `/stakeholder-perspectives` (merged into user-level `stakeholder-review`), `/perform-post-mortem` (merged into user-level `post-mortem`) — merged with equivalent skills from other projects
- `/feature-flagging`, `/refactoring-patterns`, `/typescript-gotchas` — generalized (removed Eyas-specific paths/naming) and moved

These are auto-loaded for every project without needing to live here.

## Auto-Invocation

These skills are configured to auto-invoke when Claude Code detects relevant keywords in the task context. You can also manually invoke any skill with `/skill-name`:

```
/active-test-content-gating
/electron-core-standards
/electron-e2e-testing
/testing-standards
/type-registry-standards
/vue-interface-standards
```

## Skill Configuration

Each skill is defined in a `SKILL.md` file with YAML frontmatter:
- **`description`**: Primary signal for auto-invocation
- **`when_to_use`**: Guidance on when to invoke
- **`allowed-tools`**: Which Claude Code tools the skill uses
- **`paths`** (optional): File patterns the skill applies to

See individual `SKILL.md` files for full documentation.

## Related Documentation

- **CLAUDE.md** — Project-level guidelines for Claude Code
- **AGENTS.md** — Comprehensive engineering standards (root) and module-level AGENTS.md files (src/types/, src/eyas-core/, src/eyas-interface/, src/scripts/, tests/)
