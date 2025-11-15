"use client";
import { useEffect } from "react";

export function ThemeInitializer() {
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light";
    const systemTheme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    const theme = savedTheme || systemTheme;
    
    document.documentElement.classList.toggle("light", theme === "light");
  }, []);

  return null;
}