export type IRequestAPI = {
  download: (
    url: string,
    fileName?: string | null,
    eventID?: string | null,
  ) => Promise<string>;
};
