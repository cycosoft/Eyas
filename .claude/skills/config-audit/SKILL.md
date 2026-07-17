---
description: Configuration file audit and optimization - identify redundant fields, default values, and format violations across YAML and JSON configuration
when_to_use: Use when reviewing multiple configuration files, optimizing SKILL.md frontmatter, reducing token cost, or standardizing configuration across a directory
allowed-tools: Read,Bash,Grep,Edit
---

# Configuration Audit & Optimization

This skill helps identify and remediate configuration redundancy, default values, and format violations at scale.

## When to Use This Skill

- **Batch optimization**: Multiple config files with similar structure (e.g., 8+ SKILL.md files)
- **Token reduction**: Eliminating redundant fields to reduce context cost
- **Standardization**: Ensuring consistent format across related files
- **Validation**: Checking that all files follow official specifications
- **Cleanup**: Removing deprecated fields or anti-patterns

---

## Configuration Audit Workflow

### Step 1: Scan for Redundancy

For YAML/JSON configuration, identify fields that match their documented defaults:

**Common redundancy patterns:**

| File Type | Redundant Field | Default | Why Remove |
|-----------|-----------------|---------|------------|
| SKILL.md | `name: <directory-name>` | directory name | Field matches default; context waste |
| SKILL.md | `user-invocable: true` | `true` | Field always true; context waste |
| SKILL.md | `tags:` | N/A (deprecated) | Not used by Claude Code; remove entirely |
| YAML config | `enabled: true` | `true` (varies) | Check docs; often redundant |
| JSON config | `"strict": false` | `false` (varies) | Check schema; often redundant |

### Step 2: Batch Detection

Use `grep` or `bash` loops to find pattern across multiple files:

**Example: Find all SKILL.md files with redundant `user-invocable: true`**
```bash
grep -r "user-invocable: true" .claude/skills/*/SKILL.md
```

**Example: Extract frontmatter from all SKILL.md files for comparison**
```bash
for f in .claude/skills/*/SKILL.md; do
  echo "=== $(dirname $f | xargs basename) ==="
  head -15 "$f"
done
```

### Step 3: Audit & Report

Document findings:
- ✅ **Files with violations**: Count by type
- ✅ **Fields affected**: Which fields are redundant
- ✅ **Token impact**: Estimate context savings
- ✅ **Remediation plan**: Which files to edit

**Example report:**
```
Found 8 SKILL.md files with redundant frontmatter:
- `name:` field (matches directory): 8 files
- `user-invocable: true` (matches default): 8 files

Token impact: ~16 lines removed
Savings: Reduces context cost on every skill invocation
Effort: 8 Edit tool calls (batch cleanup)
```

### Step 4: Remediation

Batch edit files to remove redundant fields, using Edit tool with exact string matching.

**Approach:**
1. Read one file to extract exact formatting
2. Use Edit tool with `old_string` (current frontmatter) and `new_string` (cleaned version)
3. Verify after edits: `grep -E "name:|user-invocable:" .claude/skills/*/SKILL.md` should return 0 results

---

## Format Violations to Catch

### SKILL.md Frontmatter

**Missing required fields:**
- [ ] `description` missing — auto-invocation won't trigger
- [ ] No frontmatter at all — skill won't load

**Frontmatter syntax errors:**
- [ ] Misaligned YAML indentation (spaces vs. tabs)
- [ ] Missing `---` delimiters (top/bottom)
- [ ] Unquoted special characters (`:`, `#`, `@`)

**Field-specific issues:**
- [ ] `allowed-tools` includes tools not available in Claude Code
- [ ] `paths` globs don't match any files in the repo
- [ ] `disable-model-invocation: false` (redundant; omit if false)

### CLAUDE.md

**Content bloat:**
- [ ] Duplicates content from skills (should link instead)
- [ ] Exceeds ~100 lines (too long; move detail to skills)
- [ ] Implementation details instead of pointers (violates DRY)

---

## Anti-Patterns to Catch

### ✅ Good: Specific Defaults

```yaml
description: Vue 3 component standards
allowed-tools: Read,Edit,Bash
```

### ❌ Bad: Redundant Defaults

```yaml
name: vue-interface-standards
description: Vue 3 component standards
user-invocable: true
allowed-tools: Read,Edit,Bash
disable-model-invocation: false
```
