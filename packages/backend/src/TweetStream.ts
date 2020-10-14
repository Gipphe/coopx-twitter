import { Writable } from 'stream';
import { Response } from 'node-fetch';
import AbortController, { AbortSignal } from 'abort-controller';
import qs from 'qs';
import { StreamDelay } from './StreamDelay';
import { mkHeaders } from './Env';
import { buildURL, ChunkConsumer, TimerControls } from './Util';
import { Dispatcher } from './Dispatcher';
import { Heartbeat } from './Heartbeat';
import { StreamOptions } from './StreamOptions';
import { Tweet, WaitingUntilDelay } from './Messages';

const qsOpts: qs.IStringifyOptions = {
	arrayFormat: 'comma',
	allowDots: true,
};

interface TooManyRequestsResponse extends Response {
	status: 429;
}

const isTooManyRequestsResponse = (x: Response): x is TooManyRequestsResponse =>
	x.status === 429;

const logTooManyRequests = (_: TooManyRequestsResponse): void => {
	console.log('429: TooManyRequests');
};
const logHTTPError = (e: Response): void => {
	console.log(`HTTP Error: ${e.status}`);
};
const logUnknown = (e: unknown): void => {
	console.log(`Unknown error: ${e}`);
};

interface FetchOpts {
	method: 'GET';
	signal: AbortSignal;
	headers: Record<string, string>;
}

type FetchFn = (url: string, opts: FetchOpts) => Promise<Response>;

const keepAliveToken = '\r\n';
type KeepAliveToken = typeof keepAliveToken;
const isKeepAliveToken = (x: unknown): x is KeepAliveToken => x === keepAliveToken;

const logDelay = (delay: number): void => {
	if (delay === 0) {
		console.log('Retrying immediately');
		return;
	}
	const untilDate = new Date(Date.now() + delay);
	console.log(`Retrying at ${untilDate.toISOString()}`);
};

/**
 * Manages and dispatches content from a Twitter API 2.0 filtered stream.
 */
export class TweetStream<T> {
	private listeners: Dispatcher = new Dispatcher();

	private streamDelay: StreamDelay<T>;

	private hasInitialized = false;

	private timerControls: TimerControls<T>;

	private fetchFn: FetchFn;

	private streamOptions: StreamOptions | null = null;

	/**
	 * @param fetchFn HTTP request function to use. Requires a narrow subset of `window.fetch`'s
	 * functionality.
	 * @see {@link https://nodejs.org/package/node-fetch}
	 * @param timerControls Implementation for `setTimeout` and `clearTimeout`.
	 */
	public constructor(fetchFn: FetchFn, timerControls: TimerControls<T>) {
		this.timerControls = timerControls;
		this.streamDelay = new StreamDelay(timerControls);
		this.fetchFn = fetchFn;
	}

	private createWritableDelegator(heartbeat: Heartbeat<T>): NodeJS.WritableStream {
		return new Writable({
			write: (
				data: string | Buffer,
				_enc?: unknown,
				cb?: (err?: Error | null) => void,
			): boolean => {
				const res = data.toString('utf8');

				if (!isKeepAliveToken(res)) {
					this.listeners.send(new Tweet(res));

					if (cb) {
						cb(null);
					}
				}

				heartbeat.keepAlive();
				return true;
			},
		});
	}

	private async streamTweets(): Promise<void> {
		const controller = new AbortController();
		const heartbeat = new Heartbeat(controller, this.timerControls);
		const url = buildURL(`/2/tweets/search/stream?${qs.stringify(this.streamOptions, qsOpts)}`);
		heartbeat.start();
		const x = await this.fetchFn(url, {
			method: 'GET',
			headers: mkHeaders(),
			signal: controller.signal,
		});
		if (x.ok) {
			x.body.pipe(this.createWritableDelegator(heartbeat));
		} else {
			heartbeat.end();
			throw x;
		}
		heartbeat.end();
	}

	private async fetch(): Promise<void> {
		try {
			await this.streamTweets();
			console.log('Stream ended');
			this.streamDelay.reset();
		} catch (e: unknown) {
			if (e instanceof Response && isTooManyRequestsResponse(e)) {
				logTooManyRequests(e);
				this.streamDelay.waitAfterTooManyRequests((delay) => {
					logDelay(delay);
					this.listeners.send(new WaitingUntilDelay(delay));
					return () => this.fetch();
				});
			} else if (e instanceof Response) {
				logHTTPError(e);
				this.streamDelay.waitAfterHTTPError((delay) => {
					logDelay(delay);
					this.listeners.send(new WaitingUntilDelay(delay));
					return () => this.fetch();
				});
			} else {
				logUnknown(e);
				this.streamDelay.waitAfterNetworkError((delay) => {
					logDelay(delay);
					this.listeners.send(new WaitingUntilDelay(delay));
					return () => this.fetch();
				});
			}
			return;
		}
		this.fetch();
	}

	/**
	 * Registers a new listener for the stream's content.
	 * @param f Consuming function for the stream content.
	 * @return ID of the new listener. Used for unregistering.
	 */
	public registerListener(f: ChunkConsumer): string {
		const id = this.listeners.register(f);
		if (!this.hasInitialized) {
			console.log('Starting stream fetch');
			this.hasInitialized = true;
			this.fetch();
		}
		this.streamDelay.ifWaiting((delay) => this.listeners.send(new WaitingUntilDelay(delay)));
		return id;
	}

	/**
	 * Unregisters the listener with the passed ID if it exists.
	 * @param id ID of the listener to unregister.
	 */
	public unregisterListener(id: string): void {
		this.listeners.unregister(id);
	}

	/**
	 * Set new options for the stream.
	 * @param streamOptions Options to use for the stream.
	 * @see {@link https://developer.twitter.com/en/docs/twitter-api/tweets/filtered-stream/api-reference/get-tweets-search-stream}
	 */
	public setStreamOptions(streamOptions: StreamOptions): void {
		this.streamOptions = streamOptions;
	}
}
