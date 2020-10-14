import './main.css';
import { Elm } from './Main.elm';
import * as serviceWorker from './serviceWorker';

const rulesUrl = process.env.ELM_APP_API_RULES_URL;
const streamSocket = process.env.ELM_APP_API_STREAM_SOCKET;

const root = document.getElementById('root');

if (!rulesUrl || !streamSocket) {
  const e = 'The environment variables "ELM_APP_API_RULES_URL" and "ELM_APP_API_STREAM_SOCKET" are required.';
  console.error(e);
  root.innerHTML = e;
  root.style.fontSize = '200%';
  root.style.display = 'flex';
  root.style.alignItems = 'center';
  root.style.justifyContent = 'center';
  root.style.height = '100vh';
  root.style.width = '1000px';
  root.style.maxWidth = '80vw';
  root.style.margin = '0 auto';
} else {
  const app = Elm.Main.init({
    node: root,
    flags: {
      rulesUrl,
    }
  });

  try {
    const socket = new WebSocket(streamSocket);
    socket.addEventListener('message', (event) => {
      app.ports.messageReceiver.send(event.data);
    });
    socket.addEventListener('close', () => {
      app.ports.messageReceiver.send(JSON.stringify({
        tag: 'socket',
        event: 'closed',
      }));
    });
  } catch(e) {
    app.ports.websocketIssue.send(e.toString());
  }

  // If you want your app to work offline and load faster, you can change
  // unregister() to register() below. Note this comes with some pitfalls.
  // Learn more about service workers: https://bit.ly/CRA-PWA
  serviceWorker.unregister();
}
