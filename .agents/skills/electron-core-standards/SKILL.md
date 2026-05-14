---
name: electron-core-standards
description: Architectural standards and IPC communication patterns for the Electron main process in Eyas.
tags:
  - electron
  - main-process
  - ipc
---

# Reusable Skill: Electron Core Standards

## Overview
The core process is responsible for system-level operations, file I/O, and the management of the Electron lifecycle. It must remain decoupled from the Vue frontend.

## When to Use
- Trigger when implementing or modifying main-process logic in `src/eyas-core/`.
- Trigger when designing new IPC channels between core and interface.

## Instructions

### 1. IPC (Inter-Process Communication)
- **Naming Pattern**: Use a kebab-case `category-action` pattern (e.g., `test-server-start`, `modal-close`).
- **Typed Channels**: All IPC channel names must be cast to `ChannelName` from `src/types/primitives.js`.
- **Unidirectional Flow**: Favor `send`/`receive` patterns over `invoke`/`handle` where possible for simpler state synchronization.

### 2. Architecture
- **Functional Modules**: Group logic into functional modules (e.g., `test-server`, `menu-template`).
- **Entry Point**: `src/eyas-core/index.ts` should act as the orchestrator, proxying calls to specialized modules.
- **No Window Polling**: Do not attempt to read state directly from the `BrowserWindow`. Use IPC listeners to update local core state.

### 3. Rules & Constraints
- **ESM Standard**: Follow NodeNext resolution. Imports MUST include the `.js` extension.
- **No UI Logic**: Formatting, display strings, and UI state should live in the `src/eyas-interface/`. The core process deals only with raw data and system commands.
- **Error Handling**: All system calls (FS, Network) must be wrapped in try/catch blocks with appropriate logging via the Eyas logging system.
