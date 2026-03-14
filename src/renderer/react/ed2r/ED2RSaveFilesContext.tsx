import type { IItem, ID2S, IStash } from 'bridge/third-party/d2s/d2/types';
import React, { useMemo, useRef } from 'react';

const MAX_HISTORY = 50;

type BaseFile = Readonly<{
  fileName: string;
  edited: boolean;
  readTime: number;
  saveTime: null | number;
}>;

export type CharacterFile = BaseFile &
  Readonly<{
    type: 'character';
    character: ID2S;
  }>;

export type StashFile = BaseFile &
  Readonly<{
    type: 'stash';
    stash: IStash;
  }>;

export type SaveFile = CharacterFile | StashFile;

type SaveFiles = { [fileName: string]: SaveFile };
type ChangedSaveFiles = { [fileName: string]: SaveFile };

/**
 * A snapshot of one or more save files and/or the staging area at a point in
 * time. Used as a history entry — restoring it undoes all changes made since
 * the snapshot was taken, even across multiple files and staging simultaneously.
 */
export type HistoryEntry = {
  files?: { [fileName: string]: SaveFile };
  staging?: IItem[];
};

type History = { undo: HistoryEntry[]; redo: HistoryEntry[] };

export type ISaveFilesContext = {
  isLoaded: boolean;
  saveFiles: SaveFiles;
  setSaveFiles: React.Dispatch<React.SetStateAction<null | SaveFiles>>;
  /** Current contents of the staging area (session-only, not saved to disk). */
  stagingItems: IItem[];
  /**
   * Update the staging array without touching history.
   * Always pair with a preceding pushHistory call that captures staging state.
   */
  setStagingItemsSilent: (items: IItem[]) => void;
  /** Update a file and push the previous state onto the undo stack. */
  onChange: (file: SaveFile) => void;
  /**
   * Update a file without touching history.
   * Used by drag-start (history is pushed separately via pushHistory) and
   * drag-cancel (history is already popped via undoSilent).
   */
  onChangeSilent: (file: SaveFile) => void;
  /**
   * Push a new entry onto the undo stack and clear the redo stack.
   * The entry records the pre-change state of every file and/or the staging
   * array that will be modified as part of this logical operation.
   */
  pushHistory: (entry: HistoryEntry) => void;
  /**
   * Merge `patch` into the top undo entry, adding only keys that are not
   * already present (the earlier-captured state always wins).
   * Used by drag-end to add the destination file's pre-drop state to the
   * same entry created by drag-start.
   */
  extendHistory: (patch: HistoryEntry) => void;
  /**
   * Pop the top undo entry and restore all files in it, without pushing
   * anything onto the redo stack. Used by drag-cancel.
   */
  undoSilent: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCommit: (file: SaveFile) => void;
  onRevert: (file: SaveFile) => void;
  onReset: () => void;
};

const SaveFilesContext = React.createContext<ISaveFilesContext | null>(null);

function restoreEntry(
  entry: HistoryEntry,
  setChangedSaveFiles: React.Dispatch<React.SetStateAction<ChangedSaveFiles>>,
  setStagingItems: React.Dispatch<React.SetStateAction<IItem[]>>,
): void {
  if (entry.files != null) {
    const files = entry.files;
    setChangedSaveFiles((prev) => ({ ...prev, ...files }));
  }
  if (entry.staging != null) {
    setStagingItems(entry.staging);
  }
}

export function SaveFilesContextProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [baseSaveFiles, setBaseSaveFiles] = React.useState<null | SaveFiles>(
    null,
  );
  const [changedSaveFiles, setChangedSaveFiles] =
    React.useState<ChangedSaveFiles>({});
  const [history, setHistory] = React.useState<History>({
    undo: [],
    redo: [],
  });
  const [stagingItems, setStagingItems] = React.useState<IItem[]>([]);

  // Stable refs so history/mutation callbacks don't recreate on every render.
  const baseSaveFilesRef = useRef(baseSaveFiles);
  baseSaveFilesRef.current = baseSaveFiles;
  const changedSaveFilesRef = useRef(changedSaveFiles);
  changedSaveFilesRef.current = changedSaveFiles;
  const historyRef = useRef(history);
  historyRef.current = history;
  const stagingItemsRef = useRef(stagingItems);
  stagingItemsRef.current = stagingItems;

  const isLoaded = baseSaveFiles != null;

  const saveFiles: SaveFiles = React.useMemo(
    () => ({
      ...baseSaveFiles,
      ...changedSaveFiles,
    }),
    [baseSaveFiles, changedSaveFiles],
  );

  const canUndo = history.undo.length > 0;
  const canRedo = history.redo.length > 0;

  const setStagingItemsSilent = React.useCallback((items: IItem[]) => {
    setStagingItems(items);
  }, []);

  const onChange = React.useCallback((saveFile: SaveFile) => {
    const prev =
      changedSaveFilesRef.current[saveFile.fileName] ??
      baseSaveFilesRef.current?.[saveFile.fileName];
    if (prev != null) {
      setHistory((h) => ({
        undo: [...h.undo, { files: { [saveFile.fileName]: prev } }].slice(
          -MAX_HISTORY,
        ),
        redo: [],
      }));
    }
    setChangedSaveFiles((files) => ({
      ...files,
      [saveFile.fileName]: saveFile,
    }));
  }, []);

  const onChangeSilent = React.useCallback((saveFile: SaveFile) => {
    setChangedSaveFiles((files) => ({
      ...files,
      [saveFile.fileName]: saveFile,
    }));
  }, []);

  const pushHistory = React.useCallback((entry: HistoryEntry) => {
    setHistory((h) => ({
      undo: [...h.undo, entry].slice(-MAX_HISTORY),
      redo: [],
    }));
  }, []);

  const extendHistory = React.useCallback((patch: HistoryEntry) => {
    setHistory((h) => {
      if (h.undo.length === 0) return h;
      const top = h.undo[h.undo.length - 1];
      // For files: spread patch.files first, then top.files — top keys take
      // precedence so that the earliest-captured state is never overwritten.
      const newFiles =
        patch.files != null || top.files != null
          ? { ...patch.files, ...top.files }
          : undefined;
      // For staging: top wins (earliest captured state).
      const newStaging = top.staging ?? patch.staging;
      const newTop: HistoryEntry = {};
      if (newFiles != null) newTop.files = newFiles;
      if (newStaging != null) newTop.staging = newStaging;
      return {
        undo: [...h.undo.slice(0, -1), newTop],
        redo: [],
      };
    });
  }, []);

  const undoSilent = React.useCallback(() => {
    const h = historyRef.current;
    if (h.undo.length === 0) return;
    const entryToRestore = h.undo[h.undo.length - 1];
    setHistory({ undo: h.undo.slice(0, -1), redo: h.redo });
    restoreEntry(entryToRestore, setChangedSaveFiles, setStagingItems);
  }, []);

  const onUndo = React.useCallback(() => {
    const h = historyRef.current;
    if (h.undo.length === 0) return;
    const entryToRestore = h.undo[h.undo.length - 1];

    // Build a snapshot of current state for the redo stack.
    const currentSnapshot: HistoryEntry = {};
    if (entryToRestore.files != null) {
      const files: { [fileName: string]: SaveFile } = {};
      for (const fileName of Object.keys(entryToRestore.files)) {
        const current =
          changedSaveFilesRef.current[fileName] ??
          baseSaveFilesRef.current?.[fileName];
        if (current != null) {
          files[fileName] = current;
        }
      }
      currentSnapshot.files = files;
    }
    if (entryToRestore.staging != null) {
      currentSnapshot.staging = stagingItemsRef.current;
    }

    setHistory({
      undo: h.undo.slice(0, -1),
      redo: [...h.redo, currentSnapshot].slice(-MAX_HISTORY),
    });
    restoreEntry(entryToRestore, setChangedSaveFiles, setStagingItems);
  }, []);

  const onRedo = React.useCallback(() => {
    const h = historyRef.current;
    if (h.redo.length === 0) return;
    const entryToRestore = h.redo[h.redo.length - 1];

    // Build a snapshot of current state for the undo stack.
    const currentSnapshot: HistoryEntry = {};
    if (entryToRestore.files != null) {
      const files: { [fileName: string]: SaveFile } = {};
      for (const fileName of Object.keys(entryToRestore.files)) {
        const current =
          changedSaveFilesRef.current[fileName] ??
          baseSaveFilesRef.current?.[fileName];
        if (current != null) {
          files[fileName] = current;
        }
      }
      currentSnapshot.files = files;
    }
    if (entryToRestore.staging != null) {
      currentSnapshot.staging = stagingItemsRef.current;
    }

    setHistory({
      undo: [...h.undo, currentSnapshot].slice(-MAX_HISTORY),
      redo: h.redo.slice(0, -1),
    });
    restoreEntry(entryToRestore, setChangedSaveFiles, setStagingItems);
  }, []);

  // Commit: write to base state and clear all history (past a save point,
  // undoing would create a mismatch with what's on disk).
  const onCommit = React.useCallback((saveFile: SaveFile) => {
    setBaseSaveFiles((files) => ({
      ...files,
      [saveFile.fileName]: saveFile,
    }));
    setChangedSaveFiles(({ [saveFile.fileName]: _file, ...files }) => files);
    setHistory({ undo: [], redo: [] });
  }, []);

  // Revert: push current state so the revert itself is undoable, then discard
  // in-memory edits. The redo stack is cleared because revert is a new action.
  const onRevert = React.useCallback((saveFile: SaveFile) => {
    setHistory((h) => ({
      undo: [
        ...h.undo,
        {
          files: { [saveFile.fileName]: saveFile },
          staging: stagingItemsRef.current,
        },
      ].slice(-MAX_HISTORY),
      redo: [],
    }));
    setChangedSaveFiles(({ [saveFile.fileName]: _file, ...files }) => files);
  }, []);

  const onReset = React.useCallback(() => {
    setBaseSaveFiles(null);
    setChangedSaveFiles({});
    setStagingItems([]);
    setHistory({ undo: [], redo: [] });
  }, []);

  const context = useMemo(
    () => ({
      isLoaded,
      saveFiles,
      setSaveFiles: setBaseSaveFiles,
      stagingItems,
      setStagingItemsSilent,
      onChange,
      onChangeSilent,
      pushHistory,
      extendHistory,
      undoSilent,
      canUndo,
      canRedo,
      onUndo,
      onRedo,
      onCommit,
      onRevert,
      onReset,
    }),
    [
      isLoaded,
      saveFiles,
      setBaseSaveFiles,
      stagingItems,
      setStagingItemsSilent,
      onChange,
      onChangeSilent,
      pushHistory,
      extendHistory,
      undoSilent,
      canUndo,
      canRedo,
      onUndo,
      onRedo,
      onCommit,
      onRevert,
      onReset,
    ],
  );

  return (
    <SaveFilesContext.Provider value={context}>
      {children}
    </SaveFilesContext.Provider>
  );
}

export function useSaveFiles(): ISaveFilesContext {
  const context = React.useContext(SaveFilesContext);
  if (context == null) {
    throw new Error(
      'useSaveFilesState used outside of a SaveFilesContextProvider',
    );
  }
  return context;
}
