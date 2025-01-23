import { useEffect, useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import dayjs from "dayjs";

import { useAuth } from "../contexts/AuthContext";

// Services
import { fetchTransactions } from "../services/TransactionService";
import { fetchProducts } from "../services/ProductService";
import { fetchProductPrices } from "../services/PriceService";

// Types
import type { Transaction } from "../types/transaction";
import type { Product } from "../types/product";
import type { ProductPrice } from "../types/price";

// Child component
import { TransactionForm } from "../components/Transactions/TransactionForm";

/** Matches your backend's expanded response for createTransaction. */
interface CreateTransactionResponse {
  transaction: Transaction;
  product: Product;
  product_price: ProductPrice;
}

export default function TransactionsPage() {
  const { token } = useAuth();

  // Raw, unmodified states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [prices, setPrices] = useState<ProductPrice[]>([]);

  /**
   * We'll store an array that merges each Transaction with its matching ProductPrice.
   */
  const [mergedTransactions, setMergedTransactions] = useState<
    (Transaction & { displayPrice: number | "N/A" })[]
  >([]);

  // Fetch data on mount (if token changes)
  useEffect(() => {
    if (token) {
      handleRefreshTransactions();
      handleRefreshProducts();
      handleRefreshPrices();
    }
  }, [token]);

  // Whenever `transactions` or `prices` change, merge them once here
  useEffect(() => {
    const newMerged = transactions.map((singleTransaction) => {
      const matchedProductPrice = prices.find(
        (singlePrice) => singlePrice.id === singleTransaction.product_price_id,
      );

      // If matched, display that price; otherwise "N/A"
      const displayPrice = matchedProductPrice
        ? matchedProductPrice.price
        : "N/A";

      return {
        ...singleTransaction,
        displayPrice,
      };
    });

    setMergedTransactions(newMerged);
  }, [transactions, prices]);

  /**
   * Refreshers
   */
  async function handleRefreshTransactions() {
    if (!token) return;
    try {
      const fetchedTransactions = await fetchTransactions(token);
      setTransactions(fetchedTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  }

  async function handleRefreshProducts() {
    if (!token) return;
    try {
      const fetchedProducts = await fetchProducts(token);
      setProducts(fetchedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  }

  async function handleRefreshPrices() {
    if (!token) return;
    try {
      const fetchedPrices = await fetchProductPrices(token);

      // Keep only the "latest" price per product
      const latestPricesMap = fetchedPrices.reduce(
        (accumulator, currentProductPrice) => {
          const existingPrice = accumulator.get(currentProductPrice.product_id);
          if (!existingPrice) {
            accumulator.set(
              currentProductPrice.product_id,
              currentProductPrice,
            );
          } else if (
            dayjs(currentProductPrice.created_at).isAfter(
              dayjs(existingPrice.created_at),
            )
          ) {
            accumulator.set(
              currentProductPrice.product_id,
              currentProductPrice,
            );
          }
          return accumulator;
        },
        new Map<number, ProductPrice>(),
      );

      const finalPrices = Array.from(latestPricesMap.values());
      setPrices(finalPrices);
    } catch (error) {
      console.error("Error fetching prices:", error);
    }
  }

  /**
   * Called after a successful creation (with full expanded data).
   */
  function handleTransactionCreated(responseData: CreateTransactionResponse) {
    const { transaction, product, product_price: productPrice } = responseData;

    // Merge or insert the product
    setProducts((previousProducts) => {
      const productAlreadyExists = previousProducts.some(
        (existingProduct) => existingProduct.id === product.id,
      );
      if (!productAlreadyExists) {
        return [...previousProducts, product];
      }
      return previousProducts.map((existingProduct) =>
        existingProduct.id === product.id ? product : existingProduct,
      );
    });

    // Merge or insert the product_price
    setPrices((previousPrices) => {
      const priceAlreadyExists = previousPrices.some(
        (existingPrice) => existingPrice.id === productPrice.id,
      );
      if (!priceAlreadyExists) {
        return [...previousPrices, productPrice];
      }
      return previousPrices.map((existingPrice) =>
        existingPrice.id === productPrice.id ? productPrice : existingPrice,
      );
    });

    // Add the new transaction
    setTransactions((previousTransactions) => [
      ...previousTransactions,
      transaction,
    ]);
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Transactions
      </Typography>

      <Button
        variant="contained"
        onClick={handleRefreshTransactions}
        sx={{ mb: 2 }}
      >
        Refresh Transactions
      </Button>

      {/* Render the merged transactions */}
      {mergedTransactions.map((singleTransaction) => (
        <Box key={singleTransaction.id} sx={{ mb: 1 }}>
          <Typography variant="body2">
            ID: {singleTransaction.id}, product_id:{" "}
            {singleTransaction.product_id}, type:{" "}
            {singleTransaction.transaction_type}, price:{" "}
            {singleTransaction.displayPrice}, desc:{" "}
            {singleTransaction.description}, date: {singleTransaction.date}
          </Typography>
        </Box>
      ))}

      {/* Our reusable form for creating transactions */}
      <TransactionForm
        token={token || ""}
        products={products}
        prices={prices}
        onTransactionCreated={handleTransactionCreated}
      />
    </Box>
  );
}
