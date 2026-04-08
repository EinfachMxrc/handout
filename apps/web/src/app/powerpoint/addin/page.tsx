import Script from "next/script";
import { PowerPointAddinClient } from "@/components/powerpoint/PowerPointAddinClient";

export default function PowerPointAddinPage() {
  return (
    <>
      <Script id="office-history-cache" strategy="beforeInteractive">
        {`
          (function () {
            window.__slideHandoutHistoryCache = {
              pushState: window.history && typeof window.history.pushState === "function"
                ? window.history.pushState.bind(window.history)
                : null,
              replaceState: window.history && typeof window.history.replaceState === "function"
                ? window.history.replaceState.bind(window.history)
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
              if (!window.history) {
                return;
              }

              var cache = window.__slideHandoutHistoryCache || {};
              if (typeof window.history.pushState !== "function") {
                window.history.pushState = cache.pushState || noop;
              }
              if (typeof window.history.replaceState !== "function") {
                window.history.replaceState = cache.replaceState || noop;
              }
            }

            restoreHistory();

            var attempts = 0;
            var interval = window.setInterval(function () {
              attempts += 1;
              restoreHistory();
              if (attempts >= 40) {
                window.clearInterval(interval);
              }
            }, 50);

            window.addEventListener("load", restoreHistory);
          })();
        `}
      </Script>
      <PowerPointAddinClient />
    </>
  );
}
