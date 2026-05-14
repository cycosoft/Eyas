---
name: perform-post-mortem
description: Standard operating procedure for conducting systematic engineering post-mortems after feature development or refactoring tasks, designed to capture technical debt, workflow improvements, and token reduction strategies.
tags:
  - workflow
  - post-mortem
  - meta-skill
---

# Reusable Skill: Performing an Engineering Post-Mortem

## Overview
This skill outlines the systematic protocol to capture technical debt, workflow inefficiencies, and structural gotchas at the conclusion of every major feature or refactor, ensuring continuous optimization of the pair-programming loop.

## When to Use
- Trigger upon successful completion and verification (via `npm run check`) of a Tier 2 or Tier 3 development task.
- Trigger when the user explicitly requests an assessment or post-mortem of completed work.

## Instructions

### 1. Analyze Churn & Friction Points
- Review the conversation transcript for compilation errors, linter violations, or failing unit tests encountered during the task.
- Identify *why* the initial approach required correction (e.g., missing imports, unexpected type narrowing, unmocked dependencies).

### 2. Extract Reusable Patterns
- Determine if the solution represents a recurring repository pattern (e.g., Proxy pattern for line limits, explicit lambda wrapping for context injection).

### 3. Draft the Assessment
Structure the assessment into three distinct pillars:
- **Production Efficiency**: What architectural or documentation changes would accelerate future feature work?
- **Test Robustness**: What specific mocking or teardown practices were required to stabilize the suite?
- **Resource/Token Optimization**: How can search and verification queries be narrowed for similar tasks?

### 4. Package into Compliant AI Agent Skills
- Create or update dedicated skill folders under `.agents/skills/` (e.g., `.agents/skills/<skill-name>/SKILL.md`).
- Ensure every `SKILL.md` contains fully compliant YAML frontmatter (`name`, `description`) matching the directory structure for progressive disclosure ingestion.
