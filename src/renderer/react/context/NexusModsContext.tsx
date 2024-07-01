import React, { useCallback, useContext, useMemo } from 'react';
import useSavedState from '../hooks/useSavedState';

type IApiKey = string | null;

type INexusAuthState = {
  apiKey: IApiKey;
};

type ISetNexusAuthState = React.Dispatch<React.SetStateAction<INexusAuthState>>;

export type INexusModsContext = {
  authState: INexusAuthState;
  setAuthState: ISetNexusAuthState;
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

  // TODO: validate cached api key on start
  //       /v1/users/validate.json
  //       https://app.swaggerhub.com/apis-docs/NexusMods/nexus-mods_public_api_params_in_form_data/1.0#/User/post_v1_users_validate.json

  const context = useMemo(
    (): INexusModsContext => ({
      authState,
      setAuthState,
    }),
    [authState, setAuthState],
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}

export function useNexusAuthState(): [
  INexusAuthState,
  ISetNexusAuthState,
  authenticate: () => void,
] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('No nexus mods context available.');
  }
  const authenticate = useCallback((): void => {
    // TODO: Nexus Mods SSO
    //       https://github.com/Nexus-Mods/sso-integration-demo
  }, []);
  return [context.authState, context.setAuthState, authenticate];
}
