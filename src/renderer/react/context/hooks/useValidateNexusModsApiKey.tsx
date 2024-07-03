import ModUpdaterAPI from 'renderer/ModUpdaterAPI';
import {
  INexusAuthState,
  ISetNexusAuthState,
} from 'renderer/react/context/NexusModsContext';
import { useCallback, useEffect } from 'react';

export default function useValidateNexusModsApiKey(
  authState: INexusAuthState,
  setAuthState: ISetNexusAuthState,
): () => void {
  const apiKey = authState.apiKey;

  const validateKey = useCallback(() => {
    if (apiKey == null) {
      return;
    }
    ModUpdaterAPI.validateNexusApiKey(apiKey)
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
  }, [apiKey, setAuthState]);

  useEffect(() => {
    validateKey();
  }, [validateKey]);

  return validateKey;
}
