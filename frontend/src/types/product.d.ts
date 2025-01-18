export interface Product {
  id: number; // or make it non-optional if the server always returns an ID
  user_id: number;
  category_id?: number; // optional link to a category
  name: string;
}

// If you want to create a product with an optional category:
export interface ProductPayload {
  category_id?: number;
  name: string;
}
