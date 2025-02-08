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
import { useState, useEffect } from "react";
import { fetchCategorySpending } from "../../services/AnaliticsService";
import { CategorySpending } from "../../types/analytics";
import { useAuth } from "../../contexts/AuthContext";

export function CategoryBarChart(): JSX.Element {
  const { token } = useAuth();
  const [data, setData] = useState<CategorySpending[]>([]);

  useEffect(() => {
    if (!token) {
      console.error("No token, can't fetch category spending.");
      return;
    }
    fetchCategorySpending(token)
      .then((fetchedData) => setData(fetchedData))
      .catch((err) => console.error("Error fetching category spending:", err));
  }, []);

  return (
    <Box sx={{ width: "100%", height: 400 }}>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category_name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="total_spending" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
