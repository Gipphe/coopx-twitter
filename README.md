# twitter-stream

This is a web application for streaming tweets in real-time. It is divided into
two parts: the backend and the frontend.

The backend is responsible for handling the application authentication token
supplied by Twitter's developer portal, as well as handling the stream of
tweets itself and presenting these to the frontend in a sensible manner through
a websocket. While perusing the Twitter API, I noticed that there are two
distinct versions of their API: version 1.1 and version 2. Version 2 is
supposed to replace version 1.1 at some point in the future, and as such I saw
it only natural to use version 2 instead of version 1.1, even though this app
might be rather short-lived due to the reason I am making it in the first
place being so ephemeral. Choosing to go with version 2 did however present
another problem:
[I am unable to find an adequate library for interfacing with the version 2 API.](https://www.google.com/search?q=npm+twitter+2)
As such, I decided to just handle the streaming and such myself. The backend
also handles setting the rules that govern what kind of tweets that appear on
the stream. The Twitter stream API has
[a rich syntax](https://developer.twitter.com/en/docs/twitter-api/tweets/filtered-stream/integrate/build-a-rule)
for defining filter rules for the stream. In regards to rules, the backend
doesn't process the rules sent by the frontend whatsoever, and instead merely
works as a middleware service by handling the access token required by the API.

The frontend allows the user to add and remove rules to the stream. It also
displays the tweets received by the backend in reverse-chronological order, as
they are received.

## Configuration

The backend requires the environment variable `API_TOKEN` to be set. This env
var can be set by supplying it through the required `.env` file at the root
of this project. Due to the sensitive nature of this `.env` file, it is not
tracked in the VCS.

## Commands

- `start`: Alias for `compose:up`.
- `compose:up`: Builds and initializes the backend and frontend in respective
  containers. The frontend will be available through port `8080` by default.
