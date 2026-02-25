import Script from "next/script";
import "@/app/globals.css";

export const metadata = {
  title: "Assistant Comptable IA",
};

const TaskpaneLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="fr">
      <head>
        <Script
          src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="h-screen overflow-hidden bg-white">
        {children}
      </body>
    </html>
  );
};

export default TaskpaneLayout;
