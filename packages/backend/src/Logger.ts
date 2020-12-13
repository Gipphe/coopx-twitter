/* eslint-disable class-methods-use-this */

export interface Logger {
	info(msg: string): void;
}

export class ConsoleLogger implements Logger {
	public info(msg: string): void {
		const timestamp = (new Date()).toISOString();
		console.log(`${timestamp} - INFO: ${msg}`);
	}
}
