import 'react-native-get-random-values';
import { Platform } from 'react-native';

declare global {
  interface Crypto {
    getRandomValues: <T extends ArrayBufferView | null>(array: T) => T;
    randomUUID: () => `${string}-${string}-${string}-${string}-${string}`;
  }

  var crypto: Crypto;
}

if (Platform.OS !== 'web') {
  if (typeof global.crypto !== 'object') {
    (global as any).crypto = {};
  }

  if (typeof global.crypto.getRandomValues !== 'function') {
    global.crypto.getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
      if (array instanceof Uint8Array) {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
      }
      return array;
    };
  }

  if (typeof global.crypto.randomUUID !== 'function') {
    global.crypto.randomUUID = (): `${string}-${string}-${string}-${string}-${string}` => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      }) as `${string}-${string}-${string}-${string}-${string}`;
    };
  }
}
