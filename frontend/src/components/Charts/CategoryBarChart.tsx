import { Box } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { generateCategorySpending } from "../../data/fakeData";

export function CategoryBarChart(): JSX.Element {
  const fakeCategoryData = generateCategorySpending();

  return (
    <Box sx={{ width: "100%", height: 400 }}>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={fakeCategoryData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="categoryName" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="totalSpending" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
