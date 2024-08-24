// different methods for loading a test
export const LOAD_TYPES = {
	AUTO: `auto`, // directs config to make best guess
	WEB: `web`, // fetched via the web
	ASSOCIATION: `association`, // e.g. double-clicking a file on the desktop
	ROOT: `root`, // an *.eyas located at the runner root
	CLI: `cli` // raw config loaded during build step
};

// the file extension for an eyas test
export const EXTENSION = `.eyas`;