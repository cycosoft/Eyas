# Claude Code Instructions for Eyas

## Active TODOs
See `TODO.md` for the current punch list of outstanding work. When working in an area
touched by an open item there, surface it and offer to address it — don't silently
ignore it. Once you're confident an item is fully resolved, delete its line rather than
marking it done. Whenever you touch `TODO.md`, also normalize its formatting: under each
of the two headers, plain `- ` bullet syntax, one item per line, no stray blank lines.
`TODO.md` always has this baseline present, even when both sections are empty:

```
# TODO

-


# Future

-
```

## Project Overview

Eyas — a QA/testing desktop application built with Electron, Vue 3, and TypeScript. Eyas simplifies hands-on testing for web applications, allowing teams to quickly bundle and test changes in any state before release. Built with electron-vite for fast development iteration.

## Build & Test Commands

```bash
# Local development (Electron + dev server)
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Run all tests
npm run check

# Test Suites (targeted)
npm run test:electron:unit       # Electron core tests (vitest)
npm run test:interface:unit      # Vue interface tests (vitest)
npm run test:demo:unit           # Demo app tests (vitest)
npm run test:electron:e2e        # End-to-end tests (Playwright)

# Compilation
npm run compile:build            # Build Electron app
npm run compile:runner           # Compile platform runners
npm run compile:mac              # Full macOS build + sign + notarize
npm run compile:installer        # Platform-specific installer build

# Code auditing
npm run audit-dead-code          # Find unused code
```

## Code Discovery

Prefer the `codebase-memory-mcp` tools for code exploration:
- **`search_graph(name_pattern/label/qn_pattern)`** — Find functions/classes/routes by name
- **`trace_path(function_name, mode=calls|data_flow|cross_service)`** — Trace call chains or data flow
- **`get_code_snippet(qualified_name)`** — Get exact source with precise line ranges
- **`query_graph(cypher_query)`** — Complex graph pattern queries
- **`search_code(pattern)`** — Text search augmented by graph data

Only fall back to Grep/Glob for text in non-code files (configs, docs) or when the graph doesn't have an answer. Project name for codebase-memory: `Users-erichigginson-repos-eyas`.

## Detailed Standards & Patterns

See **`AGENTS.md`** (root) for comprehensive engineering standards covering:
- Core philosophy (Strategic Narrative Planning, "Stop. Think. Plan. Verify. Only then, Code.")
- BDD (Behavior-Driven Development) approach and mandatory testing standards
- TypeScript, DRY, linting, and type safety conventions
- Refactoring, efficiency tiers, and verification gates
- Technology stack, patterns, and operational workflows

### Module-Specific Standards

Refer to module-level `AGENTS.md` files for area-specific patterns and constraints:
- **`src/types/AGENTS.md`** — Type registry, interface conventions, and semantic naming
- **`src/eyas-core/AGENTS.md`** — Electron core process, IPC patterns, and main-thread standards
- **`src/eyas-interface/AGENTS.md`** — Vue 3 interface, component patterns, and state management
- **`src/eyas-interface/app/src/AGENTS.md`** — Interface-specific organizational patterns
- **`src/eyas-interface/app/src/components/AGENTS.md`** — Component standards and testing patterns
- **`src/scripts/AGENTS.md`** — Script execution and tooling patterns
- **`tests/AGENTS.md`** — Test organization, frameworks, and verification strategies

## Claude Code Skills

This project includes 18 reusable Claude Code skills in `.claude/skills/` organized by domain. They auto-invoke based on task context and provide domain-specific guidance.

### Planning & Strategy
- `/cognitive-pre-processor` — Strategic Narrative Planning before implementation
- `/stakeholder-perspectives` — Persona-driven alignment checks (QA engineers, release engineers, CI/CD, app developers)

### Configuration & Setup
- `/claude-code-standards` — Official Claude Code configuration and best practices
- `/config-audit` — Configuration optimization and redundancy detection
- `/directory-semantics` — Directory structure and purpose disambiguation

### Development & Implementation
- `/vue-interface-standards` — Vue 3 components and Composition API
- `/refactoring-patterns` — Code organization and line-limit resolution patterns
- `/electron-core-standards` — Electron main process architecture and IPC patterns

### Testing & Quality
- `/bdd-planning` — BDD test case headers before implementation
- `/bdd-philosophy` — BDD mindset (Discovery/Formulation/Automation)
- `/testing-standards` — Vitest execution, mocking, and test organization
- `/type-registry-standards` — Type definitions and registry organization
- `/typescript-gotchas` — Advanced patterns and debugging pitfalls

### Platform & Tooling
- `/electron-e2e-testing` — Playwright E2E test strategies and synchronization
- `/feature-flagging` — Logic bypassing and feature flag patterns
- `/active-test-content-gating` — Post-mortem on visibility gating patterns

### Efficiency & Quality
- `/efficiency-tiers` — Development efficiency tiers (Tier 0–3) and verification gates
- `/perform-post-mortem` — Retrospective protocol and technical debt capture

**See `.claude/skills/README.md` for the complete skills index and auto-invocation triggers.**

## Common Tasks

- **Adding a Vue component**: See `/vue-interface-standards` skill and `src/eyas-interface/app/src/components/AGENTS.md`
- **Modifying Electron core**: See `/electron-core-standards` skill and `src/eyas-core/AGENTS.md`
- **Writing tests**: See `/testing-standards` and `/bdd-philosophy` skills
- **Refactoring large files**: See `/refactoring-patterns` skill
- **Planning a feature**: See `/cognitive-pre-processor` skill for Strategic Narrative template

## Development Environment

- **Node version**: Check `.nvmrc` for required version
- **Dependencies**: Run `npm install` after cloning
- **TypeScript**: `npm run type-check` for compile verification
- **Linting**: `npm run lint` for style enforcement
- **Pre-commit**: Configured hooks run linting and type checks on staged files

## Workflow Checklist

1. **Plan**: Write Strategic Narrative (see `/cognitive-pre-processor`)
2. **BDD**: Write test case headers (it.todo) before implementation (see `/bdd-planning`)
3. **Test**: Write tests, verify they fail (Red phase)
4. **Code**: Implement to make tests pass (Green phase)
5. **Refactor**: Clean up while tests still pass (Refactor phase)
6. **Verify**: Run `npm run check` before committing
7. **Post-mortem**: Capture learnings for future tasks (see `/perform-post-mortem`)
