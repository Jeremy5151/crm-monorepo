import type { Metadata } from 'next';
import Providers from './Providers';
import { ConditionalLayout } from '@/components/ConditionalLayout';

export const metadata: Metadata = {
  title: 'CRM',
  description: 'Leads',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="/styles.css" />
        <link rel="stylesheet" href="/custom.css" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize CSS variables on page load
              function initializeCSSVariables() {
                const root = document.documentElement;
                
                // Default accent color
                const defaultAccentColor = '#FFD666';
                
                // Convert hex to RGB
                function hexToRgb(hex) {
                  const cleanHex = hex.replace('#', '');
                  const r = parseInt(cleanHex.substr(0, 2), 16);
                  const g = parseInt(cleanHex.substr(2, 2), 16);
                  const b = parseInt(cleanHex.substr(4, 2), 16);
                  return { r, g, b };
                }
                
                // Calculate hover color (darker)
                function getHoverColor(r, g, b) {
                  return {
                    r: Math.max(0, r - Math.round(r * 0.1)),
                    g: Math.max(0, g - Math.round(g * 0.1)),
                    b: Math.max(0, b - Math.round(b * 0.1))
                  };
                }
                
                // Calculate light color (lighter)
                function getLightColor(r, g, b) {
                  return {
                    r: Math.min(255, r + Math.round((255 - r) * 0.3)),
                    g: Math.min(255, g + Math.round((255 - g) * 0.3)),
                    b: Math.min(255, b + Math.round((255 - b) * 0.3))
                  };
                }
                
                // Set CSS variables
                function setCSSVariables(accentColor) {
                  if (!accentColor) return; // Exit if accentColor is undefined or empty
                  
                  const { r, g, b } = hexToRgb(accentColor);
                  const hover = getHoverColor(r, g, b);
                  const light = getLightColor(r, g, b);
                  
                  root.style.setProperty('--primary', \`rgb(\${r}, \${g}, \${b})\`);
                  root.style.setProperty('--primary-hover', \`rgb(\${hover.r}, \${hover.g}, \${hover.b})\`);
                  root.style.setProperty('--primary-light', \`rgb(\${light.r}, \${light.g}, \${light.b})\`);
                  
                  // Update background gradient
                  const gradientColor = \`rgb(\${light.r}, \${light.g}, \${light.b})\`;
                  const gradientStyle = \`linear-gradient(352deg, \${gradientColor}, #E4E6E7)\`;
                  root.style.setProperty('--bg-gradient', gradientStyle);
                }
                
                // Initialize with default color
                setCSSVariables(defaultAccentColor);
                
                // Try to load settings from localStorage or API
                const savedSettings = localStorage.getItem('crm-settings');
                if (savedSettings) {
                  try {
                    const settings = JSON.parse(savedSettings);
                    if (settings.accentColor) {
                      setCSSVariables(settings.accentColor);
                    }
                  } catch (e) {
                    console.warn('Failed to parse saved settings:', e);
                  }
                }
              }
              
              // Run on DOM ready
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initializeCSSVariables);
              } else {
                initializeCSSVariables();
              }
            `,
          }}
        />
      </head>
      <body>
        <Providers>
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
        </Providers>
      </body>
    </html>
  );
}