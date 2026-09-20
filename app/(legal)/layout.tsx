import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="bg-surface-50 dark:bg-[#0B0E14] pt-32 pb-24 min-h-screen text-ink-900 dark:text-zinc-100 transition-colors">
        <article className="mx-auto max-w-3xl px-6">{children}</article>
      </main>
      <Footer />
    </>
  );
}
