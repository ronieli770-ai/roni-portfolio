import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Mail, Phone } from "lucide-react";
import Galaxy from "./Galaxy";

/**
 * Studio Roni — landing page.
 *
 * The Figma comp is a 1728 × 8958 absolutely-positioned canvas. Everything below
 * is expressed in *design pixels* and converted to container-relative units
 * (`--u`), so the whole canvas scales fluidly with the viewport without ever
 * distorting an element. Below `lg` the same content reflows into a stacked
 * mobile layout.
 */

const CANVAS_W = 1728;
const CANVAS_H = 8958;

/** design px -> fluid canvas unit */
const u = (n: number) => `calc(${n} * var(--u))`;

type BoxProps = {
  x: number;
  y: number;
  w?: number;
  h?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  /** rotation in degrees, about the box centre */
  rotate?: number;
  /** anchor the box by its right edge instead of its left (RTL text blocks) */
  fromRight?: boolean;
  /** scroll-reveal style; the motion CSS composes this with `rotate` */
  reveal?: "up" | "fade";
  /** stagger, in ms */
  delay?: number;
  /** parallax factor, e.g. 0.05 — positive drifts against the scroll */
  parallax?: number;
};

/** Absolutely positioned box in design-pixel coordinates. */
function Box({
  x, y, w, h, className, style, children, rotate, fromRight, reveal, delay, parallax,
}: BoxProps) {
  return (
    <div
      className={className}
      data-reveal={reveal}
      data-parallax={parallax}
      style={{
        position: "absolute",
        top: u(y),
        ...(fromRight ? { right: u(CANVAS_W - x) } : { left: u(x) }),
        ...(w !== undefined ? { width: u(w) } : null),
        ...(h !== undefined ? { height: u(h) } : null),
        // exposed as a variable so reveal/hover transforms can re-apply it
        ...(rotate ? ({ ["--rot" as string]: `${rotate}deg` } as CSSProperties) : null),
        ...(rotate && !reveal ? { transform: `rotate(${rotate}deg)` } : null),
        ...(delay ? ({ ["--d" as string]: `${delay}ms` } as CSSProperties) : null),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Drives the scroll reveals and the parallax layers.
 *
 * Reveals fire once and then stop being observed. Parallax is recomputed on
 * scroll behind a rAF gate rather than every frame, so idle scrolling costs
 * nothing. Both are inert under prefers-reduced-motion — the CSS neutralises
 * the transforms, and this skips the work entirely.
 */
function useMotion() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    // A plain viewport test rather than IntersectionObserver: one mechanism
    // drives both reveals and parallax, and content can never get stranded
    // invisible if the observer never delivers a callback.
    let pending = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const reveal = () => {
      const vh = window.innerHeight;
      pending = pending.filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.9 && r.bottom > 0) {
          el.classList.add("is-in");
          return false;
        }
        return true;
      });
    };

    const layers = Array.from(
      document.querySelectorAll<HTMLElement>("[data-parallax]"),
    );
    let queued = false;
    const apply = () => {
      queued = false;
      const vh = window.innerHeight;
      for (const el of layers) {
        const r = el.getBoundingClientRect();
        const centred = (r.top + r.height / 2 - vh / 2) / vh;
        const factor = parseFloat(el.dataset.parallax || "0");
        el.style.setProperty("--py", `${(centred * factor * -100).toFixed(1)}px`);
      }
    };
    const onScroll = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(() => {
          apply();
          reveal();
        });
      }
    };
    apply();
    reveal();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
}

function useSteppedSection(totalSteps: number) {
  const ref = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const lockRef = useRef(false);
  const touchYRef = useRef(0);

  const advance = useCallback((delta: number) => {
    if (lockRef.current) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top > 10 || r.bottom < window.innerHeight - 10) return;

    if (delta > 0 && step < totalSteps) {
      lockRef.current = true;
      setStep((s) => s + 1);
      setTimeout(() => { lockRef.current = false; }, 700);
    } else if (delta < 0 && step > 0) {
      lockRef.current = true;
      setStep((s) => s - 1);
      setTimeout(() => { lockRef.current = false; }, 700);
    }
  }, [step, totalSteps]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(totalSteps);
      return;
    }

    const onWheel = (e: WheelEvent) => {
      const r = el.getBoundingClientRect();
      if (r.top > 10 || r.bottom < window.innerHeight - 10) return;

      const goingDown = e.deltaY > 0;
      const goingUp = e.deltaY < 0;

      if ((goingDown && step < totalSteps) || (goingUp && step > 0)) {
        e.preventDefault();
        e.stopPropagation();
        advance(e.deltaY);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      touchYRef.current = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const r = el.getBoundingClientRect();
      if (r.top > 10 || r.bottom < window.innerHeight - 10) return;
      const dy = touchYRef.current - e.touches[0].clientY;
      if (Math.abs(dy) < 30) return;
      const goingDown = dy > 0;
      const goingUp = dy < 0;
      if ((goingDown && step < totalSteps) || (goingUp && step > 0)) {
        e.preventDefault();
        advance(dy);
        touchYRef.current = e.touches[0].clientY;
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, [step, totalSteps, advance]);

  return { ref, step };
}

/* ------------------------------------------------------------------ content */

const WHY_ME = [
  {
    box: { x: 1238, y: 1486, w: 373, h: 159 },
    text: { x: 1254, y: 1508, w: 342 },
    title: "עיצוב פרימיום שיגרום להם להגיד וואו",
    body: "לא עוד תבנית גנרית שכולם מכירים. כל פרויקט מקבל שפה ויזואלית ייחודית, קומפוזיציה מדויקת ותשומת לב לכל פיקסל - כזה שגורם לגולשים להבין מיד שאתם בטופ.",
  },
  {
    box: { x: 621, y: 1396, w: 373, h: 159 },
    text: { x: 637, y: 1430, w: 342 },
    title: "מצוינות טכנולוגית ומעטפת מלאה",
    body: "מאפיון מדויק, דרך סקיצה ייחודית ועד פיתוח חלק ומהיר. אתם מקבלים אתר מתקדם, עמיד ומרשים שנראה ופועל בקדמת הטכנולוגיה.",
  },
  {
    box: { x: 117, y: 1565, w: 373, h: 159 },
    text: { x: 149, y: 1587, w: 310 },
    title: "חוויה אינטראקטיבית שמניעה לפעולה",
    body: "אתר יפה זה לא מספיק. שילוב של אנימציות דינמיות, מיקרו-אינטראקציות וקופי מדויק שמחזיקים את המשתמש עד התחתית - וגורמים לו להשאיר פרטים.",
  },
];

const PROJECT_COPY = {
  eyebrow: "Business name",
  title: "אתר / דף נחיתה",
  headline: "עיצוב פרימיום שיגרום להם להגיד וואו",
  body: "לא עוד תבנית גנרית שכולם מכירים. כל פרויקט מקבל שפה ויזואלית ייחודית, קומפוזיציה מדויקת ותשומת לב לכל פיקסל - כזה שגורם לגולשים להבין מיד שאתם בטופ.",
  cta: "למעבר לפרוייקט",
};

/** The three portfolio blocks. `edge` is the right edge of the RTL text column. */
const PROJECTS = [
  { laptop: { x: -93, y: 2343 }, screen: { x: 110, y: 2517 }, edge: 1611, eyebrowY: 2752, titleY: 2782, bodyY: 2917, ctaY: 3047 },
  { laptop: { x: 483, y: 3469 }, screen: { x: 686, y: 3643 }, edge: 407, eyebrowY: 3877, titleY: 3907, bodyY: 4042, ctaY: 4172 },
  { laptop: { x: -93, y: 4610 }, screen: { x: 110, y: 4784 }, edge: 1611, eyebrowY: 5019, titleY: 5049, bodyY: 5185, ctaY: 5314 },
];

const BENEFITS = [
  {
    cx: 311.8, cy: 6278, w: 463, h: 635, rotate: -3, avatar: 215,
    img: "/assets/avatar-1.png",
    title: "בולטות מול המתחרים",
    body: "רוב האתרים בשוק נראים אותו דבר ונשכחים שנייה אחרי שסוגרים את הלשונית. אתר דינמי עם שפה ויזואלית ייחודית מייצר אימפקט שאי אפשר להתעלם ממנו.",
  },
  {
    cx: 864.5, cy: 6254, w: 545, h: 662, rotate: 0, avatar: 242,
    img: "/assets/avatar-2.png",
    title: "אמון והמרה מהירה",
    body: "כשגולש נכנס לאתר חווייתי, זורם ומרשים, רמת האמון שלו מזנקת בשניות. הוא לא רק מסתכל, הוא מבין עם מי יש לו עסק ומשאיר פרטים בביטחון מלא.",
  },
  {
    cx: 1449, cy: 6254, w: 455, h: 635, rotate: 3.5, avatar: 230,
    img: "/assets/avatar-3.png",
    title: "מיצוי הפוטנציאל והעלאת מחירים",
    body: "לקוחות משלמים יותר למותגים שנראים כמו הtop של התעשייה. אתר מעוצב בסטנדרט פרימיום מייצר אוטוריטה מיידית ומאפשר לכם לגבות את המחיר שבאמת מגיע לכם.",
  },
];

const FORM_FIELDS = [
  { name: "phone", placeholder: "טלפון", x: 139, y: 8402, w: 319 },
  { name: "fullName", placeholder: "שם מלא", x: 474, y: 8402, w: 319 },
  { name: "business", placeholder: "שם העסק או לינק לאתר קיים (רשות)", x: 139, y: 8466, w: 653 },
  { name: "field", placeholder: "מה תחום העסק שלכם?", x: 139, y: 8530, w: 653, h: 155, multiline: true },
  { name: "goal", placeholder: "מה היעד המרכזי של האתר?", x: 139, y: 8699, w: 653 },
];

const CONTACT = { email: "ronieli770@gmail.com", phone: "050-2463500" };

/* ------------------------------------------------------------ shared pieces */

/** The glass panel used for every card in the comp. */
const glass =
  "rounded-[--card-radius] border border-white/0 bg-glass backdrop-blur-glass overflow-hidden";

/** Gradient display type: #8da8cb -> white, left to right. */
const displayGradient =
  "bg-gradient-to-r from-heading-from to-white bg-clip-text text-transparent text-gradient-fill";

function BrandButton({ label, className = "" }: { label: string; className?: string }) {
  return (
    <button
      type="button"
      className={`hov-btn grid h-full w-full place-items-center rounded-[--btn-radius] bg-gradient-to-l from-brand to-brand-light font-semibold text-white ${className}`}
      style={{ fontSize: u(24) }}
    >
      {label}
    </button>
  );
}

/** Laptop mock-up: dark bezel, screen slot, silver deck. Screen takes an image. */
function Laptop({ x, y, screen }: { x: number; y: number; screen: { x: number; y: number } }) {
  const bezelX = screen.x - 24 - x;
  const bezelY = screen.y - 27 - y;
  return (
    <>
      {/* deck */}
      <Box x={x + 133} y={y + 787} w={1057} h={34} className="pointer-events-none">
        <div
          className="h-full w-full bg-gradient-to-b from-[#e9eaec] via-[#b9bcc1] to-[#7e8288]"
          style={{
            borderRadius: `0 0 ${u(10)} ${u(10)}`,
            clipPath: "polygon(1.5% 0, 98.5% 0, 100% 100%, 0 100%)",
          }}
        />
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 bg-[#8d9197]"
          style={{ width: u(150), height: u(4), borderRadius: u(4) }}
        />
      </Box>
      {/* lid */}
      <Box x={x + bezelX} y={y + bezelY} w={963} h={630} className="pointer-events-none">
        <div
          className="hov-card h-full w-full bg-[#1b1c1e] shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
          style={{ borderRadius: u(16) }}
        >
          <div
            className="absolute overflow-hidden bg-white"
            style={{ inset: `${u(27)} ${u(24)}`, borderRadius: u(3) }}
          >
            {/* project screenshot slot — drop an <img> in here */}
            <div className="h-full w-full bg-white" />
          </div>
        </div>
      </Box>
    </>
  );
}

function Connector({
  x, y, w, h, dir, active,
}: { x: number; y: number; w: number; h: number; dir: "up" | "up-left" | "up-right"; active: boolean }) {
  const from = dir === "up" ? [w / 2, h] : dir === "up-left" ? [w, h] : [0, h];
  const to = dir === "up" ? [w / 2, 0] : dir === "up-left" ? [0, 0] : [w, 0];
  const len = Math.sqrt((to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2);
  return (
    <Box x={x} y={y} w={w} h={h} className={`pointer-events-none step-connector ${active ? "is-active" : ""}`}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full overflow-visible" fill="none">
        <path
          d={`M${from[0]} ${from[1]} L${to[0]} ${to[1]}`}
          stroke="rgba(255,255,255,0.65)"
          strokeWidth="3"
          strokeDasharray="10 10"
          strokeDashoffset={active ? 0 : len}
          className="connector-line"
        />
        <path
          d={`M${to[0]} ${to[1]} l${dir === "up" ? "-11 16" : dir === "up-left" ? "16 4" : "-16 4"} M${to[0]} ${to[1]} l${dir === "up" ? "11 16" : dir === "up-left" ? "4 16" : "-4 16"}`}
          stroke="rgba(255,255,255,0.8)"
          strokeWidth="3"
          className="connector-arrow"
        />
      </svg>
      <div
        className={`absolute rounded-full border-2 border-white bg-white/85 step-dot ${active ? "is-active anim-dot" : ""}`}
        style={{
          width: u(34), height: u(34),
          left: dir === "up" ? `calc(50% - ${u(17)})` : dir === "up-left" ? `calc(100% - ${u(34)})` : 0,
          top: `calc(100% - ${u(17)})`,
        }}
      />
    </Box>
  );
}

/* ------------------------------------------------------------------- canvas */

/**
 * The eight snap sections, in scroll order. `top` and `height` are the band each
 * one shows of the original 1728 × 8958 comp, so every element below keeps the
 * exact y it has in Figma — `Snap` slides the plane up by `top` instead.
 */
const SECTIONS = {
  hero:     { top: 0,    height: 1230 },
  whyMe:    { top: 1230, height: 1005 },
  project1: { top: 2235, height: 1165 },
  project2: { top: 3400, height: 1089 },
  project3: { top: 4489, height: 1131 },
  whyNeed:  { top: 5620, height: 1099 },
  about:    { top: 6719, height: 1122 },
  contact:  { top: 7841, height: 1117 },
} as const;

/** Scroll order, and the label each dot announces. */
const SECTION_ORDER = [
  ["hero", "פתיחה"],
  ["whyMe", "למה לעבוד דווקא איתי"],
  ["project1", "פרויקט 1"],
  ["project2", "פרויקט 2"],
  ["project3", "פרויקט 3"],
  ["whyNeed", "למה אתם צריכים את זה"],
  ["about", "נעים להכיר"],
  ["contact", "מוכנים להמריא"],
] as const;

/**
 * One full-viewport snap section.
 *
 * `--u` is the smaller of "fit the width" and "fit the height", so the band
 * scales to fill as much of the viewport as it can without ever distorting —
 * any leftover is black margin, which the glows bleed into. Children are laid
 * out on a full-canvas plane offset by `-top`, which is what lets every element
 * keep its original Figma coordinate.
 */
/**
 * Keyboard paging and the active-section index.
 *
 * CSS scroll-snap already locks the scroll position; this adds the parts it
 * cannot: arrow/page/home/end navigation, and tracking which section is current
 * so the indicator can reflect it.
 */
function useFullPage() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const sections = () =>
      Array.from(document.querySelectorAll<HTMLElement>(".snap-section"));

    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const goTo = (i: number) => {
      const all = sections();
      const target = all[Math.max(0, Math.min(all.length - 1, i))];
      target?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    };

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      // never hijack typing in the contact form
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      const current = Math.round(window.scrollY / window.innerHeight);
      const keys: Record<string, number> = {
        ArrowDown: current + 1, PageDown: current + 1, " ": current + 1,
        ArrowUp: current - 1, PageUp: current - 1,
        Home: 0, End: sections().length - 1,
      };
      if (!(e.key in keys)) return;
      e.preventDefault();
      goTo(keys[e.key]);
    };

    const onScroll = () => {
      setActive(Math.round(window.scrollY / window.innerHeight));
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return active;
}

/** Fixed dot indicator: which section you are on, and a way to jump. */
function SectionNav({ active }: { active: number }) {
  return (
    <nav
      aria-label="ניווט בין סקשנים"
      className="fixed left-6 top-1/2 z-50 hidden -translate-y-1/2 flex-col gap-3 lg:flex"
    >
      {SECTION_ORDER.map(([key, label], i) => (
        <button
          key={key}
          type="button"
          aria-label={label}
          aria-current={i === active}
          onClick={() =>
            document.querySelectorAll<HTMLElement>(".snap-section")[i]?.scrollIntoView({
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "auto"
                : "smooth",
              block: "start",
            })
          }
          className={`h-2.5 w-2.5 rounded-full border border-white/50 transition-all duration-300 hover:scale-125 ${
            i === active ? "scale-125 border-brand-light bg-brand-light" : "bg-white/0"
          }`}
        />
      ))}
    </nav>
  );
}

function Snap({
  top, height, label, bg, children, sectionRef,
}: {
  top: number;
  height: number;
  label: string;
  bg?: ReactNode;
  children: ReactNode;
  sectionRef?: React.Ref<HTMLElement>;
}) {
  const plane = (clip: boolean) => ({
    position: "absolute" as const,
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: u(CANVAS_W),
    height: u(height),
    ...(clip ? { overflow: "hidden" as const } : null),
  });

  return (
    <section
      ref={sectionRef}
      aria-label={label}
      className="snap-section relative w-full overflow-hidden bg-background"
      style={{
        height: "100dvh",
        containerType: "size",
        ["--u" as string]: `min(100cqw / ${CANVAS_W}, 100cqh / ${height})`,
      }}
    >
      {/* Glows sit outside the clipped stage. The band is letterboxed whenever
          the viewport aspect differs from the band's, and letting the light
          spill past the band is what keeps the section reading as full-bleed
          instead of a framed picture. */}
      {bg ? (
        <div style={plane(false)}>
          <div
            className="absolute left-0"
            style={{ top: u(-top), width: u(CANVAS_W), height: u(CANVAS_H) }}
          >
            {bg}
          </div>
        </div>
      ) : null}

      <div style={plane(true)}>
        <div
          className="absolute left-0"
          style={{ top: u(-top), width: u(CANVAS_W), height: u(CANVAS_H) }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

const PLANET_ROTATIONS = [
  "perspective(1200px) rotateY(0deg) rotateX(0deg) scale(1)",
  "perspective(1200px) rotateY(-12deg) rotateX(3deg) scale(1.01)",
  "perspective(1200px) rotateY(-24deg) rotateX(-2deg) scale(1.02)",
  "perspective(1200px) rotateY(-36deg) rotateX(5deg) scale(1.03)",
];

function DesktopCanvas() {
  useMotion();
  const active = useFullPage();
  const { ref: whyMeRef, step: whyMeStep } = useSteppedSection(3);

  return (
    <div className="hidden lg:block">
      <SectionNav active={active} />
      <Snap
        {...SECTIONS.hero}
        label="פתיחה"
        bg={
          <>
            <Box x={-302} y={152} w={806} h={806} className="glow-blue" />
            <Box x={1107} y={-175} w={806} h={806} className="glow-blue" />
          </>
        }
      >
          {/* ============================================================== nav */}
          <header>
            <Box x={38} y={44} w={170} h={64}>
              <img
                src="/assets/logo.png"
                alt="סטודיו רוני"
                className="h-full w-full object-contain"
              />
            </Box>
            <Box x={1613} y={44} w={77} h={65}>
              <button type="button" aria-label="פתיחת תפריט" className="relative h-full w-full">
                {[0, 1, 2].map((i) => (
                  <span key={`a${i}`} className="absolute bg-white" style={{ left: 0, top: u(i * 21.67), width: u(34.5), height: u(10.8) }} />
                ))}
                {[0, 1, 2].map((i) => (
                  <span key={`b${i}`} className="absolute bg-white" style={{ left: u(41.4), top: u(10.8 + i * 21.67), width: u(34.5), height: u(10.8) }} />
                ))}
              </button>
            </Box>
          </header>
          {/* ============================================================= hero */}
          <Box x={152} y={261} w={1424} reveal="up">
            <h1 className={`anim-glitch text-center ${displayGradient}`} data-text="אתרים שגורמים לעסק שלכם להיראות ראשון בתחום" style={{ fontSize: u(120), lineHeight: 0.85 }}>
              <span className="font-normal">אתרים שגורמים לעסק שלכם</span>{" "}
              <span className="font-bold">להיראות ראשון בתחום</span>
            </h1>
          </Box>

          {/* Pre-cropped to what the Figma frame actually shows: the node is
              1062×796 holding the 2124² source at 50%, so the plume was clipped at
              the frame bottom and the transparent margins were never visible.
              Baking that crop in cut the asset from 1896 KB to 171 KB. */}
          <Box x={590} y={418} w={554} h={698} className="anim-drift pointer-events-none" reveal="fade"
               style={{ ["--drift" as string]: 10, ["--drift-dur" as string]: "11s" } as CSSProperties}>
            <img src="/assets/rocket.webp" alt="" className="block h-full w-full" />
          </Box>

          <Box x={1107} y={823} w={583} h={253} className={`${glass} hov-card`} reveal="up" delay={120} />
          <Box x={1131} y={860} w={527} reveal="up" delay={200}>
            <p className="text-right text-white" style={{ fontSize: u(28) }}>
              <span className="font-bold">אני הופכת אתרים גנריים לחוויות דיגיטליות בסטנדרט פרימיום.</span>
              <br />
              כאלה שיוצרים רושם מטורף מהשנייה הראשונה, שמים אתכם בטופ של התעשייה ומניעים את הגולשים לפעולה.
            </p>
          </Box>

          <Box x={38} y={1001} w={192} h={72} reveal="up" delay={280}>
            <button
              type="button"
              className="hov-btn grid h-full w-full place-items-center rounded-[--btn-radius] border border-brand font-semibold text-white hover:bg-brand/15"
              style={{ fontSize: u(24) }}
            >
              לתיק עבודות
            </button>
          </Box>
          <Box x={247} y={1001} w={192} h={72} reveal="up" delay={360}>
            <BrandButton label="בואו נדבר" />
          </Box>
      </Snap>

      <Snap {...SECTIONS.whyMe} label="למה לעבוד דווקא איתי" sectionRef={whyMeRef} bg={<>
          <Box x={164} y={1200} w={1400} h={1400} style={{
            background: "radial-gradient(closest-side, rgb(247 225 186 / 0.25) 0%, rgb(247 225 186 / 0.15) 30%, rgb(247 225 186 / 0.05) 60%, transparent 100%)",
            filter: "blur(80px)",
          }} className="pointer-events-none" />
        </>}>
          {/* ======================================================== why me */}
          <Box x={434} y={1276} w={861} reveal="up">
            <h2 className={`anim-glitch text-center ${displayGradient}`} data-text="למה לעבוד דווקא איתי?" style={{ fontSize: u(80), lineHeight: 0.85 }}>
              <span className="font-normal">למה לעבוד </span>
              <span className="font-semibold">דווקא איתי?</span>
            </h2>
          </Box>

          <Box x={264} y={1500} w={1200} h={1200} className="pointer-events-none" style={{ perspective: "1200px" }}>
            <div className="planet-3d h-full w-full overflow-hidden rounded-full" style={{
              transform: PLANET_ROTATIONS[whyMeStep],
            }}>
              <img src="/assets/mars-dome.png" alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 rounded-full" style={{
                background: "radial-gradient(circle at 35% 40%, transparent 30%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.6) 100%)",
              }} />
            </div>
          </Box>

          <Connector x={1195} y={1672} w={250} h={188} dir="up-right" active={whyMeStep >= 1} />
          <Connector x={745} y={1747} w={238} h={248} dir="up" active={whyMeStep >= 2} />
          <Connector x={554} y={1955} w={234} h={207} dir="up-left" active={whyMeStep >= 3} />

          {WHY_ME.map((card, i) => (
            <div key={card.title}>
              <Box {...card.box} className={`${glass} hov-card step-card ${whyMeStep >= i + 1 ? "is-active" : ""}`} />
              <Box x={card.text.x} y={card.text.y} w={card.text.w} className={`step-card ${whyMeStep >= i + 1 ? "is-active" : ""}`} style={{ transitionDelay: "0.65s" }}>
                <p className="text-right text-white" style={{ fontSize: u(18) }}>
                  <span className="font-bold">{card.title}</span>
                  <br />
                  {card.body}
                </p>
              </Box>
            </div>
          ))}
      </Snap>

      <Snap {...SECTIONS.project1} label="פרויקט 1" bg={<>
          {/* Figma "Ellipse 3" + "Ellipse 4" — the cream halo behind the planet.
              Boxes are the *blurred* extent, not the source ellipse; see index.css.
              Repeated per section because each snap section clips its own band. */}
          <Box x={-751} y={549} w={3099} h={2829} className="glow-cream-a" />
          <Box x={-740} y={746} w={3224} h={2829} className="glow-cream-b" />
          <Box x={0} y={2231} w={1728} h={787} className="glow-band" />
        </>}>
          {/* Bleeds off the right frame edge — the canvas clip is the crop, as in Figma. */}
          <Box x={1330} y={2323} w={398} h={698} className="anim-drift pointer-events-none"
               style={{ ["--drift" as string]: 12, ["--drift-dur" as string]: "10s" } as CSSProperties}>
            <img src="/assets/planet-saturn.png" alt="" className="h-full w-full" />
          </Box>
          {[PROJECTS[0]].map((p) => (
            <div key={0}>
              <Laptop x={p.laptop.x} y={p.laptop.y} screen={p.screen} />
              <Box x={p.edge} y={p.eyebrowY} w={260} fromRight reveal="up">
                <p className="text-right font-normal text-brand-light" style={{ fontSize: u(18) }}>
                  {PROJECT_COPY.eyebrow}
                </p>
              </Box>
              <Box x={p.edge} y={p.titleY} w={342} fromRight reveal="up" delay={90}>
                <h3 className={`text-right ${displayGradient}`} style={{ fontSize: u(60), lineHeight: 0.93 }}>
                  {PROJECT_COPY.title}
                </h3>
              </Box>
              <Box x={p.edge} y={p.bodyY} w={349} fromRight reveal="up" delay={180}>
                <p className="text-right text-white" style={{ fontSize: u(16) }}>
                  <span className="font-bold">{PROJECT_COPY.headline}</span>
                  <br />
                  {PROJECT_COPY.body}
                </p>
              </Box>
              <Box x={p.edge} y={p.ctaY} w={280} h={65} fromRight reveal="up" delay={270}>
                <BrandButton label={PROJECT_COPY.cta} />
              </Box>
            </div>
          ))}
      </Snap>

      <Snap {...SECTIONS.project2} label="פרויקט 2" bg={<>
          {/* Figma "Ellipse 3" + "Ellipse 4" — the cream halo behind the planet.
              Boxes are the *blurred* extent, not the source ellipse; see index.css.
              Repeated per section because each snap section clips its own band. */}
          <Box x={-751} y={549} w={3099} h={2829} className="glow-cream-a" />
          <Box x={-740} y={746} w={3224} h={2829} className="glow-cream-b" />
        </>}>
          <Box x={0} y={3420} w={326} h={440} className="anim-drift pointer-events-none"
               style={{ ["--drift" as string]: 18, ["--drift-dur" as string]: "15s" } as CSSProperties}>
            <img src="/assets/planet-earth.png" alt="" className="h-full w-full object-contain" />
          </Box>
          {[PROJECTS[1]].map((p) => (
            <div key={1}>
              <Laptop x={p.laptop.x} y={p.laptop.y} screen={p.screen} />
              <Box x={p.edge} y={p.eyebrowY} w={260} fromRight reveal="up">
                <p className="text-right font-normal text-brand-light" style={{ fontSize: u(18) }}>
                  {PROJECT_COPY.eyebrow}
                </p>
              </Box>
              <Box x={p.edge} y={p.titleY} w={342} fromRight reveal="up" delay={90}>
                <h3 className={`text-right ${displayGradient}`} style={{ fontSize: u(60), lineHeight: 0.93 }}>
                  {PROJECT_COPY.title}
                </h3>
              </Box>
              <Box x={p.edge} y={p.bodyY} w={349} fromRight reveal="up" delay={180}>
                <p className="text-right text-white" style={{ fontSize: u(16) }}>
                  <span className="font-bold">{PROJECT_COPY.headline}</span>
                  <br />
                  {PROJECT_COPY.body}
                </p>
              </Box>
              <Box x={p.edge} y={p.ctaY} w={280} h={65} fromRight reveal="up" delay={270}>
                <BrandButton label={PROJECT_COPY.cta} />
              </Box>
            </div>
          ))}
      </Snap>

      <Snap {...SECTIONS.project3} label="פרויקט 3" bg={
        <Box x={0} y={4489} w={1728} h={1467} className="glow-band" />
      }>
          <Box x={1376} y={4543} w={352} h={414} className="anim-drift pointer-events-none"
               style={{ ["--drift" as string]: 16, ["--drift-dur" as string]: "13s" } as CSSProperties}>
            <img src="/assets/planet-teal.png" alt="" className="h-full w-full object-contain" />
          </Box>
          {/* Bleeds off the right frame edge — the canvas clip is the crop, as in Figma. */}
          {[PROJECTS[2]].map((p) => (
            <div key={2}>
              <Laptop x={p.laptop.x} y={p.laptop.y} screen={p.screen} />
              <Box x={p.edge} y={p.eyebrowY} w={260} fromRight reveal="up">
                <p className="text-right font-normal text-brand-light" style={{ fontSize: u(18) }}>
                  {PROJECT_COPY.eyebrow}
                </p>
              </Box>
              <Box x={p.edge} y={p.titleY} w={342} fromRight reveal="up" delay={90}>
                <h3 className={`text-right ${displayGradient}`} style={{ fontSize: u(60), lineHeight: 0.93 }}>
                  {PROJECT_COPY.title}
                </h3>
              </Box>
              <Box x={p.edge} y={p.bodyY} w={349} fromRight reveal="up" delay={180}>
                <p className="text-right text-white" style={{ fontSize: u(16) }}>
                  <span className="font-bold">{PROJECT_COPY.headline}</span>
                  <br />
                  {PROJECT_COPY.body}
                </p>
              </Box>
              <Box x={p.edge} y={p.ctaY} w={280} h={65} fromRight reveal="up" delay={270}>
                <BrandButton label={PROJECT_COPY.cta} />
              </Box>
            </div>
          ))}
      </Snap>

      <Snap {...SECTIONS.whyNeed} label="למה אתם צריכים את זה" bg={<>
          <Box x={0} y={4489} w={1728} h={1467} className="glow-band" />
          <Box x={666} y={5836} w={806} h={806} className="glow-blue" />
        </>}>
          {/* =============================================== why you need it */}
          <Box x={434} y={5724} w={861} reveal="up">
            <h2 className={`anim-glitch text-center ${displayGradient}`} data-text="למה אתם צריכים את זה?" style={{ fontSize: u(80), lineHeight: 0.85 }}>
              <span className="font-normal">למה אתם צריכים </span>
              <span className="font-semibold">את זה?</span>
            </h2>
          </Box>

          {BENEFITS.map((b, i) => (
            <Box
              key={b.title}
              x={b.cx - b.w / 2}
              y={b.cy - b.h / 2}
              w={b.w}
              h={b.h}
              rotate={b.rotate}
              className={`${glass} hov-card`}
              reveal="fade"
              delay={i * 140}
            >
              <div className="flex h-full flex-col items-center" style={{ paddingTop: u(33) }}>
                <img
                  src={b.img}
                  alt=""
                  className="rounded-full object-cover"
                  style={{ width: u(b.avatar), height: u(b.avatar) }}
                />
                <h3
                  className="absolute w-full px-[6%] text-center font-normal text-white"
                  style={{ top: u(316 - (b.h - 635) / 2), fontSize: u(60), lineHeight: 0.97 }}
                >
                  {b.title}
                </h3>
                <p
                  className="absolute w-full px-[10%] text-center text-white"
                  style={{ top: u(450 - (b.h - 635) / 2), fontSize: u(18) }}
                >
                  {b.body}
                </p>
              </div>
            </Box>
          ))}
      </Snap>

      <Snap {...SECTIONS.about} label="נעים להכיר, רוני אליהו">
          {/* ============================================================ about */}
          <Box x={-256} y={6719} w={2001} h={1122} parallax={0.04} className="overflow-hidden bg-black">
            <Galaxy
              density={1.1}
              hueShift={220}
              saturation={0.25}
              glowIntensity={0.35}
              twinkleIntensity={0.35}
              starSpeed={0.35}
              rotationSpeed={0.04}
              repulsionStrength={1.6}
            />
          </Box>
          <Box x={10} y={6790} w={990} h={1010} className="anim-drift pointer-events-none" reveal="fade"
               style={{ ["--drift" as string]: 20, ["--drift-dur" as string]: "12s" } as CSSProperties}>
            <img src="/assets/astronaut-float.png" alt="" className="h-full w-full object-contain" />
          </Box>
          <Box x={1573} y={6866} w={738} fromRight reveal="up">
            <h2 className={`anim-glitch text-right ${displayGradient}`} data-text="נעים להכיר, רוני אליהו" style={{ fontSize: u(80), lineHeight: u(77) }}>
              נעים להכיר,
              <br />
              רוני אליהו
            </h2>
          </Box>
          <Box x={1572} y={7065} w={562} fromRight reveal="up" delay={120}>
            <div className="space-y-[1.4em] text-right text-white" style={{ fontSize: u(32) }}>
              <p className="font-semibold">
                כשאנשים מגיעים לאתר שלכם, יש לכם בדיוק 3 שניות להוכיח להם שהם הגיעו למקום הנכון.
              </p>
              <p>
                המטרה שלי היא לקחת עסקים מעולים ולהעניק להם נוכחות דיגיטלית בסטנדרט הגבוה ביותר. כל
                פרויקט אצלי נבנה מאפס מתוך שילוב של סטוריטלינג ויזואלי סוחף, אנימציות דינמיות ותשומת לב
                לכל פיקסל.
              </p>
              <p>
                כשעיצוב חדשני פוגש חשיבה חדה, התוצאה היא אתר עוצמתי מעורר השראה, כזה שגורם לכל לקוח
                מתעניין להבין מיד שאתם הבחירה הנכונה.
              </p>
            </div>
          </Box>
      </Snap>

      <Snap {...SECTIONS.contact} label="מוכנים להמריא" bg={
        <Box x={-281} y={8230} w={892} h={892} className="glow-warm" />
      }>
          {/* ========================================================== contact */}
          <Box x={1670} y={7926} w={738} fromRight reveal="up">
            <h2 className={`anim-glitch text-right ${displayGradient}`} data-text="מוכנים להמריא?" style={{ fontSize: u(80), lineHeight: u(77) }}>
              מוכנים להמריא?
            </h2>
          </Box>

          <Box x={1670} y={8040} w={700} fromRight reveal="up" delay={110}>
            <div className="flex items-center justify-end gap-[3.2em] text-white" style={{ fontSize: u(24) }}>
              <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-[0.7em] font-semibold hover:text-brand-light">
                <span dir="ltr">{CONTACT.email}</span>
                <Mail style={{ width: u(36), height: u(36) }} strokeWidth={2.2} />
              </a>
              <a href={`tel:${CONTACT.phone}`} className="flex items-center gap-[0.7em] font-semibold hover:text-brand-light">
                <span dir="ltr">{CONTACT.phone}</span>
                <Phone style={{ width: u(36), height: u(36) }} strokeWidth={2.2} />
              </a>
            </div>
          </Box>

          <Box x={1150} y={8189} w={578} h={769} className="anim-drift pointer-events-none" reveal="fade"
               style={{ ["--drift" as string]: 14, ["--drift-dur" as string]: "14s" } as CSSProperties}>
            <img src="/assets/astronaut-moon.png" alt="" className="h-full w-full object-contain" />
          </Box>

          <Box x={58} y={8189} w={816} h={699} className={`${glass} hov-card`} reveal="up" />
          <Box x={139} y={8249} w={654} reveal="up" delay={100}>
            <p className={`anim-glitch text-center font-medium ${displayGradient}`} data-text="השאירו פרטים קצרים ונתחיל לבנות את האתר שישים אתכם בטופ." style={{ fontSize: u(45), lineHeight: u(52) }}>
              השאירו פרטים קצרים ונתחיל לבנות את האתר שישים אתכם בטופ.
            </p>
          </Box>

          <form>
            {FORM_FIELDS.map((f) =>
              f.multiline ? (
                <Box key={f.name} x={f.x} y={f.y} w={f.w} h={f.h}>
                  <textarea
                    name={f.name}
                    placeholder={f.placeholder}
                    aria-label={f.placeholder}
                    className="hov-field h-full w-full resize-none rounded-[--field-radius] border border-white bg-glass px-[1em] py-[0.9em] text-center text-white backdrop-blur-glass placeholder:text-white focus:outline-none"
                    style={{ fontSize: u(18) }}
                  />
                </Box>
              ) : (
                <Box key={f.name} x={f.x} y={f.y} w={f.w} h={50}>
                  <input
                    name={f.name}
                    placeholder={f.placeholder}
                    aria-label={f.placeholder}
                    className="hov-field h-full w-full rounded-[--field-radius] border border-white bg-glass px-[1em] text-center text-white backdrop-blur-glass placeholder:text-white focus:outline-none"
                    style={{ fontSize: u(18) }}
                  />
                </Box>
              ),
            )}
            <Box x={139} y={8763} w={654} h={65}>
              <BrandButton label="שגרו את הטופס 🚀" />
            </Box>
          </form>
      </Snap>
    </div>
  );
}

/* ------------------------------------------------------------------- mobile */

function MobileLayout() {
  return (
    <div className="bg-background text-white lg:hidden">
      <header className="flex items-center justify-between px-5 py-5">
        <img src="/assets/logo.png" alt="סטודיו רוני" className="h-11 w-auto" />
        <button type="button" aria-label="פתיחת תפריט" className="space-y-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="block h-1.5 w-7 bg-white" />
          ))}
        </button>
      </header>

      <section className="glow-blue-m relative overflow-hidden px-5 pb-8 pt-4 text-center">
        <h1 className={`anim-glitch mx-auto max-w-[22ch] ${displayGradient}`} data-text="אתרים שגורמים לעסק שלכם להיראות ראשון בתחום" style={{ fontSize: "clamp(2.2rem,10vw,3.6rem)", lineHeight: 0.9 }}>
          <span className="font-normal">אתרים שגורמים לעסק שלכם</span>{" "}
          <span className="font-bold">להיראות ראשון בתחום</span>
        </h1>
        <img src="/assets/rocket.png" alt="" className="mx-auto mt-6 w-2/3 max-w-[280px]" />
        <div className={`${glass} mt-6 p-5 text-right`}>
          <p className="text-[clamp(0.95rem,4vw,1.15rem)]">
            <span className="font-bold">אני הופכת אתרים גנריים לחוויות דיגיטליות בסטנדרט פרימיום.</span>{" "}
            כאלה שיוצרים רושם מטורף מהשנייה הראשונה, שמים אתכם בטופ של התעשייה ומניעים את הגולשים
            לפעולה.
          </p>
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" className="h-14 flex-1 rounded-[--btn-radius] border border-brand text-lg font-semibold">
            לתיק עבודות
          </button>
          <button type="button" className="h-14 flex-1 rounded-[--btn-radius] bg-gradient-to-l from-brand to-brand-light text-lg font-semibold">
            בואו נדבר
          </button>
        </div>
      </section>

      <section className="px-5 py-12">
        <h2 className={`anim-glitch text-center ${displayGradient}`} data-text="למה לעבוד דווקא איתי?" style={{ fontSize: "clamp(1.8rem,8vw,2.6rem)" }}>
          <span className="font-normal">למה לעבוד </span>
          <span className="font-semibold">דווקא איתי?</span>
        </h2>
        <img
          src="/assets/mars-dome.png"
          alt=""
          className="mx-auto mt-8 w-full max-w-[420px] rounded-t-[50%] object-cover"
        />
        <div className="mt-8 space-y-4">
          {WHY_ME.map((c) => (
            <div key={c.title} className={`${glass} p-5 text-right`}>
              <p className="font-bold">{c.title}</p>
              <p className="mt-1 text-sm">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-14 px-5 py-12">
        {PROJECTS.map((_, i) => (
          <article key={i} className="text-right">
            <div className="overflow-hidden rounded-2xl border-[6px] border-[#1b1c1e] bg-white">
              <div className="aspect-[16/10] w-full bg-white" />
            </div>
            <p className="mt-5 text-brand-light">{PROJECT_COPY.eyebrow}</p>
            <h3 className={`mt-1 text-[clamp(1.6rem,7vw,2.2rem)] ${displayGradient}`}>
              {PROJECT_COPY.title}
            </h3>
            <p className="mt-3 text-sm">
              <span className="font-bold">{PROJECT_COPY.headline}</span> {PROJECT_COPY.body}
            </p>
            <button type="button" className="mt-5 h-14 w-full rounded-[--btn-radius] bg-gradient-to-l from-brand to-brand-light text-lg font-semibold">
              {PROJECT_COPY.cta}
            </button>
          </article>
        ))}
      </section>

      <section className="glow-blue-m px-5 py-12">
        <h2 className={`anim-glitch text-center ${displayGradient}`} data-text="למה אתם צריכים את זה?" style={{ fontSize: "clamp(1.8rem,8vw,2.6rem)" }}>
          <span className="font-normal">למה אתם צריכים </span>
          <span className="font-semibold">את זה?</span>
        </h2>
        <div className="mt-8 space-y-5">
          {BENEFITS.map((b) => (
            <div key={b.title} className={`${glass} flex flex-col items-center p-6 text-center`}>
              <img src={b.img} alt="" className="h-32 w-32 rounded-full object-cover" />
              <h3 className="mt-4 text-[clamp(1.4rem,6vw,1.9rem)]">{b.title}</h3>
              <p className="mt-3 text-sm">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="px-5 py-12"
        style={{ backgroundImage: "url(/assets/starfield.png)", backgroundSize: "cover" }}
      >
        <h2 className={`anim-glitch text-right ${displayGradient}`} data-text="נעים להכיר, רוני אליהו" style={{ fontSize: "clamp(1.8rem,8vw,2.6rem)", lineHeight: 1.05 }}>
          נעים להכיר,
          <br />
          רוני אליהו
        </h2>
        <img src="/assets/astronaut-float.png" alt="" className="mx-auto my-6 w-4/5" />
        <div className="space-y-4 text-right text-[clamp(0.95rem,4.2vw,1.15rem)]">
          <p className="font-semibold">
            כשאנשים מגיעים לאתר שלכם, יש לכם בדיוק 3 שניות להוכיח להם שהם הגיעו למקום הנכון.
          </p>
          <p>
            המטרה שלי היא לקחת עסקים מעולים ולהעניק להם נוכחות דיגיטלית בסטנדרט הגבוה ביותר. כל
            פרויקט אצלי נבנה מאפס מתוך שילוב של סטוריטלינג ויזואלי סוחף, אנימציות דינמיות ותשומת לב
            לכל פיקסל.
          </p>
          <p>
            כשעיצוב חדשני פוגש חשיבה חדה, התוצאה היא אתר עוצמתי מעורר השראה, כזה שגורם לכל לקוח
            מתעניין להבין מיד שאתם הבחירה הנכונה.
          </p>
        </div>
      </section>

      <section className="glow-warm-m px-5 py-12">
        <h2 className={`anim-glitch text-right ${displayGradient}`} data-text="מוכנים להמריא?" style={{ fontSize: "clamp(1.8rem,8vw,2.6rem)" }}>
          מוכנים להמריא?
        </h2>
        <div className="mt-4 flex flex-col items-end gap-2">
          <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-2 font-semibold">
            <span dir="ltr">{CONTACT.email}</span>
            <Mail className="h-6 w-6" />
          </a>
          <a href={`tel:${CONTACT.phone}`} className="flex items-center gap-2 font-semibold">
            <span dir="ltr">{CONTACT.phone}</span>
            <Phone className="h-6 w-6" />
          </a>
        </div>

        <form className={`${glass} mt-8 space-y-3 p-5`}>
          <p className={`text-center font-medium ${displayGradient}`} style={{ fontSize: "clamp(1.25rem,5.5vw,1.75rem)", lineHeight: 1.2 }}>
            השאירו פרטים קצרים ונתחיל לבנות את האתר שישים אתכם בטופ.
          </p>
          {FORM_FIELDS.map((f) =>
            f.multiline ? (
              <textarea
                key={f.name}
                name={f.name}
                placeholder={f.placeholder}
                aria-label={f.placeholder}
                rows={4}
                className="w-full resize-none rounded-[--field-radius] border border-white bg-glass p-3 text-center text-white placeholder:text-white focus:outline-none focus:ring-2 focus:ring-brand-light"
              />
            ) : (
              <input
                key={f.name}
                name={f.name}
                placeholder={f.placeholder}
                aria-label={f.placeholder}
                className="h-12 w-full rounded-[--field-radius] border border-white bg-glass px-3 text-center text-white placeholder:text-white focus:outline-none focus:ring-2 focus:ring-brand-light"
              />
            ),
          )}
          <button type="submit" className="h-14 w-full rounded-[--btn-radius] bg-gradient-to-l from-brand to-brand-light text-lg font-semibold">
            שגרו את הטופס 🚀
          </button>
        </form>
      </section>
    </div>
  );
}

export default function RoniPortfolio() {
  return (
    <main dir="rtl" className="min-h-[100dvh] w-full overflow-x-hidden bg-background font-sans">
      <DesktopCanvas />
      <MobileLayout />
    </main>
  );
}
