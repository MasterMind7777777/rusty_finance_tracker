import { Routes, Route } from "react-router-dom";
import { Layout } from "./Layout";

// Example pages
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import CategoriesPage from "./pages/CategoriesPage";
import ProductsPage from "./pages/ProductsPage";
import ProductPricesPage from "./pages/ProductPricesPage";
import TransactionsPage from "./pages/TransactionsPage";
import TagsPage from "./pages/TagsPage"; // Import TagsPage
import { DashboardPage } from "./pages/DashboardPage";

function App() {
  return (
    <Routes>
      {/**
        The parent route uses <Layout> as its element.
        The <Outlet /> in Layout is where child routes render.
      */}
      <Route path="/" element={<Layout />}>
        {/** index route = the default child if we go to "/" */}
        <Route index element={<LoginPage />} />

        {/** Additional children */}
        <Route path="signup" element={<SignUpPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="prices" element={<ProductPricesPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="tags" element={<TagsPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
      </Route>
    </Routes>
  );
}

export default App;
