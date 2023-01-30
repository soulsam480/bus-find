const SOURCE =
  'U2FsdGVkX19fomT9WZ1dYj4S0Hz5kORIE7yemgV3MAW6R+IPq8rXt48UZe+8nLVbYSEKwzdQ19aYGUi4oTAs2xGSfeKg0cNDb1d+4I9YFoo9b6gFXrMuf6TnrXjnEkct';

export interface IProjectMeta {
  source: string;
  author: string;
}

export async function getSource(): Promise<IProjectMeta | null> {
  const [AES, Utf8] = await Promise.all([
    import('crypto-js/aes'),
    import('crypto-js/enc-utf8'),
  ]);

  try {
    const res = AES.default
      .decrypt(SOURCE, window.location.host)
      .toString(Utf8.default);

    return JSON.parse(res);
  } catch (_e) {
    return null;
  }
}
