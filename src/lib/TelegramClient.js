import TdClient from 'tdweb/dist/tdweb';
import Emitter from 'component-emitter';
import CryptoJS from 'crypto-js';
import Dexie from 'dexie';
import * as DexieExportImport from 'dexie-export-import';
import { getBrowserName, getOSName } from 'utils/device';
import { clone } from 'utils/clone';
import { getRandomUuid } from 'utils/uuid';
import { serializeBlob, deserializeBlob } from 'utils/blob';

const TD_CLIENT_OPTIONS = {
  logVerbosityLevel: 1,
  jsLogVerbosityLevel: 'info',
  mode: 'wasm',
  instanceName: null, // TO BE PROVIDED FROM OUTSIDE
  readOnly: false,
  isBackground: false,
  useDatabase: false,
  wasmUrl: '3dee0f934ca1a5946a253599e3e442c6.wasm'
};

const TD_PARAMETERS = {
  '@type': 'tdParameters',
  api_id: process.env.REACT_APP_TELEGRAM_API_ID,
  api_hash: process.env.REACT_APP_TELEGRAM_API_HASH,
  system_language_code: navigator.language || 'en',
  device_model: getBrowserName(),
  system_version: getOSName(),
  application_version: '1.0.0',
  use_file_database: false,
  use_message_database: false,
  use_secret_chats: false,
  use_test_dc: false,
};

const INSTANCE_NAME_REGEX = /tdlib:[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}/;

class TelegramClient {
  static generateInstanceName() {
    return `tdlib:${getRandomUuid()}`
  }

  static buildEncryptionKey(string) {
    return Array.from(string).map(char => (
      char.charCodeAt(0).toString(2).padStart(8, '0').slice(-8)
    )).join('');
  }

  static info(backup, encryptionPassword) {
    const json = CryptoJS.AES.decrypt(backup, encryptionPassword).toString(CryptoJS.enc.Utf8);
    const data = JSON.parse(json);
    const { id, name, phoneNumber, photoUrl, username } = data;

    return { id, name, phoneNumber, photoUrl, username };
  }

  static async restore(backup, encryptionPassword) {
    const json = CryptoJS.AES.decrypt(backup, encryptionPassword).toString(CryptoJS.enc.Utf8);
    const data = JSON.parse(json);
    const client = await this.importFromData(data, encryptionPassword);

    return client;
  }

  static async importFromData(data, encryptionPassword) {
    const { serializedBlob, ...options } = data;
    const blob = await deserializeBlob(serializedBlob);
    const text = await blob.text();
    const oldInstanceName = text.match(INSTANCE_NAME_REGEX)[0];
    const clonedInstanceName = TelegramClient.generateInstanceName();
    const clonedText = text.split(oldInstanceName).join(clonedInstanceName);
    const clonedBlob = new Blob([clonedText], { type: blob.type });

    await DexieExportImport.importDB(clonedBlob, {});

    const client = new TelegramClient({
      ...options,
      encryptionPassword,
      instanceName: clonedInstanceName,
    });

    return client;
  }

  constructor({ encryptionPassword, id, instanceName, name, password, phoneNumber, photoUrl, username }) {
    this.encryptionPassword = encryptionPassword;
    this.id = id;
    this.instanceName = instanceName || TelegramClient.generateInstanceName();
    this.name = name;
    this.password = password;
    this.phoneNumber = phoneNumber;
    this.photoUrl = photoUrl;
    this.username = username;
    this.client = new TdClient({
      ...clone(TD_CLIENT_OPTIONS),
      instanceName: this.instanceName
    });

    this.client.onUpdate = update => {
      switch (update['@type']) {
        case 'updateAuthorizationState': {
          this.authorizationState = update.authorization_state;

          switch (update.authorization_state['@type']) {
            case 'authorizationStateReady':
              this.getMe().then((me) => {
                this.id = me.id;
                this.photoUrl = me.profile_photo?.minithumbnail?.data;
                this.photoUrl = this.photoUrl ? `data:image/png;base64,${this.photoUrl}` : null;
                this.username = me.username;
                this.name = [me.first_name, me.last_name].filter(Boolean).join(' ');
                this.emit('ready');
              });
              break;
            case 'authorizationStateWaitTdlibParameters':
              this.send('setTdlibParameters', { parameters: clone(TD_PARAMETERS) });
              break;
            case 'authorizationStateWaitEncryptionKey':
              const encryptionKey = TelegramClient.buildEncryptionKey(encryptionPassword);
              this.send('setDatabaseEncryptionKey', { new_encryption_key: encryptionKey });
              break;
            case 'authorizationStateWaitPhoneNumber':
              this.phoneNumber ? this.setPhoneNumber(this.phoneNumber) : this.emit('waitPhoneNumber');
              break;
            case 'authorizationStateWaitCode':
              this.emit('waitCode');
              break;
            case 'authorizationStateWaitPassword':
              this.password ? this.setPassword(this.password) : this.emit('waitPassword', update);
              break;
            default:
              break;
          }
          this.emit(update.authorization_state['@type'], update);
          break;
        }
        default:
          break;
      }

      this.emit('update', update);
      this.emit(update['@type'], update);
    };

    this.on('authorizationStateClosed', () => {
      indexedDB.deleteDatabase(`/${this.instanceName}/dbfs`);
      indexedDB.deleteDatabase(`${this.instanceName}`);
    });
  }

  getMe() {
    return this.send('getMe');
  }

  setPhoneNumber(phone_number) {
    this.phoneNumber = phone_number;
    return this.send('setAuthenticationPhoneNumber', { phone_number });
  }

  setCode(code) {
    return this.send('checkAuthenticationCode', { code });
  }

  setPassword(password) {
    this.password = password;
    return this.send('checkAuthenticationPassword', { password });
  }

  close() {
    return this.client.close();
  }

  async backup() {
    const blob = await this.exportToBlob();
    const serializedBlob = await serializeBlob(blob);
    const data = {
      id: this.id,
      name: this.name,
      password: this.password,
      phoneNumber: this.phoneNumber,
      photoUrl: this.photoUrl,
      serializedBlob: serializedBlob,
      username: this.username,
    };
    const json = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(json, this.encryptionPassword).toString();

    return encrypted;
  }

  async exportToBlob() {
    const currentDatabaseName = `/${this.instanceName}/dbfs`;
    const db = new Dexie(currentDatabaseName);
    await db.open();
    const blob = await DexieExportImport.exportDB(db, {});

    return blob;
  }

  send(command, options = {}) {
    return this.client.send({
      ...options,
      '@type': command
    });
  }
}

Emitter(TelegramClient.prototype);

export default TelegramClient;
