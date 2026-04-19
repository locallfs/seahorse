import Medusa from '@medusajs/js-sdk';
import * as SecureStore from 'expo-secure-store';

const BACKEND_URL =
  process.env.EXPO_PUBLIC_MEDUSA_BACKEND_URL ||
  'https://seahorse-production.up.railway.app';

const TOKEN_KEY = 'reefnerds.jwt';

const storage = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {}
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {}
  },
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
