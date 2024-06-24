import { Drawer } from '@mui/material';
import ModSettings from './ModSettings';
import { useSelectedMod } from './ModsContext';

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
