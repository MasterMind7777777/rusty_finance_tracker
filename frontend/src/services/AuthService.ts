import { buildUrl } from "./api";
import type { LoginRequest, TokenResponse, NewUser } from "../types/auth";

export async function signUp(newUser: NewUser): Promise<Response> {
  const response = await fetch(buildUrl("/users"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newUser),
  });
  return response;
}

export async function login(
  credentials: LoginRequest,
): Promise<TokenResponse | null> {
  try {
    const response = await fetch(buildUrl("/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      console.error("Login error:", await response.text());
      return null;
    }

    const data = (await response.json()) as TokenResponse;
    return data;
  } catch (err) {
    console.error("Request failed:", err);
    return null;
  }
}
