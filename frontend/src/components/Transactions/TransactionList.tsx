import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
} from "@mui/material";
import type { Transaction } from "../../types/transaction";
import type { Product } from "../../types/product";
import { Tag } from "../../types/tag";

export interface MergedTransaction extends Transaction {
  displayPrice: number | "N/A";
  tagsObj: Tag[] | null;
  productObj: Product | null;
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
            <TableCell>Product</TableCell>
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
              <TableCell>
                {tx.productObj ? tx.productObj.name : "Unknown Product"}
              </TableCell>
              <TableCell>{tx.transaction_type}</TableCell>
              <TableCell>
                {typeof tx.displayPrice === "number"
                  ? `$${tx.displayPrice}`
                  : "N/A"}
              </TableCell>
              <TableCell>{tx.description || ""}</TableCell>
              <TableCell>{tx.date}</TableCell>
              <TableCell>
                {tx.tagsObj && tx.tagsObj.length > 0
                  ? tx.tagsObj.map((tag) => (
                      <Chip
                        key={tag.id}
                        label={tag.name}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))
                  : "No Tags"}
              </TableCell>
            </TableRow>
          ))}
          {transactions.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <Typography variant="body2">No transactions found.</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
