export type RecordingState = {
	status: `recording` | `stopped` | null;
	sessionId: string | null;
	playbackError: string | null;
}
