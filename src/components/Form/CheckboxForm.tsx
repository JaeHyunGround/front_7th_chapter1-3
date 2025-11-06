import { Checkbox, FormControl, FormControlLabel } from '@mui/material';

interface CheckboxFormProps {
  label: string;
  checkedValue: boolean;
  onChange: (value: boolean) => void;
  fullWidth?: boolean;
}

const CheckboxForm = ({ label, checkedValue, onChange, fullWidth = true }: CheckboxFormProps) => {
  return (
    <FormControl fullWidth={fullWidth}>
      <FormControlLabel
        control={
          <Checkbox
            checked={checkedValue}
            onChange={(e) => {
              onChange(e.target.checked);
            }}
          />
        }
        label={label}
      />
    </FormControl>
  );
};

export default CheckboxForm;
