import { useTranslation } from 'react-i18next';
import useAsyncCallback from 'renderer/react/hooks/useAsyncCallback';
import resolvePath from 'renderer/utils/resolvePath';
import { getAppPath } from 'renderer/AppInfoAPI';
import { FolderOpen } from '@mui/icons-material';
import { MenuItem } from '@mui/material';
import ShellAPI from 'renderer/ShellAPI';

export default function OpenModsDirectoryMenuItem({ onHideMenu }: {
  onHideMenu: () => void;
}): JSX.Element | null {
  const { t } = useTranslation();
  const modsPath = resolvePath(getAppPath(), 'mods', '');

  const onOpenModsDirectory = useAsyncCallback(async () => {
    onHideMenu();

    ShellAPI.openExternal(modsPath).catch(console.error);
  }, [onHideMenu, t]);

  return (
    <MenuItem disableRipple={true} onClick={onOpenModsDirectory}>
      <FolderOpen sx={{ marginRight: 1 }} />
      {t('modlist.menu.openModsDirectory')}
    </MenuItem>
  );
}
