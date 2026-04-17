import { sdk } from './medusa';

export type UploadFile = { uri: string; name: string; type: string };

export async function uploadImage(file: UploadFile): Promise<string | null> {
  const form = new FormData();
  form.append('files', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  const res = await sdk.client.fetch<{ files: { url: string; id: string }[] }>(
    '/admin/uploads',
    {
      method: 'POST',
      body: form as any,
    }
  );

  return res?.files?.[0]?.url || null;
}
