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
import { Logger } from './Logger';

const qsOpts: qs.IStringifyOptions = {
	arrayFormat: 'comma',
	allowDots: true,
};

/**
 * A more idiomatic way to encapsulate a `Response` that should be thrown.
 */
class CannotConnect extends Error {
	private innerResponse: Response;

	public constructor(res: Response) {
		super();
		this.innerResponse = res;
	}

	public get response(): Response {
		return this.innerResponse;
	}

	public toString(): string {
		return `CannotConnect: ${this.innerResponse.status} - ${this.innerResponse.statusText}`;
	}
}

interface TooManyRequestsResponse extends Response {
	status: 429;
}

const isTooManyRequestsResponse = (x: Response): x is TooManyRequestsResponse =>
	x.status === 429;

interface FetchOpts {
	method: 'GET';
	signal: AbortSignal;
	headers: Record<string, string>;
}

type FetchFn = (url: string, opts: FetchOpts) => Promise<Response>;

const keepAliveToken = '\r\n';
type KeepAliveToken = typeof keepAliveToken;
const isKeepAliveToken = (x: unknown): x is KeepAliveToken => x === keepAliveToken;

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

	private logger: Logger;

	/**
	 * @param fetchFn HTTP request function to use. Requires a narrow subset of `window.fetch`'s
	 * functionality.
	 * @see {@link https://nodejs.org/package/node-fetch}
	 * @param timerControls Implementation for `setTimeout` and `clearTimeout`.
	 */
	public constructor(logger: Logger, fetchFn: FetchFn, timerControls: TimerControls<T>) {
		this.timerControls = timerControls;
		this.streamDelay = new StreamDelay(timerControls);
		this.fetchFn = fetchFn;
		this.logger = logger;
	}

	public logTooManyRequests(_: TooManyRequestsResponse): void {
		this.logger.info('429: TooManyRequests');
	}

	public logHTTPError(e: Response): void {
		this.logger.info(`HTTP Error: ${e.status}`);
	}

	public logUnknown(e: unknown): void {
		this.logger.info(`Unknown error: ${e}`);
	}

	public logAborted(e: unknown): void {
		this.logger.info(`Stream aborted: ${e}`);
		this.logger.info('Retrying immediately');
	}

	public logDelay(delay: number): void {
		if (delay === 0) {
			this.logger.info('Retrying immediately');
			return;
		}
		const untilDate = new Date(Date.now() + delay);
		this.logger.info(`Retrying at ${untilDate.toISOString()}`);
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

					if (typeof cb === 'function') {
						cb(null);
					}
				}

				heartbeat.keepAlive();
				return true;
			},
		});
	}

	private async streamTweets(): Promise<void> {
		this.logger.info('Attempting stream');
		const controller = new AbortController();
		const heartbeat = new Heartbeat(this.logger, controller, this.timerControls);
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
			throw new CannotConnect(x);
		}

		// Wait for the entire stream to end. The contents of the promise returned by `.buffer()`
		// should have already been handled by this point by the WriteStream created by
		// `createWritableDelegator`.
		this.logger.info('Waiting for buffer');
		await x.buffer();
		this.logger.info('Buffer done');
		heartbeat.end();
	}

	private async fetch(): Promise<void> {
		try {
			await this.streamTweets();
			this.streamDelay.reset();
		} catch (e: unknown) {
			await this.waitAfterError(e);
		}
		return this.fetch();
	}

	private waitAfterError(e: unknown): Promise<void> {
		return new Promise((resolve) => {
			if (e instanceof CannotConnect && isTooManyRequestsResponse(e.response)) {
				this.logTooManyRequests(e.response);
				return this.streamDelay.waitAfterTooManyRequests((delay) => {
					this.logDelay(delay);
					this.listeners.send(new WaitingUntilDelay(delay));
					return resolve;
				});
			}

			if (e instanceof CannotConnect) {
				this.logHTTPError(e.response);
				return this.streamDelay.waitAfterHTTPError((delay) => {
					this.logDelay(delay);
					this.listeners.send(new WaitingUntilDelay(delay));
					return resolve;
				});
			}

			if (e instanceof Error && e.name === 'AbortError') {
				this.logAborted(e);
				return this.timerControls.setTimeout(() => resolve(), 1);
			}

			this.logUnknown(e);
			return this.streamDelay.waitAfterNetworkError((delay) => {
				this.logDelay(delay);
				this.listeners.send(new WaitingUntilDelay(delay));
				return resolve;
			});
		});
	}

	/**
	 * Registers a new listener for the stream's content.
	 * @param f Consuming function for the stream content.
	 * @return ID of the new listener. Used for unregistering.
	 */
	public registerListener(f: ChunkConsumer): string {
		const id = this.listeners.register(f);
		if (!this.hasInitialized) {
			this.logger.info('Starting stream fetch');
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
