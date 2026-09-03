import "./globals.css";
import "./design-system.css";
import "./header-fix.css";

export const metadata = {
  title: "Shiva — Fantasy Football Intelligence",
  description: "One More Shiva fantasy football intelligence"
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#071019",
  colorScheme: "dark"
};

const criticalShellCss = `
  html,body{margin:0;background:#071019;color-scheme:dark;min-height:100%;}
  body{min-height:100dvh;}
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" style={{ background: "#071019", colorScheme: "dark" }}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preload" href="/shiva-trophy.png" as="image" />
        <style dangerouslySetInnerHTML={{ __html: criticalShellCss }} />
      </head>
      <body style={{ background: "#071019", margin: 0 }}>{children}</body>
    </html>
  );
}
