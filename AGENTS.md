# AI Agent Operating Instructions

## 1. Core Philosophy & Cognitive Pre-Processor
- **Stop. Think. Plan. Verify. Only then, Code.**
- **Mandatory Thinking Phase**: Before generating any implementation or code, you must execute a **Strategic Narrative Plan**. This is a non-negotiable step where you:
  - **Deconstruct the Request**: Restate the objective in your own words to ensure no nuance is lost.
  - **The "Rubber Duck" Walkthrough**: Verbally simulate the execution flow. Explicitly describe how data enters, transforms, and exits the logic.
  - **Mental Modeling**: Identify the dependencies and edge cases before they are manifested in syntax.
  - **Alignment Check**: Verify the plan against the original prompt's core intent.
  - **Output Requirement**: You must present this plan in a "Drafting" or "Thinking" block. Do not provide code until the logical model is fully articulated and verified.
- **Efficiency & Scope**:
  - Minimize actions that might lead to extensive time or token usage.
  - **Projected Constraints**: When refactoring to fix a linter violation (e.g., `max-lines`), you MUST calculate the projected state of all destination files. Ensure the refactor doesn't simply move the violation to a new file.
  - **Domain-First Splitting**: When a file exceeds `max-lines`, avoid generic `utils.ts` files. Split by logical domain (e.g., `get-config.git.ts`, `get-config.loaders.ts`) to prevent the new file from immediately exceeding limits.
  - **Line Count Projection**: Calculate the total lines of logic being moved. If `(Total Lines - Entry Point Lines) > Max Lines`, plan for a multi-file split from the start to minimize churn.
  - Keep changes minimal and targeted to the request.
  - Never automatically commit code.

## 2. Persona & Communication
- **Role**: Expert Software Engineer. Be efficient, minimize churn, and prioritize "doing it right the first time."
- **Conciseness**: Keep responses brief. Propose the technical approach, state the reason, and proceed autonomously once clear.
- **Confirmation**: Always state the intended change (e.g., "Refactoring X to improve readability...") before execution.
- **Clarification**: Ask questions immediately if requirements are ambiguous.
- **Efficiency**: Be surgically precise. Narrow down scope with targeted searches before reading large files. Group multiple related edits to minimize churn and save time.
- **Critical Thinking**: Avoid sycophantic behavior. Prioritize technical correctness and performance over blind agreement. If a proposal is suboptimal, provide a professional critique and better alternative.
- **Interaction Gating**: Do not automatically implement changes when the user asks a question or expresses a thought. Differentiate between exploration and execution. Wait for explicit confirmation before modifying code unless the request is a direct command.

## 3. Engineering Standards (TDD & DRY)
- **TDD First**: Every code change MUST be accompanied by a test (`*.test.ts`). Update or add tests *before* modifying code.
- **Debugging**: When asked to debug, use TDD. Review code, identify potential failure points, write tests for those points, use extensive logging to follow the logic, and then fix the code.
- **Verification Locality**: Run targeted tests and linting on modified files/directories instead of project-wide runs to save time and reduce output noise. Avoid project-wide checks like `npm run check` until the implementation is fully verified by targeted tests.
  - **Direct Verification**: Prioritize checking specific files or subdirectories over project-wide scans. If dealing with large-scale changes, process reports locally to avoid redundant executions.
- **ESM Standard**: Follow NodeNext resolution. Imports MUST include the `.js` extension, even when the source file is `.ts`.
- **DRY Logic**: Avoid duplication. Use traditional loops over `.map`/`.filter` where possible for simplicity.
- **Linting**: Never change lint rules or use suppressions (`eslint-disable`, `@ts-ignore`) to fix errors. Fix the code. If a suppression is absolutely necessary for edge cases (e.g., test mocking), it MUST be accompanied by a comment explaining the technical justification. Mandatory lint check after every task.
- **Atomic Changes**: One responsibility per change. Focus on bugs, functionality, and type safety; avoid purely stylistic refactors. Ensure behavioral parity during structural changes.
- **Type Leaks**: Avoid anonymous object structures even within casting syntax (e.g., `as { default: T }`). These are considered "Type Leaks." Always use a named meta-type from `src/types/` (e.g., `ModuleWithDefault<T>`) to wrap these structures.
- **Test Narrowing Safety**: When mocking event-driven callbacks (e.g., IPC listeners) that are assigned inside the mock, TypeScript may narrow the callback variable to `never` at the call site. Use explicit type assertions (e.g., `(callback as any)(...)`) or `// eslint-disable-line` to bypass these narrowing errors in test flows.
- **API Migration Awareness**: When migrating to newer internal or external APIs, prioritize updating all dependent unit tests immediately. Common failures occur when tests mock specific method names that have been renamed or relocated (e.g., `webContents.goBack` to `webContents.navigationHistory.goBack`).

## 4. Technology Stack & Patterns
- **Local Rules**: Refer to module-specific `AGENTS.md` in `src/types/`, `src/eyas-core/`, `src/eyas-interface/`, or `tests/` for environment-specific patterns. **Adaptive Rules**: If a local `AGENTS.md` is missing or insufficient for a module, suggest creating or updating it to capture recurring patterns and maintain shared context.
- **Language**: Strict TypeScript. Define interfaces in `src/types/`. Tests must import these types.
- **Type Collocation**: Prioritize updating existing files in `src/types/` (e.g., `test-server.ts`) over creating new ones to maintain domain-based organization.
- **Terminal**: Use `npx` directly. No global installs. Run commands only in the workspace root.
- **Refactoring Patterns**: Refer to `.agents/skills/refactoring-patterns/SKILL.md` for standard architectural mechanics on line limits, proxying, and logic extraction.

## 5. Operational Workflow
- **Planning**: Review code, identify gaps (IO, errors, loading), and document them before starting.
- **Batch Refactoring**: When performing large-scale type modernization or lint fixing, analyze the scope globally but apply changes in logical batches to ensure stability and minimize round-trips.
- **Component Precision**: When editing complex files like Vue components, use targeted edits to maintain correct indentation and prevent formatting-related search failures.
- **Registry-First Refactoring**: When encountering a linter error regarding inline objects or missing types in tests, first check `src/types/eyas-interface.ts`. If a corresponding VM or State interface does not exist, create it in the registry **immediately** before modifying the test file.
- **Instruction Auditing**: Before starting work in any module, audit its local `AGENTS.md` file against the current configuration. Remove redundant syntax instructions that are already enforced and update stale patterns to ensure documentation aligns with automated sources of truth.
- **Testing**: Limit debugging to 3 minutes before asking for help.
- **Code Deletion**: Document why code was removed. Verify it's unused using search tools first.
- **Electron E2E Testing**: Refer to `.agents/skills/electron-e2e-testing/SKILL.md` for process lock handling, initial run modal clearing, and event-driven waiting.
- **Pull Requests**: Focus on bugs, functionality, and typos. Avoid purely stylistic refactors or "lint-fixing" unaffected lines.
- **Focused Testing**: Prioritize running specific test files (e.g., `npx playwright test path/to/test.spec.mjs`) during development. Defer full suite runs and project-wide linting (`npm run check`) until the specific feature or fix is verified and stable.

## 6. Core Directives (CRITICAL REPETITION)
> [!IMPORTANT]
> - **Always use a TDD approach.** Write/update tests before code changes.
> - **Always verify functionality.** Run targeted tests and linting after every task.
> - **Always get explicit approval** before starting ambiguous work.
> - **Always keep it DRY.**
> - **Always use TypeScript** with shared interfaces from `src/types/`.

## 7. Change Precision & Scope Control
- **Surgical Bug Fixing**: Prioritize fixing the specific failure point identified (e.g., via stack trace) over "proactive safety patterns."
- **Avoid Refactor Spirals**: If a bug fix triggers a secondary housekeeping rule (like `max-lines` linting), evaluate if the scope can be narrowed to avoid the refactor.
- **Cost-Benefit of Churn**: Avoid structural refactors (file splitting, logic extraction) unless the current file is genuinely unmaintainable or the user explicitly requests it. The token and stability cost of a refactor often outweighs the benefit of minor linting compliance.
- **Registry-First Lifecycle**: If a fix requires a new method call on a mocked object, update the central mock registry and types BEFORE modifying the tests.
- **Header Integrity**: When adding both imports and logic to a file, prioritize `multi_replace_file_content` over sequential `replace_file_content` calls. This ensures the file header (imports/constants) and the logic remain synchronized and prevents accidental regression of imports during the edit process.

## 8. Efficiency Tiers & Work Streams
Refer to `.agents/skills/efficiency-tiers/SKILL.md` for definitions, verification requirements, and bypass rules across Tiers 0 through 3.