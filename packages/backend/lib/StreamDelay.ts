import { TimerControls } from './Util';

export type DelayResetter = () => void;

/**
 * Function to be called surrounding the wait. First, before the wait, it is called
 * with the duration of the upcoming delay in milliseconds. The function returned from this
 * first call is then called after the actual wait has passed. This second invocation is passed
 * a function used to reset the wait duration, equivalent to calling `reset` on this
 * `StreamDelay`
 */
export type DelayHandler<T> = (delay: number) => (resetDelay: DelayResetter) => T;

/**
 * Manages the duration for retrying the Twitter API 2.0 stream endpoints for the various scenarios
 * described in their
 * [specification](https://developer.twitter.com/en/docs/twitter-api/tweets/filtered-stream/integrate/handling-disconnections).
 */
export class StreamDelay<TimerRef> {
	private isWaiting = false;

	private timer: TimerRef | null = null;

	private delay = 0;

	private timerControls: TimerControls<TimerRef>;

	/**
	 * @param timerControls Implementations for `setTimeout` and `clearTimeout` to use.
	 */
	public constructor(timerControls: TimerControls<TimerRef>) {
		this.timerControls = timerControls;
	}

	private incDelay(f: (x: number) => number): void {
		this.delay = f(this.delay);
	}

	private resetDelay(): void {
		this.delay = 0;
	}

	private clearTimer(): void {
		if (this.timer !== null) {
			this.timerControls.clearTimeout(this.timer);
			this.timer = null;
		}
	}

	private incDelayNetworkError(): void {
		this.incDelay((x) => Math.min(x + 250, 16000));
	}

	private incDelayHTTPError(): void {
		if (this.delay === 0) {
			this.delay = 5000;
		} else {
			this.incDelay((x) => Math.min(x * 2, 320000));
		}
	}

	private incDelayTooManyRequests(): void {
		if (this.delay === 0) {
			this.delay = 60000;
		} else {
			this.incDelay((x) => x * 2);
		}
	}

	private waitForDelay<T>(runBeforeDelay: DelayHandler<T>): Promise<T> {
		this.isWaiting = true;
		const untilDate = new Date(Date.now() + this.delay);
		console.log(`Waiting until ${untilDate.toISOString()}`);
		const runAfterDelay = runBeforeDelay(this.delay);
		return new Promise((resolve) => {
			this.timer = this.timerControls.setTimeout(() => {
				this.isWaiting = false;
				resolve(runAfterDelay(this.resetDelay.bind(this)));
			}, this.delay);
		});
	}

	private async waitAndInc<T>(f: DelayHandler<T>, incFn: () => void): Promise<T> {
		const x = await this.waitForDelay(f);
		incFn();
		return x;
	}

	/**
	 * Waits before calling the passed `DelayHandler` according to Twitter API 2.0's specificaiton
	 * for retry delays in the case of receiving a "TooManyRequests" response from the API.
	 * @param f Function to be called surrounding the wait.
	 */
	public async waitAfterTooManyRequests<T>(f: DelayHandler<T>): Promise<T> {
		return this.waitAndInc(f, this.incDelayTooManyRequests.bind(this));
	}

	/**
	 * Waits before calling the passed `DelayHandler` according to Twitter API 2.0's specificaiton
	 * for retry delays in the case of miscellaneous network errors.
	 * @param f Function to be called surrounding the wait.
	 */
	public async waitAfterNetworkError<T>(f: DelayHandler<T>): Promise<T> {
		return this.waitAndInc(f, this.incDelayNetworkError.bind(this));
	}

	/**
	 * Waits before calling the passed `DelayHandler` according to Twitter API 2.0's specificaiton
	 * for retry delays in the case of miscellanous HTTP Errors.
	 * @param f Function to be called surrounding the wait.
	 */
	public async waitAfterHTTPError<T>(f: DelayHandler<T>): Promise<T> {
		return this.waitAndInc(f, this.incDelayHTTPError.bind(this));
	}

	/**
	 * Calls the passed function with the current wait duration if this `StreamDelay` is currently
	 * waiting. Otherwise, does nothing.
	 * @param f Function to call if currently waiting.
	 */
	public ifWaiting(f: (delay: number) => void): void {
		if (this.isWaiting) {
			f(this.delay);
		}
	}

	/**
	 * Resets the current duration and cancels the current timeout if currently waiting.
	 */
	public reset(): void {
		this.resetDelay();
		this.clearTimer();
	}
}
