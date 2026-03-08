import type { Mod } from 'bridge/BridgeAPI';
import { getAppPath } from 'renderer/AppInfoAPI';
import ShellAPI from 'renderer/ShellAPI';
import useAsyncCallback from 'renderer/react/hooks/useAsyncCallback';
import ModListMenuItem from 'renderer/react/modlist/ModListMenuItem';
import resolvePath from 'renderer/utils/resolvePath';
import { useTranslation } from 'react-i18next';
import { Folder } from '@mui/icons-material';

export function ModListOpenMenuItem({ mod }: { mod: Mod }) {
  const { t } = useTranslation();
  const appPath = getAppPath();
  const modPath = resolvePath(appPath, 'mods', mod.id);

  const onOpen = useAsyncCallback(async () => {
    await ShellAPI.showItemInFolder(
      mod.info.type === 'data'
        ? resolvePath(modPath, 'data')
        : resolvePath(modPath, 'mod.json'),
    );
  }, [mod.id]);

  return (
    <ModListMenuItem
      icon={<Folder />}
      label={t('modlist.action.open')}
      onClick={onOpen}
    />
  );
}
