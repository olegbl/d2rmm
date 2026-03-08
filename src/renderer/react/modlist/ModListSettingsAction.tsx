import type { Mod } from 'bridge/BridgeAPI';
import { useSelectedMod } from 'renderer/react/context/ModsContext';
import ModListItemChip from 'renderer/react/modlist/ModListItemChip';
import ModListMenuItem from 'renderer/react/modlist/ModListMenuItem';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const onConfigureMod = useConfigureMod(mod);

  if (mod.info.config == null) {
    return null;
  }

  return (
    <ModListItemChip
      color={isEnabled ? 'primary' : undefined}
      icon={<Settings />}
      label={t('modlist.chip.settings')}
      onClick={onConfigureMod}
      tooltip={t('modlist.chip.settings.tooltip')}
    />
  );
}

export function ModListSettingsMenuItem({ mod }: Props): JSX.Element | null {
  const { t } = useTranslation();
  const onConfigureMod = useConfigureMod(mod);

  if (mod.info.config == null) {
    return null;
  }

  return (
    <ModListMenuItem
      icon={<Settings />}
      label={t('modlist.action.settings')}
      onClick={onConfigureMod}
    />
  );
}
