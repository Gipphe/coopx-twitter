import bodyParser from 'body-parser';
import * as ws from 'ws';
import WebSocket from 'ws';
import http from 'http';
import express, * as Express from 'express';
// eslint-disable-next-line import/no-extraneous-dependencies, import/no-unresolved
import { ParamsDictionary, Query } from 'express-serve-static-core';
import fetch, { Response } from 'node-fetch';
import cors from 'cors';
import { buildURL } from './lib/Util';
import { mkHeaders } from './lib/Env';
import { TweetStream } from './lib/TweetStream';

const port = process.env.PORT || 8080;

const handleResponse = async (resp: Response, res: Express.Response<string>): Promise<void> => {
	if (!resp.ok) {
		console.error(`Error from API (${resp.url}): ${resp.status} - ${resp.statusText}`);
		res.status(resp.status);
		resp.body.pipe(res);
		return;
	}
	res.send(await resp.text());
};

const app = express()
	.use(bodyParser.text({ type: () => true }))
	.use(cors())
	.post('/api/*', async (req: Express.Request<ParamsDictionary, string, string, Query>, res) => {
		const url = buildURL(req.originalUrl);
		const resp = await fetch(url, {
			method: 'POST',
			headers: mkHeaders({ 'Content-Type': 'application/json' }),
			body: req.body,
		});
		await handleResponse(resp, res);
	})
	.get('/api/*', async (req: Express.Request<ParamsDictionary, string, void, Query>, res) => {
		const url = buildURL(req.originalUrl);
		const resp = await fetch(url, { headers: mkHeaders() });
		await handleResponse(resp, res);
	})
	.use('*', (_, res) => {
		res.status(404).send('Not found');
	});

const server = http.createServer(app);
const wss = new ws.Server({ server });
const tweetStream = new TweetStream();

wss.on('connection', (socket: WebSocket) => {
	const id = tweetStream.registerListener((data: string): void => {
		socket.send(data);
	});
	console.log(`New connection: ${id}`);

	socket.on('close', () => {
		console.log(`Closed connection: ${id}`);
		tweetStream.unregisterListener(id);
	});
});

server.listen(port, () => {
	console.log(`Started on port ${port}`);
});
