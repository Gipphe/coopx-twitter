import test from 'ava';
import td from 'testdouble';
import timers, { NodeClock } from '@sinonjs/fake-timers';
import { DelayHandler, StreamDelay } from '../src/StreamDelay';

test('waiting once after HTTP error', (t) => {
	t.plan(0);
	const clock = timers.createClock();
	const sd = new StreamDelay(clock as NodeClock);
	const before = td.func();
	const after = td.func();
	td.when(before(0)).thenReturn(after);
	sd.waitAfterHTTPError(before as DelayHandler<void>);
	clock.next();
	td.verify(after(td.matchers.isA(Function)));
});

test('waiting twice after HTTP error', async (t) => {
	t.plan(0);
	const clock = timers.createClock();
	const sd = new StreamDelay(clock as NodeClock);
	const before = td.func();
	const after1 = td.func();
	const after2 = td.func();
	td.when(before(0)).thenReturn(after1);
	td.when(before(5000)).thenReturn(after2);

	const p1 = sd.waitAfterHTTPError(before as DelayHandler<void>);
	clock.next();
	await p1;

	const p2 = sd.waitAfterHTTPError(before as DelayHandler<void>);
	clock.next();
	await p2;

	td.verify(after1(td.matchers.isA(Function)));
	td.verify(after2(td.matchers.isA(Function)));
});

test('waiting thrice after HTTP error', async (t) => {
	t.plan(0);
	const clock = timers.createClock();
	const sd = new StreamDelay(clock as NodeClock);
	const before = td.func();
	const after1 = td.func();
	const after2 = td.func();
	const after3 = td.func();
	td.when(before(0)).thenReturn(after1);
	td.when(before(5000)).thenReturn(after2);
	td.when(before(10000)).thenReturn(after3);

	const p1 = sd.waitAfterHTTPError(before as DelayHandler<void>);
	clock.next();
	await p1;

	const p2 = sd.waitAfterHTTPError(before as DelayHandler<void>);
	clock.next();
	await p2;

	const p3 = sd.waitAfterHTTPError(before as DelayHandler<void>);
	clock.next();
	await p3;

	td.verify(after1(td.matchers.isA(Function)));
	td.verify(after2(td.matchers.isA(Function)));
	td.verify(after3(td.matchers.isA(Function)));
});

test('waiting thrice after Network error', async (t) => {
	t.plan(0);
	const clock = timers.createClock();
	const sd = new StreamDelay(clock as NodeClock);
	const before = td.func();
	const after1 = td.func();
	const after2 = td.func();
	const after3 = td.func();
	td.when(before(0)).thenReturn(after1);
	td.when(before(250)).thenReturn(after2);
	td.when(before(500)).thenReturn(after3);

	const p1 = sd.waitAfterNetworkError(before as DelayHandler<void>);
	clock.next();
	await p1;

	const p2 = sd.waitAfterNetworkError(before as DelayHandler<void>);
	clock.next();
	await p2;

	const p3 = sd.waitAfterNetworkError(before as DelayHandler<void>);
	clock.next();
	await p3;

	td.verify(after1(td.matchers.isA(Function)));
	td.verify(after2(td.matchers.isA(Function)));
	td.verify(after3(td.matchers.isA(Function)));
});

test('waiting thrice after TooManyRequests', async (t) => {
	t.plan(0);
	const clock = timers.createClock();
	const sd = new StreamDelay(clock as NodeClock);
	const before = td.func();
	const after1 = td.func();
	const after2 = td.func();
	const after3 = td.func();
	td.when(before(0)).thenReturn(after1);
	td.when(before(60000)).thenReturn(after2);
	td.when(before(120000)).thenReturn(after3);

	const p1 = sd.waitAfterTooManyRequests(before as DelayHandler<void>);
	clock.next();
	await p1;

	const p2 = sd.waitAfterTooManyRequests(before as DelayHandler<void>);
	clock.next();
	await p2;

	const p3 = sd.waitAfterTooManyRequests(before as DelayHandler<void>);
	clock.next();
	await p3;

	td.verify(after1(td.matchers.isA(Function)));
	td.verify(after2(td.matchers.isA(Function)));
	td.verify(after3(td.matchers.isA(Function)));
});

test('reset sets delay back to 0', async (t) => {
	t.plan(0);
	const clock = timers.createClock();
	const sd = new StreamDelay(clock as NodeClock);
	const before = td.func();
	const after1 = td.func();
	const after2 = td.func();
	td.when(before(0)).thenReturn(after1);
	td.when(before(5000)).thenReturn(after2);

	const p1 = sd.waitAfterHTTPError(before as DelayHandler<void>);
	clock.next();
	await p1;

	const p2 = sd.waitAfterHTTPError(before as DelayHandler<void>);
	clock.next();
	await p2;

	sd.reset();
	const p3 = sd.waitAfterHTTPError(before as DelayHandler<void>);
	clock.next();
	await p3;

	td.verify(after1(td.matchers.isA(Function)), { times: 2 });
	td.verify(after2(td.matchers.isA(Function)));
});

test('ifWaiting calls provided func if waiting', async (t) => {
	t.plan(0);
	const clock = timers.createClock();
	const sd = new StreamDelay(clock as NodeClock);
	const before = td.func();
	const after = td.func();
	const whileWaiting = td.func();
	td.when(before(0)).thenReturn(after);

	const p1 = sd.waitAfterHTTPError(before as DelayHandler<void>);
	sd.ifWaiting(whileWaiting as (x: number) => void);
	clock.next();
	await p1;

	td.verify(after(td.matchers.isA(Function)));
	td.verify(whileWaiting(0));
});

test('ifWaiting does not call provided func if not waiting', (t) => {
	t.plan(0);
	const clock = timers.createClock();
	const sd = new StreamDelay(clock as NodeClock);
	const whileWaiting = td.func();
	sd.ifWaiting(whileWaiting as (x: number) => void);

	td.verify(whileWaiting(), { ignoreExtraArgs: true, times: 0 });
});

test('calling reset without having waited is a noop', async (t) => {
	t.plan(0);
	const clock = timers.createClock();
	const sd = new StreamDelay(clock as NodeClock);
	const before = td.func();
	const after = td.func();
	td.when(before(0)).thenReturn(after);
	sd.reset();
	const p = sd.waitAfterHTTPError(before as DelayHandler<void>);
	clock.next();
	await p;
	td.verify(after(td.matchers.isA(Function)));
});

test('calling reset while waiting cancels pending wait', async (t) => {
	t.plan(0);
	const clock = timers.createClock();
	const sd = new StreamDelay(clock as NodeClock);
	const before = td.func();
	const after = td.func();
	td.when(before(td.matchers.isA(Number))).thenReturn(after);
	sd.waitAfterHTTPError(before as DelayHandler<void>);
	sd.reset();
	clock.next();
	td.verify(after(), { ignoreExtraArgs: true, times: 0 });
});
