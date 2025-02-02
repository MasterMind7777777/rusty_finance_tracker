import { buildUrl, getAuthHeaders } from "./api";
import { Tag, TagPayload } from "../types/tag";

/**
 * Fetch all tags
 */
export async function fetchTags(token: string): Promise<Tag[]> {
  const res = await fetch(buildUrl("/tags"), {
    method: "GET",
    headers: getAuthHeaders(token),
  });
  if (!res.ok) {
    console.error("Error fetching tags:", await res.text());
    return [];
  }
  return (await res.json()) as Tag[];
}

/**
 * Create a new tag and return the newly created Tag object
 */
export async function createTag(
  token: string,
  payload: TagPayload,
): Promise<Tag | null> {
  const res = await fetch(buildUrl("/tags"), {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error("Tag creation error:", await res.text());
    return null;
  }
  return (await res.json()) as Tag;
}
