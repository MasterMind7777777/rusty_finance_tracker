export interface Category {
  id?: number;
  name: string;
  parent_category_id?: number | null;
  created_at?: string; // stored as string (DateTime)
}

// The payload when creating a category now allows you to provide either a parent category id or a parent category name.
export interface CategoryPayload {
  name: string;
  parent_category_id?: number | null;
  parent_category_name?: string;
}

// A lightweight DTO for a category, typically used for parent details.
export interface CategoryDto {
  id: number;
  name: string;
}

// The full response returned by the backend upon category creation.
export interface CreateCategoryResponse {
  category: Category;
  parent?: CategoryDto;
}
