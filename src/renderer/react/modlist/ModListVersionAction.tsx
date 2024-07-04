import type { Mod } from 'bridge/BridgeAPI';
import type { ModUpdaterDownload } from 'bridge/ModUpdaterAPI';
import type { IShellAPI } from 'bridge/ShellAPI';
import { consumeAPI } from 'renderer/IPC';
import ModListItemChip from 'renderer/react/modlist/ModListItemChip';
import ModListMenuItem from 'renderer/react/modlist/ModListMenuItem';
import useModUpdater from 'renderer/react/modlist/hooks/useModUpdater';
import { useCallback } from 'react';
import { Download, Update } from '@mui/icons-material';

const ShellAPI = consumeAPI<IShellAPI>('ShellAPI');

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
  return useCallback(async () => {
    if (latestUpdate != null) {
      await onDownloadVersion(latestUpdate);
    }
  }, [latestUpdate, onDownloadVersion]);
}

type Props = {
  mod: Mod;
};

export function ModListVersionChip({ mod }: Props): JSX.Element | null {
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
              ? 'Update is Available'
              : `Download Version ${latestUpdate?.version}`
            : isUpdateChecked
              ? 'Recheck for Updates'
              : 'Check for Updates'
      }
    />
  );
}

export function ModListUpdateMenuItem({ mod }: Props): JSX.Element | null {
  const { isUpdatePossible, isUpdateChecked, onCheckForUpdates } =
    useModUpdater(mod);

  if (mod.info.website == null || !isUpdatePossible) {
    return null;
  }

  return (
    <ModListMenuItem
      icon={<Update />}
      label={isUpdateChecked ? 'Recheck for Updates' : 'Check for Updates'}
      onClick={onCheckForUpdates}
    />
  );
}

export function ModListDownloadMenuItem({ mod }: Props): JSX.Element | null {
  const { downloads, isDownloadPossible, onDownloadVersion } =
    useModUpdater(mod);

  if (downloads.length === 0 || !isDownloadPossible) {
    return null;
  }

  return (
    <ModListMenuItem icon={<Download />} label="Download">
      {downloads.map((download) => (
        <ModListMenuItem
          key={download.version}
          icon={<Download />}
          label={`Version ${download.version}`}
          onClick={async () => {
            await onDownloadVersion(download);
          }}
        />
      ))}
    </ModListMenuItem>
  );
}
