import { FormControl, FormLabel, TextField, Tooltip } from '@mui/material';
import { ChangeEvent, FocusEvent } from 'react';

interface InputFormProps {
  id: string;
  label: string;
  value: string;
  type?: 'text' | 'date' | 'time';
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  error?: string | boolean | null;
  fullWidth?: boolean;
}

const InputForm = ({
  id,
  label,
  value,
  type = 'text',
  onChange,
  onBlur,
  error,
  fullWidth = true,
}: InputFormProps) => {
  const isError = !!error;
  const errorTitle = error ? error : '';

  const textField = (
    <TextField
      id={id}
      size="small"
      value={value}
      type={type}
      onChange={onChange}
      onBlur={onBlur}
      error={isError}
    />
  );

  return (
    <FormControl fullWidth={fullWidth}>
      <FormLabel htmlFor={id}>{label}</FormLabel>
      {isError ? (
        <Tooltip title={errorTitle} open={isError} placement="top">
          {textField}
        </Tooltip>
      ) : (
        textField
      )}
    </FormControl>
  );
};

export default InputForm;
