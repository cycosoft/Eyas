#!/usr/bin/env node

/* global process */

'use strict';

// Import dependencies
const bytenode = require(`bytenode`);
const path = require(`path`);

// Compile the CLI with options
bytenode.compileFile({
	filename: path.join(process.cwd(), `src`, `cli`, `index.js`),
	output: path.join(process.cwd(), `dist`, `cli.jsc`)
});