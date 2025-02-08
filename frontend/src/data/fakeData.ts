// src/data/fakeData.ts

export function generateSpendingTimeSeries(
  days: number,
): Array<{ date: string; totalSpending: number }> {
  const data = [];
  let currentSpending = 100;
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    // Simulate random spending changes
    currentSpending += Math.floor(Math.random() * 50 - 25);
    if (currentSpending < 0) currentSpending = 10;
    data.push({
      date: date.toISOString().substring(0, 10),
      totalSpending: currentSpending,
    });
  }
  return data;
}

export function generateCategorySpending(): Array<{
  categoryName: string;
  totalSpending: number;
}> {
  // Just some random categories
  const categories = [
    "Groceries",
    "Rent",
    "Utilities",
    "Entertainment",
    "Other",
  ];
  return categories.map((cat) => ({
    categoryName: cat,
    totalSpending: Math.floor(Math.random() * 1000 + 100),
  }));
}

export function generateProductPriceData(
  months: number,
): Array<{ date: string; price: number }> {
  const data = [];
  let currentPrice = 50;
  for (let i = 0; i < months; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - (months - i));
    currentPrice += Math.floor(Math.random() * 10 - 5);
    if (currentPrice < 10) currentPrice = 15;
    data.push({
      date: date.toISOString().substring(0, 10),
      price: currentPrice,
    });
  }
  return data;
}
