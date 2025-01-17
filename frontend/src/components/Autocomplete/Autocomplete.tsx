import { useState, ChangeEvent, useCallback } from "react";
import "./Autocomplete.css";

type AutocompleteProps<T> = {
  items: T[];
  getLabel: (item: T) => string;
  getId: (item: T) => number;
  onSelect: (id: number, label: string) => void;
  placeholder?: string;
};

export function Autocomplete<T>(props: AutocompleteProps<T>) {
  const { items, getLabel, getId, onSelect, placeholder } = props;
  const [inputText, setInputText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const lowerText = inputText.toLowerCase();
  const filteredItems = items.filter((item) =>
    getLabel(item).toLowerCase().includes(lowerText),
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelect = useCallback(
    (item: T) => {
      const label = getLabel(item);
      const id = getId(item);
      setInputText(label);
      setShowSuggestions(false);
      onSelect(id, label);
    },
    [onSelect, getId, getLabel],
  );

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={inputText}
        placeholder={placeholder}
        onChange={handleChange}
      />
      {showSuggestions && filteredItems.length > 0 && (
        <ul className="autocomplete-suggestions">
          {filteredItems.map((item, index) => (
            <li
              key={index}
              className="autocomplete-item"
              onClick={() => handleSelect(item)}
            >
              {getLabel(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
