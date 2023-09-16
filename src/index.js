import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import TelegramClient from 'lib/TelegramClient';
import App from './App';
import { wipeOutTraces } from 'utils/storage';

window.onbeforeunload = (e) => wipeOutTraces();
window.addEventListener('beforeunload', window.onbeforeunload, false);

// FIXME: It's just for your testing. Remove these lines:
window.TelegramClient = TelegramClient;
console.log('You can initialize your client this way, we did this for you already:\n%cconst client = new TelegramClient({ encryptionPassword: \'your-very-safe-password\' });', 'color: black; background: lightpink; border-radius: 3px; padding: 3px 6px;');
console.log('%c^ We did this for you already ^', 'color: white; font-weight: bold; background: red; border-radius: 3px; padding: 3px 6px;');
const client = new TelegramClient({ encryptionPassword: 'your-very-safe-password' });
window.client = client;

client.on('ready', async () => {
  const backup = await client.backup();
  console.log('%cHere is your session backup:', 'color: white; font-weight: bold; background: red; border-radius: 3px; padding: 3px 6px;');
  console.log({ backup });
  console.log('%cYour client is ready, try something out:', 'color: white; font-weight: bold; background: red; border-radius: 3px; padding: 3px 6px;');
  console.log(client);
  console.log('You can call this, for example:\n%cawait client.getMe();', 'color: black; background: lightpink; border-radius: 3px; padding: 3px 6px;');
});
client.on('waitPhoneNumber', () => {
  const number = prompt("What's your phone number?");
  client.setPhoneNumber(number).catch(console.error);
});
client.on('waitCode', () => {
  const code = prompt("What 5-digit code Telegram sent you?");
  client.setCode(code).catch(console.error);
});
client.on('waitPassword', ({ authorization_state: { password_hint } }) => {
  const password = prompt(`What's your 2-factor auth password${password_hint ? `(hint: ${password_hint})` : ''}?`);
  client.setPassword(password).catch(console.error);
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
