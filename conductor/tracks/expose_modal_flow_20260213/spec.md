# Specification: Decouple Expose Modal from Server Initiation

## 1. Objective
Modify the "Expose Test" feature to decouple the UI interaction (Vue modal) from the server initiation logic. The Express server should only start after explicit user confirmation within the modal, and the user must have the ability to cancel the operation.

## 2. Acceptance Criteria
1.  **Modal-First Interaction:** When the "Expose Test" menu item is clicked, only the `ExposeSetupModal` Vue component shall be displayed. The Express server must **not** be started at this point.
2.  **User Cancellation:** The `ExposeSetupModal` must provide a "Cancel" button or an equivalent dismissal action (e.g., clicking the background). Activating this control must close the modal without starting the Express server.
3.  **User Confirmation:** The `ExposeSetupModal` must have a "Continue" button. The Express server initiation logic (`doStartExpose`) shall only be executed *after* this button is clicked.
