import type { Mod } from 'bridge/BridgeAPI';
import ModListItemChip from 'renderer/react/modlist/ModListItemChip';
import { Warning } from '@mui/icons-material';

type Props = {
  mod: Mod;
};

export function ModListDataModChip({ mod }: Props): JSX.Element | null {
  if (mod.info.type !== 'data') {
    return null;
  }

  return (
    <ModListItemChip
      color="warning"
      icon={<Warning />}
      label="data mod"
      tooltip="This mod is a non-D2RMM data mod and may conflict with other mods or game updates."
    />
  );
}
