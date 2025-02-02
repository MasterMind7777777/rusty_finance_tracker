// src/components/Tags/TagForm.tsx
import React, { useState } from "react";
import { Box, Typography, Button, TextField, Paper } from "@mui/material";
import Grid from "@mui/material/Grid2"; // Grid v2 import in MUI v6+
import { createTag } from "../../services/TagService";
import type { Tag } from "../../types/tag";

interface TagFormProps {
  token: string;
  onTagCreated: (newTag: Tag) => void;
}

export function TagForm({ token, onTagCreated }: TagFormProps) {
  const [tagName, setTagName] = useState("");

  async function handleCreateTag(e: React.FormEvent) {
    e.preventDefault();
    if (!tagName.trim()) {
      console.log("Tag name is empty, please enter a name.");
      return;
    }
    try {
      const newTag = await createTag(token, { name: tagName });
      if (!newTag) {
        console.error("Tag creation failed.");
        return;
      }
      onTagCreated(newTag);
      setTagName("");
    } catch (error) {
      console.error("Error creating tag:", error);
    }
  }

  return (
    <Paper sx={{ p: 2, mt: 3 }} elevation={3}>
      <Box component="form" onSubmit={handleCreateTag}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Create a New Tag
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Tag Name"
              variant="outlined"
              size="small"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Button variant="contained" type="submit">
              Create Tag
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
}
