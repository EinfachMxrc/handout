import Script from "next/script";
import { PowerPointAddinClient } from "@/components/powerpoint/PowerPointAddinClient";

export default function PowerPointAddinPage() {
  return (
    <>
      <Script
        src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"
        strategy="beforeInteractive"
      />
      <PowerPointAddinClient />
    </>
  );
}
