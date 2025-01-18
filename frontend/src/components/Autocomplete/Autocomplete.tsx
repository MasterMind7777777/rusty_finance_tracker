import { Autocomplete, TextField } from "@mui/material";

/**
 * T represents the shape of your data items (e.g., Category, Product, etc.)
 */
interface AutocompleteMuiProps<T> {
  /**
   * The data array to display in the dropdown.
   */
  items: T[];
  /**
   * Function to retrieve the label (string) from an item
   * for display in the dropdown.
   */
  getOptionLabel: (option: T | string) => string;
  /**
   * Callback invoked when the user selects an item from the dropdown
   * or types in a new value (if allowNewValue=true).
   */
  onSelect: (selected: T | string | null) => void;
  /**
   * Optional callback invoked whenever the text field value changes.
   * Receives the raw input string typed by the user.
   */
  onInputChange?: (value: string) => void;
  /**
   * The label that appears on the text field (and as placeholder).
   */
  label?: string;
  /**
   * Whether to allow a new, free-typed value that's not in the items list.
   * If set to true, the autocomplete will pass that string to onSelect.
   */
  allowNewValue?: boolean;
}

/**
 * A generic Material UI Autocomplete wrapper that returns the entire selected object,
 * or a newly typed string if `allowNewValue` is enabled.
 */
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
  } = props;

  return (
    <Autocomplete
      options={items}
      getOptionLabel={(option) => getOptionLabel(option)}
      freeSolo={allowNewValue}
      // Called whenever the selected item changes (including new typed string).
      onChange={(_, newValue) => {
        // newValue can be:
        //   - T (an existing item from 'items'),
        //   - string (if allowNewValue=true and user typed something new),
        //   - null (if cleared)
        if (newValue === null) {
          onSelect(null);
        } else if (typeof newValue === "object") {
          // It's an existing item of type T
          onSelect(newValue as T);
        } else {
          // newValue is a string
          if (allowNewValue) {
            onSelect(newValue);
          } else {
            onSelect(null);
          }
        }
      }}
      // Called on every keystroke input change
      onInputChange={(_event, inputValue) => {
        if (onInputChange) {
          onInputChange(inputValue);
        }
      }}
      renderInput={(params) => (
        <TextField {...params} label={label} size="small" variant="outlined" />
      )}
    />
  );
}
