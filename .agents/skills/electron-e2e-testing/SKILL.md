---
name: electron-e2e-testing
description: Operational procedures and synchronization strategies for writing, debugging, and executing Playwright E2E tests in Electron environments.
tags:
  - e2e-testing
  - playwright
  - electron
---

# Reusable Skill: Electron E2E Testing & Process Management

## Overview
This skill documents operational workflows and synchronization practices for managing Electron processes, clearing blocking initial run modals, and writing stable event-driven E2E tests with Playwright.

## When to Use
- Trigger when writing or debugging Playwright E2E test suites (`tests/e2e/`).
- Trigger when encountering resource lock errors or unclosed Electron runner instances during testing.

## Instructions

### 1. Process Management & Lock Release
When encountering "resource busy" or "locked" errors during Electron testing, prioritize stopping the parent process that spawned the app before attempting to force-kill children. This is often more effective at releasing file locks.

### 2. E2E Synchronization (First-Run States)
When writing or fixing Electron E2E tests using a fresh `userDataDir`, always account for "First Run" blocking states. Explicitly call `ensureEnvironmentSelected` (or equivalent) to clear initial modals before attempting to interact with application menus or header elements.

### 3. Event-Driven E2E Tests
Avoid hardcoded `setTimeout` calls (e.g., `new Promise(resolve => setTimeout(resolve, 3000))`) in E2E tests and utilities. These create "dead time" and slow down the suite.
- **Wait for State**: Use Playwright's `waitForSelector`, `expect(...).toBeVisible()`, or custom IPC signals to detect when the application is ready.
### 4. macOS Window Resize Gotchas (UI Menus)
On macOS, calling `BrowserWindow.setContentSize` or performing other programmatic resizes can trigger a system-level event that causes Vuetify `v-menu` components (and other overlays) to automatically close.
- **Assertion Impact**: If a test expands a menu to verify "Expanded" UI layer dimensions, the menu may collapse during the resize step.
- **Stable Assertion Pattern**: Assert that the UI layer is *either* full height (if the menu stayed open) or header-height (if it closed), as long as it matches the current window dimensions. Example: `(uiBounds.height === windowHeight || uiBounds.height === EYAS_HEADER_HEIGHT)`.
