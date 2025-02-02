import { Autocomplete, TextField, TextFieldProps } from "@mui/material";

interface AutocompleteMuiProps<T> {
  items: T[];
  getOptionLabel: (option: T | string) => string;
  onSelect: (selected: T | string | null) => void;
  onInputChange?: (value: string) => void;
  label?: string;
  allowNewValue?: boolean;

  /**
   * Optional additional props for the TextField,
   * e.g. error, helperText, etc.
   */
  textFieldProps?: Partial<TextFieldProps>;
}

export function AutocompleteMui<T>(
  props: AutocompleteMuiProps<T>,
): JSX.Element {
  const {
    items,
    getOptionLabel,
    onSelect,
    onInputChange,
    label = "Select an item",
    allowNewValue = false,
    textFieldProps = {},
  } = props;

  return (
    <Autocomplete
      options={items}
      getOptionLabel={(option) => getOptionLabel(option)}
      freeSolo={allowNewValue}
      onChange={(_, newValue) => {
        if (!newValue) {
          onSelect(null);
        } else if (typeof newValue === "object") {
          onSelect(newValue as T);
        } else {
          // string
          if (allowNewValue) {
            onSelect(newValue);
          } else {
            // user typed a custom value but allowNewValue = false
            onSelect(null);
          }
        }
      }}
      onInputChange={(_event, newInputValue) => {
        onInputChange?.(newInputValue);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          {...textFieldProps}
          label={label}
          size="small"
          variant="outlined"
          fullWidth
        />
      )}
    />
  );
}
