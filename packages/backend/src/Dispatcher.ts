import shortid from 'shortid';
import { ToJSON } from './Messages';
import { ChunkConsumer } from './Util';

export type ListenerID = string;

/**
 * Manages listeners for outgoing messages between the frontend and the backend.
 */
export class Dispatcher {
	private listeners: Map<ListenerID, ChunkConsumer> = new Map();

	public send(payload: ToJSON): void {
		this.listeners.forEach((f) => f(payload.toJSON()));
	}

	/**
	 * Register a new listener with a generated ID string, returning this ID.
	 * @param f Event handler for consuming stringified JSON.
	 * @return ID of the newly registered listener.
	 */
	public register(f: ChunkConsumer): ListenerID {
		const id = shortid();
		this.listeners.set(id, f);
		return id;
	}

	/**
	 * Unregister the listener with the passed ID. If no listener is registered with the passed ID,
	 * this is method is a noop.
	 * @param id ID of the listener to unregister.
	 */
	public unregister(id: ListenerID): void {
		this.listeners.delete(id);
	}

	/**
	 * Returns the current number of listeners.
	 * @return Number of listeners.
	 */
	public get numberOfListeners(): number {
		return this.listeners.size;
	}
}
