export interface Category {
  id?: number;
  name: string;
  parent_id?: number;
  created_at?: string; // we store DateTime as string
}

export interface CategoryPayload {
  name: string;
  parent_category_id?: number;
}
