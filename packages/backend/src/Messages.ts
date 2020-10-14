export interface ToJSON {
	toJSON(): string;
}

/**
 * A tweet chunk to send to the frontend. Taken directly from the stream, as a string, leaving
 * the frontend to interpret the structure of the tweet's contents.
 */
export class Tweet implements ToJSON {
	private tweetContents: string;

	/**
	 * @param tweetContents Stringified JSON contents to embed in the tweet message.
	 */
	public constructor(tweetContents: string) {
		this.tweetContents = tweetContents;
	}

	public toJSON(): string {
		return JSON.stringify({
			tag: 'tweet',
			data: JSON.parse(this.tweetContents),
		});
	}
}

/**
 * A message that informs the frontend that we are waiting until a specified time until we retry
 * the stream.
 */
export class Waiting implements ToJSON {
	private until: Date;

	/**
	 * @param until The point in time when the waiting will be over.
	 */
	public constructor(until: Date) {
		this.until = until;
	}

	public toJSON(): string {
		return JSON.stringify({
			tag: 'waiting',
			until: this.until.valueOf(),
		});
	}
}

/**
 * Creates a `Waiting` message from just a delay.
 */
export class WaitingUntilDelay extends Waiting {
	/**
	 * @param delay Delay in milliseconds until the waiting will be over.
	 */
	public constructor(delay: number) {
		super(new Date(Date.now() + delay));
	}
}
