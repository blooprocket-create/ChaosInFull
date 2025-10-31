import { redirect } from "next/navigation";

export const metadata = { title: "World • Chaos In Full", description: "World is now part of Veil Keeper.", openGraph: { title: "Chaos In Full World", images: ["/og/world.png"] } };

// Redirect legacy world page to the new Veil Keeper experience
export default function WorldPage() {
  redirect("/phaser");
}
