import { useContext } from 'react';
import { Context } from '../ModsContext';
import {
  IModConfigOverrides,
  ISetModConfigOverrides,
} from './useModsContextConfigOverrides';

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
