import type { ID2S, IStash } from 'bridge/third-party/d2s/d2/types';
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
 * A snapshot of one or more save files at a point in time.
 * Used as a history entry — restoring it undoes all changes made since
 * the snapshot was taken, even across multiple files simultaneously.
 */
export type HistoryEntry = { [fileName: string]: SaveFile };

type History = { undo: HistoryEntry[]; redo: HistoryEntry[] };

export type ISaveFilesContext = {
  isLoaded: boolean;
  saveFiles: SaveFiles;
  setSaveFiles: React.Dispatch<React.SetStateAction<null | SaveFiles>>;
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
   * The entry records the pre-change state of every file that will be
   * modified as part of this logical operation.
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

  // Stable refs so history/mutation callbacks don't recreate on every render.
  const baseSaveFilesRef = useRef(baseSaveFiles);
  baseSaveFilesRef.current = baseSaveFiles;
  const changedSaveFilesRef = useRef(changedSaveFiles);
  changedSaveFilesRef.current = changedSaveFiles;
  const historyRef = useRef(history);
  historyRef.current = history;

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

  const onChange = React.useCallback((saveFile: SaveFile) => {
    const prev =
      changedSaveFilesRef.current[saveFile.fileName] ??
      baseSaveFilesRef.current?.[saveFile.fileName];
    if (prev != null) {
      setHistory((h) => ({
        undo: [...h.undo, { [saveFile.fileName]: prev }].slice(-MAX_HISTORY),
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
      // Spread patch first, then top — top keys take precedence so that the
      // earliest-captured state (from drag-start) is never overwritten.
      const newTop = { ...patch, ...top };
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
    setChangedSaveFiles((files) => ({ ...files, ...entryToRestore }));
  }, []);

  const onUndo = React.useCallback(() => {
    const h = historyRef.current;
    if (h.undo.length === 0) return;
    const entryToRestore = h.undo[h.undo.length - 1];
    const currentSnapshot: HistoryEntry = {};
    for (const fileName of Object.keys(entryToRestore)) {
      const current =
        changedSaveFilesRef.current[fileName] ??
        baseSaveFilesRef.current?.[fileName];
      if (current != null) {
        currentSnapshot[fileName] = current;
      }
    }
    setHistory({
      undo: h.undo.slice(0, -1),
      redo: [...h.redo, currentSnapshot].slice(-MAX_HISTORY),
    });
    setChangedSaveFiles((files) => ({ ...files, ...entryToRestore }));
  }, []);

  const onRedo = React.useCallback(() => {
    const h = historyRef.current;
    if (h.redo.length === 0) return;
    const entryToRestore = h.redo[h.redo.length - 1];
    const currentSnapshot: HistoryEntry = {};
    for (const fileName of Object.keys(entryToRestore)) {
      const current =
        changedSaveFilesRef.current[fileName] ??
        baseSaveFilesRef.current?.[fileName];
      if (current != null) {
        currentSnapshot[fileName] = current;
      }
    }
    setHistory({
      undo: [...h.undo, currentSnapshot].slice(-MAX_HISTORY),
      redo: h.redo.slice(0, -1),
    });
    setChangedSaveFiles((files) => ({ ...files, ...entryToRestore }));
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

  // Revert: discard in-memory edits and clear all history.
  const onRevert = React.useCallback((saveFile: SaveFile) => {
    setChangedSaveFiles(({ [saveFile.fileName]: _file, ...files }) => files);
    setHistory({ undo: [], redo: [] });
  }, []);

  const onReset = React.useCallback(() => {
    setBaseSaveFiles(null);
    setChangedSaveFiles({});
    setHistory({ undo: [], redo: [] });
  }, []);

  const context = useMemo(
    () => ({
      isLoaded,
      saveFiles,
      setSaveFiles: setBaseSaveFiles,
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
