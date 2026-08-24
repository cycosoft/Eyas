# macOS Signing

MacOS Guide: https://www.rocketride.io/blog/macos-code-sign-notarize-electron-app

MacOS Guide 2: https://www.peterkoraca.com/blog/how-to-package-code-sign-notarize-and-share-an-electronjs-app-for-mac-os-in-2023

MacOS Guide 3: https://christarnowski.com/making-notarization-work-on-macos-for-electron-apps-built-with-electron-builder/

https://apple.stackexchange.com/questions/377232/signed-pkg-using-productbuild-distribute-but-codesign-says-code-object-is-not

https://www.codevamping.com/2023/11/macos-pkg-installer/

# Windows Signing: Azure Artifact Signing

Windows builds are signed via [Azure Artifact Signing](https://learn.microsoft.com/en-us/azure/artifact-signing/) (formerly "Trusted Signing"), wired into `win.azureSignOptions` in `src/scripts/electron-builder-config.ts`. Signing happens automatically as part of `npm run compile:installer` / `npm run compile:mac:installer` — there's no separate manual signing step or CLI tool to install; electron-builder's bundled `winCodeSign` toolset handles it (it downloads a small .NET runtime + signing assembly on first use).

## One-time Azure setup (per signing identity)

Full walkthrough: [Quickstart: Set up Artifact Signing](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart)

1. Azure subscription must be **Pay-As-You-Go** — the free/trial/sponsored subscription tiers are explicitly not supported by this service.
2. Register the `Microsoft.CodeSigning` resource provider on that subscription (Subscription → Settings → Resource providers).
3. Create an **Artifact Signing Account** (Basic SKU is ~$10/mo, 5,000 signings included) in a region that [supports the service](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart#azure-regions-that-support-artifact-signing) — note the region's endpoint URL, you'll need it below.
4. Complete an **Organization** identity validation (Public Trust) on that account, using the legal business entity — not an Individual validation — so the issued certificate carries the org's name rather than a personal one. This requires being granted the **Artifact Signing Identity Verifier** role on the account first (Access control (IAM)), and one authorized human still has to complete a one-time biometric ID check even for the org path; only the resulting certificate's subject is org-only.
5. Create a **Certificate Profile** (type: Public Trust) against that completed identity validation.
6. Create an **App registration** (Entra ID) to act as the build's service principal — note its Application (client) ID and Directory (tenant) ID, and generate a client secret under Certificates & secrets.
7. Grant that app registration the **Artifact Signing Certificate Profile Signer** role, scoped to the certificate profile (Certificate profile → Access control (IAM) → Add role assignment).

## Required environment variables

Set these in `.env.local` (never commit real values — see `.env` for the placeholder template):

```
AZURE_TENANT_ID=                  # Directory (tenant) ID from the app registration
AZURE_CLIENT_ID=                  # Application (client) ID from the app registration
AZURE_CLIENT_SECRET=              # Client secret value (shown once at creation)
AZURE_CERT_PUBLISHER_NAME=        # Full certificate subject, e.g. CN=Org Name, O=Org Name, L=City, S=State, C=US
AZURE_CODE_SIGNING_ENDPOINT=      # Region endpoint, e.g. https://cus.codesigning.azure.net
AZURE_CERTIFICATE_PROFILE_NAME=   # Certificate profile name
AZURE_CODE_SIGNING_ACCOUNT_NAME=  # Artifact Signing account name
```

If any of these are unset, `compile-runners.ts` skips `azureSignOptions` entirely and produces an unsigned Windows build (useful for local dev builds that don't need to be signed).

Verify a signed output with `npm run sign:win:verify`.
