export interface NewProductPrice {
  product_id: number;
  price: number; // Price stored in cents
  created_at: string; // ISO string date
}

export interface ProductPriceDto {
  id: number;
  product_id: number;
  price: number; // Price in dollars as a float (converted from cents)
  created_at: string;
}

// The response returned by the backend upon creating a product price.
// It contains both the created product price record (as a DTO) and minimal product details.
export interface CreateProductPriceResponse {
  product_price: ProductPriceDto;
  product: {
    id: number;
    name: string;
  };
}
