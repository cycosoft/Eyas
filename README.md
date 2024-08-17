<p align="center">
	<a href="https://cycosoft.com/">
		<img src="https://cycosoft.com/eyas/logo.svg" alt="Eyas Logo" width="150px" height="150px">
	</a>
</p>

<div align="center">
  <h1>Eyas</h1>
</div>
<p align="center">Simplified Hands-on Testing for Web Applications</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@cycosoft/eyas">
    <img src="https://img.shields.io/npm/v/@cycosoft/eyas?color=6988e6&label=version">
  </a>
</p>

<br />
<br />

## The Pitch

You bundle your app with the CLI ( `npm run build && npx eyas db` ), and your consumer runs the output `*.eyas` with the [runner](https://github.com/cycosoft/Eyas/releases).

Reduce and simplify the feedback loop with any stakeholder & any team size, regardless of their technical ability. Less bugs, faster deployment cycles, reduced stress ...for free.

- 🎨 A/B Test Design Changes
- 👩‍💻 Allow POs to Test UX
- 🚀 Get Pre-Merge QA Sign-Off
- 🌍 Test Against Any Environment
- 📢 Get Early Customer Feedback

## Table of Contents

- [Install](#install)
- [Configuration](#configuration)
- [Usage](#usage)
- [Outputs](#outputs)
- [Tips](#tips)
- [The Fine Print](#the-fine-print)

## Install

```bash
# Install the CLI
npm install @cycosoft/eyas --save-dev
```

## Configuration

The CLI will attempt to run without a configuration file by using the values in this example `.eyas.config.js`. Example overrides are provided as comments.

```js
// <projectRoot>/.eyas.config.js
module.exports = {
  // From <projectRoot>, this is the path to your production output i.e. `npm run build` output
  source: `dist`,
  // Simulate a domain for the test (accepts '' || [''] || [{ url, title }])
  domains: [
    `eyas://local.test`
    /*
      { url: `dev.cycosoft.com`, title: `Development` },
      { url: `staging.cycosoft.com`, title: `Staging` },
      { url: `cycosoft.com`, title: `Production` } // Prod URLs are helpful, but under careful consideration.
    */
  ],
  // The name of your project
  title: ``,
  // The version of your project Eyas will be built from. You can alternatively set it to your package.json version for example.
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
    // Build a Windows distributable for `eyas bundle` command (auto-detected if not set)
    windows: true,
    // Build a MacOS distributable for `eyas bundle` command (auto-detected if not set)
    mac: true,
    // The number of hours from build time until the distributable expires
    expires: 168 // (range: 1-720 hours)
  }
};
```

## Usage

```bash
# Generates an Eyas test database for use with the installed version of Eyas
npm run build-my-project && npx eyas db
```

```bash
# Packages the configured app to a distributable zip
npm run build-my-project && npx eyas bundle
```

## Outputs

- `db`: Creates an `*.eyas` file of project production output + test config (recommended)
  - Requires end user to have Eyas [installed](https://github.com/cycosoft/Eyas/releases)
  - Outputs to `./eyas-dist/`
  - About the size of the project production output
  - Recommended for end-users who do frequent testing (e.g. internal team)
- `bundle`: Packages project production output, test config & Eyas for each enabled platform
  - Does not require Eyas to be installed
  - Outputs to `./eyas-dist/${title} - ${version}.${platform}.zip`
  - 60mb - 100mb range
  - Recommended for one-off testing (e.g. customers)

## Tips

- Add `eyas-*` to your `.gitignore` to prevent outputs from being committed to your repo
<!-- - Deprecated: If your app is using a custom domain and you'd like to test it in your browser via Eyas, you will need to add the domain to your `etc/hosts` file. See [this guide](https://www.ephost.com/account/index.php/knowledgebase/232/How-to-edit-your-Host-file.html) (no affiliation) for more information. -->
- View documented changes at [CHANGELOG.md](CHANGELOG.md)
- While Eyas is intended to be used for testing in lower environments, testing fixes against production can be incredibly valuable when working directly with customers. It is advisable to use day-of time limits in these cases, and _very importantly_ that your test is branched *only* from the commit currently in production.

## The Fine Print

🆘 Support is available via ( https://github.com/cycosoft/Eyas/issues )

- Licensed under the [MIT License](LICENSE.TXT)
- View [terms of use](https://cycosoft.com/eyas/terms)
- View [privacy policy](https://cycosoft.com/eyas/privacy)
- Logo source design by [Freepik](https://www.freepik.com/free-vector/eagle-logo-design-template_45007164.htm)
- Analytics data collected: See [METRICS.md](docs/METRICS.md)

[Eyas](https://www.dictionary.com/browse/eyas#:~:text=Falconry.%20a%20young%20falcon%20or%20hawk%20taken%20from%20the%20nest%20for%20training.):
<small>
Falconry. a young falcon or hawk taken from the nest for training.
</small>

[[Back to Top](#table-of-contents)]