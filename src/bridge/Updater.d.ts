export type Update = {
  version: string;
  url: string;
};

export type IUpdaterAPI = {
  getLatestUpdate: () => Promise<Update | null>;
  installUpdate: (update: Update) => Promise<void>;
};
