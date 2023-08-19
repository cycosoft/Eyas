#!/usr/bin/env node

// //imports
// const { spawn } = require('child_process');
// const path = require('path');

// //config
// const commandToRun = `eyas.min.js`; //the command passed to new-terminal
// const spawnArgs = { command: ``, args: [] }; //spawn arguments
// const currentWorkingDir = process.cwd(); //current working directory

// //build the spawn arguments for Mac (or other non-windows platforms)
// spawnArgs.command = path.join(currentWorkingDir, `node_modules`, `electron`, `cli.js`);
// // spawnArgs.args = [`"${commandToRun}"`];
// spawnArgs.args = [];

// console.log(spawnArgs.command);

// // Spawn a shell to run the command in the correct working directory
// const shell = spawn(
// 	spawnArgs.command,
// 	spawnArgs.args,
// 	{
// 		cwd: currentWorkingDir, // Set the working directory for the new process
// 		stdio: `inherit`,
// 		shell: true
// 	}
// );

// // When the shell exits, exit this process
// shell.on(`exit`, code => process.exit(code));


const electron = require('electron');
const path = require('path');

console.log({__dirname});

//get the path to package.json
const packagePath = path.join(__dirname, `package.json`);
console.log({packagePath});

//import the package.json file
const package = require(packagePath);

//get the path to the eyas entry point
const eyasPath = path.join(__dirname, package.main);
console.log({eyasPath});

const { spawn } = require('child_process');

const child = spawn(electron, [eyasPath], {
	stdio: 'inherit',
	windowsHide: false,
	cwd: process.cwd()
});
child.on('close', function (code, signal) {
  if (code === null) {
    console.error(electron, 'exited with signal', signal);
    process.exit(1);
  }
  process.exit(code);
});

const handleTerminationSignal = function (signal) {
  process.on(signal, function signalHandler () {
    if (!child.killed) {
      child.kill(signal);
    }
  });
};

handleTerminationSignal('SIGINT');
handleTerminationSignal('SIGTERM');
