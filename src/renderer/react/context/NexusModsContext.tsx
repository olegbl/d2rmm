import type { NexusModsApiStateEvent } from 'bridge/NexusModsAPI';
import useNexusModsApiStateListener from 'renderer/react/context/hooks/useNexusModsApiStateListener';
import useNxmProtocolHandler from 'renderer/react/context/hooks/useNxmProtocolHandler';
import useNxmProtocolRegistrar from 'renderer/react/context/hooks/useNxmProtocolRegistrar';
import useValidateNexusModsApiKey from 'renderer/react/context/hooks/useValidateNexusModsApiKey';
import useSavedState from 'renderer/react/hooks/useSavedState';
import React, { useMemo } from 'react';

type IApiKey = string | null;

export type INexusAuthState = {
  apiKey: IApiKey;
  name?: string | null;
  email?: string | null;
  isPremium?: boolean | null;
};

export type ISetNexusAuthState = React.Dispatch<
  React.SetStateAction<INexusAuthState>
>;

export type INexusModsContext = {
  apiState: NexusModsApiStateEvent | null;
  authState: INexusAuthState;
  setAuthState: ISetNexusAuthState;
  validateKey: () => void;
  isRegisteredAsNxmProtocolHandler: boolean;
  registerAsNxmProtocolHandler: () => void;
  unregisterAsNxmProtocolHandler: () => void;
};

export const Context = React.createContext<INexusModsContext | null>(null);

export function NexusModsContextProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [authState, setAuthState] = useSavedState(
    'nexus-auth',
    {} as INexusAuthState,
    (map) => JSON.stringify(map),
    (str) => JSON.parse(str),
  );

  const apiState = useNexusModsApiStateListener();

  const [
    nxmRegistrarDialog,
    isRegisteredAsNxmProtocolHandler,
    registerAsNxmProtocolHandler,
    unregisterAsNxmProtocolHandler,
  ] = useNxmProtocolRegistrar();

  useNxmProtocolHandler(authState);

  const validateKey = useValidateNexusModsApiKey(authState, setAuthState);

  const context = useMemo(
    (): INexusModsContext => ({
      apiState,
      authState,
      setAuthState,
      validateKey,
      isRegisteredAsNxmProtocolHandler,
      registerAsNxmProtocolHandler,
      unregisterAsNxmProtocolHandler,
    }),
    [
      apiState,
      authState,
      setAuthState,
      validateKey,
      isRegisteredAsNxmProtocolHandler,
      registerAsNxmProtocolHandler,
      unregisterAsNxmProtocolHandler,
    ],
  );

  return (
    <Context.Provider value={context}>
      {children}
      {nxmRegistrarDialog}
    </Context.Provider>
  );
}
