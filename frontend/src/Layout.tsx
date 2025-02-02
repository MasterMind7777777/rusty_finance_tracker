import React from "react";
import { Outlet, Link as RouterLink } from "react-router-dom";
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";

interface LayoutProps {
  drawerWidth?: number;
}

/**
 * A reusable Layout that includes:
 * - A responsive Drawer (sidebar) for navigation.
 * - A top AppBar with a menu icon that toggles the drawer on mobile.
 * - An <Outlet /> area where each page will render.
 */
export function Layout({ drawerWidth = 240 }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // You can generate or hardcode these links
  const navLinks = [
    { text: "Login", path: "/" },
    { text: "Sign Up", path: "/signup" },
    { text: "Categories", path: "/categories" },
    { text: "Products", path: "/products" },
    { text: "Prices", path: "/prices" },
    { text: "Transactions", path: "/transactions" },
  ];

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap>
          Finance Tracker
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navLinks.map((item) => (
          <ListItemButton
            component={RouterLink}
            to={item.path}
            key={item.text}
            onClick={() => setMobileOpen(false)} // close drawer on click (mobile)
          >
            <ListItemText primary={item.text} />
          </ListItemButton>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      {/** AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          {/** Icon button for mobile to open/close drawer */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div">
            Finance Tracker
          </Typography>
        </Toolbar>
      </AppBar>

      {/** Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="navigation links"
      >
        {/** The implementation can vary, here is a permanent drawer on sm+ screens,
             and a temporary drawer on mobile. */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }} // better performance on mobile
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/** Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 2,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8, // space under the AppBar
        }}
      >
        {/** This is where the selected page (route) renders */}
        <Outlet />
      </Box>
    </Box>
  );
}
