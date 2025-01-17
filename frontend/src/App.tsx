import { Link } from "react-router-dom";

export default function App() {
  return (
    <div
      style={{ padding: "1rem", fontFamily: "sans-serif", maxWidth: "900px" }}
    >
      <h1>Finance Tracker Frontend (React + TS)</h1>
      <nav>
        <Link to="/">Login</Link> | <Link to="/signup">Sign Up</Link> |{" "}
        <Link to="/categories">Categories</Link> |{" "}
        <Link to="/products">Products</Link> |{" "}
        <Link to="/prices">Product Prices</Link> |{" "}
        <Link to="/transactions">Transactions</Link>
      </nav>
      <hr />
    </div>
  );
}
