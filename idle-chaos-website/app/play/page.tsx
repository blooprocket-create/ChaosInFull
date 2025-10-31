import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Veil Keeper fully replaces the old game. Redirect /play to /phaser.
export default function PlayPage() {
  redirect("/phaser");
}
