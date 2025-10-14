import { redirect } from "next/navigation";
import { getSession } from "@/src/lib/auth";

export const metadata = { title: "Account Settings • Chaos In Full" };

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold">Account Settings</h1>
      <p className="text-gray-400 mt-2">Manage your display name and password.</p>

      {/* Update display name */}
      <form action="/api/account/profile" method="post" className="mt-8 space-y-3" data-enhance>
        <h2 className="text-xl font-semibold">Display Name</h2>
        <input name="username" defaultValue={session.email.split("@")[0]} placeholder="New display name" className="w-full rounded bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-purple-500" />
        <button className="btn">Save Name</button>
      </form>

      {/* Change password */}
      <form action="/api/account/password" method="post" className="mt-10 space-y-3" data-enhance>
        <h2 className="text-xl font-semibold">Change Password</h2>
        <input name="currentPassword" type="password" placeholder="Current password" className="w-full rounded bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-purple-500" />
        <input name="newPassword" type="password" placeholder="New password" className="w-full rounded bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-purple-500" />
        <input name="confirmPassword" type="password" placeholder="Confirm new password" className="w-full rounded bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-purple-500" />
        <button className="btn">Update Password</button>
      </form>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          document.querySelectorAll('form[data-enhance]').forEach(form => {
            form.addEventListener('submit', async (e) => {
              e.preventDefault();
              const btn = form.querySelector('button');
              btn?.setAttribute('disabled','');
              try {
                const res = await fetch(form.action, { method: 'POST', body: new FormData(form) });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Request failed');
                window.dispatchEvent(new Event('auth:changed'));
                alert(data.message || 'Saved');
              } catch (err) {
                alert(err.message || 'Something went wrong');
              } finally {
                btn?.removeAttribute('disabled');
              }
            })
          })
        `,
        }}
      />
    </section>
  );
}
