import useModConfigOverrides from 'renderer/react/context/hooks/useModConfigOverrides';
import {
  IModConfigOverride,
  ISetModConfigOverride,
} from 'renderer/react/context/hooks/useModsContextConfigOverrides';
import { useCallback } from 'react';

export default function useModConfigOverride(
  id: string,
): [IModConfigOverride | null, ISetModConfigOverride] {
  const [modConfigOverrides, setModConfigOverrides] = useModConfigOverrides();

  const modConfigOverride = modConfigOverrides[id];

  const setModConfigOverride = useCallback(
    (arg: React.SetStateAction<IModConfigOverride>) => {
      setModConfigOverrides((oldOverrides) => ({
        ...oldOverrides,
        [id]: typeof arg === 'function' ? arg(oldOverrides[id]) : arg,
      }));
    },
    [id, setModConfigOverrides],
  );

  return [modConfigOverride, setModConfigOverride];
}
