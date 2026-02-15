# Specification: Expose Test - Auto-Shutdown Resume Modal

## Overview
Currently, when the "Expose Test" server reaches its 30-minute time limit and automatically shuts down, users have no clear indication of why the test is no longer being served. This feature introduces a modal that appears upon auto-shutdown to inform the user and provide an option to immediately restart the server with the same settings for another 30 minutes.

## Functional Requirements
- **Detection:** The application must detect when the `expose-server` has been shut down specifically due to the 30-minute timeout (auto-shutdown).
- **Notification:** A modal must be displayed to the user immediately upon auto-shutdown.
- **Modal Content:**
    - Inform the user that the server has auto-shut down.
    - State that resuming will re-expose the test for another 30 minutes.
- **Actions:**
    - **Resume/Restart:** Restarts the expose server immediately using the exact settings (port, protocol, root path, etc.) from the previous session.
    - **No/Close:** Dismisses the modal and leaves the server stopped.
- **Persistence:** The application must remember the settings of the *last* successful expose session to facilitate the "Automatic Restart" behavior.

## Non-Functional Requirements
- **User Experience:** The transition from shutdown to the resume modal should be seamless.
- **Clarity:** The modal should clearly distinguish between an intentional stop and an auto-shutdown.

## Acceptance Criteria
- [ ] When the 30-minute timer expires, the "Expose Resume" modal appears.
- [ ] The modal clearly explains the reason for the shutdown.
- [ ] Clicking the "Resume" button restarts the server with previous settings without requiring re-entry of data.
- [ ] Clicking "Close" or "No" dismisses the modal.
- [ ] The feature works for both HTTP and HTTPS expose sessions.

## Out of Scope
- Allowing users to change settings (e.g., switching from HTTP to HTTPS) directly within the Resume modal.
- Maintaining a history of more than the most recent session's settings.
