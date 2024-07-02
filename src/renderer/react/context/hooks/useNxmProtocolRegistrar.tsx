import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import NxmProtocolAPI from 'renderer/NxmProtocolAPI';
import useSavedState from 'renderer/react/hooks/useSavedState';

export default function useNxmProtocolRegistrar(): [
  dialog: JSX.Element,
  isRegistered: boolean,
  register: () => void,
  unregister: () => void,
] {
  const [isRejected, setIsRejected] = useSavedState(
    'nxm-selection-rejected',
    false,
    (map) => JSON.stringify(map),
    (str) => JSON.parse(str),
  );

  const [isRegistered, setIsRegistered] = useState(false);

  const [isShown, setIsShown] = useState(false);

  const onShow = useCallback(() => {
    setIsShown(true);
  }, []);

  const onHide = useCallback(() => {
    setIsShown(false);
  }, []);

  const isInitialCheckDone = useRef(false);
  useEffect(() => {
    if (isInitialCheckDone.current) {
      return;
    }
    isInitialCheckDone.current = true;
    (async () => {
      const isRegisteredNew = await NxmProtocolAPI.getIsRegistered();
      setIsRegistered(isRegisteredNew);
      if (!isRejected && !isRegisteredNew) {
        onShow();
      }
    })()
      .then()
      .catch(console.error);
  }, [isRejected, onShow]);

  const onRegister = useCallback(async () => {
    setIsRejected(false);
    const success = await NxmProtocolAPI.register();
    setIsRegistered(success);
    if (!success) {
      console.error('Failed to register as nxm:// protocol handler.');
    }
  }, [setIsRejected]);

  const onUnregister = useCallback(async () => {
    setIsRejected(false);
    const success = await NxmProtocolAPI.unregister();
    setIsRegistered(!success);
    if (!success) {
      console.error('Failed to unregister as nxm:// protocol handler.');
    }
  }, [setIsRejected]);

  const onAgree = useCallback(async () => {
    setIsRejected(false);
    onHide();
    await onRegister();
  }, [onHide, onRegister, setIsRejected]);

  const onDisagree = useCallback(() => {
    setIsRejected(true);
    onHide();
  }, [onHide, setIsRejected]);

  return [
    <Dialog onClose={onHide} open={isShown}>
      <DialogTitle>Nexus Mods Handler</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Would you like to set D2RMM as the default handler for nxm:// links?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onDisagree}>Disagree</Button>
        <Button autoFocus={true} onClick={onAgree}>
          Agree
        </Button>
      </DialogActions>
    </Dialog>,
    isRegistered,
    onRegister,
    onUnregister,
  ];
}
