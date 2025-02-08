import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useEffect, useState } from "react";
import { Dayjs } from "dayjs";
import { AutocompleteMui } from "../Autocomplete/Autocomplete";
import { AutocompleteMuiMultiple } from "../Autocomplete/AutocompleteMulti";
import { Product } from "../../types/product";
import { Tag } from "../../types/tag";
import { fetchProducts } from "../../services/ProductService";
import { fetchTags } from "../../services/TagService";
import { useAuth } from "../../contexts/AuthContext";

interface ChartSettingsProps {
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  selectedCategory: string;
  selectedProduct: Product | null;
  transactionType: string;
  selectedTags: Tag[];
  onStartDateChange: (newDate: Dayjs | null) => void;
  onEndDateChange: (newDate: Dayjs | null) => void;
  onCategoryChange: (newCategory: string) => void;
  onProductChange: (newProduct: Product | null) => void;
  onTransactionTypeChange: (newType: string) => void;
  onTagsChange: (newTags: Tag[]) => void;
}

export function ChartSettings({
  startDate,
  endDate,
  selectedCategory,
  selectedProduct,
  transactionType,
  selectedTags,
  onStartDateChange,
  onEndDateChange,
  onCategoryChange,
  onProductChange,
  onTransactionTypeChange,
  onTagsChange,
}: ChartSettingsProps): JSX.Element {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    console.log("Chart Settings:", {
      startDate,
      endDate,
      selectedCategory,
      selectedProduct,
      transactionType,
      selectedTags,
    });
  }, [
    startDate,
    endDate,
    selectedCategory,
    selectedProduct,
    transactionType,
    selectedTags,
  ]);

  useEffect(() => {
    if (token) {
      fetchProducts(token)
        .then((fetchedProducts: Product[]) => setProducts(fetchedProducts))
        .catch((err) =>
          console.error("Error fetching products in ChartSettings:", err),
        );
      fetchTags(token)
        .then((fetchedTags: Tag[]) => setTags(fetchedTags))
        .catch((err) =>
          console.error("Error fetching tags in ChartSettings:", err),
        );
    }
  }, [token]);

  return (
    <Box sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={2}>
        {/* Date Pickers */}
        <Grid size={{ xs: 12, md: 4 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={onStartDateChange}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={onEndDateChange}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>
        </Grid>

        {/* Category (free text) */}
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            label="Category"
            fullWidth
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
          />
        </Grid>

        {/* Product (single autocomplete, no new values) */}
        <Grid size={{ xs: 12, md: 4 }}>
          <AutocompleteMui<Product>
            items={products}
            /**
             * Check if `option` is a string or a Product.
             * Because AutocompleteMui can handle both, we do a type check:
             */
            getOptionLabel={(option) =>
              typeof option === "string" ? option : option.name
            }
            onSelect={(val) => {
              // If val is a string or null, we ignore it.
              // We only want actual Product objects.
              if (val && typeof val !== "string") {
                onProductChange(val);
              } else {
                onProductChange(null);
              }
            }}
            label="Product"
            allowNewValue={false}
          />
        </Grid>

        {/* Transaction Type */}
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControl fullWidth>
            <InputLabel id="transaction-type-label">
              Transaction Type
            </InputLabel>
            <Select
              labelId="transaction-type-label"
              label="Transaction Type"
              value={transactionType}
              onChange={(e) => onTransactionTypeChange(e.target.value)}
            >
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="Expense">Expense</MenuItem>
              <MenuItem value="Income">Income</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Tags (multiple autocomplete, no new values) */}
        <Grid size={{ xs: 12, md: 4 }}>
          <AutocompleteMuiMultiple<Tag>
            value={selectedTags}
            items={tags}
            /**
             * same union type logic: if option is string or Tag,
             * we only show .name if it's a Tag
             */
            getOptionLabel={(option) =>
              typeof option === "string" ? option : option.name
            }
            label="Tags"
            allowNewValue={false}
            /**
             * Because we do not allow new strings:
             * newValues is empty, onNewValuesChange is no-op
             */
            newValues={[]}
            onNewValuesChange={() => {}}
            onChange={(newSelected) => {
              // Filter out anything that might be a string
              const tagOnly = newSelected.filter(
                (item) => typeof item !== "string",
              ) as Tag[];
              onTagsChange(tagOnly);
            }}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
