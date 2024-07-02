import type { NexusModsApiStateEvent } from 'bridge/NexusModsAPI';
import {
  Context,
  INexusAuthState,
  ISetNexusAuthState,
} from 'renderer/react/context/NexusModsContext';
import { v4 as uuidv4 } from 'uuid';
import { useCallback, useContext } from 'react';

// DEBUG: Using Vortex app id during development
// TODO: get a real app id from Nexus Mods staff
const APPLICATION_ID = 'vortex';

export default function useNexusAuthState(): {
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
