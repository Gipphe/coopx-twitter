import { Writable } from 'stream';
import fetch, { Response } from 'node-fetch';
import AbortController from 'abort-controller';
import qs from 'qs';
import { StreamDelay } from './StreamDelay';
import { mkHeaders } from './Env';
import { buildURL, TimerControls } from './Util';
import { TweetListeners } from './TweetListeners';
import { Heartbeat, isKeepAliveToken } from './Heartbeat';
import { StreamOptions } from './StreamOptions';

const qsOpts: qs.IStringifyOptions = {
	arrayFormat: 'comma',
	allowDots: true,
};

export type ChunkConsumer = (data: string) => void;

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

export class TweetStream<T> {
	private listeners: TweetListeners = new TweetListeners();

	private streamDelay: StreamDelay<T>;

	private hasInitialized = false;

	private timerControls: TimerControls<T>;

	private fetchFn: typeof fetch;

	private streamOptions: StreamOptions | null = null;

	public constructor(fetchFn: typeof fetch, timerControls: TimerControls<T>) {
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
					this.listeners.sendTweet(res);

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
		console.log('Attempting stream...');
		try {
			await this.streamTweets();
			console.log('Stream ended');
			this.streamDelay.reset();
		} catch (e: unknown) {
			if (e instanceof Response && isTooManyRequestsResponse(e)) {
				logTooManyRequests(e);
				this.streamDelay.waitAfterTooManyRequests((delay) => {
					this.listeners.sendWaitingUntilDelay(delay);
					return () => this.fetch();
				});
			} else if (e instanceof Response) {
				logHTTPError(e);
				this.streamDelay.waitAfterHTTPError((delay) => {
					this.listeners.sendWaitingUntilDelay(delay);
					return () => this.fetch();
				});
			} else {
				logUnknown(e);
				this.streamDelay.waitAfterNetworkError((delay) => {
					this.listeners.sendWaitingUntilDelay(delay);
					return () => this.fetch();
				});
			}
			return;
		}
		this.fetch();
	}

	public registerListener(f: ChunkConsumer): string {
		const id = this.listeners.register(f);
		if (!this.hasInitialized) {
			console.log('Starting stream fetch');
			this.hasInitialized = true;
			this.fetch();
		}
		this.streamDelay.ifWaiting(this.listeners.sendWaitingUntilDelay.bind(this.listeners));
		return id;
	}

	public unregisterListener(id: string): void {
		this.listeners.unregister(id);
	}

	public setStreamOptions(streamOptions: StreamOptions): void {
		this.streamOptions = streamOptions;
	}
}
