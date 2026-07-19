export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h1 className="mb-4 text-4xl font-bold text-pocketlet-600">Pocketlet</h1>
      <p className="max-w-md text-gray-600">
        A simple, passkey-powered wallet for USDC and XLM on Stellar testnet.
      </p>
    </main>
  );
}
