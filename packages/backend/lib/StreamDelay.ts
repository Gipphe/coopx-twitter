export type DelayResetter = () => void;
export type DelayHandler<T> = (delay: number) => (resetDelay: DelayResetter) => T;

export class StreamDelay {
	private isWaiting = false;

	private timer: NodeJS.Timeout | null = null;

	private delay = 0;

	private incDelay(f: (x: number) => number): void {
		this.delay = f(this.delay);
	}

	private resetDelay(): void {
		this.delay = 0;
	}

	private clearTimer(): void {
		if (this.timer !== null) {
			clearTimeout(this.timer);
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
			this.timer = setTimeout(() => {
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

	public async waitAfterTooManyRequests<T>(f: DelayHandler<T>): Promise<T> {
		return this.waitAndInc(f, this.incDelayTooManyRequests.bind(this));
	}

	public async waitAfterNetworkError<T>(f: DelayHandler<T>): Promise<T> {
		return this.waitAndInc(f, this.incDelayNetworkError.bind(this));
	}

	public async waitAfterHTTPError<T>(f: DelayHandler<T>): Promise<T> {
		return this.waitAndInc(f, this.incDelayHTTPError.bind(this));
	}

	public ifWaiting(f: (delay: number) => void): void {
		if (this.isWaiting) {
			f(this.delay);
		}
	}

	public reset(): void {
		this.resetDelay();
		this.clearTimer();
	}
}
