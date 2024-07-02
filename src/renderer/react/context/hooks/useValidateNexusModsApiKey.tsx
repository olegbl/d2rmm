import { useCallback, useEffect, useRef } from 'react';
import ModUpdaterAPI from 'renderer/ModUpdaterAPI';
import {
  INexusAuthState,
  ISetNexusAuthState,
} from 'renderer/react/context/NexusModsContext';

export default function useValidateNexusModsApiKey(
  authState: INexusAuthState,
  setAuthState: ISetNexusAuthState,
): () => void {
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

  return validateKey;
}
