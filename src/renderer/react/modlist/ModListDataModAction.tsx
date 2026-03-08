import type { Mod } from 'bridge/BridgeAPI';
import ModListItemChip from 'renderer/react/modlist/ModListItemChip';
import { useTranslation } from 'react-i18next';
import { Warning } from '@mui/icons-material';

type Props = {
  mod: Mod;
};

export function ModListDataModChip({ mod }: Props): JSX.Element | null {
  const { t } = useTranslation();

  if (mod.info.type !== 'data') {
    return null;
  }

  return (
    <ModListItemChip
      color="warning"
      icon={<Warning />}
      label={t('modlist.chip.dataMod')}
      tooltip={t('modlist.chip.dataMod.tooltip')}
    />
  );
}
