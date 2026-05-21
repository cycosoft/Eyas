import type { Event, WebFrameMain } from 'electron';

export type WebContentsConsoleMessageEvent = {
	level: string;
	message: string;
	lineNumber: number;
	sourceId: string;
	frame: WebFrameMain;
}

declare module 'electron' {
	type WebContents = {
		on(
			event: 'console-message',
			listener: (event: Event & WebContentsConsoleMessageEvent) => void
		): this;
	}
}
