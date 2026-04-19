import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#fff6f8] to-[#ffeaf2] px-6 py-16 text-[#5f4150]">
      <main className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        <p className="text-4xl" aria-hidden="true">
          ❤️
        </p>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-[#5f4150]">
            Kviz
          </h1>
          <p className="text-lg leading-relaxed text-[#7a5665]">
            Ovdje počinje mala interaktivna priča — korak po korak, sve do
            poklona.
          </p>
        </div>
        <Link
          href="/romantic-gift/index.html?autostart=1"
          className="inline-flex w-full max-w-xs items-center justify-center rounded-2xl bg-gradient-to-r from-[#ff7fb7] to-[#ff5fa8] px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-pink-200/60 transition hover:opacity-95 active:scale-[0.99]"
        >
          Otvori: Put do tvog poklona
        </Link>
      </main>
    </div>
  );
}
