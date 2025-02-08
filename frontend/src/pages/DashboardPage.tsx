import { Box, Typography, Paper } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useState, useEffect } from "react";
import dayjs, { Dayjs } from "dayjs";

import { SpendingLineChart } from "../components/Charts/SpendingLineChart";
import { CategoryBarChart } from "../components/Charts/CategoryBarChart";
import { CategoryPieChart } from "../components/Charts/CategoryPieChart";
import { ProductPriceLineChart } from "../components/Charts/ProductPriceLineChart";
import { ChartSettings } from "../components/Charts/ChartSettings";
import { Product } from "../types/product";
import { Tag } from "../types/tag";

export function DashboardPage(): JSX.Element {
  const [startDate, setStartDate] = useState<Dayjs | null>(
    dayjs().subtract(30, "day"),
  );
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [transactionType, setTransactionType] = useState<string>("All");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  useEffect(() => {
    console.log("Dashboard filters:", {
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

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Dashboard
      </Typography>

      <ChartSettings
        startDate={startDate}
        endDate={endDate}
        selectedCategory={selectedCategory}
        selectedProduct={selectedProduct}
        transactionType={transactionType}
        selectedTags={selectedTags}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onCategoryChange={setSelectedCategory}
        onProductChange={setSelectedProduct}
        onTransactionTypeChange={setTransactionType}
        onTagsChange={setSelectedTags}
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Spending Over Time
            </Typography>
            <SpendingLineChart />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Spending by Category (Bar)
            </Typography>
            <CategoryBarChart />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Spending by Category (Pie)
            </Typography>
            <CategoryPieChart />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Product Price History
            </Typography>
            <ProductPriceLineChart />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
