// src/components/AutocompleteMui.tsx
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
   * Callback invoked when the user selects an item from the dropdown.
   * The entire object is returned for maximum flexibility.
   */
  onSelect: (selected: T | null) => void;
  /**
   * The label that appears on the text field (and as placeholder).
   */
  label?: string;
  /**
   * Whether to allow free text input not in the items list.
   * By default, we'll keep it false.
   */
  freeSolo?: boolean;
}

/**
 * A generic Material UI Autocomplete wrapper that returns the entire selected object.
 * This is more flexible than returning just (id, label).
 */
export function AutocompleteMui<T>(
  props: AutocompleteMuiProps<T>,
): JSX.Element {
  const {
    items,
    getOptionLabel,
    onSelect,
    label = "Select an item",
    freeSolo = false,
  } = props;

  return (
    <Autocomplete
      options={items}
      getOptionLabel={getOptionLabel}
      freeSolo={freeSolo}
      onChange={(_, newValue) => {
        // If user clears the field or picks an item, newValue can be T or null (or string if freeSolo)
        // We unify that by calling onSelect with either T or null.
        // If freeSolo is true, newValue could be a string.
        if (typeof newValue === "object" || newValue === null) {
          onSelect(newValue as T | null);
        } else {
          // newValue is string in freeSolo scenario
          onSelect(null);
        }
      }}
      // Render the text field input
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          size="small"
          variant="outlined"
          // You can add your sx here if needed
        />
      )}
      // If you want to filter by getOptionLabel automatically, you can rely on default filterOptions
      // or customize the filtering logic if needed.
    />
  );
}
