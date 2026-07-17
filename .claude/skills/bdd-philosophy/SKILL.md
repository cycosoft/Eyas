---
description: BDD philosophy, practices, and mindset - Discovery, Formulation, Automation patterns for understanding and testing user behavior
when_to_use: Use when starting test-driven development, reviewing test failures from a behavioral perspective, ensuring tests capture business outcomes, or coaching on BDD mindset
allowed-tools: Read,Grep
---

# BDD Philosophy: Discovery, Formulation, Automation

This skill explains the **mindset and practices** behind Behavior-Driven Development — beyond test syntax and into how BDD teams think about solving problems.

BDD is not just Given/When/Then syntax. It's a collaborative process for building shared understanding between business and technical teams, with automated tests as a byproduct.

---

## The Three Core Practices

### 1. Discovery: What It *Could* Do

**The hardest single part of building software is deciding precisely what to build.** — Fred Brooks

**Goal**: Have the right conversations at the right time to build shared understanding.

**What happens:**
- Team discusses a user story through concrete, real-world examples
- Uncover edge cases, alternative flows, and assumptions
- Identify gaps in understanding before coding
- Reduce scope by deferring low-priority functionality

**Key questions to answer:**
- What problem are we actually solving?
- What does "success" look like from the user's perspective?
- What edge cases or alternative flows exist?
- Are there different rules for different user types?
- What happens when this fails, is empty, times out, or receives invalid input?
- What does the user see when it fails?

**Example:**
- ❌ "Add test environment switching"
- ✅ "When user clicks the environment dropdown, the app presents a list of pre-configured test environments (dev, staging, prod). User selects one, and all subsequent test runs use that environment. If the selected environment is unavailable, the app shows an error and preserves the previous selection."

**Discovery reveals**: Maybe only some environments require authentication. Maybe there's a "custom environment" option. Maybe users want to save environment presets. These details come from conversation, not from code review.

---

### 2. Formulation: What It *Should* Do

**Goal**: Confirm shared understanding by documenting examples in executable form.

**What happens:**
- Take examples from discovery
- Write them as structured specifications that can be automated
- Use domain language (user-friendly terms, not technical jargon)
- Get feedback from the whole team before coding

**In Eyas (JavaScript/TypeScript):**
- Not Gherkin (which is for Cucumber + browser UI automation)
- But well-named tests with clear intent:
  ```javascript
  describe('Environment Selector', () => {
    describe('when user clicks the environment dropdown', () => {
      it('displays a list of available environments', () => { ... });
      it('shows the current environment as selected', () => { ... });
      it('disables unavailable environments', () => { ... });
    });
    
    describe('when user selects a new environment', () => {
      it('switches all subsequent test runs to that environment', () => { ... });
    });

    describe('when the selected environment is unavailable', () => {
      it('shows an error message and preserves the previous environment', () => { ... });
      it('does not start test runs with an invalid environment', () => { ... });
    });
  });
  ```

**The test names ARE your formulation** — they're documented examples that can be reviewed by non-technical stakeholders.

**Key principle:** If a non-technical person reads your test names and says "yes, that's what we need" — your formulation is good.

---

### 3. Automation: What It *Actually* Does

**Goal**: Implement behavior guided by examples, with tests as guard rails.

**What happens:**
1. Take one formulated example (one test case)
2. Write the test (it fails — red)
3. Implement code to make it pass (green)
4. Refactor with confidence (the test protects you)
5. Move to next example

**This is test-driven implementation**, driven by the behavior you documented in formulation.

**Key principle:** Tests should pass/fail based on **observable behavior**, not code structure. If you refactor internals and the test still passes, that's correct. If refactoring breaks your test, you're testing implementation details.

---

## The BDD Mindset: Behavior vs. Implementation

### What to Test (Behavior)

Tests describe what happens from the user's perspective:

```javascript
// ✅ BDD: Tests observable behavior
it('switches test runs to the selected environment', () => {
  const wrapper = mount(EnvironmentSelector);
  wrapper.find('[data-qa="env-select"]').trigger('click');
  wrapper.find('[data-qa="env-option-staging"]').trigger('click');
  expect(wrapper.emitted('environment-changed')).toContainEqual(['staging']);
});

it('shows an error when the selected environment is unavailable', () => {
  const wrapper = mount(EnvironmentSelector, { 
    propsData: { availableEnvironments: ['dev', 'prod'] } 
  });
  wrapper.find('[data-qa="env-select"]').trigger('click');
  wrapper.find('[data-qa="env-option-staging"]').trigger('click');
  expect(wrapper.find('[data-qa="error-message"]').text()).toContain('unavailable');
});
```

### What NOT to Test (Implementation)

These tests break when refactoring internal code (brittleness):

```javascript
// ❌ Not BDD: Tests implementation details
it('sets selectedEnv state to staging', () => {
  const wrapper = mount(EnvironmentSelector);
  wrapper.vm.selectEnvironment('staging'); // calling internal method
  expect(wrapper.vm.selectedEnv).toBe('staging'); // checking internal state
});

it('calls the internal validateEnvironment method', () => {
  const wrapper = mount(EnvironmentSelector);
  vi.spyOn(wrapper.vm, 'validateEnvironment');
  wrapper.vm.handleSelect('staging');
  expect(wrapper.vm.validateEnvironment).toHaveBeenCalled();
});
```

### Happy Path + Sad Path

Every Formulation must cover both success and failure scenarios — not just the happy path. Sad-path cases include: empty or missing data, invalid input, permission-denied, network/storage failure, and boundary values. If a feature can fail, time out, or receive bad input, that's a required test case, not an optional one.

### The Distinction

| Behavior Test | Implementation Test |
|---|---|
| "Environment switches to selected value" | "selectedEnv state becomes staging" |
| "Error shown when env unavailable" | "error flag is set in component state" |
| "Dropdown opens when clicked" | "isOpen property becomes true" |
| "Presets save when user clicks Save" | "savePreset() method is called" |

**Rule of thumb**: If someone refactors your code and all tests pass, your tests are good. If refactoring breaks tests, you're testing the wrong things.

---

## Common BDD Anti-Patterns

### Anti-Pattern 1: Skipping Discovery

**What it looks like:**
- Jump straight from user story to code
- No discussion of edge cases or alternatives
- Tests written later as documentation of what was implemented

**Why it fails:**
- Implement the wrong thing (discover requirements during code review)
- Waste time refactoring because assumptions were wrong
- Tests document what you built, not what users need

**Fix:**
- Have a discovery session first
- Document concrete examples
- Write formulation (test names) before code
- Then implement

---

### Anti-Pattern 2: Testing at the Wrong Level

**What it looks like:**
- All tests are unit tests (testing isolated functions)
- No tests for user workflows (how features interact)
- No integration tests for realistic scenarios

**Why it fails:**
- Unit tests pass but feature doesn't work end-to-end
- Refactoring internal code breaks user-visible behavior you didn't test

**Fix:**
- Test at multiple levels: component behavior, integration, workflows
- BDD applies at all levels, not just e2e
- Focus on observable behavior at each level
