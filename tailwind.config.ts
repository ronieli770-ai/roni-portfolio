import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        brand: {
          DEFAULT: "hsl(var(--brand))",
          light: "hsl(var(--brand-light))",
          foreground: "hsl(var(--brand-foreground))",
        },
        "heading-from": "hsl(var(--heading-from))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Hebrew"', "system-ui", "sans-serif"],
      },
      backdropBlur: {
        glass: "var(--glass-blur)",
      },
      borderRadius: {
        card: "var(--card-radius)",
        btn: "var(--btn-radius)",
        field: "var(--field-radius)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
