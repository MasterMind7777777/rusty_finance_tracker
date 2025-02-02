import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
} from "@mui/material";
import type { ProductPrice } from "../../types/price";

interface ProductPriceListProps {
  prices: ProductPrice[];
}

export function ProductPriceList({ prices }: ProductPriceListProps) {
  return (
    <TableContainer component={Paper} sx={{ mb: 3 }}>
      <Table size="small">
        <TableHead sx={{ bgcolor: "grey.200" }}>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Product ID</TableCell>
            <TableCell>Price</TableCell>
            <TableCell>Created At</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {prices.map((pp) => (
            <TableRow key={pp.id}>
              <TableCell>{pp.id}</TableCell>
              <TableCell>{pp.product_id}</TableCell>
              <TableCell>${pp.price}</TableCell>
              <TableCell>{pp.created_at}</TableCell>
            </TableRow>
          ))}
          {prices.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} align="center">
                <Typography variant="body2">
                  No product prices found.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
