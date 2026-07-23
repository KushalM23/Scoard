import Link from "next/link";
import { ArrowLeft, Home, Search } from "lucide-react";
import Header from "@/components/layout/Header";
import Layout from "@/components/layout/AppShell";

export default function NotFound() {
  return (
    <Layout>
      <Header />
      <main className="flex items-center justify-center px-4 py-16 sm:px-6">
        <section className="w-full max-w-2xl p-8 text-center sm:p-14">
          <p className="font-display text-5xl leading-none text-accent sm:text-5xl">404</p>
          <h1 className="mt-3 font-display text-2xl uppercase tracking-[0.12em] text-text sm:text-3xl">
            Page not found
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-text/60 sm:text-base">
            The link may be missing, moved, or no longer available.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-text transition-opacity hover:opacity-85"
            >
              Go Home
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-text transition-opacity hover:opacity-85"
            >
              Browse Players
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-text transition-opacity hover:opacity-85"
            >
              View Teams
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
