import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Snackbar,
  Alert,
  Stack,
  Paper,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import dayjs from "dayjs";

import { useAuth } from "../contexts/AuthContext";

// Services
import { fetchTransactions } from "../services/TransactionService";
import { fetchProducts } from "../services/ProductService";
import { fetchProductPrices } from "../services/PriceService";

// Types
import { Transaction } from "../types/transaction";
import { Product } from "../types/product";
import { ProductPrice } from "../types/price";

// Components
import {
  TransactionList,
  MergedTransaction,
} from "../components/Transactions/TransactionList";
import { TransactionForm } from "../components/Transactions/TransactionForm";

/**
 * The exact shape returned by createTransaction.
 * Must match what your backend actually returns.
 */
interface TransactionCreateResponse {
  transaction: Transaction;
  product: Product;
  product_price: ProductPrice;
}

export default function TransactionsPage() {
  const { token } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [prices, setPrices] = useState<ProductPrice[]>([]);
  const [mergedTransactions, setMergedTransactions] = useState<
    MergedTransaction[]
  >([]);

  // Snackbar state for notifications
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success",
  );

  useEffect(() => {
    if (token) {
      refreshData();
    }
  }, [token]);

  // Recompute mergedTransactions whenever transactions or prices change
  useEffect(() => {
    const newMerged = transactions.map((t) => {
      const foundPrice = prices.find((p) => p.id === t.product_price_id);
      const displayPrice = foundPrice ? foundPrice.price : "N/A";
      return { ...t, displayPrice };
    });
    setMergedTransactions(newMerged);
  }, [transactions, prices]);

  async function refreshData() {
    await Promise.all([
      handleRefreshTransactions(),
      handleRefreshProducts(),
      handleRefreshPrices(),
    ]);
  }

  async function handleRefreshTransactions() {
    if (!token) return;
    try {
      const fetched = await fetchTransactions(token);
      setTransactions(fetched);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      showError("Failed to fetch transactions.");
    }
  }

  async function handleRefreshProducts() {
    if (!token) return;
    try {
      const fetched = await fetchProducts(token);
      setProducts(fetched);
    } catch (err) {
      console.error("Error fetching products:", err);
      showError("Failed to fetch products.");
    }
  }

  async function handleRefreshPrices() {
    if (!token) return;
    try {
      const fetched = await fetchProductPrices(token);

      // Keep only the most recent price per product
      const latestMap = new Map<number, ProductPrice>();
      fetched.forEach((priceObj) => {
        const existing = latestMap.get(priceObj.product_id);
        if (!existing) {
          latestMap.set(priceObj.product_id, priceObj);
        } else if (
          dayjs(priceObj.created_at).isAfter(dayjs(existing.created_at))
        ) {
          latestMap.set(priceObj.product_id, priceObj);
        }
      });
      setPrices(Array.from(latestMap.values()));
    } catch (err) {
      console.error("Error fetching prices:", err);
      showError("Failed to fetch prices.");
    }
  }

  /**
   * Called after a successful creation in the form.
   * Update local states and show a success message.
   */
  function handleTransactionCreated(data: TransactionCreateResponse) {
    const { transaction, product, product_price: productPrice } = data;

    // Merge or insert product
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      return exists
        ? prev.map((p) => (p.id === product.id ? product : p))
        : [...prev, product];
    });

    // Merge or insert product price
    setPrices((prev) => {
      const exists = prev.some((pr) => pr.id === productPrice.id);
      return exists
        ? prev.map((pr) => (pr.id === productPrice.id ? productPrice : pr))
        : [...prev, productPrice];
    });

    // Add the new transaction
    setTransactions((prev) => [...prev, transaction]);

    showSuccess("Transaction created successfully!");
  }

  function showSuccess(msg: string) {
    setSnackbarMessage(msg);
    setSnackbarSeverity("success");
    setSnackbarOpen(true);
  }

  function showError(msg: string) {
    setSnackbarMessage(msg);
    setSnackbarSeverity("error");
    setSnackbarOpen(true);
  }

  function handleCloseSnackbar() {
    setSnackbarOpen(false);
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Transactions
      </Typography>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          Here you can view and create new transactions.
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={handleRefreshTransactions}
        >
          Refresh
        </Button>
      </Stack>
      <TransactionList transactions={mergedTransactions} />
      <Paper sx={{ p: 2 }}>
        <TransactionForm
          token={token || ""}
          products={products}
          prices={prices}
          onTransactionCreated={handleTransactionCreated}
        />
      </Paper>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
