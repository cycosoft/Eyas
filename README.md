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

- 📦 Package your app as a portable runner or executable for Windows, Mac, or Linux
- 🔗 Simulate running your app from any domain
- 📏 Supports custom screen size testing (mobile, tablet, desktop)
- 🕜 Custom build expiration between 1 hour and 30 days

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
    // Define custom routes for your test
    routes: [/* { from: `/my-route`, to: `/demo/alt` } */],
    // The name of your application
    title: `Eyas`,
    // The version of your application that was built. Defaults to current branch name.
    version: `<current-branch>`,
    // Additional screen sizes to test your application at
    viewports: [/* { label: `iPad Pro`, width: 1024, height: 1366 } */],
    // Custom links to display in the menu (external opens directly in browser)
    menu: [/* { label: `Cycosoft, LLC`, url: `cycosoft.com`, external: true } */]
  },

  // Defaults to building for the current platform if no platform is specified
  outputs: {
    // Force building a .exe
    windows: false,
    // Force building a .dmg
    mac: false,
    // Force building a .AppImage
    linux: false,
    // The number of hours from build time until the distributable expires
    expires: 168, // (range: 1-720 hours)
    // Build an unsigned executable for the current platform (.exe.zip, .dmg.zip, .AppImage)
    // 60 - 100 MB
    executable: false,
    // Builds a zipped file containing your application and a runner for the built platform (default)
    // ~275kb before downloads
    portable: false
  }
};
```

## Usage

```json
// package.json
{
  "scripts": {
    "interactive": "eyas", // Select from a list of available commands
    "quick": "eyas preview", // Preview the your app without creating distributables
    "share": "eyas compile" // Compiles the configured app to a distributable
  }
}
```

## Outputs

- `preview`: builds and runs Eyas from `./.eyas-preview/`
- `compile`: builds to _./.eyas-preview/_ and compiles to `./.eyas-dist/`

Depending on your OS, you may be able to build executables for multiple platforms on a single machine using the  `electronuserland/builder` and `electronuserland/builder:wine` docker images. See more information ([here](https://www.electron.build/multi-platform-build#provided-docker-images)). Here's a simple visualization of known possible configurations.

| | Portable | .exe | .AppImage | .dmg |
| - | - | - | - | - |
| Mac | ✅ | ✅ | ✅ | ✅ |
| Windows | ✅ | ✅ | ✅ | |
| Linux | ✅ | ✅ | ✅ | |

All outputs are zipped. Portable builds will add ~250kb overhead to your distributable, and executables can range between 60-100mb depending on the platform. Portable builds are recommended for most use cases. They download dependencies in-place on the client machine, and avoid many of the security warnings that come with executables.

## Tips

- Add `eyas-*` to your `.gitignore` to prevent output from being committed to your repo
- Windows executables can sometimes be slower to launch due to Microsoft Defender
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
