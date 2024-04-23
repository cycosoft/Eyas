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
<img src="https://img.shields.io/npm/v/@cycosoft/eyas?color=6988e6&label=version">
</p>

<br />
<br />

## Table of Contents

- [Features](#features)
- [About](#about)
- [Install](#install)
- [Configuration](#configuration)
- [Usage](#usage)
- [Outputs](#outputs)
- [Tips](#tips)
- [The Fine Print](#the-fine-print)

## Features

- 📦 Shareable: Bundle your app with a runner for Windows & MacOS. No server needed.
- 🔗 Dynamic: Simulate running your app from any domain.
- 📏 Supports standard & custom screen sizes (mobile, tablet, desktop).
- 🕜 Time-limited: Set test expiration dates between 1 hour and 30 days.

## About

_Eyas_ leverages a packaged version of your application to provide a simple and shareable testing solution without the need to set up an entire server. Regardless of your team size, you can now decrease the feedback loop for no extra cost. You can easily include PMs, designers, executives and customers in the testing process.

## Install

```bash
# Install the package
npm install @cycosoft/eyas --save-dev
```

## Configuration

```js
// <projectRoot>/.eyas.config.js
module.exports = {
  test: {
    // The path to the directory containing your application files
    source: `dist`,
    // The port your application will be served on via localhost
    port: 3000,
    // Run your application from any domain locally instead of localhost
    domain: null,
    // Define custom redirects for your test
    redirects: [/* { from: `/my-route`, to: `/demo/alt-route` } */],
    // The name of your application
    title: `My Cool Site`,
    // The version of your application that was built. Defaults to current branch name.
    version: `<current-branch>`,
    // Additional screen sizes to test your application at
    viewports: [/* { label: `iPad Pro`, width: 1024, height: 1366 } */],
    // Custom links to display in the menu (external opens directly in browser)
    menu: [/* { label: `Cycosoft, LLC`, url: `cycosoft.com`, external: true } */]
  },

  outputs: {
    // The number of hours from build time until the distributable expires
    expires: 168 // (range: 1-720 hours)
  }
};
```

## Usage

```bash
# ackages the configured app to a distributable
npm run build-my-project && npx eyas bundle
```

## Outputs

- `bundle`: Packages consumer source code for each enabled platform to `./eyas-dist/`

All outputs are zipped, and can have a base range between 60-100mb depending on the platform.

## Tips

- Add `.eyas-*` and `eyas-*` to your `.gitignore` to prevent outputs from being committed to your repo
- If your app is using a custom domain and you'd like to test it in your browser via Eyas, you will need to add the domain to your `etc/hosts` file. See [this guide](https://www.ephost.com/account/index.php/knowledgebase/232/How-to-edit-your-Host-file.html) (no affiliation) for more information.
- View documented changes at [CHANGELOG.md](CHANGELOG.md)

## The Fine Print

Support is available via <support+eyas@cycosoft.com>

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
