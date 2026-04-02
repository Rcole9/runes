import Link from "next/link";

export default function Home() {
  return (
    <main className="landing">
      <div className="landing-card">
        <p className="eyebrow">Web RPG Prototype</p>
        <h1>Runes of the Void</h1>
        <p>
          Descend into seeded dungeon instances, outplay telegraphed boss attacks,
          and build your power level with loot.
        </p>
        <Link href="/play" className="play-button">
          Play
        </Link>
      </div>
    </main>
  );
}
