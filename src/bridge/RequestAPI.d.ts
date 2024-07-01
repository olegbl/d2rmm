export type RequestHeaders = Record<string, string>;

export type ResponseHeaders = Record<string, string | string[]>;

export type IRequestAPI = {
  download: (
    url: string,
    options?: {
      fileName?: string | null;
      eventID?: string | null;
      headers?: RequestHeaders | null;
    } | null,
  ) => Promise<{
    filePath: string;
    headers: ResponseHeaders;
  }>;
};
