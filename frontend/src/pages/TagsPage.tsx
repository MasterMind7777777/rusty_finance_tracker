// src/pages/TagsPage.tsx
import { useEffect, useState } from "react";
import { fetchTags } from "../services/TagService";
import { useAuth } from "../contexts/AuthContext";
import type { Tag } from "../types/tag";
import { Box, Typography, Button, Stack } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { TagList } from "../components/Tags/TagList";
import { TagForm } from "../components/Tags/TagForm";

export default function TagsPage() {
  const { token } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    if (token) {
      handleRefreshTags();
    }
  }, [token]);

  async function handleRefreshTags() {
    if (!token) {
      console.error("No token, can't fetch tags.");
      return;
    }
    try {
      const data = await fetchTags(token);
      setTags(data);
    } catch (err) {
      console.error("Failed to fetch tags:", err);
    }
  }

  function handleTagCreated(newTag: Tag) {
    setTags((prev) => [...prev, newTag]);
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Typography variant="h5">Tags</Typography>
        <Button
          variant="contained"
          onClick={handleRefreshTags}
          startIcon={<RefreshIcon />}
        >
          Refresh Tags
        </Button>
      </Stack>
      <TagList tags={tags} />
      <TagForm token={token || ""} onTagCreated={handleTagCreated} />
    </Box>
  );
}
