# Specification: Refactor Expose Menu and Modal Integration

## 1. Overview
This track involves refactoring the application's menu structure to consolidate development tools and improving the user experience for the "Expose Test" feature by integrating configuration options directly into its setup process.

## 2. Functional Requirements

### 2.1 Menu Restructuring
- **Remove:** The top-level "📡 Expose Test" (or equivalent) menu.
- **Remove:** The "🔒 Enable HTTPS for Expose" option from the "🔧 Tools" root menu.
- **Merge:** The "Expose Test" functionality into the "🔧 Tools" root menu.
- **Dynamic Behavior:**
    - **Inactive State:** When the server is not running, the "🔧 Tools" menu shall contain a single item: "📡 Expose Test". Clicking this item opens the `ExposeSetupModal`.
    - **Active State:** When the server is running, the "📡 Expose Test" item in the "🔧 Tools" menu shall be replaced with a sub-menu named "📡 Exposed for ~XXm" (displaying the remaining time).
    - **Sub-menu Content:** This sub-menu shall contain the standard management options:
        - "🛑 Stop Expose"
        - "📋 Copy Exposed URL"
        - "🌐 Open in Browser"

### 2.2 Modal Integration (HTTPS Toggle)
- **Feature Integration:** The ability to enable or disable HTTPS for the exposed server shall be moved from the main menu into the `ExposeSetupModal` component.
- **UI Placement:** The HTTPS toggle shall be presented as an additional configuration step within the existing steps list (e.g., "Step 3: Enable HTTPS").
- **State Management:** The modal must capture the state of this toggle and pass it to the server initiation logic when the "Continue" button is clicked.

## 3. Acceptance Criteria
1.  **Menu Consolidation:** The top-level menu is simplified by moving all Expose-related actions under the "Tools" menu.
2.  **Contextual Config:** The HTTPS setting is no longer globally toggled but is configured as part of the server startup flow in the modal.
3.  **Dynamic Sub-menus:** The "Tools" menu correctly updates its structure based on whether the Expose server is active or inactive.
4.  **Functional Parity:** The "Expose Test" feature continues to function correctly (starting, stopping, copying URLs, and opening in browser) within its new menu location.

## 4. Out of Scope
- Changing the underlying Express server logic (beyond passing the HTTPS toggle).
- Modifying the 30-minute automatic timeout logic.
- Redesigning the visual appearance of the `ExposeSetupModal` (other than adding the toggle step).
