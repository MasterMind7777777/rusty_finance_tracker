import React, { useState } from "react";
import { signUp } from "../services/AuthService";
import type { NewUser } from "../types/auth";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();

    const newUser: NewUser = {
      email,
      password_hash: password,
    };

    try {
      const response = await signUp(newUser);
      const text = await response.text();
      if (response.ok) {
        setMessage(`Sign-up result: ${text}`);
      } else {
        setMessage(`Sign-up error: ${text}`);
      }
    } catch (err) {
      setMessage(`Request failed: ${String(err)}`);
    }
  }

  return (
    <div>
      <h2>Sign Up</h2>
      <form onSubmit={handleSignUp}>
        <input
          type="text"
          placeholder="New user email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <br />
        <input
          type="password"
          placeholder="New user password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <br />
        <button type="submit">Sign Up</button>
      </form>
      <p>{message}</p>
    </div>
  );
}
