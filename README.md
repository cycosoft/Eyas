<p align="center">
	<a href="https://cycosoft.com/">
		<img src="./_design/eyas-logo.svg" alt="Eyas Logo" width="150px" height="150px">
	</a>
</p>

<div align="center">
  <h1>Eyas</h1>
</div>
<p align="center">A "shift-left" serverless testing solution for static web applications</p>

<p align="center">
<img src="https://img.shields.io/npm/v/@cycosoft/eyas?color=6988e6&label=version">
</p>

<br />
<br />

## Table of Contents

- [Features](#features)
- [Install](#install)
- [Configuration](#configuration)
- [Usage](#usage)
- [Warning](#Warning)
- [Support](#support)
- [Sponsorship](#sponsorship)
- [Attribution](#attribution)

## Features

- 💰 **Cost** - Free to implement
- 📦 **Serverless** - No need to manage a deployment environment
- 📈 **Speed & Stability** - Ship faster and increase confidence in your application by testing _before merge_
- 🤝 **Shareability** - No special tools needed, just run the app. Share your work with your team, company or even customers.
- 🔗 **Cross-platform** - Test your application in multiple environments

## Install

```bash
# Install the package
npm install @cycosoft/eyas --save-dev
```

## Configuration

```js
// <projectRoot>/.eyasrc.js
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
    version: `your-feature-branch`,
    // Additional resolutions to test your application at
    resolutions: [/* { label: `iPad Pro`, width: 1024, height: 1366 } */],
    // Custom links to display in the menu
    menu: [/* { label: `Cycosoft, LLC`, url: `cycosoft.com` } */]
  }
};
```

## Usage

```json
// package.json
{
  "scripts": {
    "interactive": "eyas", // Select from a list of avaiable commands
    "quick": "eyas preview", // Previews the configured app without compiling to distributable
    "share": "eyas compile" // Compiles the configured app to a distributable
  }
}
```

## Warning

This tool disables certain security features of the browser to allow for testing of local files. **Do not use this tool for anything other than testing.**

## Support

Submit your feedback to <support+eyas@cycosoft.com>

## Sponsorship

Please reach out to <support+sponsor@cycosoft.com>

## Attribution

This project includes code and assets from the following sources:

- Project Logo [Freepik](https://www.freepik.com/free-vector/eagle-logo-design-template_45007164.htm)