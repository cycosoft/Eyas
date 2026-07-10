---
name: bdd-planning
description: Converting implementation plans and feature requests into empty BDD test cases using it.todo.
tags:
  - bdd
  - testing
  - planning
---

# Reusable Skill: BDD Planning

## Overview
This skill outlines the process of converting acceptance criteria, feature requirements, and design specifications from an approved implementation plan directly into empty BDD test cases (`it.todo` or `test.todo`). 

Using executable placeholders ensures that:
- Every planned behavior is mapped and tracked in the codebase.
- No requirements are lost or forgotten during coding iterations.
- Development progress is transparently reflected by tests changing from "todo" to passing implementations.

## When to Use
- Trigger immediately after receiving user approval on an implementation plan.
- Trigger before writing any functional implementation logic for a new feature or bug fix.

## Instructions

### 1. Extract Requirements
Read the approved `implementation_plan.md` (specifically the proposed changes and verification sections) and identify each discrete behavior or constraint the system must satisfy.

### 2. Scaffold Empty BDD Test Suites
Create a new test file (or modify an existing test suite) and represent each behavior as a `describe` block containing one or more `it.todo()` (or `test.todo()`) statements.

#### Example Plan Requirement:
> The active test server component must display a loading spinner while fetching active tests, and show a helpful error message if the IPC channel fails.

#### Corresponding BDD Scaffold:
```ts
describe('TestServerActiveModal (UI Behavior)', () => {
  describe('Loading State', () => {
    it.todo('should display a loading spinner while fetching active tests');
  });

  describe('Error Handling', () => {
    it.todo('should display a helpful error message when the IPC channel fails');
  });
});
```

### 3. Iterative Development Cycle
Follow this cycle for every requirement outlined in your test suite:
1. **Target one `it.todo`**: Select a single pending behavior.
2. **Implement the Test**: Change `it.todo("should...")` to an active test block `it("should...", async () => { ... })` specifying the setup, action, and assertions. Run the test to ensure it fails (Red phase).
3. **Write the Code**: Implement the minimum necessary application logic to make the test pass (Green phase).
4. **Refactor**: Clean up the code and tests while ensuring the test continues to pass (Refactor phase).
5. **Repeat**: Move to the next `it.todo` until all placeholders are fully implemented.
