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
import type { Transaction } from "../../types/transaction";

export interface MergedTransaction extends Transaction {
  displayPrice: number | "N/A";
}

interface TransactionListProps {
  transactions: MergedTransaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  return (
    <TableContainer component={Paper} sx={{ mb: 3 }}>
      <Table size="small">
        <TableHead sx={{ bgcolor: "grey.200" }}>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Product ID</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Price</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Tags</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell>{tx.id}</TableCell>
              <TableCell>{tx.product_id}</TableCell>
              <TableCell>{tx.transaction_type}</TableCell>
              <TableCell>
                {typeof tx.displayPrice === "number"
                  ? `$${tx.displayPrice}`
                  : "N/A"}
              </TableCell>
              <TableCell>{tx.description || ""}</TableCell>
              <TableCell>{tx.date}</TableCell>
              <TableCell>{tx.tags}</TableCell>
            </TableRow>
          ))}
          {transactions.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center">
                <Typography variant="body2">No transactions found.</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
