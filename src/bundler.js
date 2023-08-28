#!/usr/bin/env node

/* global process */

'use strict';

console.log(`Hello World!`);


// At the end of your application code, add the following line:
const readline = require(`readline`);
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

rl.question(`Press Enter to exit...`, () => {
	rl.close();
});