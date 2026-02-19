import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 max-w-md">
        <div className="text-8xl font-bold text-indigo-200 mb-4">404</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Page introuvable</h2>
        <p className="text-gray-600 mb-6">La page que vous cherchez n&apos;existe pas ou a été déplacée.</p>
        <Link
          href="/"
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium inline-block"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
