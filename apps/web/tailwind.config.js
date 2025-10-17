/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/app/**/*.{ts,tsx,js,jsx}",
      "./src/components/**/*.{ts,tsx,js,jsx}",
      "./src/lib/**/*.{ts,tsx,js,jsx}",
    ],
    theme: {
      extend: {
        fontFamily: {
          sans: ['Lato', 'ui-sans-serif', 'system-ui'],
        },
        colors: {
          bg: "hsl(var(--bg))",
          card: "hsl(var(--card))",
          text: "hsl(var(--text))",
          muted: "hsl(var(--muted))",
          brand: "hsl(var(--brand))",
          brand2: "hsl(var(--brand2))",
          ok: "hsl(var(--ok))",
          warn: "hsl(var(--warn))",
          bad: "hsl(var(--bad))",
        },
        boxShadow: {
          card: "0 8px 24px rgba(0,0,0,.08)",
        }
      },
    },
    plugins: [],
  };
  