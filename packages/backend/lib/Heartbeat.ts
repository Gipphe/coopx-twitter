import AbortController from 'abort-controller';
import { TimerControls } from './Util';

const twentyThreeSeconds = 23000;

export const keepAliveToken = '\r\n';
export type KeepAliveToken = typeof keepAliveToken;
export const isKeepAliveToken = (x: unknown): x is KeepAliveToken => x === keepAliveToken;

/**
 * A timed controller that calls `abort` on the passed `AbortController` if `keepAlive` is not
 * called within 23 seconds. Every call to `keepAlive` resets the 23-second timer, until `end` is
 * called, upon which the `Heartbeat` returns to its initial state.
 */
export class Heartbeat<TimerRef> {
	private controller: AbortController;

	private timer: TimerRef | null = null;

	private timerControls: TimerControls<TimerRef>;

	/**
	 * @param controller An `AbortController` to call should the timer expire.
	 * @param timerControls Implementations for `setTimeout` and `clearTimeout` to use.
	 */
	public constructor(controller: AbortController, timerControls: TimerControls<TimerRef>) {
		this.controller = controller;
		this.timerControls = timerControls;
	}

	private signalAbort(): void {
		this.controller.abort();
	}

	private clearTimer(): void {
		if (this.timer) {
			this.timerControls.clearTimeout(this.timer);
			this.timer = null;
		}
	}

	/**
	 * Starts the actual timer.
	 */
	public start(): void {
		this.timer = this.timerControls.setTimeout(() => {
			this.signalAbort();
		}, twentyThreeSeconds);
	}

	/**
	 * Refreshes the delay until the `AbortController` is called. If `start` has not been called
	 * yet, functions identical to `start`.
	 */
	public keepAlive(): void {
		this.clearTimer();
		this.start();
	}

	/**
	 * Signal the end of the Heartbeat monitoring. If called after `start`, and before the timer
	 * has expired: the timer is reset and the timeout is cancelled. Otherwise it is a noop.
	 */
	public end(): void {
		this.clearTimer();
	}
}
