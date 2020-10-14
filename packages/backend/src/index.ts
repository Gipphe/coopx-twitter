import bodyParser from 'body-parser';
import * as ws from 'ws';
import WebSocket from 'ws';
import http from 'http';
import express, * as Express from 'express';
// eslint-disable-next-line import/no-extraneous-dependencies, import/no-unresolved
import { ParamsDictionary, Query } from 'express-serve-static-core';
import fetch, { Response } from 'node-fetch';
import cors from 'cors';
import { buildURL } from './Util';
import { mkHeaders, port } from './Env';
import { TweetStream } from './TweetStream';
import { StreamOptions } from './StreamOptions';

const streamOptions: StreamOptions = {
	expansions: [
		'author_id',
	],
	media: {
		fields: [
			'height',
			'width',
			'preview_image_url',
			'type',
			'url',
		],
	},
	tweet: {
		fields: [
			'attachments',
			'author_id',
			'created_at',
			'id',
			'text',
		],
	},
	user: {
		fields: [
			'created_at',
			'id',
			'profile_image_url',
			'url',
			'username',
			'verified',
		],
	},
};

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
	.post('/rules/*', async (req: Express.Request<ParamsDictionary, string, string, Query>, res) => {
		const url = buildURL(req.originalUrl);
		const resp = await fetch(url, {
			method: 'POST',
			headers: mkHeaders({ 'Content-Type': 'application/json' }),
			body: req.body,
		});
		await handleResponse(resp, res);
	})
	.get('/rules/*', async (req: Express.Request<ParamsDictionary, string, void, Query>, res) => {
		const url = buildURL(req.originalUrl);
		const resp = await fetch(url, { headers: mkHeaders() });
		await handleResponse(resp, res);
	})
	.use('*', (_, res) => {
		res.status(404).send('Not found');
	});

const server = http.createServer(app);
const wss = new ws.Server({ server });
const tweetStream = new TweetStream(fetch, global);

tweetStream.setStreamOptions(streamOptions);

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
