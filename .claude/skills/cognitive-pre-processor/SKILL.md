---
description: Strategic Narrative Planning - mental modeling, decision frameworks, and verification before implementation
when_to_use: Use before starting any feature development, major refactoring, or architectural decision
allowed-tools: Read,Grep,mcp__codebase-memory-mcp__search_graph,mcp__codebase-memory-mcp__search_code,mcp__codebase-memory-mcp__trace_path,mcp__codebase-memory-mcp__get_code_snippet
---

# Cognitive Pre-Processor: Strategic Narrative Planning

## Overview

Before writing implementation or code, create a **Strategic Narrative Plan** that captures:
1. **What** we're building and why
2. **Where** it fits in the codebase
3. **How** it will work (architecture & data flow)
4. **Who** it impacts (stakeholder perspectives)
5. **Verification** strategy before and after

**For the philosophy underpinning this practice** (Stop. Think. Plan. Verify. Only then, Code.), see `AGENTS.md` section 1. This skill focuses on the *mechanical process* of executing that philosophy.

## Strategic Narrative Plan Template

```markdown
# Strategic Narrative: [Feature Name]

## 1. Problem & Intent
**What problem are we solving?**
- Clear 1-2 sentence problem statement
- Why this matters to users/business

**Definition of Success:**
- Measurable outcome: what will be different?
- Example: "Users can close the service status modal with a single tap"

## 2. Scope & Boundaries
**What's included:**
- Specific files/components to change
- Data flows affected

**What's NOT included:**
- Anti-goals: things we won't do
- Explicitly rule out scope creep

**Impact Analysis:**
- Which features depend on this?
- Could any existing behavior break?

## 3. Technical Architecture
**Data Flow:**
- User action → Component state → Observable outcome
- Diagram: [ASCII or description]

**Key Files:**
- [ ] `src/components/AppHeader.vue` - Updated to use AppButton
- [ ] `src/components/AppButton.vue` - New wrapper component
- [ ] `src/components/AppButton.spec.js` - Tests for behavior

**Design Decisions & Alternatives:**
- Why AppButton instead of separate components?
- Why optional props instead of separate files?
- Considered but rejected: [alternative approaches]

## 4. Verification Strategy
**Before Implementation:**
- Current behavior: [describe existing state]
- Tests that must pass: [existing test file names]

**After Implementation:**
- Expected new behavior: [user-facing outcomes]
- Tests that verify: [new test names]
- Regression checklist: [what might break]

## 5. Stakeholder Perspective Review
* **Target Persona(s)**: [Who benefits: developer, QA engineer, etc.?]
* **Value Proposition**: [How does this solve their core need?]
* **Friction Guard**: [What pain points are we preventing?]
```

## Process Steps

### Step 1: Understand the Problem (5 min)
- Read the user request carefully
- Ask clarifying questions if needed
- Define success in observable terms (not technical)

### Step 2: Scope & Boundaries (5 min)
- List files that will change
- Identify what WON'T be touched
- Think about regressions

### Step 3: Design (5 min)
- Sketch data flow
- List key files
- Document design decisions
- Consider alternatives

### Step 4: Verification Strategy (5 min)
- What tests exist now that must still pass?
- What new tests describe the desired behavior?
- What could break? How do we detect it?

### Step 5: Stakeholder Alignment (2 min)
- Who benefits from this?
- What friction does it remove?
- Are we using established patterns (design tokens, components)?

### Step 6: Implement & Verify (ongoing)
- Execute the plan
- Run tests before and after
- Commit with the plan as context

## Anti-Patterns to Avoid
- ❌ Jumping to code before capturing the plan
- ❌ Over-engineering for hypothetical future needs
- ❌ Ignoring stakeholder perspectives until too late
- ❌ Skipping the "what could break?" analysis
- ❌ Writing tests AFTER implementation (defeats BDD)

## When to Adjust the Plan
- User clarifies scope differently
- Technical constraint discovered
- Stakeholder feedback changes priority
- New information invalidates assumptions

**When this happens**: Update the Strategic Narrative and revisit verification strategy. Don't silently change course.

## Related Skills
- See `/testing-standards` for BDD verification strategy
- See `/stakeholder-perspectives` for persona-driven alignment
- See `/refactoring-patterns` for incremental design decisions
