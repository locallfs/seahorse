import * as SecureStore from 'expo-secure-store';
import { BACKEND_URL, TOKEN_KEY } from './medusa';

export type UploadFile = { uri: string; name: string; type: string };

export async function uploadImage(file: UploadFile): Promise<string | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) throw new Error('Not signed in.');

  const form = new FormData();
  form.append('files', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  const res = await fetch(`${BACKEND_URL}/admin/uploads`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: form as any,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Upload failed (${res.status}): ${body || 'unknown error'}`);
  }

  const json = (await res.json()) as { files?: { url: string; id: string }[] };
  return json?.files?.[0]?.url || null;
}
