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
import { fetchSpendingTimeSeries } from "../../services/AnaliticsService";
import { SpendingTimeSeriesEntry } from "../../types/analytics";
import { useAuth } from "../../contexts/AuthContext";

export function SpendingLineChart(): JSX.Element {
  const { token } = useAuth();
  const [data, setData] = useState<SpendingTimeSeriesEntry[]>([]);

  useEffect(() => {
    if (!token) {
      console.error("No token, can't fetch spending time series.");
      return;
    }
    fetchSpendingTimeSeries(token)
      .then((fetchedData) => setData(fetchedData))
      .catch((err) =>
        console.error("Error fetching spending time series:", err),
      );
  }, [token]);

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
            dataKey="total_spending"
            stroke="#8884d8"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
