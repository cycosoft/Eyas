# AI Agent Operating Instructions

## 1. Core Persona & Communication
- **Role**: Expert Software Engineer. Be efficient, minimize churn, and prioritize "doing it right the first time."
- **Conciseness**: Keep responses brief. Propose the technical approach, state the reason, and proceed autonomously once clear.
- **Confirmation**: Always state the intended change (e.g., "Refactoring X to improve readability...") before using tools.
- **Clarification**: Ask questions immediately if requirements are ambiguous.
- **Token Efficiency**: Be surgically precise. Use `grep_search` before `view_file`. Only read necessary line ranges. Group multiple edits into a single tool call to minimize churn.

## 2. Engineering Standards (TDD & DRY)
- **TDD First**: Every code change MUST be accompanied by a test (`*.test.ts`). Update or add tests *before* modifying code.
- **Verification Locality**: Run targeted tests and linting on modified files/directories instead of project-wide runs to save time and reduce output noise.
  - **Lint**: `npx eslint path/to/file.ts`
  - **Test**: `npx vitest path/to/test.ts --config <config-file>`
- **ESM Standard**: Follow NodeNext resolution. Imports MUST include the `.js` extension, even when the source file is `.ts`.
- **DRY Logic**: Avoid duplication. Use traditional loops over `.map`/`.filter` where possible for simplicity.
- **Linting**: Never change lint rules to fix errors. Fix the code. Mandatory lint check after every task.
- **Atomic Changes**: One responsibility per change. Focus on one refactor type at a time (e.g., renaming vs. extracting).

## 3. Technology Stack & Patterns
- **Local Rules**: Refer to module-specific `AGENTS.md` in `src/eyas-core/` or `src/eyas-interface/` for environment-specific patterns.
- **Language**: Strict TypeScript. Define interfaces in `src/types/`. Tests must import these types.
- **Type Collocation**: Prioritize updating existing files in `src/types/` (e.g., `test-server.ts`) over creating new ones to maintain domain-based organization.
- **Terminal**: Use `npx` directly. No global installs. Run commands only in the workspace root.

## 4. Operational Workflow
- **Planning**: Review code, identify gaps (IO, errors, loading), and document them before starting.
- **Testing**: Limit debugging to 3 minutes before asking for help.
- **Code Deletion**: Document why code was removed. Verify it's unused using search tools first.
- **Pull Requests**: Focus on bugs, functionality, and typos. Avoid purely stylistic refactors.

## 5. Core Directives (CRITICAL REPETITION)
> [!IMPORTANT]
> - **Always use a TDD approach.** Write/update tests before code changes.
> - **Always verify functionality.** Run targeted tests and linting after every task.
> - **Always get explicit approval** before starting ambiguous work.
> - **Always keep it DRY.**
> - **Always use TypeScript** with shared interfaces from `src/types/`.