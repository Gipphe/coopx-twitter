import test from 'ava';
import { Tweet, Waiting, WaitingUntilDelay } from '../src/Messages';

test('Tweet: stringifies as expected', (t) => {
	const tweet = new Tweet('{"foo": "bar", "baz": true, "quux": {"a": "b"} }');
	t.deepEqual(JSON.parse(tweet.toJSON()), {
		tag: 'tweet',
		data: {
			foo: 'bar',
			baz: true,
			quux: {
				a: 'b',
			},
		},
	});
});

test('Waiting: stringifies as expected', (t) => {
	const d = new Date('2020-01-01T10:00Z');
	const waiting = new Waiting(d);
	t.deepEqual(JSON.parse(waiting.toJSON()), {
		tag: 'waiting',
		until: 1577872800000,
	});
});

test.serial('WaitingUntilDelay: stringifies as expected', (t) => {
	const fakeNow = () => 100;
	const realNow = Date.now;
	Date.now = fakeNow;

	const x = new WaitingUntilDelay(1000);
	t.deepEqual(JSON.parse(x.toJSON()), {
		tag: 'waiting',
		until: 1100,
	});

	Date.now = realNow;
});
