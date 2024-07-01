export type INxmProtocolAPI = {
  getIsRegistered: () => Promise<boolean>;
  register: () => Promise<boolean>;
  unregister: () => Promise<boolean>;
};
