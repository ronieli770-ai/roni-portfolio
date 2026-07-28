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
};

/** Absolutely positioned box in design-pixel coordinates. */
function Box({ x, y, w, h, className, style, children, rotate, fromRight }: BoxProps) {
  return (
    <div
      className={className}
      style={{
        position: "absolute",
        top: u(y),
        ...(fromRight ? { right: u(CANVAS_W - x) } : { left: u(x) }),
        ...(w !== undefined ? { width: u(w) } : null),
        ...(h !== undefined ? { height: u(h) } : null),
        ...(rotate ? { transform: `rotate(${rotate}deg)` } : null),
        ...style,
      }}
    >
      {children}
    </div>
  );
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
      className={`grid h-full w-full place-items-center rounded-[--btn-radius] bg-gradient-to-l from-brand to-brand-light font-semibold text-white transition-[filter] hover:brightness-110 ${className}`}
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
          className="h-full w-full bg-[#1b1c1e] shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
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

/** Dashed pointer from a why-me card to a hotspot on the planet. */
function Connector({
  x, y, w, h, dir,
}: { x: number; y: number; w: number; h: number; dir: "up" | "up-left" | "up-right" }) {
  const from = dir === "up" ? [w / 2, h] : dir === "up-left" ? [w, h] : [0, h];
  const to = dir === "up" ? [w / 2, 0] : dir === "up-left" ? [0, 0] : [w, 0];
  return (
    <Box x={x} y={y} w={w} h={h} className="pointer-events-none">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full overflow-visible" fill="none">
        <path
          d={`M${from[0]} ${from[1]} L${to[0]} ${to[1]}`}
          stroke="rgba(255,255,255,0.65)"
          strokeWidth="3"
          strokeDasharray="10 10"
        />
        <path
          d={`M${to[0]} ${to[1]} l${dir === "up" ? "-11 16" : dir === "up-left" ? "16 4" : "-16 4"} M${to[0]} ${to[1]} l${dir === "up" ? "11 16" : dir === "up-left" ? "4 16" : "-4 16"}`}
          stroke="rgba(255,255,255,0.8)"
          strokeWidth="3"
        />
      </svg>
      <div
        className="absolute rounded-full border-2 border-white bg-white/85"
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

function DesktopCanvas() {
  return (
    <div
      className="relative mx-auto hidden w-full overflow-hidden bg-background lg:block"
      style={{
        ["--u" as string]: `calc(100cqw / ${CANVAS_W})`,
        containerType: "inline-size",
        height: u(CANVAS_H),
      }}
    >
      {/* ============================================================ glows */}
      <Box x={-302} y={152} w={806} h={806} className="glow-blue" />
      <Box x={1107} y={-175} w={806} h={806} className="glow-blue" />
      {/* Figma "Ellipse 3" + "Ellipse 4" — the cream halo behind the planet.
          Boxes are the *blurred* extent, not the source ellipse; see index.css. */}
      <Box x={-751} y={549} w={3099} h={2829} className="glow-cream-a" />
      <Box x={-740} y={746} w={3224} h={2829} className="glow-cream-b" />
      <Box x={0} y={2231} w={1728} h={787} className="glow-band" />
      <Box x={0} y={4489} w={1728} h={1467} className="glow-band" />
      <Box x={666} y={5836} w={806} h={806} className="glow-blue" />
      <Box x={-281} y={8230} w={892} h={892} className="glow-warm" />

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
      <Box x={152} y={261} w={1424}>
        <h1 className={`text-center ${displayGradient}`} style={{ fontSize: u(120), lineHeight: 0.85 }}>
          <span className="font-normal">אתרים שגורמים לעסק שלכם</span>{" "}
          <span className="font-bold">להיראות ראשון בתחום</span>
        </h1>
      </Box>

      {/* Pre-cropped to what the Figma frame actually shows: the node is
          1062×796 holding the 2124² source at 50%, so the plume was clipped at
          the frame bottom and the transparent margins were never visible.
          Baking that crop in cut the asset from 1896 KB to 171 KB. */}
      <Box x={590} y={418} w={554} h={698} className="pointer-events-none">
        <img src="/assets/rocket.webp" alt="" className="block h-full w-full" />
      </Box>

      <Box x={1107} y={823} w={583} h={253} className={glass} />
      <Box x={1131} y={860} w={527}>
        <p className="text-right text-white" style={{ fontSize: u(28) }}>
          <span className="font-bold">אני הופכת אתרים גנריים לחוויות דיגיטליות בסטנדרט פרימיום.</span>
          <br />
          כאלה שיוצרים רושם מטורף מהשנייה הראשונה, שמים אתכם בטופ של התעשייה ומניעים את הגולשים לפעולה.
        </p>
      </Box>

      <Box x={38} y={1001} w={192} h={72}>
        <button
          type="button"
          className="grid h-full w-full place-items-center rounded-[--btn-radius] border border-brand font-semibold text-white transition-colors hover:bg-brand/15"
          style={{ fontSize: u(24) }}
        >
          לתיק עבודות
        </button>
      </Box>
      <Box x={247} y={1001} w={192} h={72}>
        <BrandButton label="בואו נדבר" />
      </Box>

      {/* ======================================================== why me */}
      <Box x={434} y={1276} w={861}>
        <h2 className={`text-center ${displayGradient}`} style={{ fontSize: u(80), lineHeight: 0.85 }}>
          <span className="font-normal">למה לעבוד </span>
          <span className="font-semibold">דווקא איתי?</span>
        </h2>
      </Box>

      <Box x={343} y={1657} w={1067} h={577} className="pointer-events-none overflow-hidden" style={{ borderRadius: `${u(533)} ${u(533)} 0 0` }}>
        <img src="/assets/mars-dome.png" alt="" className="h-full w-full object-cover" />
      </Box>

      <Connector x={1195} y={1672} w={250} h={188} dir="up-right" />
      <Connector x={745} y={1747} w={238} h={248} dir="up" />
      <Connector x={554} y={1955} w={234} h={207} dir="up-left" />

      {WHY_ME.map((card) => (
        <div key={card.title}>
          <Box {...card.box} className={glass} />
          <Box x={card.text.x} y={card.text.y} w={card.text.w}>
            <p className="text-right text-white" style={{ fontSize: u(18) }}>
              <span className="font-bold">{card.title}</span>
              <br />
              {card.body}
            </p>
          </Box>
        </div>
      ))}

      {/* ===================================================== portfolio */}
      <Box x={1376} y={4543} w={352} h={414} className="pointer-events-none">
        <img src="/assets/planet-teal.png" alt="" className="h-full w-full object-contain" />
      </Box>
      {/* Bleeds off the right frame edge — the canvas clip is the crop, as in Figma. */}
      <Box x={1330} y={2323} w={398} h={698} className="pointer-events-none">
        <img src="/assets/planet-saturn.png" alt="" className="h-full w-full" />
      </Box>
      <Box x={0} y={3420} w={326} h={440} className="pointer-events-none">
        <img src="/assets/planet-earth.png" alt="" className="h-full w-full object-contain" />
      </Box>

      {PROJECTS.map((p, i) => (
        <div key={i}>
          <Laptop x={p.laptop.x} y={p.laptop.y} screen={p.screen} />
          <Box x={p.edge} y={p.eyebrowY} w={260} fromRight>
            <p className="text-right font-normal text-brand-light" style={{ fontSize: u(18) }}>
              {PROJECT_COPY.eyebrow}
            </p>
          </Box>
          <Box x={p.edge} y={p.titleY} w={342} fromRight>
            <h3 className={`text-right ${displayGradient}`} style={{ fontSize: u(60), lineHeight: 0.93 }}>
              {PROJECT_COPY.title}
            </h3>
          </Box>
          <Box x={p.edge} y={p.bodyY} w={349} fromRight>
            <p className="text-right text-white" style={{ fontSize: u(16) }}>
              <span className="font-bold">{PROJECT_COPY.headline}</span>
              <br />
              {PROJECT_COPY.body}
            </p>
          </Box>
          <Box x={p.edge} y={p.ctaY} w={280} h={65} fromRight>
            <BrandButton label={PROJECT_COPY.cta} />
          </Box>
        </div>
      ))}

      {/* =============================================== why you need it */}
      <Box x={434} y={5724} w={861}>
        <h2 className={`text-center ${displayGradient}`} style={{ fontSize: u(80), lineHeight: 0.85 }}>
          <span className="font-normal">למה אתם צריכים </span>
          <span className="font-semibold">את זה?</span>
        </h2>
      </Box>

      {BENEFITS.map((b) => (
        <Box
          key={b.title}
          x={b.cx - b.w / 2}
          y={b.cy - b.h / 2}
          w={b.w}
          h={b.h}
          rotate={b.rotate}
          className={glass}
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

      {/* ============================================================ about */}
      <Box x={-256} y={6719} w={2001} h={1122} className="overflow-hidden bg-black">
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
      <Box x={10} y={6790} w={990} h={1010} className="pointer-events-none">
        <img src="/assets/astronaut-float.png" alt="" className="h-full w-full object-contain" />
      </Box>
      <Box x={1573} y={6866} w={738} fromRight>
        <h2 className={`text-right ${displayGradient}`} style={{ fontSize: u(80), lineHeight: u(77) }}>
          נעים להכיר,
          <br />
          רוני אליהו
        </h2>
      </Box>
      <Box x={1572} y={7065} w={562} fromRight>
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

      {/* ========================================================== contact */}
      <Box x={1670} y={7926} w={738} fromRight>
        <h2 className={`text-right ${displayGradient}`} style={{ fontSize: u(80), lineHeight: u(77) }}>
          מוכנים להמריא?
        </h2>
      </Box>

      <Box x={1670} y={8040} w={700} fromRight>
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

      <Box x={1150} y={8189} w={578} h={769} className="pointer-events-none">
        <img src="/assets/astronaut-moon.png" alt="" className="h-full w-full object-contain" />
      </Box>

      <Box x={58} y={8189} w={816} h={699} className={glass} />
      <Box x={139} y={8249} w={654}>
        <p className={`text-center font-medium ${displayGradient}`} style={{ fontSize: u(45), lineHeight: u(52) }}>
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
                className="h-full w-full resize-none rounded-[--field-radius] border border-white bg-glass px-[1em] py-[0.9em] text-center text-white backdrop-blur-glass placeholder:text-white focus:outline-none focus:ring-2 focus:ring-brand-light"
                style={{ fontSize: u(18) }}
              />
            </Box>
          ) : (
            <Box key={f.name} x={f.x} y={f.y} w={f.w} h={50}>
              <input
                name={f.name}
                placeholder={f.placeholder}
                aria-label={f.placeholder}
                className="h-full w-full rounded-[--field-radius] border border-white bg-glass px-[1em] text-center text-white backdrop-blur-glass placeholder:text-white focus:outline-none focus:ring-2 focus:ring-brand-light"
                style={{ fontSize: u(18) }}
              />
            </Box>
          ),
        )}
        <Box x={139} y={8763} w={654} h={65}>
          <BrandButton label="שגרו את הטופס 🚀" />
        </Box>
      </form>
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
        <h1 className={`mx-auto max-w-[22ch] ${displayGradient}`} style={{ fontSize: "clamp(2.2rem,10vw,3.6rem)", lineHeight: 0.9 }}>
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
        <h2 className={`text-center ${displayGradient}`} style={{ fontSize: "clamp(1.8rem,8vw,2.6rem)" }}>
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
        <h2 className={`text-center ${displayGradient}`} style={{ fontSize: "clamp(1.8rem,8vw,2.6rem)" }}>
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
        <h2 className={`text-right ${displayGradient}`} style={{ fontSize: "clamp(1.8rem,8vw,2.6rem)", lineHeight: 1.05 }}>
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
        <h2 className={`text-right ${displayGradient}`} style={{ fontSize: "clamp(1.8rem,8vw,2.6rem)" }}>
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
