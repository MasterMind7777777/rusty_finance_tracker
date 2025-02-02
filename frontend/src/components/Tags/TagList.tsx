// src/components/Tags/TagList.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
} from "@mui/material";
import type { Tag } from "../../types/tag";

interface TagListProps {
  tags: Tag[];
}

export function TagList({ tags }: TagListProps) {
  return (
    <TableContainer component={Paper} sx={{ mb: 3 }}>
      <Table size="small">
        <TableHead sx={{ bgcolor: "grey.200" }}>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Name</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tags.map((tag) => (
            <TableRow key={tag.id}>
              <TableCell>{tag.id}</TableCell>
              <TableCell>{tag.name}</TableCell>
            </TableRow>
          ))}
          {tags.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} align="center">
                <Typography variant="body2">No tags found.</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
