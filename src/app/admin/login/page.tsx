import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

/** Static page: the form posts to /api/admin/login, which sets the httpOnly session cookie. */
export default function AdminLoginPage() {
  return (
    <section className="mx-auto max-w-[480px] py-8 sm:py-14">
      <div className="float p-6 sm:p-8">
        <p className="eyebrow">Sundial Years · owner only</p>
        <h1 className="mt-3 text-[2rem] font-semibold leading-tight">Sign in to the dashboard</h1>
        <p className="mt-2 text-[1.0625rem] leading-relaxed text-ink-2">
          Errors, contact messages, feedback, the test inbox and the source watch. You stay signed in on this browser until you sign out or the session expires.
        </p>
        <LoginForm />
      </div>
    </section>
  );
}
