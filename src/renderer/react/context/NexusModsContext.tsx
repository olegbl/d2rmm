import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { IModUpdaterAPI } from 'bridge/ModUpdaterAPI';
import { NexusModsAPIStateEvent as NexusModsApiStateEvent } from 'bridge/NexusModsAPI';
import { useEventAPIListener } from 'renderer/EventAPI';
import { consumeAPI } from 'renderer/IPC';
import useSavedState from '../hooks/useSavedState';

// DEBUG: Using Vortex app id during development
// TODO: get a real app id from Nexus Mods staff
const APPLICATION_ID = 'vortex';

const ModUpdaterAPI = consumeAPI<IModUpdaterAPI>('ModUpdaterAPI');

type IApiKey = string | null;

type INexusAuthState = {
  apiKey: IApiKey;
  name?: string | null;
  email?: string | null;
  isPremium?: boolean | null;
};

type ISetNexusAuthState = React.Dispatch<React.SetStateAction<INexusAuthState>>;

export type INexusModsContext = {
  apiState: NexusModsApiStateEvent | null;
  authState: INexusAuthState;
  setAuthState: ISetNexusAuthState;
  validateKey: () => void;
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

  const [apiState, setApiState] = useState<NexusModsApiStateEvent | null>(null);

  useEventAPIListener('nexus-mods-api-status', setApiState);

  const validateKey = useCallback(() => {
    if (authState.apiKey == null) {
      return;
    }
    ModUpdaterAPI.validateNexusApiKey(authState.apiKey)
      .then(({ name, email, isValid, isPremium }) => {
        if (!isValid) {
          console.warn(
            `Nexus Mods auth session is invalid. Please log in again.`,
          );
          setAuthState({ apiKey: null });
        } else {
          setAuthState((oldAuthState) => ({
            ...oldAuthState,
            name,
            email,
            isPremium,
          }));
        }
      })
      .catch(console.error);
  }, [authState.apiKey, setAuthState]);

  // we only want to validate the initial cached key - any further changes
  // will be coming from within the session with a pre-validated key
  const isCachedKeyValidatedRef = useRef(false);
  useEffect(() => {
    if (!isCachedKeyValidatedRef.current) {
      validateKey();
    }
    isCachedKeyValidatedRef.current = true;
  }, [validateKey]);

  const context = useMemo(
    (): INexusModsContext => ({
      apiState,
      authState,
      setAuthState,
      validateKey,
    }),
    [apiState, authState, setAuthState, validateKey],
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}

export function useNexusAuthState(): {
  nexusApiState: NexusModsApiStateEvent | null;
  nexusAuthState: INexusAuthState;
  setNexusAuthState: ISetNexusAuthState;
  nexusSignIn: () => void;
  nexusSignOut: () => void;
} {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('No nexus mods context available.');
  }

  const nexusSignIn = useCallback((): void => {
    const id = uuidv4();
    const socket = new WebSocket('wss://sso.nexusmods.com');
    socket.onopen = (_event) => {
      // subscribe to SSO events
      socket.send(
        JSON.stringify({
          id,
          protocol: 2,
          // we only need to remember the token and pass it in if we're reconnecting
          // token: undefined,
        }),
      );
      // start SSO flow in browser
      window.open(
        `https://www.nexusmods.com/sso?id=${id}&application=${APPLICATION_ID}`,
      );
    };
    socket.onclose = (_event) => {
      // it doesn't seem to be currently necessary, but we can keep the socket
      // alive by reconnecting to Nexus Mods until we get a fully success / failure
    };
    socket.onmessage = (event) => {
      const response = JSON.parse(event.data) as {
        success: boolean;
        error: string | null;
        data?: { connection_token?: string; api_key?: string } | null;
      };
      if (!response.success && response.error != null) {
        console.error(`Error when signing in to Nexus Mods: ${response.error}`);
      }
      if (response.success && response.data?.api_key != null) {
        const apiKey = response.data.api_key;
        socket.close();
        context.setAuthState({ apiKey });
        context.validateKey();
      }
    };
  }, [context]);

  const nexusSignOut = useCallback((): void => {
    context.setAuthState({ apiKey: null });
  }, [context]);

  return {
    nexusApiState: context.apiState,
    nexusAuthState: context.authState,
    setNexusAuthState: context.setAuthState,
    nexusSignIn,
    nexusSignOut,
  };
}
