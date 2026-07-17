---
description: Lightweight internal empathy self-check (not a real stakeholder) - simulate target personas to sanity-check a design/feature, and flag when a question surfaces that actually needs the real team
when_to_use: Use at the start of feature development, major UI changes, or architectural decisions as a quick internal sanity check - not a substitute for asking real stakeholders
allowed-tools: Read
---

# Stakeholder Perspectives & Empathy Alignment

## Overview
This is a fast, internal self-check — you simulating how a persona would react — not a real stakeholder consultation. It's meant to catch obvious misses (missing a11y consideration, wrong persona targeted, ignoring an existing friction point) cheaply, before code, without bothering anyone.

It is **not** authoritative on product or business decisions. If running this checklist surfaces a genuine open question — not "would a developer find this confusing" but "should we even do this, or which of two real options is right" — stop simulating and escalate to the human user directly. Don't let a persuasive-sounding simulated answer substitute for a real one on anything that actually matters.

**Recommended Workflow**: Include stakeholder alignment in your Strategic Narrative Plan (see `/cognitive-pre-processor`).

## The Stakeholder Registry

### 🔬 The QA Engineering Team (Eyas End-Users)

#### 1. The QA Engineer (Pre-Release Validation)
- **Role/Context**: Tests Electron app builds against different environments (staging, prod) before release
- **Core Value**: Confidence in build quality, quick validation cycles, reproducibility
- **Friction**: Manual environment setup, slow feedback loops, non-deterministic test results
- **Design Check**: Clear error reporting, easy environment switching, deterministic outcomes
- **Example**: "QA should be able to validate a build in minutes, not hours"

#### 2. The Release Engineer (Build Signing & Distribution)
- **Role/Context**: Signs, notarizes, and distributes installers across platforms (macOS, Windows)
- **Core Value**: Reliability, audit trail, compliance with code signing standards
- **Friction**: Complex signing workflows, unclear error states when notarization fails, platform-specific edge cases
- **Design Check**: Clear signing status feedback, detailed error messages, cross-platform consistency
- **Example**: "Signing should fail fast with a clear message, not silently produce a bad installer"

#### 3. The CI/CD Integration Engineer
- **Role/Context**: Integrates Eyas into automated testing pipelines
- **Core Value**: Scriptability, deterministic behavior, minimal dependencies
- **Friction**: Complex CLI arguments, flaky test servers, hard-to-parse output formats
- **Design Check**: Machine-readable output, clear exit codes, reproducible test runs
- **Example**: "Eyas should work seamlessly in headless CI environments with no GUI overhead"

### 💻 The Developer Community (Eyas Users)

#### 4. The Electron App Developer (Integrating Eyas)
- **Role/Context**: Uses Eyas to test their own Electron app before shipping
- **Core Value**: Easy setup, comprehensive test coverage, minimal integration friction
- **Friction**: Complex configuration, inadequate documentation, missing test scenarios
- **Design Check**: Clear defaults, progressive disclosure of advanced options, thorough docs
- **Example**: "Integrating Eyas into my test suite should take 10 minutes, not 2 hours"

---

## Stakeholder Alignment Checklist

### 1. Persona Selection (Mandatory)
Choose at least:
- **One QA/Testing Persona**: QA Engineer or Release Engineer
- **One Infrastructure Persona**: CI/CD Integration Engineer or Electron Developer
- **The User**: The developer using Eyas (perspective)

### 2. Value Proposition Alignment
For each selected persona, answer:
- **Value Proposition**: How does this implementation solve their core need?
- **Friction Guard**: What specific pain points are we preventing?
- **Example**: "Test environment setup improvement reduces QA cycle time from 30 min to 5 min per build"

### 3. Design & Interaction Checks
- **QA Check**: Can QA easily identify test status without digging into logs?
- **Compliance Check**: Does this change affect code signing, notarization, or audit trails?
- **CLI/Automation Check**: Does output parse cleanly for scripts and CI pipelines?

### 4. No Hidden Regressions
Ask for each persona:
- Will this change make their workflow harder?
- Could this introduce ambiguity or confusion?
- Does this require additional training or documentation?

---

## Template for Strategic Narrative Plan

Add this section to your plan:

```markdown
### 👤 Stakeholder Perspective Review

* **Target Persona(s)**: [QA Engineer, Release Engineer, CI Integration, App Developer, etc.]
* **Value Proposition**: [How does this solve their core need?]
* **Friction Guard**: [What specific friction/frustrations are we preventing?]
* **CLI/Output Check**: [How will scripts/CI parse results?]

#### Risk Assessment
* **For QA**: [Any test reliability risks?]
* **For Release**: [Any signing/notarization risks?]
* **For CI**: [Any scriptability concerns?]
* **For Developers**: [Any integration friction?]
```

---

## Anti-Patterns

### ❌ Persona Blindness
"We'll ship it once it's technically perfect" — but nobody can use it.
**Fix**: Start with persona alignment, not technical perfection.

### ❌ Single Persona Fixation
Optimizing for QA at the expense of Release or CI.
**Fix**: Explicitly consider all stakeholders; call out trade-offs.

### ❌ Friction Inflation
Solving problems that don't exist for anyone.
**Fix**: Tie every change to a specific persona's real pain point.

---

## Related Skills
- `/cognitive-pre-processor`: Embed this check in your Strategic Narrative Plan
- `/testing-standards`: BDD tests verify the persona's observable outcomes
