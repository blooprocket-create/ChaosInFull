import { redirect } from "next/navigation";
import { getSession } from "@/src/lib/auth";
import DeleteAccountClient from "@/src/components/DeleteAccountClient";

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
        <DeleteAccountClient />
      </div>
    </section>
  );
}
