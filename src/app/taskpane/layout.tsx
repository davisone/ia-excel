import Script from "next/script";

export const metadata = {
  title: "Assistant Comptable Julie",
};

const TaskpaneLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Script
        src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"
        strategy="afterInteractive"
      />
      <div className="h-screen overflow-hidden bg-white">
        {children}
      </div>
    </>
  );
};

export default TaskpaneLayout;
