import type { Mod } from 'bridge/BridgeAPI';
import { useSelectedMod } from 'renderer/react/context/ModsContext';
import ModListItemChip from 'renderer/react/modlist/ModListItemChip';
import ModListMenuItem from 'renderer/react/modlist/ModListMenuItem';
import { useCallback } from 'react';
import { Settings } from '@mui/icons-material';

function useConfigureMod(mod: Mod): () => void {
  const [, setSelectedMod] = useSelectedMod();

  return useCallback((): void => {
    setSelectedMod(mod);
  }, [mod, setSelectedMod]);
}

type Props = {
  mod: Mod;
  isEnabled: boolean;
};

export function ModListSettingsChip({
  mod,
  isEnabled,
}: Props): JSX.Element | null {
  const onConfigureMod = useConfigureMod(mod);

  if (mod.info.config == null) {
    return null;
  }

  return (
    <ModListItemChip
      color={isEnabled ? 'primary' : undefined}
      icon={<Settings />}
      label="settings"
      onClick={onConfigureMod}
      tooltip="Configure Mod Settings"
    />
  );
}

export function ModListSettingsMenuItem({ mod }: Props): JSX.Element | null {
  const onConfigureMod = useConfigureMod(mod);

  if (mod.info.config == null) {
    return null;
  }

  return (
    <ModListMenuItem
      icon={<Settings />}
      label="Open Settings"
      onClick={onConfigureMod}
    />
  );
}
