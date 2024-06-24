export type IRequestAPI = {
  createRequest: (url: string) => Promise<string>;
  sendRequest: (id: string) => Promise<void>;
};
