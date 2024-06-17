<p align="center">
	<a href="https://cycosoft.com/">
		<img src="https://cycosoft.com/eyas/logo.svg" alt="Eyas Logo" width="150px" height="150px">
	</a>
</p>

<div align="center">
  <h1>Eyas</h1>
</div>
<p align="center">Feature Branch Testing Without a Server</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@cycosoft/eyas">
    <img src="https://img.shields.io/npm/v/@cycosoft/eyas?color=6988e6&label=version">
  </a>
</p>

<br />
<br />

## About

_Eyas_ leverages a packaged version of your application to provide a simple and shareable testing solution without the need to set up a server and custom domains. Regardless of your team size, you can now decrease the feedback loop for no extra cost. You can easily include PMs, designers, executives and customers in the testing process.

In practice, _Eyas_ can shift-left your testing process by allowing full testing of feature branches before they are merged. This will increase confidence in your main branch, enable at-will deployments, reduce bugs / hotfixes / rollbacks, increase team velocity, decrease team stress, and crucially limit code freezes when "tossing the release over the wall" with QA.

## Table of Contents

- [Features](#features)
- [Install](#install)
- [Configuration](#configuration)
- [Usage](#usage)
- [Outputs](#outputs)
- [Tips](#tips)
- [The Fine Print](#the-fine-print)

## Features

- 📦 Shareable: Bundle your app in a read-only archive for Windows & MacOS. No server needed.
- 🔗 Dynamic: Simulate running from any domain.
- 📏 Resolution: Supports standard & custom screen sizes (mobile, tablet, desktop).
- 🕜 Time-limited: Set test expiration dates between 1 hour and 30 days.

## Install

```bash
# Install the package
npm install @cycosoft/eyas --save-dev
```

## Configuration

```js
// <projectRoot>/.eyas.config.js
module.exports = {
  // The path to the directory containing your application files
  source: `dist`,
  // Simulate a domain for the test (accepts '' || [''] || [{ url, title }])
  domains: [/*
    { url: `dev.cycosoft.com`, title: `Development` },
    { url: `staging.cycosoft.com`, title: `Staging` },
    { url: `cycosoft.com`, title: `Production` }
  */],
  // The name of your application
  title: `My Cool Site`,
  // The version of your application that was built. Defaults to current branch name.
  version: `<current-branch>.<current-commit>`,
  // Additional screen sizes to test your application at
  viewports: [/* { label: `iPad Pro`, width: 1024, height: 1366 } */],
  // Custom items for link menu with support for getting user input
  links: [/*
    { label: `Cycosoft, LLC`, url: `cycosoft.com`, external: true (open in browser) },
    { label: `Variables Demo`, url: `{testdomain}?id={int}&msg={str}&go={bool}&list={item1|item2|}` }
  */]
  // File outputs
  outputs: {
    // Build a Windows distributable
    windows: true,
    // Build a MacOS distributable
    mac: true,
    // The number of hours from build time until the distributable expires
    expires: 168 // (range: 1-720 hours)
  }
};
```

## Usage

```bash
# Packages the configured app to a distributable zip
npm run build-my-project && npx eyas bundle
```

```bash
# Generates an Eyas test database
npm run build-my-project && npx eyas db
```

## Outputs

- `db`: Creates an `*.eyas` file of project production output + test config
  - Requires end user to have Eyas installed
  - Outputs to `./eyas-dist/`
  - About the size of the project production output
  - Recommended for end-users who do frequent testing (e.g. internal team)
- `bundle`: Packages project production output, test config & Eyas for each enabled platform
  - Does not require Eyas to be installed
  - Outputs to `./eyas-dist/${title} - ${version}.${platform}.zip`
  - 60mb - 100mb range
  - Recommended for one-off testing (e.g. customers)

## Tips

- Add `.eyas-*` and `eyas-*` to your `.gitignore` to prevent outputs from being committed to your repo
<!-- - If your app is using a custom domain and you'd like to test it in your browser via Eyas, you will need to add the domain to your `etc/hosts` file. See [this guide](https://www.ephost.com/account/index.php/knowledgebase/232/How-to-edit-your-Host-file.html) (no affiliation) for more information. -->
- View documented changes at [CHANGELOG.md](CHANGELOG.md)
- While Eyas is intended to be used for testing in lower environments, testing fixes against production can be incredibly valuable when working directly with customers. It is advisable to use day-of time limits in these cases, and _very importantly_ that your test is branched *only* from the commit currently in production.

## The Fine Print

🆘 Support is available via ( https://github.com/cycosoft/Eyas/issues )

- Licensed under the [MIT License](LICENSE.TXT)
- View [terms of use](https://cycosoft.com/eyas/terms)
- View [privacy policy](https://cycosoft.com/eyas/privacy)
- Logo source design by [Freepik](https://www.freepik.com/free-vector/eagle-logo-design-template_45007164.htm)
- Analytics data collected:
  - Meta: Randomized ephemeral session id
  - Meta: operating system
  - Meta: Eyas version number
  - Event: app launched
  - Event: app exit modal was shown
  - Event: app closed

[[Back to Top](#table-of-contents)]
