import Link from "next/link";

export default function Home() {
  return (
    <main className="landing">
      <div className="landing-cave-layer landing-cave-back" aria-hidden="true" />
      <div className="landing-cave-layer landing-cave-mid" aria-hidden="true" />
      <div className="landing-cave-layer landing-cave-fore" aria-hidden="true" />
      <div className="landing-fx-ring" aria-hidden="true" />
      <div className="landing-fx-grid" aria-hidden="true" />
      <div className="landing-hero-art" aria-hidden="true">
        <img
          className="hero-sprite hero-player"
          src="/assets/sprites/rpg-characters/freepixel-rpg-characters-companions/warrior-knight-with-sword-021.png"
          alt=""
        />
        <img
          className="hero-sprite hero-boss"
          src="/assets/sprites/rpg-enemies/freepixel-theme-dungeon-crawler/dungeon-orc-large-green-axe-warrior-brute_20260217_222727.png"
          alt=""
        />
      </div>

      <section className="landing-card">
        <p className="eyebrow">Cave Descent</p>
        <h1 className="landing-title">Runes of the Void</h1>
        <p className="landing-copy">
          Drop into a mineral-lit cavern where broken ledges, boss chambers, and
          buried relics pull every run deeper into the dark.
        </p>

        <div className="landing-tags" aria-label="Game highlights">
          <span className="landing-tag">Cave boss every 3rd floor</span>
          <span className="landing-tag">Relics and loot drops</span>
          <span className="landing-tag">Class switching mid-run</span>
        </div>

        <div className="landing-actions">
          <Link href="/play" className="play-button">
            Enter the Caverns
          </Link>
          <a href="https://kenney.nl/assets" target="_blank" rel="noreferrer" className="landing-link">
            Art packs by Kenney
          </a>
        </div>
      </section>
    </main>
  );
}
