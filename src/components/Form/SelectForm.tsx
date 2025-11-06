import { FormControl, FormLabel, MenuItem, Select } from '@mui/material';

interface SeleceOption {
  value: string | number;
  label: string;
  ariaLabel?: string;
}

interface SelectFormProps {
  id: string;
  label: string;
  labelId: string;
  value: string | number;
  onChange: (value: string | number) => void;
  options: SeleceOption[];
  ariaLabel: string;
  fullWidth?: boolean;
}

const SelectForm = ({
  id,
  label,
  labelId,
  value,
  onChange,
  options,
  ariaLabel,
  fullWidth = true,
}: SelectFormProps) => {
  return (
    <FormControl fullWidth={fullWidth}>
      <FormLabel id={labelId}>{label}</FormLabel>
      <Select
        id={id}
        size="small"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-labelledby={labelId}
        aria-label={ariaLabel}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value} aria-label={option.ariaLabel}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default SelectForm;
