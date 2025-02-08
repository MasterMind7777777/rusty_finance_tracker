export interface Product {
  id: number; // or make it non-optional if the server always returns an ID
  category_id?: number; // optional link to a category
  name: string;
}

// Updated payload with an optional category_name for creating a product
export interface ProductPayload {
  category_id?: number;
  category_name?: string;
  name: string;
}

// The complete response after creating a product.
export interface CreateProductResponse {
  product: Product;
  category?: Category | null;
}
