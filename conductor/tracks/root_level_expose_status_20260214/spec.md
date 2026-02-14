# Specification: Root-Level Expose Status Menu (DRY & TDD)

## 1. Overview
Refine the application menu to provide higher visibility for the "Expose Test" feature. When active, a dynamic root-level menu item will show the countdown timer. 

## 2. Functional Requirements

### 2.1 UI Behavior
- **"Tools" Menu:** Remains unchanged (contains the Expose sub-menu).
- **Dynamic Root Item:** When the server is active, append a new top-level item: `📡 Exposed for ~${remainingMinutes}m`.
- **Sub-menu Consistency:** The root status item must share the exact same sub-menu options as the "Tools" entry (Stop, Copy URL, Open in Browser).
- **Cleanup:** The root status item is removed immediately when the server stops.

### 2.2 Implementation Architecture (DRY)
- **Shared Component:** Abstract the creation of the Expose sub-menu array (Stop, Copy URL, Open in Browser) into a private helper function within `menu-template.js`.
- **Consumption:** Both the "Tools" sub-menu logic and the new "Root" item logic must call this shared helper to avoid duplication of label strings or click handlers.

## 3. Testing Requirements (TDD)
- **Unit Tests:** `tests/electron/menu-template.test.js` must be updated *first* with failing assertions:
    - Verify that when `exposeActive` is true, the last item in the returned array is the status menu.
    - Verify that when `exposeActive` is false, the last item is *not* the status menu.
- **Verification:** Implementation is complete only when these tests pass and linting is clean.

## 4. Acceptance Criteria
1. **Redundant Entry:** The Expose sub-menu appears in both "Tools" and at the root level when active.
2. **Identical Logic:** Click handlers and labels are identical between both entries.
3. **Automated Verification:** All unit tests pass.
