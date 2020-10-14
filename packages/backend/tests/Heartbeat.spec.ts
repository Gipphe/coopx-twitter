import timers, { NodeClock } from '@sinonjs/fake-timers';
import { AbortController } from 'abort-controller';
import test from 'ava';
import { Heartbeat } from '../src/Heartbeat';

test('does not start by default', (t) => {
	const clock = timers.createClock();
	t.deepEqual(clock.countTimers(), 0);
	// eslint-disable-next-line no-new
	new Heartbeat(new AbortController(), clock as NodeClock);
	t.deepEqual(clock.countTimers(), 0);
});

test.cb('calls the provided abort controller after 23 seconds', (t) => {
	const clock = timers.createClock();
	const ab = new AbortController();
	const hb = new Heartbeat(ab, clock as NodeClock);

	ab.signal.addEventListener('abort', () => {
		t.deepEqual(clock.now, 23000);
		t.end();
	});

	hb.start();
	clock.next();
});

test.cb('resets the timer when `keepAlive` is called', (t) => {
	const clock = timers.createClock();
	const ab = new AbortController();
	const hb = new Heartbeat(ab, clock as NodeClock);

	ab.signal.addEventListener('abort', () => {
		t.deepEqual(clock.now, 28000);
		t.end();
	});

	hb.start();
	clock.tick(5000);
	hb.keepAlive();
	clock.next();
});

test.cb('never calls the abort controller if `end` is called before timeout', (t) => {
	const clock = timers.createClock();
	const ab = new AbortController();
	const hb = new Heartbeat(ab, clock as NodeClock);

	ab.signal.addEventListener('abort', () => {
		t.fail('Abort was called');
		t.end();
	});

	hb.start();
	clock.tick(5000);
	hb.end();
	clock.tick(23000);
	t.deepEqual(clock.now, 28000);
	t.end();
});

test.cb('calling end first does nothing', (t) => {
	const clock = timers.createClock();
	const ab = new AbortController();
	const hb = new Heartbeat(ab, clock as NodeClock);

	ab.signal.addEventListener('abort', () => {
		t.fail('Abort was called');
		t.end();
	});

	hb.end();
	clock.tick(24000);
	t.deepEqual(clock.now, 24000);
	t.end();
});
