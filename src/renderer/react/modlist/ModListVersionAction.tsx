import type { Mod } from 'bridge/BridgeAPI';
import type { ModUpdaterDownload } from 'bridge/ModUpdaterAPI';
import ShellAPI from 'renderer/ShellAPI';
import useAsyncCallback from 'renderer/react/hooks/useAsyncCallback';
import ModListItemChip from 'renderer/react/modlist/ModListItemChip';
import ModListMenuItem from 'renderer/react/modlist/ModListMenuItem';
import useModUpdater from 'renderer/react/modlist/hooks/useModUpdater';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Update } from '@mui/icons-material';

function useOpenWebsite(mod: Mod): () => void {
  return useCallback((): void => {
    if (mod.info.website != null) {
      ShellAPI.openExternal(mod.info.website).catch(console.error);
    }
  }, [mod]);
}

function useDownloadLatestUpdate(
  latestUpdate: ModUpdaterDownload | null,
  onDownloadVersion: (download: ModUpdaterDownload) => Promise<void>,
): () => void {
  return useAsyncCallback(async () => {
    if (latestUpdate != null) {
      await onDownloadVersion(latestUpdate);
    }
  }, [latestUpdate, onDownloadVersion]);
}

type Props = {
  mod: Mod;
};

export function ModListVersionChip({ mod }: Props): JSX.Element | null {
  const { t } = useTranslation();
  const {
    isUpdatePossible,
    isDownloadPossible,
    isUpdateChecked,
    isUpdateAvailable,
    latestUpdate,
    onCheckForUpdates,
    onDownloadVersion,
  } = useModUpdater(mod);

  const onDownloadLatestUpdate = useDownloadLatestUpdate(
    latestUpdate,
    onDownloadVersion,
  );
  const onOpenWebsite = useOpenWebsite(mod);

  if (mod.info.version == null) {
    return null;
  }

  const label = `v${mod.info.version}`;

  return (
    <ModListItemChip
      color={
        isUpdateAvailable ? 'warning' : isUpdateChecked ? 'success' : undefined
      }
      icon={<Update />}
      label={label}
      onClick={
        !isUpdatePossible
          ? undefined
          : isUpdateAvailable
            ? !isDownloadPossible
              ? onOpenWebsite
              : onDownloadLatestUpdate
            : onCheckForUpdates
      }
      tooltip={
        !isUpdatePossible
          ? undefined
          : isUpdateAvailable
            ? !isDownloadPossible
              ? t('modlist.action.version.updateAvailable')
              : t('modlist.action.version.downloadWithVersion', {
                  version: latestUpdate?.version,
                })
            : isUpdateChecked
              ? t('modlist.action.version.recheck')
              : t('modlist.action.version.check')
      }
    />
  );
}

export function ModListUpdateMenuItem({ mod }: Props): JSX.Element | null {
  const { t } = useTranslation();
  const { isUpdatePossible, isUpdateChecked, onCheckForUpdates } =
    useModUpdater(mod);

  if (mod.info.website == null || !isUpdatePossible) {
    return null;
  }

  return (
    <ModListMenuItem
      icon={<Update />}
      label={
        isUpdateChecked
          ? t('modlist.action.version.recheck')
          : t('modlist.action.version.check')
      }
      onClick={onCheckForUpdates}
    />
  );
}

export function ModListDownloadMenuItem({ mod }: Props): JSX.Element | null {
  const { t } = useTranslation();
  const { downloads, isDownloadPossible, onDownloadVersion } =
    useModUpdater(mod);

  if (downloads.length === 0 || !isDownloadPossible) {
    return null;
  }

  return (
    <ModListMenuItem icon={<Download />} label={t('modlist.action.download')}>
      {downloads.map((download) => (
        <ModListMenuItem
          key={download.version}
          icon={<Download />}
          label={t('modlist.action.version.download', {
            version: download.version,
          })}
          onClick={async () => {
            await onDownloadVersion(download);
          }}
        />
      ))}
    </ModListMenuItem>
  );
}
