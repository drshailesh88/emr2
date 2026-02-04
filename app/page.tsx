export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">Doctor Secretary AI</h1>
      <p className="text-lg text-gray-600 mb-8">
        AI-powered medical secretary for solo doctors in India
      </p>
      <div className="flex gap-4">
        <a
          href="/login"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Login
        </a>
        <a
          href="/signup"
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Sign Up
        </a>
      </div>
    </main>
  );
}
