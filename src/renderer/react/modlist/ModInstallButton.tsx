import { useIsInstalling } from 'renderer/react/context/InstallContext';
import { useIsInstallConfigChanged } from 'renderer/react/context/ModsContext';
import useInstallMods from 'renderer/react/modlist/hooks/useInstallMods';
import { useTranslation } from 'react-i18next';
import { SaveOutlined } from '@mui/icons-material';
import Save from '@mui/icons-material/Save';
import { LoadingButton } from '@mui/lab';
import { Tooltip } from '@mui/material';

type Props = {
  isUninstall?: boolean;
  tooltip?: string | null;
};

export default function ModInstallButton({
  isUninstall = false,
  tooltip,
}: Props): JSX.Element {
  const { t } = useTranslation();
  const isInstallConfigChanged = useIsInstallConfigChanged();
  const [isInstalling] = useIsInstalling();
  const onInstallMods = useInstallMods(isUninstall);

  const button = (
    <LoadingButton
      loading={isInstalling}
      loadingPosition="start"
      onClick={onInstallMods}
      startIcon={isInstallConfigChanged ? <Save /> : <SaveOutlined />}
      variant={isInstallConfigChanged ? 'contained' : 'outlined'}
    >
      {t(isUninstall ? 'install.button.uninstall' : 'install.button.install')}
    </LoadingButton>
  );

  if (tooltip != null) {
    return <Tooltip title={tooltip}>{button}</Tooltip>;
  }

  return button;
}
