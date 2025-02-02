import { KeyboardEvent } from "react";
import { Chip, Box, FormControl, FormHelperText } from "@mui/material";
import { AutocompleteMui, AutocompleteMuiProps } from "./Autocomplete";

interface AutocompleteMuiMultipleProps<T>
  extends Omit<AutocompleteMuiProps<T>, "onSelect"> {
  value: T[]; // Multiple selected items
  newValues: string[]; // Newly created tags (strings)
  onChange: (selected: T[]) => void; // Function to handle changes to the selected items
  onNewValuesChange: (newValues: string[]) => void; // Function to handle changes to the new tags (strings)
}

export function AutocompleteMuiMultiple<T>(
  props: AutocompleteMuiMultipleProps<T>,
): JSX.Element {
  const {
    value,
    newValues,
    onChange,
    onNewValuesChange,
    items,
    getOptionLabel,
    label,
    allowNewValue,
    textFieldProps,
    onInputChange, // Expose onInputChange to be passed down
  } = props;

  // Handle adding new items (tags selected from the list or typed tags)
  const handleAddItem = (newValue: T | string | null) => {
    if (!newValue) return;

    if (typeof newValue === "object" && !value.includes(newValue)) {
      onChange([...value, newValue]); // Add selected tag (object)
    } else if (typeof newValue === "string" && !newValues.includes(newValue)) {
      onNewValuesChange([...newValues, newValue]); // Add new tag (string)
    }
  };

  // Handle removing items
  const handleRemoveItem = (item: T | string) => {
    if (typeof item === "object") {
      const updatedValues = value.filter((v) => v !== item);
      onChange(updatedValues);
    } else {
      const updatedNewValues = newValues.filter((v) => v !== item);
      onNewValuesChange(updatedNewValues);
    }
  };

  // Handle keypress to prevent form submission on Enter key when the input is focused
  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent form submission on Enter key
    }
  };

  return (
    <FormControl fullWidth size="small">
      <AutocompleteMui
        items={items}
        getOptionLabel={getOptionLabel}
        label={label}
        allowNewValue={allowNewValue}
        onSelect={handleAddItem} // Handle adding items
        onInputChange={onInputChange} // Expose onInputChange
        textFieldProps={{
          ...textFieldProps,
          onKeyPress: handleKeyPress, // Capture Enter key press
        }}
      />
      <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
        {/* Display selected tags */}
        {value.map((item, index) => (
          <Chip
            key={index}
            label={getOptionLabel(item)}
            onDelete={() => handleRemoveItem(item)} // Allow removal of selected tags
            color="primary"
          />
        ))}
        {/* Display new tags */}
        {newValues.map((item, index) => (
          <Chip
            key={index}
            label={item}
            onDelete={() => handleRemoveItem(item)} // Allow removal of new tags
            color="secondary"
          />
        ))}
      </Box>
      {value.length === 0 && (
        <FormHelperText>
          Select multiple items or create new ones
        </FormHelperText>
      )}
    </FormControl>
  );
}
