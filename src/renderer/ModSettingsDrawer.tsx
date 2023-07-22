import { Drawer } from '@mui/material';
import { useSelectedMod } from './ModsContext';
import ModSettings from './ModSettings';

export default function ModSettingsDrawer(
  _props: Record<string, never>
): JSX.Element {
  const [selectedMod, setSelectedMod] = useSelectedMod();
  return (
    <Drawer
      anchor="right"
      open={selectedMod != null}
      onClose={() => setSelectedMod(null)}
    >
      {selectedMod == null ? null : (
        <ModSettings mod={selectedMod} onClose={() => setSelectedMod(null)} />
      )}
    </Drawer>
  );
}
