import { Context } from 'renderer/react/context/ModsContext';
import {
  IModConfigOverrides,
  ISetModConfigOverrides,
} from 'renderer/react/context/hooks/useModsContextConfigOverrides';
import { useContext } from 'react';

export default function useModConfigOverrides(): [
  IModConfigOverrides,
  ISetModConfigOverrides,
] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('No preferences context available.');
  }
  return [context.modConfigOverrides, context.setModConfigOverrides];
}
