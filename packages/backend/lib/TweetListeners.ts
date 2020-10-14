import shortid from 'shortid';

export type ChunkConsumer = (data: string) => void;
export type ListenerID = string;

/**
 * Manages listeners for outgoing messages between the frontend and the backend.
 */
export class TweetListeners {
	private listeners: Map<ListenerID, ChunkConsumer> = new Map();

	private sendToAll(payload: string | unknown): void {
		const json = typeof payload === 'string'
			? payload
			: JSON.stringify(payload);
		this.listeners.forEach((f) => f(json));
	}

	/**
	 * Send the passed tweet text to all registered recipients.
	 * @param tweet The tweet text to send.
	 */
	public sendTweet(tweet: string): void {
		const payload = JSON.stringify({
			tag: 'tweet',
			data: tweet,
		});
		this.sendToAll(payload);
	}

	/**
	 * Send a message that we are currently waiting until the passed time. The passed `Date` object
	 * is converted to a Unix Epoch timestamp in milliseconds.
	 * @param until The time to wait until.
	 */
	public sendWaiting(until: Date): void {
		const payload = JSON.stringify({
			tag: 'waiting',
			until: until.valueOf(),
		});
		this.sendToAll(payload);
	}

	/**
	 * Sends a message that we are currently waiting until the time of the passed delay.
	 * @param delay Milliseconds into the future of the target time.
	 */
	public sendWaitingUntilDelay(delay: number): void {
		this.sendWaiting(new Date(Date.now() + delay));
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
