import {
  ISetUpdateState,
  IUpdateState,
} from 'renderer/react/context/UpdatesContext';
import useModUpdates from 'renderer/react/context/hooks/useModUpdates';
import { useCallback } from 'react';

const DEFAULT_UPDATE_STATE = {
  isUpdateChecked: false,
  isUpdateAvailable: false,
  nexusUpdates: [],
  nexusDownloads: [],
};

export default function useModUpdate(
  modID: string,
): [IUpdateState, ISetUpdateState] {
  const [updates, setUpdates] = useModUpdates();
  const updateState = updates.get(modID) ?? DEFAULT_UPDATE_STATE;
  const setUpdateState = useCallback(
    (arg: React.SetStateAction<IUpdateState | null>) =>
      setUpdates((oldUpdates) => {
        const newUpdates = new Map(oldUpdates);
        const oldState = oldUpdates.get(modID) ?? DEFAULT_UPDATE_STATE;
        const newState = typeof arg === 'function' ? arg(oldState) : arg;
        if (newState == null) {
          newUpdates.delete(modID);
        } else {
          newUpdates.set(modID, newState);
        }
        return newUpdates;
      }),
    [modID, setUpdates],
  );
  return [updateState, setUpdateState];
}
