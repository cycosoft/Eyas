# Specification: Simplified Expose Workflow

## 1. Overview
The current "Expose" feature in Eyas is complex, relies on invasive system-level modifications (via `hostile` and `mkcert` CA installation), and often requires elevated permissions (Admin/Sudo). This track refactors the feature to provide a predictable, secure, and zero-permission experience.

## 2. Goals
- **Predictability:** Use a fixed, mnemonic port (`12701`) for the exposed server.
- **Security:** Bind strictly to the local loopback interface (`127.0.0.1`).
- **Simplicity:** Remove all logic for modifying the system `hosts` file and installing Certificate Authorities.
- **Zero-Permission:** Ensure the feature works without requiring Admin or Sudo privileges.

## 3. Functional Requirements
### 3.1 Server Binding
- The Express server must bind strictly to `127.0.0.1`.
- The default port must be `12701`.
- If port `12701` is unavailable, the system should fall back to a random available port (using `get-port`).

### 3.2 SSL Implementation
- Replace the current `mkcert`-based logic with the `selfsigned` (v5.x) library.
- Certificates should be generated on-the-fly when the server starts.
- Users will be expected to bypass the browser's "Connection not private" warning.

### 3.3 UI Updates
- Update the `ExposeSetupModal` to remove all "Setup Steps" (CA installation, Hosts modification).
- Update the modal to display the fixed URL: `https://127.0.0.1:12701` (or the fallback).
- Add a helpful note explaining that users can use their own custom domain by manually updating their system `hosts` file.

### 3.4 Cleanup
- Remove `hostile` and `mkcert` from `package.json`.
- Delete `src/eyas-core/expose/expose-hosts.js` and `src/eyas-core/expose/expose-certs.js` (or refactor them).
- Remove all "Manual etc/hosts" instructions from the UI.

## 4. Acceptance Criteria
- [ ] Eyas starts the expose server on `https://127.0.0.1:12701` by default.
- [ ] The `selfsigned` library successfully generates a certificate without requiring Admin rights.
- [ ] The UI correctly displays the active URL.
- [ ] All `hosts` file modification logic is removed.
- [ ] The project successfully builds and passes existing tests after removing `hostile` and `mkcert`.

## 5. Out of Scope
- Automatic machine IP detection for external network access (focus is strictly on `127.0.0.1`).
- Automation of the "Advanced -> Proceed" step in Chrome.
