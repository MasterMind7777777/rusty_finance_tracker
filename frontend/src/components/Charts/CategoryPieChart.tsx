import { Box } from "@mui/material";
import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { useState, useEffect } from "react";
import { fetchCategorySpending } from "../../services/AnaliticsService";
import { CategorySpending } from "../../types/analytics";
import { useAuth } from "../../contexts/AuthContext";

export function CategoryPieChart(): JSX.Element {
  const { token } = useAuth();
  const [data, setData] = useState<CategorySpending[]>([]);
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA00FF"];

  useEffect(() => {
    if (!token) {
      console.error("No token, can't fetch category spending.");
      return;
    }
    fetchCategorySpending(token)
      .then((fetchedData) => setData(fetchedData))
      .catch((err) => console.error("Error fetching category spending:", err));
  }, [token]);

  return (
    <Box sx={{ width: "100%", height: 400 }}>
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie
            data={data}
            dataKey="total_spending"
            nameKey="category_name"
            cx="50%"
            cy="50%"
            outerRadius={120}
            fill="#8884d8"
            label
          >
            {data.map((entry, index) => (
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
