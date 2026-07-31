---
description: Directory structure semantics, distinguishing purpose across folders (source vs. live, archive vs. current, system-specific), and information architecture patterns
when_to_use: Use when understanding directory layouts, disambiguating folder purposes, documenting directory relationships, or organizing multi-variant code structures
allowed-tools: Read,Grep,Bash,mcp__codebase-memory-mcp__search_graph,mcp__codebase-memory-mcp__search_code,mcp__codebase-memory-mcp__trace_path,mcp__codebase-memory-mcp__get_code_snippet
---

# Directory Structure Semantics & Information Architecture

This skill helps disambiguate why directories exist, what they contain, and how they relate to each other — preventing confusion when similar directories serve different purposes.

## Common Directory Confusion Patterns

### Pattern 1: Same Content in Multiple Places

**Scenario**: You find `src/utils.js`, `utils/index.js`, and `helpers/utils.js` containing similar code.

**Questions to answer:**
- Are these duplicates? (bug) or complementary? (design)
- Which is authoritative?
- Are they intentionally versioned? (old vs. new)
- Do they serve different systems? (frontend vs. backend, test vs. prod)

### Pattern 2: Folders with Similar Names

**Scenario**: `.agents/`, `.claude/`, `agents/`, `claude/`

**The confusion**: Are these versions? Old vs. new? Different purposes?

**How to disambiguate:**
1. Read folder contents (file types, naming conventions)
2. Check documentation (README, comments, CLAUDE.md)
3. Infer purpose from file content (vs. assuming naming order = versioning)
4. Document the relationship explicitly

---

## Eyas Directory Reference

### Clear Distinctions in This Project

#### `.agents/` — Agent Definitions for Non-Claude-Code Systems

- **Purpose**: Agent definitions and skill templates for other agent frameworks (not Claude Code)
- **Content**: Original `.md` files with basic structure
- **Audience**: Other agent systems, legacy integrations
- **Maintenance**: Archive/reference; do not edit for Claude Code use
- **Relation to `.claude/skills/`**: Different purpose; not versioning

**Why separate:**
- Claude Code has its own skill configuration format
- Other agent systems in the project use their own definitions
- Keeping them separate prevents format confusion

#### `.claude/` — Claude Code Configuration & Tools

- **Purpose**: All Claude Code configuration, skills, and workflows
- **Subfolders**:
  - `skills/` — Reusable domain-specific skills (18+ `.claude/skills/**/SKILL.md`)
  - Other future: plans, memory, hooks, etc.
- **Content**: Enriched versions of skills with full documentation
- **Audience**: Claude Code and this project's AI workflows
- **Maintenance**: Primary/authoritative; actively edited and improved
- **Relation to `.agents/`**: Complementary, not derivative

---

## Best Practices for Directory Semantics

### 1. Document Relationships in README

When related directories exist, create a README at the parent level explaining the relationship:

```markdown
# Folder Structure

- `.agents/` — Definitions for non-Claude-Code agent systems
  - Source format varies by agent type
  - Archive reference; see `.claude/` for Claude Code skills
  
- `.claude/` — Claude Code configuration and tools
  - `skills/` — Reusable domain-specific skills
  - `memory/` — Auto-memory storage (persists across sessions)
  - Authoritative for Claude Code workflows
```

### 2. Avoid Naming Confusion

**❌ Don't do this:**
```
agents/        ← vague: agents for what system?
agents_old/    ← implies versioning (not true here)
agents_v2/     ← suggests iteration (misleading)
```

**✅ Do this:**
```
.agents/                        ← specific: other agent systems (dot-prefix convention)
.claude/skills/                 ← specific: Claude Code skills directory
src/agents/                     ← specific: application code for agent-like patterns
```

### 3. Document Ownership

For each directory, clarify:
- **Who maintains it?** (Claude Code, other agent framework, project code)
- **When to edit it?** (actively, for reference only, legacy)
- **What format?** (SKILL.md, custom format, .md docs)
- **How often?** (every task, rarely, never)

**Example**: `.claude/skills/README.md`
```markdown
## Authoritative Source

These skills are defined in `.claude/skills/` and auto-load in Claude Code.
The `.agents/` folder contains definitions for other agent systems and is
not actively maintained for Claude Code use.
```

---

## Anti-Patterns to Catch

### ✅ Good: Clear Purpose

```
.claude/                 ← specific tool/system namespace
.agents/                 ← specific tool/system namespace
```

### ❌ Bad: Ambiguous Naming

```
old-styles/              ← ambiguous: old version of what?
tmp/                     ← ambiguous: temporary what?
backup/                  ← ambiguous: backup of what?
```
