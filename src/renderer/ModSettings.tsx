import { Close } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Divider,
  FormGroup,
  IconButton,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ModSettingsField from './ModSettingsField';

type FieldElement = { field: ModConfigField; element: JSX.Element };
type SectionElement = {
  field: ModConfigFieldSection | null;
  elements: FieldElement[];
};

type Props = {
  mod: Mod;
  onClose: () => unknown;
};

export default function ModSettings({
  mod,
  onClose,
}: Props): JSX.Element | null {
  // this should never happen as there should be no settings
  // button available on mods without a config
  if (mod.info.config == null) {
    return null;
  }

  return (
    <FormGroup sx={{ minWidth: 360 }}>
      <Box
        sx={{
          paddingLeft: 2,
          paddingRight: 2,
          paddingTop: 1,
          paddingBottom: 1,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6" color="text.secondary">
          {mod.info.name}
        </Typography>
        <Box sx={{ flexGrow: 1, flexShrink: 1 }} />
        <IconButton color="default" onClick={onClose}>
          <Close />
        </IconButton>
      </Box>
      <Divider />
      {mod.info.config
        .reduce(
          (agg: SectionElement[], field: ModConfigFieldOrSection) => {
            if (field.type === 'section') {
              const sectionElement: SectionElement = {
                field,
                elements: [],
              };
              return [...agg, sectionElement];
            }
            const fieldElement: FieldElement = {
              field,
              element: (
                <ModSettingsField key={field.id} field={field} mod={mod} />
              ),
            };
            const section: SectionElement = agg[
              agg.length - 1
            ] as SectionElement;
            return [
              ...agg.slice(0, -1),
              {
                ...section,
                elements: [...section.elements, fieldElement],
              },
            ];
          },
          [{ field: null, elements: [] }]
        )
        .filter((section) => section.elements.length > 0)
        .map((section) => {
          return (
            <Accordion
              key={section.field?.id ?? 'default'}
              defaultExpanded={section.field?.defaultExpanded ?? true}
              disableGutters={true}
              square={true}
            >
              {section.field == null ? null : (
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="general-content"
                  id="general-header"
                >
                  <Typography>{section.field.name}</Typography>
                </AccordionSummary>
              )}
              <AccordionDetails
                id="general-content"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {section.elements.map((element) => element.element)}
              </AccordionDetails>
            </Accordion>
          );
        })}
    </FormGroup>
  );
}
