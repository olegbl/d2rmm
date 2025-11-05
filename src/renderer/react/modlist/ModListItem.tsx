import type { Mod } from 'bridge/BridgeAPI';
import { DialogManagerContextProvider } from 'renderer/react/context/DialogContext';
import { useToggleMod } from 'renderer/react/context/ModsContext';
import { ModListAuthorChip } from 'renderer/react/modlist/ModListAuthorAction';
import { ModListDataModChip } from 'renderer/react/modlist/ModListDataModAction';
import { ModListDeleteMenuItem } from 'renderer/react/modlist/ModListDeleteAction';
import ModListMenu from 'renderer/react/modlist/ModListMenu';
import ModListNexusIDMenuItem from 'renderer/react/modlist/ModListNexusIDAction';
import { ModListOpenMenuItem } from 'renderer/react/modlist/ModListOpenAction';
import { ModListRenameMenuItem } from 'renderer/react/modlist/ModListRenameAction';
import {
  ModListSettingsChip,
  ModListSettingsMenuItem,
} from 'renderer/react/modlist/ModListSettingsAction';
import {
  ModListDownloadMenuItem,
  ModListUpdateMenuItem,
  ModListVersionChip,
} from 'renderer/react/modlist/ModListVersionAction';
import {
  ModListWebsiteChip,
  ModListWebsiteMenuItem,
} from 'renderer/react/modlist/ModListWebsiteAction';
import {
  MenuListMenuContextProvider,
  useModListMenuContext,
} from 'renderer/react/modlist/context/ModListMenuContext';
import { Draggable } from 'react-beautiful-dnd';
import DragIndicator from '@mui/icons-material/DragIndicator';
import Help from '@mui/icons-material/Help';
import {
  Box,
  Checkbox,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';

type Props = {
  index: number;
  isEnabled: boolean;
  isReorderEnabled: boolean;
  mod: Mod;
};

export default function ModListItem({
  index,
  isEnabled,
  isReorderEnabled,
  mod,
}: Props) {
  const item = (
    <ModListItemContent
      index={index}
      isEnabled={isEnabled}
      isReorderEnabled={isReorderEnabled}
      mod={mod}
    />
  );

  return (
    <MenuListMenuContextProvider>
      <DialogManagerContextProvider>
        {isReorderEnabled ? (
          <Draggable draggableId={mod.id} index={index}>
            {(providedDraggable) => (
              <div
                ref={providedDraggable.innerRef}
                {...providedDraggable.draggableProps}
                {...providedDraggable.dragHandleProps}
              >
                {item}
              </div>
            )}
          </Draggable>
        ) : (
          item
        )}
        <ModListMenu>
          <ModListSettingsMenuItem isEnabled={isEnabled} mod={mod} />
          <ModListWebsiteMenuItem mod={mod} />
          <ModListUpdateMenuItem mod={mod} />
          <ModListDownloadMenuItem mod={mod} />
          <ModListNexusIDMenuItem mod={mod} />
          <ModListRenameMenuItem mod={mod} />
          <ModListOpenMenuItem mod={mod} />
          <ModListDeleteMenuItem mod={mod} />
        </ModListMenu>
      </DialogManagerContextProvider>
    </MenuListMenuContextProvider>
  );
}

function ModListItemContent({ isEnabled, isReorderEnabled, mod }: Props) {
  const onToggleMod = useToggleMod();
  const { onOpenContextMenu } = useModListMenuContext();

  return (
    <ListItem disablePadding={true}>
      <ListItemButton
        onClick={() => onToggleMod(mod)}
        onContextMenu={onOpenContextMenu}
        sx={{ width: 'auto', flexGrow: 1, flexShrink: 1 }}
      >
        <ListItemIcon>
          <Checkbox
            checked={isEnabled}
            disableRipple={true}
            edge="start"
            tabIndex={-1}
          />
        </ListItemIcon>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', flexDirection: 'row' }}>
              <Typography>{mod.info.name}</Typography>
              {mod.info.description == null ? null : (
                <Tooltip title={mod.info.description}>
                  <Help color="disabled" sx={{ ml: 1 }} />
                </Tooltip>
              )}
              <Box sx={{ flex: 1 }} />
              <ModListWebsiteChip mod={mod} />
              <ModListAuthorChip mod={mod} />
              <ModListVersionChip mod={mod} />
              <ModListSettingsChip isEnabled={isEnabled} mod={mod} />
              <ModListDataModChip mod={mod} />
            </Box>
          }
        />
      </ListItemButton>
      {isReorderEnabled ? <DragIndicator color="disabled" /> : null}
    </ListItem>
  );
}
