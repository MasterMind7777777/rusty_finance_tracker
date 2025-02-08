import { Box } from "@mui/material";
import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { generateCategorySpending } from "../../data/fakeData";

export function CategoryPieChart(): JSX.Element {
  const fakeCategoryData = generateCategorySpending();
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA00FF"];

  return (
    <Box sx={{ width: "100%", height: 400 }}>
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie
            data={fakeCategoryData}
            dataKey="totalSpending"
            nameKey="categoryName"
            cx="50%"
            cy="50%"
            outerRadius={120}
            fill="#8884d8"
            label
          >
            {fakeCategoryData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
}
