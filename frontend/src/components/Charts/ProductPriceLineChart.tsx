import { Box } from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState, useEffect } from "react";
import { fetchProductPriceData } from "../../services/AnaliticsService";
import { ProductPriceData } from "../../types/analytics";
import { useAuth } from "../../contexts/AuthContext";

interface ProductPriceLineChartProps {
  productId: number;
}

export function ProductPriceLineChart({
  productId,
}: ProductPriceLineChartProps): JSX.Element {
  const { token } = useAuth();
  const [data, setData] = useState<ProductPriceData[]>([]);

  useEffect(() => {
    if (!token) {
      console.error("No token, can't fetch product price data.");
      return;
    }
    fetchProductPriceData(token, productId)
      .then((fetchedData) => setData(fetchedData))
      .catch((err) => console.error("Error fetching product price data:", err));
  }, [token, productId]);

  return (
    <Box sx={{ width: "100%", height: 400 }}>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#8884d8"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
