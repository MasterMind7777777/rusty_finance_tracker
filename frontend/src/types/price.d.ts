export interface NewProductPrice {
  product_id: number;
  price: number;
  created_at: string;
}

export interface ProductPrice {
  id?: number;
  product_id: number;
  price: float;
  created_at: string;
}
