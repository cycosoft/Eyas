<p align="center">
	<a href="https://cycosoft.com/">
		<img src="https://cycosoft.com/eyas/logo.svg" alt="Eyas Logo" width="150px" height="150px">
	</a>
</p>

<div align="center">
  <h1>Eyas</h1>
</div>
<p align="center">Bundle your web code into an executable for fast serverless testing</p>

<p align="center">
<img src="https://img.shields.io/npm/v/@cycosoft/eyas?color=6988e6&label=version">
</p>

<br />
<br />

## Table of Contents

- [Features](#features)
- [Who and Why](#who-and-why)
- [Install](#install)
- [Configuration](#configuration)
- [Usage](#usage)
- [Output](#output)
- [Tips](#tips)
- [Support](#support)
- [The Fine Print](#the-fine-print)

## Features

- 📈 **Speed & Stability** - Ship faster and increase confidence in your application by testing _before merge_
- 🤝 **Shareability** - No special tools or configuration needed on your target machines. Share your demo with your team, company or even customers as a simple executable file.
- 📦 **Serverless** - No need to manage a deployment server
- 🔗 **Cross-platform** - Test your application in multiple environments
- 💰 **Cost** - Free to implement

## Who and Why

_If you've got HTML and someone who wants to see it, this is for you_.

The best time to test your changes is _before_ you merge them, but setting up a development environment on everyone's computer doesn't scale. The standard solution is to merge the code, and test it down the line in a staging environment where a simple bug might block the entire team from shipping. An emerging trend is to deploy each branch to an ephemeral environment, but this can be costly and time consuming to set up for all but the largest companies.

_Eyas_ leverages a packaged version of your application to provide a _simple_, shareable, and serverless testing solution that's ready to share within minutes. Regardless of your team size, you can now decrease the feedback loop for no extra cost. You can easily include PMs, designers, executives and customers in the testing process.

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
    // The number of hours from build time until the distributable expires
    expires: 168, // (range: 1-720 hours)
    // The level of compression applied to your distributable
    compression: `normal`, // store, normal, maximum
    // Build an executable for the current platform (.exe, .dmg, .AppImage)
    executable: false,
    // Builds a zipped file containing your application and a runner for the building platform
    node: true,
    // Wraps .exe and .dmg outputs in a .zip file
    zip: false
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

## Output

- `preview`: builds and runs Eyas from `./.eyas-preview/`
- `compile`: builds to _./.eyas-preview/_, compiles to `./.eyas-dist/`, and then deletes _./.eyas-preview/_

Depending on your OS, you may be able to build for multiple platforms on a single machine using the  `electronuserland/builder` and `electronuserland/builder:wine` docker images. See more information ([here](https://www.electron.build/multi-platform-build#provided-docker-images)). Here's a simple visualization of known possible configurations.

| Outputs -> | Win | Linux | Mac | Node |
| - | - | - | - | - |
| Mac | ✅ | ✅ | ✅ | ✅ |
| Windows | ✅ | ✅ | | ✅ |
| Linux | ✅ | ✅ | | ✅ |

## Tips

- Add `eyas-*` to your `.gitignore` to prevent output from being committed to your repo
- Windows executables can sometimes be slower to launch due to Microsoft Defender
- This tool disables certain security features of the browser, **and should not be used in a production capacity.**
- If your app is using a custom domain and you'd like to test it in your browser via Eyas, you will need to add the domain to your `etc/hosts` file. See [this guide](https://www.ephost.com/account/index.php/knowledgebase/232/How-to-edit-your-Host-file.html) (no affiliation) for more information.
- View documented changes at [CHANGELOG.md](CHANGELOG.md)

## Support

Support is available via <support+eyas@cycosoft.com>

## The Fine Print

- Licensed under the [MIT License](LICENSE.TXT)
- View [terms of use](https://cycosoft.com/eyas/terms)
- View [privacy policy](https://cycosoft.com/eyas/privacy)
- Logo source design by [Freepik](https://www.freepik.com/free-vector/eagle-logo-design-template_45007164.htm)
- Analytics data collected:
  - Meta: Randomized ephemeral user id
  - Meta: operating system
  - Meta: Eyas version number
  - Event: app launched
  - Event: app exit modal was shown
  - Event: app closed

[[Back to Top](#table-of-contents)]
