import './main.css';
import { Elm } from './Main.elm';
import * as serviceWorker from './serviceWorker';

const apiBaseUrl = process.env.ELM_APP_API_BASE_URL;
const websocketUrl = process.env.ELM_APP_API_WS_URL;

const root = document.getElementById('root');

if (!apiBaseUrl || !websocketUrl) {
  const e = 'The environment variables "ELM_APP_API_BASE_URL" and "ELM_APP_API_WS_URL" are required.';
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
      apiBaseUrl,
    }
  });

  try {
    const socket = new WebSocket(websocketUrl);
    socket.addEventListener('message', (event) => {
      console.log(event.data);
      console.log(typeof event.data);
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
