import React, { useState } from "react";
import { login } from "../services/AuthService";
import { useAuth } from "../contexts/AuthContext";
import { Box, Typography, TextField, Button } from "@mui/material";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setToken } = useAuth();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const data = await login({ email, password_hash: password });
    if (data && data.token) {
      setToken(data.token);
    }
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Login
      </Typography>

      <Box component="form" onSubmit={handleLogin}>
        <TextField
          label="Email"
          type="email"
          variant="outlined"
          size="small"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 2, width: "300px" }}
        />

        <TextField
          label="Password"
          type="password"
          variant="outlined"
          size="small"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 2, width: "300px" }}
        />

        <Button type="submit" variant="contained">
          Log In
        </Button>
      </Box>
    </Box>
  );
}
