import Script from "next/script";
import { PowerPointAddinClient } from "@/components/powerpoint/PowerPointAddinClient";

export default function PowerPointAddinPage() {
  return (
    <>
      <Script id="office-history-cache" strategy="beforeInteractive">
        {`
          (function () {
            globalThis.__slideHandoutHistoryCache = {
              pushState: globalThis.history && typeof globalThis.history.pushState === "function"
                ? globalThis.history.pushState.bind(globalThis.history)
                : null,
              replaceState: globalThis.history && typeof globalThis.history.replaceState === "function"
                ? globalThis.history.replaceState.bind(globalThis.history)
                : null,
            };
          })();
        `}
      </Script>
      <Script
        src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"
        strategy="beforeInteractive"
      />
      <Script id="office-history-restore" strategy="beforeInteractive">
        {`
          (function () {
            var noop = function () {};

            function restoreHistory() {
              if (!globalThis.history) {
                return;
              }

              var cache = globalThis.__slideHandoutHistoryCache || {};
              if (typeof globalThis.history.pushState !== "function") {
                globalThis.history.pushState = cache.pushState || noop;
              }
              if (typeof globalThis.history.replaceState !== "function") {
                globalThis.history.replaceState = cache.replaceState || noop;
              }
            }

            restoreHistory();

            var attempts = 0;
            var interval = globalThis.setInterval(function () {
              attempts += 1;
              restoreHistory();
              if (attempts >= 40) {
                globalThis.clearInterval(interval);
              }
            }, 50);

            globalThis.addEventListener("load", restoreHistory);
          })();
        `}
      </Script>
      <PowerPointAddinClient />
    </>
  );
}
