/**
 * GlassPlayground — visual lab for exploring glass morphism variants
 * over deep dark vibrant gradient backgrounds.
 */

import { motion } from "framer-motion";

// ─── Google Fonts (injected once) ────────────────────────────────────────────
const FONT_LINK = "https://fonts.googleapis.com/css2?family=Cormorant:wght@300;400&family=Geist+Mono:wght@300;400&display=swap";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface GradientScene {
  id: string;
  name: string;
  tag: string;
  background: string;
  /** OKLCH color for tinted glass + luminous glow, without alpha */
  accent: string;
  accentRaw: string; // for box-shadow glow construction
}

const SCENES: GradientScene[] = [
  {
    id: "bio",
    name: "Bioluminescent",
    tag: "deep teal",
    accent: "oklch(67% 0.24 184)",
    accentRaw: "67% 0.24 184",
    background: `
      radial-gradient(ellipse at 18% 55%, oklch(34% 0.14 195 / 85%) 0%, transparent 58%),
      radial-gradient(ellipse at 78% 18%, oklch(28% 0.11 185 / 65%) 0%, transparent 52%),
      radial-gradient(ellipse at 55% 95%, oklch(22% 0.09 208 / 75%) 0%, transparent 50%),
      linear-gradient(145deg, oklch(8% 0.030 215) 0%, oklch(13% 0.042 200) 55%, oklch(7% 0.022 222) 100%)
    `,
  },
  {
    id: "violet",
    name: "Violet Abyss",
    tag: "indigo void",
    accent: "oklch(63% 0.28 289)",
    accentRaw: "63% 0.28 289",
    background: `
      radial-gradient(ellipse at 25% 40%, oklch(30% 0.20 290 / 85%) 0%, transparent 55%),
      radial-gradient(ellipse at 80% 70%, oklch(25% 0.18 275 / 70%) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 10%, oklch(20% 0.14 300 / 60%) 0%, transparent 45%),
      linear-gradient(160deg, oklch(7% 0.025 295) 0%, oklch(11% 0.035 280) 50%, oklch(8% 0.020 310) 100%)
    `,
  },
  {
    id: "molten",
    name: "Molten Core",
    tag: "amber-crimson",
    accent: "oklch(68% 0.22 48)",
    accentRaw: "68% 0.22 48",
    background: `
      radial-gradient(ellipse at 60% 30%, oklch(38% 0.18 42 / 90%) 0%, transparent 55%),
      radial-gradient(ellipse at 15% 75%, oklch(30% 0.20 22 / 80%) 0%, transparent 50%),
      radial-gradient(ellipse at 85% 85%, oklch(25% 0.15 35 / 65%) 0%, transparent 45%),
      linear-gradient(130deg, oklch(7% 0.022 30) 0%, oklch(12% 0.038 18) 50%, oklch(9% 0.028 45) 100%)
    `,
  },
  {
    id: "aurora",
    name: "Aurora",
    tag: "teal-violet-green",
    accent: "oklch(72% 0.20 175)",
    accentRaw: "72% 0.20 175",
    background: `
      radial-gradient(ellipse at 20% 30%, oklch(38% 0.18 175 / 80%) 0%, transparent 52%),
      radial-gradient(ellipse at 70% 60%, oklch(30% 0.22 290 / 75%) 0%, transparent 48%),
      radial-gradient(ellipse at 45% 95%, oklch(26% 0.15 145 / 70%) 0%, transparent 45%),
      radial-gradient(ellipse at 90% 10%, oklch(22% 0.12 260 / 60%) 0%, transparent 40%),
      linear-gradient(155deg, oklch(7% 0.022 185) 0%, oklch(9% 0.020 270) 50%, oklch(7% 0.018 155) 100%)
    `,
  },
  {
    id: "ocean",
    name: "Midnight Ocean",
    tag: "blue-cyan depths",
    accent: "oklch(66% 0.22 220)",
    accentRaw: "66% 0.22 220",
    background: `
      radial-gradient(ellipse at 40% 20%, oklch(32% 0.16 225 / 85%) 0%, transparent 55%),
      radial-gradient(ellipse at 80% 65%, oklch(26% 0.18 210 / 75%) 0%, transparent 50%),
      radial-gradient(ellipse at 10% 80%, oklch(22% 0.12 235 / 65%) 0%, transparent 45%),
      linear-gradient(150deg, oklch(6% 0.020 230) 0%, oklch(10% 0.030 215) 55%, oklch(8% 0.022 240) 100%)
    `,
  },
  {
    id: "volcanic",
    name: "Volcanic",
    tag: "obsidian embers",
    accent: "oklch(62% 0.24 32)",
    accentRaw: "62% 0.24 32",
    background: `
      radial-gradient(ellipse at 50% 80%, oklch(35% 0.22 28 / 90%) 0%, transparent 55%),
      radial-gradient(ellipse at 85% 25%, oklch(28% 0.18 18 / 75%) 0%, transparent 48%),
      radial-gradient(ellipse at 15% 40%, oklch(20% 0.14 38 / 65%) 0%, transparent 42%),
      linear-gradient(170deg, oklch(6% 0.018 15) 0%, oklch(10% 0.025 30) 45%, oklch(8% 0.020 8) 100%)
    `,
  },
  {
    id: "synthwave",
    name: "Synthwave",
    tag: "magenta-pink neon",
    accent: "oklch(64% 0.28 330)",
    accentRaw: "64% 0.28 330",
    background: `
      radial-gradient(ellipse at 30% 50%, oklch(32% 0.24 320 / 85%) 0%, transparent 55%),
      radial-gradient(ellipse at 75% 25%, oklch(26% 0.20 285 / 75%) 0%, transparent 50%),
      radial-gradient(ellipse at 60% 90%, oklch(28% 0.22 345 / 70%) 0%, transparent 48%),
      linear-gradient(140deg, oklch(7% 0.025 315) 0%, oklch(10% 0.030 290) 45%, oklch(8% 0.022 340) 100%)
    `,
  },
  {
    id: "forest",
    name: "Forest Void",
    tag: "deep emerald",
    accent: "oklch(62% 0.26 148)",
    accentRaw: "62% 0.26 148",
    background: `
      radial-gradient(ellipse at 25% 65%, oklch(28% 0.18 148 / 85%) 0%, transparent 55%),
      radial-gradient(ellipse at 75% 30%, oklch(22% 0.14 162 / 70%) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 95%, oklch(18% 0.10 140 / 65%) 0%, transparent 45%),
      linear-gradient(145deg, oklch(6% 0.018 152) 0%, oklch(9% 0.024 145) 55%, oklch(7% 0.016 162) 100%)
    `,
  },
];

// ─── Glass panel definitions ──────────────────────────────────────────────────

interface GlassVariant {
  id: string;
  label: string;
  description: string;
  getStyle: (accent: string, accentRaw: string) => React.CSSProperties;
  blur: string;
}

const GLASS_VARIANTS: GlassVariant[] = [
  {
    id: "frost",
    label: "Frost",
    description: "Pure white diffusion",
    blur: "backdrop-blur-xl",
    getStyle: () => ({
      background: "oklch(100% 0 0 / 7%)",
      border: "1px solid oklch(100% 0 0 / 15%)",
      boxShadow: "inset 0 1px 0 oklch(100% 0 0 / 20%)",
    }),
  },
  {
    id: "tinted",
    label: "Tinted",
    description: "Hue-matched saturation",
    blur: "backdrop-blur-md",
    getStyle: (_accent, accentRaw) => ({
      background: `oklch(${accentRaw} / 15%)`,
      border: `1px solid oklch(${accentRaw} / 28%)`,
      boxShadow: `inset 0 1px 0 oklch(${accentRaw} / 35%)`,
    }),
  },
  {
    id: "deep",
    label: "Deep",
    description: "Shadow-dark absorption",
    blur: "backdrop-blur-2xl",
    getStyle: () => ({
      background: "oklch(10% 0.008 220 / 52%)",
      border: "1px solid oklch(100% 0 0 / 0%)",
      borderTop: "1px solid oklch(100% 0 0 / 18%)",
      boxShadow: "inset 0 1px 0 oklch(100% 0 0 / 14%), 0 4px 24px oklch(0% 0 0 / 40%)",
    }),
  },
  {
    id: "luminous",
    label: "Luminous",
    description: "Charged with light",
    blur: "backdrop-blur-sm",
    getStyle: (_accent, accentRaw) => ({
      background: `oklch(${accentRaw} / 4%)`,
      border: `1px solid oklch(${accentRaw} / 40%)`,
      boxShadow: [
        `inset 0 0 20px oklch(${accentRaw} / 12%)`,
        `0 0 30px oklch(${accentRaw} / 18%)`,
        `0 0 60px oklch(${accentRaw} / 8%)`,
        `inset 0 1px 0 oklch(${accentRaw} / 50%)`,
      ].join(", "),
    }),
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

interface GlassPanelProps {
  variant: GlassVariant;
  scene: GradientScene;
  delay: number;
}

const GlassPanel = ({ variant, scene, delay }: GlassPanelProps) => {
  const style = variant.getStyle(scene.accent, scene.accentRaw);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`relative rounded-xl p-5 ${variant.blur} flex flex-col gap-3`}
      style={style}
    >
      {/* Label row */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-medium tracking-[0.18em] uppercase"
          style={{ fontFamily: "'Geist Mono', monospace", color: scene.accent }}
        >
          {variant.label}
        </span>
        <span
          className="text-[10px] opacity-50 tracking-wider"
          style={{ fontFamily: "'Geist Mono', monospace", color: "oklch(90% 0 0)" }}
        >
          {variant.id}
        </span>
      </div>

      {/* Content */}
      <p
        className="text-xs leading-relaxed opacity-70"
        style={{ color: "oklch(88% 0.006 220)", fontFamily: "'Geist Mono', monospace" }}
      >
        {variant.description}
      </p>

      {/* Button */}
      <button
        className="mt-1 self-start rounded-full px-4 py-1.5 text-[11px] tracking-widest uppercase transition-all duration-200 hover:opacity-90 active:scale-95"
        style={{
          fontFamily: "'Geist Mono', monospace",
          background: `oklch(${scene.accentRaw} / 22%)`,
          border: `1px solid oklch(${scene.accentRaw} / 45%)`,
          color: scene.accent,
          boxShadow: `0 0 12px oklch(${scene.accentRaw} / 15%)`,
        }}
      >
        Examine
      </button>
    </motion.div>
  );
};

interface SceneCardProps {
  scene: GradientScene;
  index: number;
}

const SceneCard = ({ scene, index }: SceneCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.7, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    className="relative overflow-hidden rounded-2xl"
    style={{ background: scene.background, minHeight: 420 }}
  >
    {/* Scene header */}
    <div className="relative z-10 px-6 pt-6 pb-4">
      <div className="flex items-baseline gap-3">
        <h2
          className="text-2xl font-light tracking-wide"
          style={{
            fontFamily: "'Cormorant', Georgia, serif",
            color: "oklch(94% 0.010 220)",
          }}
        >
          {scene.name}
        </h2>
        <span
          className="text-xs tracking-[0.22em] uppercase opacity-50"
          style={{
            fontFamily: "'Geist Mono', monospace",
            color: scene.accent,
          }}
        >
          {scene.tag}
        </span>
      </div>
      {/* Accent line */}
      <div
        className="mt-2 h-px w-16 rounded-full"
        style={{ background: `linear-gradient(to right, ${scene.accent}, transparent)` }}
      />
    </div>

    {/* Glass variants grid */}
    <div className="relative z-10 grid grid-cols-2 gap-3 px-6 pb-6">
      {GLASS_VARIANTS.map((variant, vi) => (
        <GlassPanel
          key={variant.id}
          variant={variant}
          scene={scene}
          delay={index * 0.08 + vi * 0.06 + 0.2}
        />
      ))}
    </div>

    {/* Subtle noise overlay for texture */}
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.025]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        mixBlendMode: "overlay",
      }}
    />
  </motion.div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GlassPlayground() {
  return (
    <>
      {/* Font injection */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href={FONT_LINK} rel="stylesheet" />

      <div
        className="min-h-screen"
        style={{ background: "oklch(7% 0.020 220)", fontFamily: "'Geist Mono', monospace" }}
      >
        {/* ── Sticky header ── */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="sticky top-0 z-50 flex items-center justify-between px-8 py-5"
          style={{
            background: "oklch(7% 0.020 220 / 85%)",
            backdropFilter: "blur(24px)",
            borderBottom: "1px solid oklch(100% 0 0 / 6%)",
          }}
        >
          <div className="flex items-baseline gap-4">
            <h1
              className="text-3xl font-light tracking-[0.12em]"
              style={{ fontFamily: "'Cormorant', Georgia, serif", color: "oklch(94% 0.010 220)" }}
            >
              Glass Lab
            </h1>
            <span
              className="text-[10px] tracking-[0.3em] uppercase opacity-40"
              style={{ color: "oklch(70% 0.024 220)" }}
            >
              v0.1
            </span>
          </div>

          <div className="flex items-center gap-6">
            {GLASS_VARIANTS.map((v) => (
              <span
                key={v.id}
                className="text-[10px] tracking-[0.2em] uppercase opacity-40 hover:opacity-80 transition-opacity cursor-default"
                style={{ color: "oklch(80% 0.012 220)" }}
              >
                {v.label}
              </span>
            ))}
          </div>
        </motion.header>

        {/* ── Intro ── */}
        <div className="px-8 pt-10 pb-8">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-xs leading-loose tracking-wider max-w-xl opacity-30"
            style={{ color: "oklch(80% 0.012 220)" }}
          >
            Eight chromatic environments. Four glass morphologies per specimen.
            Frost · Tinted · Deep · Luminous — each interacts differently with the
            underlying chromatic field.
          </motion.p>
        </div>

        {/* ── Grid ── */}
        <main className="px-8 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-7xl mx-auto">
            {SCENES.map((scene, i) => (
              <SceneCard key={scene.id} scene={scene} index={i} />
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
