import { Drawer } from '@mui/material';
import { useSelectedMod } from 'renderer/react/context/ModsContext';
import ModSettings from 'renderer/react/settings/ModSettings';

export default function ModSettingsDrawer(
  _props: Record<string, never>,
): JSX.Element {
  const [selectedMod, setSelectedMod] = useSelectedMod();
  return (
    <Drawer
      anchor="right"
      onClose={() => setSelectedMod(null)}
      open={selectedMod != null}
    >
      {selectedMod == null ? null : (
        <ModSettings mod={selectedMod} onClose={() => setSelectedMod(null)} />
      )}
    </Drawer>
  );
}
