import test, { ExecutionContext } from 'ava';
import { buildURL } from '../src/Util';

const urlEq = (t: ExecutionContext<unknown>, input: string, expected: string) => {
	t.deepEqual(buildURL(input), expected);
};
urlEq.title = (providedTitle = '', input: string, expected: string) =>
	`${providedTitle} buildURL(${input}) = ${expected}`.trim();

test(urlEq, 'foo', 'https://api.twitter.com/foo');
test(urlEq, '/foo', 'https://api.twitter.com/foo');
test(urlEq, '/rules/foo', 'https://api.twitter.com/foo');
test(urlEq, 'rules/foo', 'https://api.twitter.com/foo');
