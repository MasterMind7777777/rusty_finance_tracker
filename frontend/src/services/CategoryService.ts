import { buildUrl, getAuthHeaders } from "./api";
import type {
  CreateCategoryResponse,
  Category,
  CategoryPayload,
} from "../types/category";

export async function fetchCategories(token: string): Promise<Category[]> {
  const res = await fetch(buildUrl("/categories"), {
    method: "GET",
    headers: getAuthHeaders(token),
  });
  if (!res.ok) {
    console.error("Error fetching categories:", await res.text());
    return [];
  }
  return (await res.json()) as Category[];
}

export async function createCategory(
  token: string,
  payload: CategoryPayload,
): Promise<CreateCategoryResponse | null> {
  const res = await fetch(buildUrl("/categories"), {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error("Category creation error:", await res.text());
    return null;
  }

  // Parse the newly created category response from the backend.
  const newCat: CreateCategoryResponse = await res.json();
  return newCat;
}
