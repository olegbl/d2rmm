import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Divider,
  Typography,
  styled,
} from '@mui/material';
import { ModConfigFieldOrSection, ModConfigSection } from 'bridge/ModConfig';
import ModSettingsField from './ModSettingsField';

const StyledAccordion = styled(Accordion)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&:before': {
    display: 'none',
  },
}));

const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  backgroundColor: theme.palette.action.hover,
  '&:hover': {
    backgroundColor: theme.palette.action.focus,
  },
}));

const StyledAccordionDetails = styled(AccordionDetails)(({ theme }) => ({
  borderTop: `1px solid ${theme.palette.divider}`,
}));

type Props = {
  section: ModConfigSection;
  mod: Mod;
};

export default function ModSettingsSection({
  section,
  mod,
}: Props): JSX.Element | null {
  return (
    <StyledAccordion
      key={section.id ?? 'default'}
      defaultExpanded={section.defaultExpanded ?? true}
      disableGutters={true}
      square={true}
      elevation={0}
    >
      {section.name === '' ? null : (
        <StyledAccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="general-content"
          id="general-header"
        >
          <Typography>{section.name}</Typography>
        </StyledAccordionSummary>
      )}
      <StyledAccordionDetails
        id="general-content"
        sx={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {section.children?.reduce(
          (agg: JSX.Element[], field: ModConfigFieldOrSection) => {
            const addDivider =
              field.type === 'section' &&
              agg[agg.length - 1]?.type !== ModSettingsSection;
            return [
              ...agg,
              addDivider ? <Divider key={`divider:${field.id}`} /> : null,
              field.type === 'section' ? (
                <ModSettingsSection key={field.id} section={field} mod={mod} />
              ) : (
                <ModSettingsField key={field.id} field={field} mod={mod} />
              ),
            ].filter(Boolean) as JSX.Element[];
          },
          []
        )}
      </StyledAccordionDetails>
    </StyledAccordion>
  );
}
