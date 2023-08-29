#!/usr/bin/env node

/* global __dirname process */

'use strict';

const bytenode = require(`bytenode`);
const path = require(`path`);

const compiledFilename = bytenode.compileFile({
    filename: path.join(process.cwd(), `src`, `cli`, `index.js`),
    output: path.join(process.cwd(), `dist`, `cli.jsc`)
});