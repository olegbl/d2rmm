import type { NexusModsApiStateEvent } from 'bridge/NexusModsAPI';
import { useEventAPIListener } from 'renderer/EventAPI';
import { useState } from 'react';

export default function useNexusModsApiStateListener(): NexusModsApiStateEvent | null {
  const [apiState, setApiState] = useState<NexusModsApiStateEvent | null>(null);
  useEventAPIListener('nexus-mods-api-status', setApiState);
  return apiState;
}
