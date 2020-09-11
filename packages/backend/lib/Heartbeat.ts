import AbortController from 'abort-controller';

const twentyThreeSeconds = 23000;

export const keepAliveToken = '\r\n';
export type KeepAliveToken = typeof keepAliveToken;
export const isKeepAliveToken = (x: unknown): x is KeepAliveToken => x === keepAliveToken;

export class Heartbeat {
	private controller: AbortController;

	private timer: NodeJS.Timeout | null = null;

	constructor(controller: AbortController) {
		this.controller = controller;
	}

	private signalAbort(): void {
		this.controller.abort();
	}

	private clearTimer(): void {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

	public start(): void {
		this.timer = setTimeout(() => {
			this.signalAbort();
		}, twentyThreeSeconds);
	}

	public stayinAlive(): void {
		console.log("Ah, ha, ha, ha, stayin' alive");
		this.clearTimer();
		this.start();
	}

	public end(): void {
		this.clearTimer();
	}
}
