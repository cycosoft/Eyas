---
description: Official Claude Code configuration standards, frontmatter field definitions, and best practices for skills and projects
when_to_use: Use when setting up Claude Code configuration, defining new skills, troubleshooting skill auto-invocation, or optimizing CLAUDE.md and SKILL.md files
allowed-tools: Read,Grep
---

# Claude Code Standards Reference

This skill documents official Claude Code configuration format, best practices, and standards to eliminate the need for external research on future Claude Code tasks.

## SKILL.md Frontmatter Reference

All Claude Code skills use YAML frontmatter. These are the authoritative field definitions:

### Required Fields

- **`description`** (string, recommended)
  - Primary signal Claude uses to decide when to auto-invoke the skill
  - Semantic content matters: describes what the skill teaches, not implementation details
  - Capped at 1,536 characters when combined with `when_to_use` in skill listings
  - **Best practice**: Be specific about domain and purpose, not generic

### Optional Fields

- **`when_to_use`** (string, optional)
  - Guidance on when to invoke the skill
  - Appended to `description` in skill listings (combined capped at 1,536 chars)
  - Clarifies the trigger conditions: "Use when..." or "Trigger when..."
  - **Best practice**: Complement description, don't repeat it

- **`allowed-tools`** (string, space- or comma-separated)
  - Which Claude Code tools the skill can use: `Read`, `Edit`, `Write`, `Bash`, `Grep`, `Explore`, `Plan`, `advisor`, etc.
  - Limits scope and prevents unintended operations
  - **Best practice**: Only include tools actually needed for the skill's domain

- **`paths`** (optional YAML block, list of globs)
  - File patterns the skill applies to
  - Helps Claude focus on relevant code when auto-invoking
  - Example:
    ```yaml
    paths:
      - "src/components/**/*.vue"
      - "src/views/**/*.vue"
    ```
  - **Best practice**: Use for skills targeting specific file types

- **`disable-model-invocation: true`** (optional boolean)
  - Prevents Claude from auto-invoking; skill becomes user-only (manual `/skill-name` invocation only)
  - Default (when omitted): `false` — Claude CAN auto-invoke
  - **Best practice**: Only set to `true` if skill should never auto-trigger

### Anti-Patterns: Fields to Avoid

- **`name:`** — Defaults to directory name; omit if `name` matches directory
  - **Cost**: Redundant field wastes context tokens across all future invocations
  
- **`user-invocable: true`** — Defaults to `true`; omit the explicit declaration
  - **Cost**: Same as above; noise that adds no information
  
- **`tags:`** — Deprecated; omit entirely
  - **Cost**: Not used by Claude Code for auto-invocation; adds clutter

### Default Values (Omit When Not Needed)

Per official Claude Code docs, these defaults apply when fields are omitted:
- `name` → directory name
- `user-invocable` → `true`
- `disable-model-invocation` → `false` (auto-invocation enabled)

**Token optimization**: Omit any field that matches its default value.

---

## Auto-Invocation Mechanics

### How Claude Decides to Auto-Invoke

1. Claude reads the task/prompt from the user
2. Claude scans loaded skills' `description` and `when_to_use` fields
3. If semantic overlap is detected, the skill is auto-invoked
4. The skill stays loaded for the session and can be re-invoked via `/skill-name`

**Not a keyword matcher**: Auto-invocation is semantic, not pattern-based. The description's language matters.

### Optimizing for Auto-Invocation

- **Be specific**: "BDD testing patterns and Vitest execution" auto-invokes better than "Testing"
- **Use domain language**: "Vue 3 components and Composition API" vs. generic "Components"
- **Address the "why"**: "Strategic Narrative Planning" hints at planning before code vs. generic "Planning"

---

## CLAUDE.md Structure

The CLAUDE.md file at project root should include:

### Minimal Content (Required)
- Project overview (one paragraph)
- Build/test commands
- Code style standards (indentation, imports, testing approach)
- Local development setup (Node, dependencies, environment)

### Recommended Content
- Architecture overview (folder structure, state management)
- Testing patterns (framework, environment, mocking approach)
- Common tasks with skill references

### Anti-Patterns
- **Duplication**: Don't repeat content that's in skills (it will rot)
- **Excessive length**: CLAUDE.md should be ~80 lines, not 200+
- **Implementation details**: Architecture and patterns go in skills, not CLAUDE.md

### Links to Skills
When referencing a workflow, link to the skill instead of duplicating:
- ✅ "For testing patterns, see `/testing-standards`"
- ❌ "Write tests using describe/it blocks with BDD structure..." (duplicated content)

---

## Skill Lifecycle & Organization

### When to Create a New Skill
- Domain is broad enough to warrant 50+ lines of guidance
- Content is reusable across many tasks in that domain
- Skill would auto-invoke frequently (not edge-case-only)

### When to Extend an Existing Skill
- Content naturally fits within an existing domain
- Would benefit from that skill's focus area (e.g., adding TypeScript patterns to `/typescript-gotchas`)

### Directory Naming
- Use kebab-case (lowercase, hyphens)
- Name should match `/skill-name` invocation command
- Example: `cognitive-pre-processor/` → `/cognitive-pre-processor`

### Directory Structure
```
.claude/skills/
├── skill-name/
│   ├── SKILL.md          (required: frontmatter + markdown)
│   └── [extras]/         (optional: examples, templates, reference files)
└── README.md             (index of all skills)
```

---

## Related Documentation

- **Official Claude Code docs**: https://code.claude.com/docs/en/skills
- **Skills in this project**: `.claude/skills/README.md`
- **Project standards**: `CLAUDE.md`, `AGENTS.md`
