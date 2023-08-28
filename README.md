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

## Features
- **Serverless** - No need to manage servers or containers
- **Stability** - Increase confidence in your application by testing before merge
- **Shareability** - Share your tests with your team, company or even stakeholders
- **Speed** - No special tools needed, just run the app
- **Cross-platform** - Test your application in multiple environments

## Install
```bash
# Install the package
npm install @cycosoft/eyas
```

## Configuration

```js
// ./.eyasrc.js
module.exports = {
  testSourceDirectory: `dist`,
  serverPort: 3000,
  customDomain: `demo.cycosoft.com`,
  buildVersion: `v1.0.1`, //falls back to branch name
  appTitle: `Demo App`,
  appWidth: 1024,
  appHeight: 768,
  menu: [
    { label: `Cycosoft.com`, url: `https://cycosoft.com`, external: true },
  ]
};
```

## Usage

```json
// package.json
{
  "scripts": {
    "demo": "eyas build"
  }
}
```

## ⚠️ Warning ⚠️

This tool disables certain security features of the browser to allow for testing of local files. **Do not use this tool for anything other than testing.**

## Sponsorship

Please reach out to <sponsor@cycosoft.com>

## Attribution

This project includes code and assets from the following sources:

- Project Logo [Freepik](https://www.freepik.com/free-vector/eagle-logo-design-template_45007164.htm)