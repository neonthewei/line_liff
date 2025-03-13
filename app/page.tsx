import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">記帳小本本</h1>
        <Link
          href="/edit"
          className="px-6 py-3 bg-green-500 text-white rounded-xl shadow-sm hover:bg-green-600 transition-colors"
        >
          編輯交易
        </Link>
      </div>
    </main>
  );
}
