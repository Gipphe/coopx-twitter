import dotenv from 'dotenv';

dotenv.config();

export const port = process.env.PORT || 8080;
const token = process.env.API_TOKEN;

if (token === undefined) {
	console.error('The API_TOKEN is missing');
	process.exit(1);
}

export const mkHeaders = (headers?: Record<string, string>): Record<string, string> => ({
	Authorization: `Bearer ${token}`,
	...headers,
});
