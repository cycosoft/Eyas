---
name: efficiency-tiers
description: Definitions of development efficiency tiers and work streams, detailing mandatory verification gates and test bypass rules for diagnostic exploration vs production commits.
tags:
  - workflow
  - verification
  - quality-gates
---

# Reusable Skill: Efficiency Tiers & Work Streams

## Overview
This skill defines the four operational efficiency tiers, outlining specific verification requirements and bypass rules for diagnostic probes, cosmetic adjustments, targeted bug fixes, and final integration check-ins.

## When to Use
- Trigger when determining the level of verification required for a current development task.
- Trigger when applying zero-gate diagnostic logging during debugging sessions.

## Instructions

### Tier 0: Diagnostic / Temporary Logging (Zero-Gate Stream)
- **Definition**: Adding temporary `console.log` statements, print traces, or debug probes requested by the user to diagnose problems.
- **Workflow**: Rapid Direct Edit -> Direct Run/Manual Verification.
- **Verification/Bypass Rules**: Completely bypass test writing (no TDD required), linter rules, formatting checks, and file quality-gate rules (e.g. ignore maximum line counts or style enforcement). Never perform secondary cleanups, file refactoring, or split logic when adding temporary debug logging.

### Tier 1: Visual/Cosmetic Iteration
- **Definition**: Changes to CSS, labels, or UI layout that do not touch application logic or IPC.
- **Workflow**: Rapid Edit -> Manual/User Verification.
- **Verification**: Skip full test suites. Run *only* `npx eslint <file> --fix` locally. Batch full verification at the end of the task.

### Tier 2: Targeted Functional Fixes
- **Definition**: Logic changes in a single module or component.
- **Workflow**: TDD (Targeted Test) -> Code -> Targeted Verification.
- **Verification**: Run `npx vitest <file>` or `npx playwright test <file>`. Skip project-wide checks until the feature is stable.

### Tier 3: Final Integration (The "Check-In" Gate)
- **Definition**: Completion of a feature branch or complex refactor.
- **Workflow**: Full project validation.
- **Verification**: Mandatory `npm run check` before concluding the session or task.
