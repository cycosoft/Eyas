# Claude Code Skills for Eyas

This directory contains 18 reusable Claude Code skills organized by domain. Each skill provides domain-specific guidance, standards, and protocols for the Eyas project.

## Skill Sourcing

- **`.claude/skills/` (this directory)** — Claude Code-authoritative skill definitions with full YAML frontmatter and documentation
- **`.agents/skills/`** — Shared source of truth for other agent systems in the project; updated manually when `.claude/skills` changes

These are kept in sync by explicit manual updates, not automation. If you modify `.agents/skills` for other tools, plan to reflect those changes into `.claude/skills/`.

## Skills Index

### Planning & Strategy
Skills for thinking through problems before implementation.

- **`/cognitive-pre-processor`** — Strategic Narrative Planning
  - **Purpose**: Mental modeling, decision frameworks, and verification before implementation
  - **Use when**: Starting feature development, major refactoring, or architectural decisions
  - **Provides**: Step-by-step planning protocol, strategic narrative template, stakeholder alignment

- **`/stakeholder-perspectives`** — Persona-Driven Alignment (internal self-check)
  - **Purpose**: Quick internal empathy simulation to sanity-check features/UI against target personas — not a real stakeholder consultation
  - **Use when**: Starting feature development, planning major UI changes, or making architectural decisions
  - **Provides**: Stakeholder persona profiles (QA engineers, release engineers, CI/CD integrators, Electron app developers), alignment checklist

### Configuration & Project Setup
Skills for managing project configuration and structure.

- **`/claude-code-standards`** — Official Claude Code Configuration
  - **Purpose**: Caches official Claude Code documentation, standards, and best practices to eliminate research
  - **Use when**: Setting up Claude Code configuration, defining new skills, troubleshooting auto-invocation, or optimizing CLAUDE.md
  - **Provides**: Frontmatter field definitions, auto-invocation mechanics, CLAUDE.md structure patterns

- **`/config-audit`** — Configuration Optimization & Audit
  - **Purpose**: Identify redundant fields, default values, and format violations across configuration files
  - **Use when**: Reviewing multiple config files, reducing token cost, standardizing formats, or batch cleanup
  - **Provides**: Audit workflow, redundancy detection, batch remediation patterns

- **`/directory-semantics`** — Directory Structure & Purpose
  - **Purpose**: Disambiguate why directories exist and clarify relationships between similar folders
  - **Use when**: Understanding directory layouts, documenting folder purposes, or organizing multi-system structures
  - **Provides**: Disambiguation patterns, ownership documentation, `.agents/` vs `.claude/` clarification

### Development & Implementation

- **`/vue-interface-standards`** — Vue 3 Components & Composition API
  - **Purpose**: Component patterns, state management, and testing standards for the Vue 3 frontend interface
  - **Use when**: Building or refactoring Vue components in `src/eyas-interface/`, or managing UI state via Pinia/Vuetify
  - **Applies to**: `src/eyas-interface/**/*.vue`
  - **Provides**: Component patterns, prop design, state management, Vitest execution

- **`/refactoring-patterns`** — Code Organization & Abstraction
  - **Purpose**: Refactoring patterns including proxy pattern, logic extraction, and domain-first splitting
  - **Use when**: Refactoring code exceeding `max-lines`, extracting logic, or improving code organization
  - **Provides**: Incremental wrapping strategy, proxy patterns, state extraction, platform utility abstraction

- **`/electron-core-standards`** — Electron Main Process Architecture
  - **Purpose**: Architectural standards and IPC communication patterns for the Electron main process
  - **Use when**: Implementing or modifying main-process logic in `src/eyas-core/`, or designing new IPC channels
  - **Applies to**: `src/eyas-core/**/*.ts`
  - **Provides**: IPC patterns, functional module organization, error handling, object liveness guards (CRITICAL)

### Testing & Quality

- **`/bdd-planning`** — Mandatory BDD Planning Gate
  - **Purpose**: Convert implementation plans into empty BDD test cases (it.todo) before writing product code
  - **Use when**: Before writing or editing any product code for a feature, bug fix, or behavior change
  - **Provides**: Requirement extraction, BDD scaffold structure, iterative development cycle

- **`/bdd-philosophy`** — BDD Mindset & Practices
  - **Purpose**: BDD philosophy, Discovery/Formulation/Automation practices, and behavior-focused testing mindset
  - **Use when**: Starting test-driven development, reviewing test failures from behavioral perspective, or coaching on BDD principles
  - **Provides**: Three core practices, behavior vs. implementation distinctions, common anti-patterns, happy+sad path strategy

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

- **`/typescript-gotchas`** — Debugging & Common Pitfalls
  - **Purpose**: Advanced TypeScript patterns, mocking pitfalls, event handler quirks, and debugging type narrowing issues
  - **Use when**: Debugging type errors, fixing mocking issues, or troubleshooting test failures related to typing
  - **Provides**: Type leak prevention, test narrowing safety, API migration awareness, module-level constant mocking

### Platform & Tooling

- **`/electron-e2e-testing`** — Playwright E2E Test Strategies
  - **Purpose**: Operational procedures and synchronization strategies for writing and debugging Playwright E2E tests
  - **Use when**: Writing or debugging E2E test suites in `tests/e2e/`, or encountering resource lock errors
  - **Applies to**: `tests/e2e/**/*.spec.mjs`
  - **Provides**: Process management, first-run modal handling, event-driven testing, macOS window resize gotchas

- **`/feature-flagging`** — Logic Bypassing & Feature Flags
  - **Purpose**: Standards for bypassing logic via feature flags while satisfying strict TSC unreachable code checks
  - **Use when**: Temporarily disabling features, investigating logic flow, or implementing "coming soon" features
  - **Provides**: Boolean toggle patterns, block comment patterns, centralized flag registry, cleanup requirements

- **`/active-test-content-gating`** — Active Test Content Visibility (Post-Mortem)
  - **Purpose**: Architectural post-mortem and operational guidelines for implementing active test content visibility gating in UI components
  - **Use when**: Debugging or extending AppHeader/AppHeaderOmniHub, handling Electron IPC payloads, or troubleshooting Vitest state leaks
  - **Provides**: Production code efficiency patterns, test state isolation mandatory pattern, token reduction strategies

### Efficiency & Quality Gates

- **`/efficiency-tiers`** — Development Efficiency Tiers
  - **Purpose**: Definitions of development efficiency tiers (Diagnostic, Cosmetic, Functional, Integration) and verification gates
  - **Use when**: Determining the level of verification required for a task, or applying zero-gate diagnostic logging
  - **Provides**: Tier definitions (Tier 0–3), workflow patterns, verification/bypass rules for each tier

### Documentation & Retrospectives

- **`/perform-post-mortem`** — Retrospective Protocol
  - **Purpose**: Post-mortem protocol for capturing technical debt, workflow improvements, and lessons learned
  - **Use when**: After completing major features, debugging complex issues, or experiencing test failures
  - **Provides**: Post-mortem template, churn analysis, reusable pattern extraction, assessment structure

## Auto-Invocation

These skills are configured to auto-invoke when Claude Code detects relevant keywords in the task context. You can also manually invoke any skill with `/skill-name`:

```
/active-test-content-gating
/bdd-planning
/bdd-philosophy
/claude-code-standards
/cognitive-pre-processor
/config-audit
/directory-semantics
/efficiency-tiers
/electron-core-standards
/electron-e2e-testing
/feature-flagging
/perform-post-mortem
/refactoring-patterns
/stakeholder-perspectives
/testing-standards
/type-registry-standards
/typescript-gotchas
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
