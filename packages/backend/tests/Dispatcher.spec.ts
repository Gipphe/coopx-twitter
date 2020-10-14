import test from 'ava';
import td from 'testdouble';
import { Dispatcher } from '../src/Dispatcher';
import { ChunkConsumer } from '../src/Util';

test('send tweet to 1 listener', (t) => {
	const d = new Dispatcher();
	const f = td.func();
	d.register(f as ChunkConsumer);
	d.send({ toJSON: () => 'foo' });
	t.notThrows(() => td.verify(f('foo')));
});

test('send tweet to 5 listeners', (t) => {
	const fs = Array.from(Array(5).keys()).map(() => td.func());
	const d = new Dispatcher();
	fs.forEach((f) => d.register(f as ChunkConsumer));
	d.send({ toJSON: () => 'foo' });
	t.notThrows(() => {
		fs.forEach((f) => td.verify(f('foo')));
	});
});

test('unregister', (t) => {
	const f = td.func();
	const d = new Dispatcher();
	const id = d.register(f as ChunkConsumer);
	d.unregister(id);
	d.send({ toJSON: () => 'foo' });
	t.notThrows(() => td.verify(f(), { times: 0, ignoreExtraArgs: true }));
});

test('get number of listeners', (t) => {
	const d = new Dispatcher();
	const fs = Array.from(Array(5).keys()).map(() => td.func());
	fs.forEach((f) => d.register(f as ChunkConsumer));
	t.deepEqual(d.numberOfListeners, 5);
});
