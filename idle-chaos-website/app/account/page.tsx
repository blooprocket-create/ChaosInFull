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

      {/* Danger zone: Delete account */}
      <div className="mt-12 rounded-lg border border-red-500/30 bg-red-500/5 p-5">
        <h2 className="text-xl font-semibold text-red-300">Delete Account</h2>
        <p className="text-sm text-red-200/80 mt-1">This permanently deletes your user, characters, items, storage, and stats. There is no undo.</p>
        <form className="mt-4 grid gap-3" id="delete-form" data-delete>
          <input name="username" placeholder="Confirm your username" className="w-full rounded bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-red-500" />
          <input name="password" type="password" placeholder="Confirm your password" className="w-full rounded bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-red-500" />
          <div className="flex items-center gap-2 text-sm">
            <span id="captcha-q" className="text-red-200"/>
          </div>
          <input name="captcha" placeholder="Answer" className="w-40 rounded bg-black/40 border border-white/10 px-3 py-2 outline-none focus:border-red-500" />
          <button className="btn border-red-500/50 hover:border-red-500 text-red-200">Delete my account</button>
        </form>
      </div>

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
          // Delete account handler with simple captcha
          const df = document.querySelector('#delete-form');
          if (df) {
            const qEl = document.querySelector('#captcha-q');
            const a = Math.floor(Math.random()*9)+1, b = Math.floor(Math.random()*9)+1;
            qEl && (qEl.textContent = 'Captcha: What is ' + a + ' + ' + b + '?');
            const expected = a + b;
            df.addEventListener('submit', async (e) => {
              e.preventDefault();
              const btn = df.querySelector('button');
              btn?.setAttribute('disabled','');
              try {
                const fd = new FormData(df);
                const body = {
                  username: fd.get('username'),
                  password: fd.get('password'),
                  captcha: String(fd.get('captcha')||'').trim(),
                  expected: expected.toString(),
                };
                const res = await fetch('/api/account/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Request failed');
                alert('Account deleted. Bye forever.');
                window.location.href = '/';
              } catch (err) {
                alert((err && err.message) ? err.message : 'Could not delete account');
              } finally {
                btn?.removeAttribute('disabled');
              }
            });
          }
        `,
        }}
      />
    </section>
  );
}
