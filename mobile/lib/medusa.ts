import Medusa from '@medusajs/js-sdk';
import * as SecureStore from 'expo-secure-store';

const BACKEND_URL =
  process.env.EXPO_PUBLIC_MEDUSA_BACKEND_URL ||
  'https://seahorse-production.up.railway.app';

const TOKEN_KEY = 'reefnerds.jwt';

const storage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const sdk = new Medusa({
  baseUrl: BACKEND_URL,
  auth: {
    type: 'jwt',
    jwtTokenStorageMethod: 'custom',
    storage,
    jwtTokenStorageKey: TOKEN_KEY,
  },
});

export { BACKEND_URL, TOKEN_KEY };
