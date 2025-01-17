export interface LoginRequest {
  email: string;
  password_hash: string;
}

export interface TokenResponse {
  token: string;
}

export interface NewUser {
  email: string;
  password_hash: string;
}
