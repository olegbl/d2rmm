import type { Mod } from 'bridge/BridgeAPI';
import ModListItemChip from 'renderer/react/modlist/ModListItemChip';
import { Face } from '@mui/icons-material';

type Props = {
  mod: Mod;
};

export function ModListAuthorChip({ mod }: Props): JSX.Element | null {
  if (mod.info.author == null) {
    return null;
  }

  return <ModListItemChip icon={<Face />} label={mod.info.author} />;
}
