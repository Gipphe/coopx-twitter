import shortid from 'shortid';

export type ChunkConsumer = (data: string) => void;
export type ListenerID = string;

export class TweetListeners {
	private listeners: Map<ListenerID, ChunkConsumer> = new Map();

	private sendToAll(payload: string | unknown): void {
		const json = typeof payload === 'string'
			? payload
			: JSON.stringify(payload);
		this.listeners.forEach((f) => f(json));
	}

	public sendTweet(tweet: string): void {
		const payload = `{"tag": "tweet", "data": ${tweet}}`;
		this.sendToAll(payload);
	}

	public sendWaiting(until: Date | number): void {
		const untilDate = typeof until === 'number'
			? new Date(Date.now() + until)
			: until;
		const payload = JSON.stringify({
			tag: 'waiting',
			until: untilDate.valueOf(),
		});
		this.sendToAll(payload);
	}

	public register(f: ChunkConsumer): ListenerID {
		const id = shortid();
		this.listeners.set(id, f);
		return id;
	}

	public unregister(id: ListenerID): void {
		this.listeners.delete(id);
	}

	public get numberOfListeners(): number {
		return this.listeners.size;
	}
}
