import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center max-w-2xl px-6">
        <div className="mb-8">
          <span className="text-6xl">📑</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Slide Handout
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Dynamische Live-Handouts für Ihre Präsentation.
          Inhalte schalten sich automatisch frei, wenn Sie zur nächsten Folie gehen.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/dashboard" className="btn-primary text-base px-8 py-3">
            Dashboard öffnen
          </Link>
          <Link href="/auth/login" className="btn-secondary text-base px-8 py-3">
            Anmelden
          </Link>
        </div>
        <p className="mt-8 text-sm text-gray-500">
          Demo: Erstellen Sie ein Konto oder melden Sie sich mit{" "}
          <code className="bg-gray-200 px-1 rounded">demo@example.com / demo1234</code> an.
        </p>
      </div>
    </div>
  );
}
