import React, { useState } from "react";
import { login } from "../services/AuthService";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { token, setToken } = useAuth();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const data = await login({ email, password_hash: password });
    if (data && data.token) {
      setToken(data.token);
    }
  }

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <br />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <br />
        <button type="submit">Log In</button>
      </form>

      {token ? (
        <p style={{ color: "green" }}>Logged in. Token: {token}</p>
      ) : (
        <p style={{ color: "red" }}>Not logged in</p>
      )}
    </div>
  );
}
