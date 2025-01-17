import React, { useEffect, useState } from "react";
import { fetchCategories, createCategory } from "../services/CategoryService";
import { useAuth } from "../contexts/AuthContext";
import type { Category, CategoryPayload } from "../types/category";
import { Autocomplete } from "../components/Autocomplete/Autocomplete";

export default function CategoriesPage() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [parentIdSelected, setParentIdSelected] = useState<number | undefined>(
    undefined,
  );

  useEffect(() => {
    if (token) {
      handleRefreshCategories();
    }
  }, [token]);

  async function handleRefreshCategories() {
    if (!token) {
      console.log("No token, can't fetch categories.");
      return;
    }
    const data = await fetchCategories(token);
    setCategories(data);
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      console.log("No token, please log in.");
      return;
    }
    const payload: CategoryPayload = {
      name: categoryName,
      parent_category_id: parentIdSelected,
    };
    const success = await createCategory(token, payload);
    if (success) {
      console.log("Category created. Refreshing...");
      handleRefreshCategories();
    }
  }

  return (
    <div>
      <h2>Categories</h2>
      <button onClick={handleRefreshCategories}>Refresh Categories</button>
      <ul>
        {categories.map((cat) => (
          <li key={cat.id}>
            ID: {cat.id}, Name: {cat.name}, Parent: {cat.parent_id ?? "None"}
          </li>
        ))}
      </ul>

      <hr />
      <h3>Create a new category</h3>
      <form onSubmit={handleCreateCategory}>
        <label>Category Name:</label>
        <br />
        <input
          type="text"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
        />
        <br />
        <label>Select Parent Category (optional):</label>
        <Autocomplete<Category>
          items={categories}
          placeholder="Type parent category name..."
          getLabel={(cat) => cat.name}
          getId={(cat) => cat.id || 0}
          onSelect={(id, _name) => setParentIdSelected(id)}
        />
        <br />
        <button type="submit">Create Category</button>
      </form>
    </div>
  );
}
