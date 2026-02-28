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

      const allFiles = Array.from(event.dataTransfer.files);
      const zipFiles = allFiles.filter((f) => f.name.endsWith('.zip'));
      const nonZipCount = allFiles.length - zipFiles.length;

      if (nonZipCount > 0) {
        showToast({
          severity: 'info',
          title: `${nonZipCount} non-zip file${nonZipCount > 1 ? 's' : ''} ignored`,
          description: 'Only .zip files can be installed by drag-and-drop.',
          duration: 4000,
        });
      }

      if (zipFiles.length === 0) {
        return;
      }

      // Install sequentially to avoid race conditions when multiple zips share a modID
      (async () => {
        for (const file of zipFiles) {
          const zipFilePath = ElectronUtilsAPI.getPathForFile(file);
          const modID = file.name.replace(/\.zip$/i, '');
          try {
            await ModUpdaterAPI.installModFromZip(zipFilePath);
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
