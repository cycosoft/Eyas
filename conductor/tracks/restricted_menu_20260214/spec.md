# Specification: Restricted Menu State During Initialization

## 1. Overview
This feature introduces a "restricted" state for the application menu during the initial launch phase of Eyas. This ensures that users cannot trigger server-side or network-altering actions (like "Expose Test" or "Clear Cache") until an environment has been selected and the application has begun loading its primary content.

## 2. Functional Requirements

### 2.1 Restricted Menu Scope
While the application is in the "Initialization" state, the following top-level menus must be disabled (greyed out):
- **Tools** (Restart Test, Copy URL, Expose Test, Developer Tools)
- **Network** (Test Home, Reload, Back, Forward, Go Online/Offline)
- **Cache** (Age, Size, Clear, Open Cache Folder)

The following menus remain enabled:
- **App Name** (About, Exit, Update Status)
- **Viewport** (Size selections)
- **Links** (Configured external links)

### 2.2 Visual State
- Restricted menu headers must be visible in the menu bar but unclickable (disabled state).

### 2.3 State Transitions
- **Initialization Start:** The app enters the restricted state immediately upon launch.
- **Initialization End (The Trigger):** The app exits the restricted state as soon as the first "real" navigation begins (e.g., after an environment is selected in the `EnvironmentModal`, or immediately upon starting the initial load if no modal is required).
- **Restart/Refresh:** If a test is restarted, the app should re-enter the initialization state until the new load starts.

## 3. Implementation Details
- The `menu-template.js` should be updated to accept a new state property (e.g., `isInitializing`).
- The Electron main process (`index.js`) must manage the `isInitializing` state and trigger menu refreshes as the application lifecycle progresses.

## Acceptance Criteria
1. Upon launch, "Tools", "Network", and "Cache" menus are greyed out.
2. While the Environment Modal is visible, these menus remain disabled.
3. Once an environment is selected and navigation starts, these menus become functional.
4. If no Environment Modal is required, the menus remain disabled during the initial splash/loading phase and enable once the target URL starts loading.
