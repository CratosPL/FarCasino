export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Slot Machine Game Server</h1>
      <p className="text-xl mb-4">Server is running!</p>
      <p className="mb-8">This server provides the backend API for the Hooligan Slot game.</p>

      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">Available Endpoints:</h2>
        <ul className="space-y-2">
          <li>
            <code className="bg-gray-700 px-2 py-1 rounded">/api/init</code> - Initialize a new player
          </li>
          <li>
            <code className="bg-gray-700 px-2 py-1 rounded">/api/spin</code> - Process a spin
          </li>
          <li>
            <code className="bg-gray-700 px-2 py-1 rounded">/api/test-spin</code> - Get a test spin result
          </li>
          <li>
            <code className="bg-gray-700 px-2 py-1 rounded">/api/stats/:playerId</code> - Get player statistics
          </li>
        </ul>
      </div>
    </main>
  )
}
