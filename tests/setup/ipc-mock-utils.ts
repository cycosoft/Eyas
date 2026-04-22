import { type Mock } from 'vitest';
import { type ChannelName } from '@registry/primitives.js';

type IpcCallback = (...args: unknown[]) => void;
type ReceiveMethod = (channel: ChannelName, callback: IpcCallback) => void;

/**
 * Type-safe helper to get a mocked bridge method.
 * @param methodName The name of the method (send, receive, etc)
 * @returns The vitest mock for that method
 */
export function getIpcMock<T extends (...args: unknown[]) => unknown>(methodName: keyof Window[`eyas`]): Mock<T> {
	return window.eyas[methodName] as unknown as Mock<T>;
}

/**
 * Finds a specific callback in the mock calls of an IPC "receive" method.
 * @param mock The vitest mock for window.eyas.receive
 * @param channelName The channel name to look for
 * @returns The callback function if found
 */
export function findReceiveCallback(mock: Mock<ReceiveMethod>, channelName: ChannelName): IpcCallback | undefined {
	const call = mock.mock.calls.find(args => args[0] === channelName);
	return call?.[1];
}
