// This file can export a baseURL or a function that sets up fetch/axios defaults.

// export const backendUrl = "http://127.0.0.1:3000"; // or your actual backend
export const backendUrl = "https://crm.vlotho.ru/rusty-fin/api"; // or your actual backend

// A helper to build full URL
export function buildUrl(path: string) {
  return `${backendUrl}${path}`;
}

// Optionally, you could define a getAuthHeaders(token: string) => { headers }
export function getAuthHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
