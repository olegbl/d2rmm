import ElectronUtilsAPI from 'renderer/ElectronUtilsAPI';
import ModUpdaterAPI from 'renderer/ModUpdaterAPI';
import { useMods } from 'renderer/react/context/ModsContext';
import useToast from 'renderer/react/hooks/useToast';
import { useCallback, useRef, useState } from 'react';

export type ModDropZoneHandlers = {
  isDraggingOver: boolean;
  onDragEnter: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
};

export default function useModDropZone(): ModDropZoneHandlers {
  const showToast = useToast();
  const [, refreshMods] = useMods();
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  // useRef (not state) so depth is mutated synchronously without triggering renders
  const dragDepth = useRef(0);

  const onDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current += 1;
    if (dragDepth.current === 1) {
      setIsDraggingOver(true);
    }
  }, []);

  const onDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current === 0) {
      setIsDraggingOver(false);
    }
  }, []);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    // Must preventDefault to allow the drop event to fire
    event.preventDefault();
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      // Reset depth immediately so the overlay dismisses even if the browser
      // doesn't fire dragleave after a drop
      dragDepth.current = 0;
      setIsDraggingOver(false);

      type InstallableItem =
        | { kind: 'zip'; file: File }
        | { kind: 'folder'; file: File };

      const installable: InstallableItem[] = [];
      let ignoredCount = 0;

      Array.from(event.dataTransfer.files).forEach((file, index) => {
        const entry = event.dataTransfer.items[index]?.webkitGetAsEntry();
        if (entry?.isDirectory) {
          installable.push({ kind: 'folder', file });
        } else if (file.name.endsWith('.zip')) {
          installable.push({ kind: 'zip', file });
        } else {
          ignoredCount += 1;
        }
      });

      if (ignoredCount > 0) {
        showToast({
          severity: 'info',
          title: `${ignoredCount} file${ignoredCount > 1 ? 's' : ''} ignored`,
          description:
            'Only .zip files and mod folders can be installed by drag-and-drop.',
          duration: 4000,
        });
      }

      if (installable.length === 0) {
        return;
      }

      // Install sequentially to avoid race conditions when multiple items share a modID
      (async () => {
        for (const item of installable) {
          const itemPath = ElectronUtilsAPI.getPathForFile(item.file);
          const modID =
            item.kind === 'zip'
              ? item.file.name.replace(/\.zip$/i, '')
              : item.file.name;
          try {
            if (item.kind === 'zip') {
              await ModUpdaterAPI.installModFromZip(itemPath);
            } else {
              await ModUpdaterAPI.installModFromFolder(itemPath);
            }
            const mods = await refreshMods([modID]);
            const mod = mods.find((m) => m.id === modID);
            showToast({
              severity: 'success',
              title: `${mod?.info.name ?? modID} installed!`,
              duration: 5000,
            });
          } catch (error) {
            showToast({
              severity: 'error',
              title: `Failed to install ${modID}`,
              description:
                error instanceof Error ? error.message : String(error),
            });
          }
        }
      })().catch(console.error);
    },
    [showToast, refreshMods],
  );

  return { isDraggingOver, onDragEnter, onDragLeave, onDragOver, onDrop };
}
