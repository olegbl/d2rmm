import { useContext } from 'react';
import {
  Context,
  ISetUpdates,
  IUpdates,
} from 'renderer/react/context/UpdatesContext';

export default function useModUpdates(): [IUpdates, ISetUpdates] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('No updates context available.');
  }
  return [context.updates, context.setUpdates];
}
