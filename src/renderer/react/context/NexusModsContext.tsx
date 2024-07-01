import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import type { IModUpdaterAPI } from 'bridge/ModUpdaterAPI';
import type { NexusModsAPIStateEvent as NexusModsApiStateEvent } from 'bridge/NexusModsAPI';
import type { INxmProtocolAPI } from 'bridge/NxmProtocolAPI';
import { useEventAPIListener } from 'renderer/EventAPI';
import { consumeAPI } from 'renderer/IPC';
import useSavedState from '../hooks/useSavedState';
import { useMods } from './ModsContext';
import { useCheckModForUpdates, useUpdateModVersion } from './UpdatesContext';

// DEBUG: Using Vortex app id during development
// TODO: get a real app id from Nexus Mods staff
const APPLICATION_ID = 'vortex';

const ModUpdaterAPI = consumeAPI<IModUpdaterAPI>('ModUpdaterAPI');
const NxmProtocolAPI = consumeAPI<INxmProtocolAPI>('NxmProtocolAPI');

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

function useNxmProtocolHandler(): [
  JSX.Element,
  boolean,
  () => void,
  () => void,
] {
  const [isRejected, setIsRejected] = useSavedState(
    'nxm-selection-rejected',
    false,
    (map) => JSON.stringify(map),
    (str) => JSON.parse(str),
  );

  const [isRegistered, setIsRegistered] = useState(false);

  const [isShown, setIsShown] = useState(false);

  const onShow = useCallback(() => {
    setIsShown(true);
  }, []);

  const onHide = useCallback(() => {
    setIsShown(false);
  }, []);

  const isInitialCheckDone = useRef(false);
  useEffect(() => {
    if (isInitialCheckDone.current) {
      return;
    }
    isInitialCheckDone.current = true;
    (async () => {
      const isRegisteredNew = await NxmProtocolAPI.getIsRegistered();
      setIsRegistered(isRegisteredNew);
      if (!isRejected && !isRegisteredNew) {
        onShow();
      }
    })()
      .then()
      .catch(console.error);
  }, [isRejected, onShow]);

  const onRegister = useCallback(async () => {
    setIsRejected(false);
    const success = await NxmProtocolAPI.register();
    setIsRegistered(success);
    if (!success) {
      console.error('Failed to register as nxm:// protocol handler.');
    }
  }, [setIsRejected]);

  const onUnregister = useCallback(async () => {
    setIsRejected(false);
    const success = await NxmProtocolAPI.unregister();
    setIsRegistered(!success);
    if (!success) {
      console.error('Failed to unregister as nxm:// protocol handler.');
    }
  }, [setIsRejected]);

  const onAgree = useCallback(async () => {
    setIsRejected(false);
    onHide();
    await onRegister();
  }, [onHide, onRegister, setIsRejected]);

  const onDisagree = useCallback(() => {
    setIsRejected(true);
    onHide();
  }, [onHide, setIsRejected]);

  return [
    <Dialog onClose={onHide} open={isShown}>
      <DialogTitle>Nexus Mods Handler</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Would you like to set D2RMM as the default handler for nxm:// links?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onDisagree}>Disagree</Button>
        <Button autoFocus={true} onClick={onAgree}>
          Agree
        </Button>
      </DialogActions>
    </Dialog>,
    isRegistered,
    onRegister,
    onUnregister,
  ];
}

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

  const [, onRefreshMods] = useMods();
  const updateModVersion = useUpdateModVersion();
  const checkModForUpdates = useCheckModForUpdates(authState);

  const [
    nxmDialog,
    isRegisteredAsNxmProtocolHandler,
    registerAsNxmProtocolHandler,
    unregisterAsNxmProtocolHandler,
  ] = useNxmProtocolHandler();

  const onOpenNxmUrl = useCallback(
    ({
      nexusModID,
      nexusFileID,
      key,
      expires,
    }: {
      nexusModID: string;
      nexusFileID: number;
      key: string | null;
      expires: number | null;
    }) => {
      if (authState.apiKey != null) {
        (async () => {
          const modID = await ModUpdaterAPI.installModViaNexus(
            null,
            authState.apiKey ?? '',
            nexusModID,
            nexusFileID,
            key ?? undefined,
            expires ?? undefined,
          );
          const mods = await onRefreshMods();
          const mod = mods.find((mod) => mod.id === modID);
          if (mod != null) {
            const newVersion = mod.info.version;
            if (newVersion != null) {
              const isUpdated = await updateModVersion(modID, newVersion);
              if (!isUpdated) {
                await checkModForUpdates(mod);
              }
            }
          }
        })()
          .then()
          .catch(console.error);
      } else {
        console.warn(
          `Couldn't handle nxm:// url for file ${nexusFileID} in mod ${nexusModID} because Nexus Mods is not authenticated.`,
        );
      }
    },
    [authState.apiKey, checkModForUpdates, onRefreshMods, updateModVersion],
  );
  useEventAPIListener('nexus-mods-open-url', onOpenNxmUrl);

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
      {nxmDialog}
    </Context.Provider>
  );
}

export function useNexusAuthState(): {
  nexusApiState: NexusModsApiStateEvent | null;
  nexusAuthState: INexusAuthState;
  setNexusAuthState: ISetNexusAuthState;
  nexusSignIn: () => void;
  nexusSignOut: () => void;
  isRegisteredAsNxmProtocolHandler: boolean;
  registerAsNxmProtocolHandler: () => void;
  unregisterAsNxmProtocolHandler: () => void;
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
    isRegisteredAsNxmProtocolHandler: context.isRegisteredAsNxmProtocolHandler,
    registerAsNxmProtocolHandler: context.registerAsNxmProtocolHandler,
    unregisterAsNxmProtocolHandler: context.unregisterAsNxmProtocolHandler,
  };
}
