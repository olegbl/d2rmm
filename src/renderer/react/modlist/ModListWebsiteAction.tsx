import type { Mod } from 'bridge/BridgeAPI';
import ShellAPI from 'renderer/ShellAPI';
import ModListItemChip from 'renderer/react/modlist/ModListItemChip';
import ModListMenuItem from 'renderer/react/modlist/ModListMenuItem';
import { useCallback } from 'react';
import { Link } from '@mui/icons-material';

function useOpenWebsite(mod: Mod): () => void {
  return useCallback((): void => {
    if (mod.info.website != null) {
      ShellAPI.openExternal(mod.info.website).catch(console.error);
    }
  }, [mod]);
}

type Props = {
  mod: Mod;
};

export function ModListWebsiteChip({ mod }: Props): JSX.Element | null {
  const onOpenWebsite = useOpenWebsite(mod);

  if (mod.info.website == null) {
    return null;
  }

  return (
    <ModListItemChip
      icon={<Link />}
      label="site"
      onClick={onOpenWebsite}
      tooltip="Visit Website"
    />
  );
}

export function ModListWebsiteMenuItem({ mod }: Props): JSX.Element | null {
  const onOpenWebsite = useOpenWebsite(mod);

  if (mod.info.website == null) {
    return null;
  }

  return (
    <ModListMenuItem
      icon={<Link />}
      label="Visit Website"
      onClick={onOpenWebsite}
    />
  );
}
