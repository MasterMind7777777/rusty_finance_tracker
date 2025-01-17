import React, { useState } from "react";
import { signUp } from "../services/AuthService";
import type { NewUser } from "../types/auth";
import { Box, Typography, TextField, Button } from "@mui/material";

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
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Sign Up
      </Typography>

      <Box component="form" onSubmit={handleSignUp}>
        <TextField
          label="New user email"
          type="email"
          variant="outlined"
          size="small"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 2, width: "300px" }}
        />

        <TextField
          label="New user password"
          type="password"
          variant="outlined"
          size="small"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 2, width: "300px" }}
        />

        <Button type="submit" variant="contained">
          Sign Up
        </Button>
      </Box>

      {message && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          {message}
        </Typography>
      )}
    </Box>
  );
}
