import { useState, useRef, useEffect } from "react";

/** Fate 4dF dice */
function rollFate(n = 4, mod = 0) {
  const faces = [-1, 0, +1];
  const dice = Array.from({ length: n }, () => faces[Math.floor(Math.random() * 3)]);
  const total = dice.reduce((a, b) => a + b, 0) + mod;
  return { dice, total, mod };
}
// ---- persistence helpers ----
const STORAGE_KEY_SHEET = "tipua:v2:sheet";


function loadJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}
function saveJSON(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
// Fixed base values for the 16 skills (row order)





const SPECIES_IMG: Record<string, string> = {
  "Tangata | Human Folk": "/species/tangata.png",
  "Pōnāturi | Sea Folk": "/species/ponaturi.png",
  "Patupaiārehe | Forest Folk": "/species/patupaiarehe.png",
};

// All available skills (edit names to match your sheet exactly)
const SKILLS = [
  "Tokatūmoana | Endurance", "Manawa-tītī | Strength", "Waewae-kai-kapua | Agility", "He Rūrū Mōhio | Intelligence",
  "Ngutu-kākā | Charisma", "He Pātiki Huna | Stealth", "Korokoro-tūī | Kaikōrero/Linguist", "Puawai Kōwhai | Naturalist",
  "Manawa Piharau | Mental Fortitude", "He Ihu Waka | Matakite/Spirit Sight", "Hiku o te Ika | Strike", "Ika Ūnahi Nui | Block",
  "Karaka Matarua | Rongoā/Potions & Poisons", "Mahi Pūngāwerewere | Craftsmanship", "He Whatu Ariki | Takutaku/Wards", "He Tuhi Hara | Makutu/Curses"
] as const;

  // --- Skill catalogue (edit these to your real 16 names) ---
const ALL_SKILLS = [
  "Tokatūmoana | Endurance",
  "Manawa-tītī | Strength",
  "Waewae-kai-kapua | Agility",
  "He Rūrū Mōhio | Intelligence",
  "Ngutu-kākā | Charisma",
  "He Pātiki Huna | Stealth",
  "Korokoro Tūī | Kaikōrero/Linguist",
  "Puawai Kōwhai | Naturalist",
  "Manawa Piharau | Mental Fortitude",
  "He Ihu Waka | Matakite/Spirit Sight",
  "Hiku o te Ika | Strike",
  "Ika Ūnahi Nui | Block",
  "Karaka Matarua | Rongoā/Potions & Poisons",
  "Mahi Pūngāwerewere | Craftsmanship",
  "He Whatu Ariki | Takutaku/Wards",
  "He Tuhi Hara | Makutu/Curses",
];



// returns what’s still available for the given slot index
function optionsForSlot(all: string[], chosen: string[], i: number) {
  const picked = new Set(chosen.filter((s, idx) => s && idx !== i));
  return all.filter(s => !picked.has(s));
}
// ---- dice scatter config ----
const DIE_SIZE = 36;                  // px; match your .die size
const MIN_DIST = 34;                  // px between die centers
const SCATTER_DESKTOP = { width: 220, height: 140 };
const SCATTER_MOBILE  = { width: 180, height: 120 };

// returns N non-overlapping positions (dx, dy, rz) inside an area box
function generateScatterPositions(
  n: number,
  area: { width: number; height: number },
  minDist: number
) {
  const positions: { dx: number; dy: number; rz: number }[] = [];
  const pad = DIE_SIZE / 2; // keep dice fully inside box
  const maxAttempts = 3000;

  for (let i = 0; i < n; i++) {
    let attempt = 0;
    let placed = false;
    while (attempt++ < maxAttempts && !placed) {
      const dx = Math.random() * (area.width  - DIE_SIZE) + pad;
      const dy = Math.random() * (area.height - DIE_SIZE) + pad;
      const ok = positions.every(p => {
        const dx2 = p.dx - dx;
        const dy2 = p.dy - dy;
        return Math.hypot(dx2, dy2) >= minDist;
      });
      if (ok) {
        positions.push({ dx, dy, rz: (Math.random() * 24) - 12 }); // -12°..+12°
        placed = true;
      }
    }
    if (!placed) positions.push({ dx: pad, dy: pad, rz: 0 }); // fallback
  }
  return positions;
}




// Fixed modifiers for each of the 16 skill slots

export default function App() {
  // === SHEET STATE ===
  const [name, setName] = useState("");
  const [race, setRace] = useState("");
  const [origin, setOrigin] = useState("");
  const [house, setHouse] = useState("");
  const [weapon, setWeapon] = useState("");
  // Āhei / Stunts
const [ahei1, setAhei1] = useState("");
const [ahei2, setAhei2] = useState("");
const [ahei3, setAhei3] = useState("");

// Ultimate Āhei (three lines)
const [ult1, setUlt1] = useState("");
const [ult2, setUlt2] = useState("");
const [ult3, setUlt3] = useState("");
// 16 skill slots, each slot is either a skill name or "" (empty)
const [skillChoices, setSkillChoices] = useState<string[]>(Array(16).fill(""));
const [skillExtras,  setSkillExtras]  = useState<number[]>(Array(16).fill(0));
// Fixed base values shown beside each skill row
const BASE_SKILL_VALUES = [4,3,3,2,2,2,1,1,1,1,0,0,0,0,0,0];
// how many boxes per row (change to taste)
const STRESS_BOXES = 6;

// Tinana (Physical)
const [tinanaRow1, setTinanaRow1] = useState<boolean[]>(Array(STRESS_BOXES).fill(false));


// Hinengaro (Mental)
const [hineRow1, setHineRow1] = useState<boolean[]>(Array(STRESS_BOXES).fill(false));

// Wairua (Spiritual)
const [wairuaRow1, setWairuaRow1] = useState<boolean[]>(Array(STRESS_BOXES).fill(false));

// Consequences: text + color per box
const [consMild, setConsMild] = useState("");
const [consModerate, setConsModerate] = useState("");
const [consSevere, setConsSevere] = useState("");

const [hasLoaded, setHasLoaded] = useState(false);










// LOAD once
useEffect(() => {
 const saved = loadJSON<{
  // existing sheet fields
  name?: string; race?: string; origin?: string; house?: string; weapon?: string;
  ahei1?: string; ahei2?: string; ahei3?: string;
  ult1?: string;  ult2?: string;  ult3?: string;

  // skills
  skillChoices?: string[];
  skillExtras?: number[];

  // stress trackers
  tinanaRow1?: boolean[]; tinanaRow2?: boolean[];
  hineRow1?:   boolean[]; hineRow2?:   boolean[];
  wairuaRow1?: boolean[]; wairuaRow2?: boolean[];

  // consequences
  consMild?: string;
  consModerate?: string;
  consSevere?: string;
 
}>(STORAGE_KEY_SHEET);


  if (!saved) return;
  if (saved.name   != null) setName(saved.name);
  if (saved.race   != null) setRace(saved.race);
  if (saved.origin != null) setOrigin(saved.origin);
  if (saved.house  != null) setHouse(saved.house);
  if (saved.weapon != null) setWeapon(saved.weapon);
  if (saved.ahei1  != null) setAhei1(saved.ahei1);
  if (saved.ahei2  != null) setAhei2(saved.ahei2);
  if (saved.ahei3  != null) setAhei3(saved.ahei3);
  if (saved.ult1   != null) setUlt1(saved.ult1);
  if (saved.ult2   != null) setUlt2(saved.ult2);
  if (saved.ult3   != null) setUlt3(saved.ult3);
  if (Array.isArray(saved.skillChoices)) setSkillChoices(saved.skillChoices);
  if (Array.isArray(saved.skillExtras))  setSkillExtras(saved.skillExtras); // <-- add this

if (Array.isArray(saved.tinanaRow1)) setTinanaRow1(saved.tinanaRow1);
if (Array.isArray(saved.hineRow1))   setHineRow1(saved.hineRow1);
if (Array.isArray(saved.wairuaRow1)) setWairuaRow1(saved.wairuaRow1);
if (saved.consMild  != null) setConsMild(saved.consMild);
if (saved.consModerate != null) setConsModerate(saved.consModerate);
if (saved.consSevere != null) setConsSevere(saved.consSevere);

setHasLoaded(true); // ✅ done loading


}, []);

// SAVE on change
useEffect(() => {
  if (!hasLoaded) return; // ⛔ don't overwrite until we've loaded data

  const payload = {
    // identity
    name, race, origin, house, weapon,

    // ahei
    ahei1, ahei2, ahei3,

    // ultimate ahei
    ult1,  ult2,  ult3,

    // skills
    skillChoices, skillExtras,

    // stress
    tinanaRow1,
    hineRow1,
    wairuaRow1,

    // consequences
    consMild, consModerate, consSevere,
    
  };

  saveJSON(STORAGE_KEY_SHEET, payload);
}, [
  hasLoaded,
  name, race, origin, house, weapon,
  ahei1, ahei2, ahei3,
  ult1,  ult2,  ult3,
  skillChoices, skillExtras,
  tinanaRow1, hineRow1, wairuaRow1,
  consMild, consModerate, consSevere,
  
]);





// === DICE STATE ===
const [roll, setRoll] = useState<{ dice: number[]; total: number; mod: number } | null>(null);
const [diceN, setDiceN] = useState(4);
const [isRolling, setIsRolling] = useState(false);


// NEW scatter state
const [dicePositions, setDicePositions] = useState<{ dx: number; dy: number; rz: number }[]>([]);
const [tossRun, setTossRun] = useState(0); // bump key to retrigger toss animation


  

  // === AUDIO: single hidden <audio> element we can reliably play ===
  const diceAudioEl = useRef<HTMLAudioElement | null>(null);

  // iOS/Android: unlock audio on first user interaction
  useEffect(() => {
    const unlock = () => {
      const a = diceAudioEl.current;
      if (!a) return;
      a.play().then(() => {
        a.pause();
        a.currentTime = 0;
        window.removeEventListener("touchend", unlock);
        window.removeEventListener("click", unlock);
      }).catch(() => {});
    };
    window.addEventListener("touchend", unlock, { once: true });
    window.addEventListener("click", unlock, { once: true });
    return () => {
      window.removeEventListener("touchend", unlock);
      window.removeEventListener("click", unlock);
    };
  }, []);

  const playDiceSound = () => {
    const a = diceAudioEl.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {}); // ignore policy hiccups
  };

  // === POSITIONS (desktop vs mobile) ===
  const positionsDesktop = {
    name:   { left: 6, top: 1,  width: 35 },
    race:   { left: 6, top: 5.5,  width: 22 },
    origin: { left: 6, top: 10, width: 22 },
    house:  { left: 6, top: 14.5, width: 22 },
    weapon: { left: 6, top: 20.5, width: 22 },
    speciesImg: { left: 28, top: 8, width: 18 },
    skillsTitle: { left: 47, top: 27, width: 30 },
    skillsMod:        { left: 85, top:  27, width: 10 }, 
    skillsBlock:       { left: 47, top: 29, width: 18 },
skillsExtrasBlock: { left: 89, top: 29, width: 5 },
  tinanaTitle:   { left: 52, top: 6.5, width: 30 },
  hinengaroTitle:{ left: 52, top: 8.1, width: 30 },
  wairuaTitle:   { left: 52, top: 9.75, width: 30 },
  // Two rows per track (containers you can drag)
tinanaRow1Pos:    { left: 84.5, top: 6, width: 13 },


hinengaroRow1Pos: { left: 52, top: 8, width: 30 },


wairuaRow1Pos:    { left: 52, top: 10, width: 30 },




 // Desktop
consequencesTitle: { left: 50, top: 12, width: 40 }, // adjust numbers
    
      // Āhei (regular)
  ahei1:  { left: 6, top: 35, width: 37 },
  ahei2:  { left: 6, top: 46, width: 37 },
  ahei3:  { left: 6, top: 57, width: 37 },
    // Ultimate Āhei block (three stacked lines)
    // Desktop
ultimateTitle: { left: 6, top: 69, width: 37 },
  ultimate1: { left: 6, top: 71, width: 37 },
  ultimate2: { left: 6, top: 79, width: 37 },
  ultimate3: { left: 6, top: 87, width: 37 },
// Desktop
// in positionsDesktop
title1: { left: 85, top: 4, width: 10 },
title2: { left: 92, top: 4, width: 10 },
// Desktop (example values)
dicePanel: { left: 45, top: 82, width: 80 },
consequencesMild:     { left: 50, top: 14.5,   width: 45 },
consequencesModerate: { left: 50, top: 18, width: 45 },
consequencesSevere:   { left: 50, top: 21.5,   width: 45 },



  };
  const positionsMobile = {
    name:   { left: 6, top: 1,  width: 30 },
    race:   { left: 6, top: 5.5,  width: 31 },
    origin: { left: 6, top: 10, width: 31 },
    house:  { left: 6, top: 14, width: 31 },
    weapon: { left: 6, top: 20, width: 20 },
    speciesImg: { left: 32, top: 20, width: 18 },
    skillsTitle: { left: 50, top: 34, width: 30 },
    skillsMod:        { left: 80, top:  34, width: 14 }, 
   skillsBlock:       { left: 50, top: 38, width: 25 },
skillsExtrasBlock: { left: 83, top: 38, width: 12 },
      // Āhei (regular)
  ahei1:  { left: 6, top: 34, width: 45 },
  ahei2:  { left: 6, top: 42, width: 45 },
  ahei3:  { left: 6, top: 50, width: 45 },
    // Ultimate Āhei
    // Mobile
ultimateTitle: { left: 6, top: 58, width: 45 },
  ultimate1: { left: 6, top: 59, width: 56 },
  ultimate2: { left: 6, top: 66.5, width: 56 },
  ultimate3: { left: 6, top: 74, width: 56 },
// Mobile (usually below or smaller)
  tinanaTitle:   { left: 40, top: 7.5, width: 60 },
  hinengaroTitle:{ left: 40, top: 10.5, width: 60 },
  wairuaTitle:   { left: 40, top: 13.5, width: 60 },
  // Two rows per track (containers you can drag)
tinanaRow1Pos:    { left: 82, top: 7, width: 15 },

hinengaroRow1Pos: { left: 52, top: 59, width: 30 },

wairuaRow1Pos:    { left: 52, top: 74, width: 30 },
// in positionsMobile
title1: { left: 83, top: 4, width: 5 },
title2: { left: 91.5, top: 4, width: 5 },
// Mobile
consequencesTitle: { left: 52, top: 19, width: 80 }, // adjust numbers
// Mobile (example values)
dicePanel: { left: 5, top: 80, width: 45},
consequencesMild:     { left: 50, top: 22, width: 45 },
consequencesModerate: { left: 50, top: 26, width: 45 },
consequencesSevere:   { left: 50, top: 30, width: 45 },

  };
  const isMobile =
  typeof window !== "undefined" &&
  window.matchMedia("(max-width: 640px)").matches;
  
const preset = isMobile ? positionsMobile : positionsDesktop;


// Start with whichever preset matches device
const [pos, setPos] = useState(preset);

// Reset if device size bucket changes
useEffect(() => {
  setPos(isMobile ? positionsMobile : positionsDesktop);
}, [isMobile]);

   
 return (
  <>
    <div className="sheet-wrap">
      <div className="sheet">
      <img src="/Background.png" alt="Character Sheet" />
{/* Fate Dice panel (inside sheet, over the background) */}
<div
  className="field"
  style={{
    left:  `${pos.dicePanel.left}%`,
    top:   `${pos.dicePanel.top}%`,
    width: `${pos.dicePanel.width}%`,
    zIndex: 10,
  }}
>
  <div
    className="panel"
    style={{ background: "transparent", border: "none", boxShadow: "none", padding: 0 }}
  >
    {/* Title */}
    <h2 className="field-label" style={{ marginBottom: 8 }}>
      <span className="label-white">PIRORI | </span>
      <span className="label-black">DICE ROLLER</span>
    </h2>

    {/* Count controls */}
    <div className="dice-compact" style={{ marginBottom: 8 }}>
      <div className="dice-control">
        <button className="btn" onClick={() => setDiceN((n) => Math.max(1, n - 1))}>−</button>
        <input
          type="number"
          className="dice-input"
          value={diceN}
          onChange={(e) => {
            const v = parseInt(e.target.value || "0", 10);
            if (!Number.isNaN(v)) setDiceN(Math.min(12, Math.max(1, v)));
          }}
        />
        <button className="btn" onClick={() => setDiceN((n) => Math.min(12, n + 1))}>＋</button>
      </div>
    </div>

    {/* Roll + Scatter row */}
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {/* Roll button */}
      <button
        className="btn roll-btn"
        onClick={() => {
          playDiceSound();
          setIsRolling(true);

          const area = isMobile ? SCATTER_MOBILE : SCATTER_DESKTOP;
          const newPositions = generateScatterPositions(diceN, area, MIN_DIST);
          setDicePositions(newPositions);
          setTossRun((n) => n + 1); // retrigger toss animation

          setTimeout(() => {
            setRoll(rollFate(diceN, 0));
            setIsRolling(false);
          }, 700);
        }}
      >
        🎲 Roll {diceN}dF
      </button>

      {/* Scatter box (dice + inline total) */}
      <div
        style={{
          position: "relative",
          width:  isMobile ? SCATTER_MOBILE.width  : SCATTER_DESKTOP.width,
          height: isMobile ? SCATTER_MOBILE.height : SCATTER_DESKTOP.height,
          marginTop: "-20px",     // nudge up; set to 0 if you prefer
          overflow: "visible",
          flex: "0 0 auto",
          // outline: "1px dashed rgba(0,0,0,.15)" // debug box
        }}
      >
        {roll && roll.dice.map((d, i) => {
          const p = dicePositions[i] || { dx: 0, dy: 0, rz: 0 };
          return (
            <div
              key={`${tossRun}-${i}`}
              className={`die ${isRolling ? "rolling" : ""}`}
              style={{
                position: "absolute",
                transform: `translate(${p.dx}px, ${p.dy}px) rotate(${p.rz}deg)`,
              }}
            >
              {d === 1 ? "＋" : d === -1 ? "−" : "·"}
            </div>
          );
        })}

        {roll && (
          <div
            style={{
              position: "absolute",
              right: 0,
              bottom:48,
              padding: "6px 8px",
              fontSize: 20,
              fontWeight: 700,
              background: "rgba(109, 233, 255, 0.75)",
              borderRadius: 4,
            }}
          >
            Total: {roll.total}
          </div>
        )}
      </div>

      
    </div>
  </div>
</div>


      {/* Ingoa | Name */}
        <div
          className="field field--lg field--compact"
          style={{ left: `${pos.name.left}%`, top: `${pos.name.top}%`, width: `${pos.name.width}%` }}
        >
          <div className="field-label">
            <span className="label-white">INGOA | </span>
            <span className="label-black">NAME</span>
          </div>
          <input className="input-underline" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {/* Ira | Species */}
        <div
          className="field field--lg field--compact"
          style={{ left: `${pos.race.left}%`, top: `${pos.race.top}%`, width: `${pos.race.width}%` }}
        >
          <div className="field-label">
            <span className="label-white">IRA | </span>
            <span className="label-black">SPECIES</span>
          </div>
          <select className="select-underline" value={race} onChange={(e) => setRace(e.target.value)}>
            <option value="">— select —</option>
            <option value="Patupaiārehe | Forest Folk">Patupaiārehe | Forest Folk</option>
            <option value="Pōnāturi | Sea Folk">Pōnāturi | Sea Folk</option>
            <option value="Tangata | Human Folk">Tangata | Human Folk</option>
          </select>
        </div>


        {/* Species image preview */}
{race && SPECIES_IMG[race] && (
  <div
    className="field"
    style={{
      left:  `${pos.speciesImg.left}%`,
      top:   `${pos.speciesImg.top}%`,
      width: `${pos.speciesImg.width}%`,
      pointerEvents: "none", // so clicks pass through, optional
    }}
  >
    <img
      src={SPECIES_IMG[race]}
      alt={race}
      style={{
        width: "100%",
        height: "auto",
        display: "block",
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,.25))",
        opacity: 0.98, // subtle print-friendly look
      }}
    />
  </div>
)}


        {/* Ūkaipō | Origin */}
        <div
          className="field field--lg field--compact"
          style={{ left: `${pos.origin.left}%`, top: `${pos.origin.top}%`, width: `${pos.origin.width}%` }}
        >
          <div className="field-label">
            <span className="label-white">ŪKAIPŌ | </span>
            <span className="label-black">ORIGIN</span>
          </div>
          <select className="select-underline" value={origin} onChange={(e) => setOrigin(e.target.value)}>
            <option value="">— select —</option>
            <option value="Papakāinga | Village">Papakāinga | Village</option>
            <option value="Pokapū | City">Pokapū | City</option>
            <option value="Mōwaho | Outskirts">Mōwaho | Outskirts</option>
          </select>
        </div>

        {/* Whare Wānanga | House of Learning (two-line label) */}
        <div
          className="field field--lg field--compact"
          style={{ left: `${pos.house.left}%`, top: `${pos.house.top}%`, width: `${pos.house.width}%` }}
        >
          <div className="field-label">
            <span className="label-white">WHARE WĀNANGA |</span><br />
            <span className="label-black">HOUSE OF LEARNING</span>
          </div>
          <select className="select-underline" value={house} onChange={(e) => setHouse(e.target.value)}>
            <option value="">— select —</option>
            <option value="Te Whare Taumata">Te Whare Taumata</option>
            <option value="Te Whare Māriri">Te Whare Māriri</option>
            <option value="Te Whare Ahuone">Te Whare Ahuone</option>
            <option value="Te Whare Pōhutukawa">Te Whare Pōhutukawa</option>
            <option value="Te Whare Tahuaroa">Te Whare Tahuaroa</option>
          </select>
        </div>

        {/* Mauriri | Weapon */}
        <div
          className="field field--lg field--compact"
          style={{ left: `${pos.weapon.left}%`, top: `${pos.weapon.top}%`, width: `${pos.weapon.width}%` }}
        >
          <div className="field-label">
            <span className="label-white">MAURIRI |</span>
            <span className="label-black">WEAPON</span>
          </div>
          <select className="select-underline" value={weapon} onChange={(e) => setWeapon(e.target.value)}>
            <option value="">— select —</option>
            <option value="Tewhatewha">Tewhatewha</option>
            <option value="Kotiate">Kotiate</option>
            <option value="Taiaha">Taiaha</option>
            <option value="Tī">Tī</option>
            <option value="Timotimo">Timotimo</option>
            <option value="Kō">Kō</option>
            <option value="Toki Kakauroa">Toki Kakauroa</option>
            <option value="Mere Tūhua">Mere Tūhua</option>
            <option value="Wahaika">Wahaika</option>
            <option value="Hoeroa">Hoeroa</option>
          </select>
        </div>
        {/* PŪKENGA | SKILLS (title only) */}
<div
  className="field title title--skills"
  style={{
    left:  `${pos.skillsTitle.left}%`,
    top:   `${pos.skillsTitle.top}%`,
    width: `${pos.skillsTitle.width}%`,
    zIndex: 6,
  }}

>
  <div className="field-label">
    <span className="label-white">PŪKENGA | </span>
    <span className="label-black">SKILLS</span>
  </div>
</div>

{/* ĀPITIHANGA | MODIFIER (title only, two lines) */}
<div
  className="field field--lg field--compact title title--skillsMod"
  style={{
    left:  `${pos.skillsMod.left}%`,
    top:   `${pos.skillsMod.top}%`,
    width: `${pos.skillsMod.width}%`,
    zIndex: 5,
  }}
  
>
  <div className="field-label" style={{ lineHeight: 1.05 }}>
    <span className="label-white">ĀPITIHANGA</span><br />
    <span className="label-black">| MODIFIER</span>
  </div>
</div>


{/* A) Skills block — ONLY the 16 dropdowns */}
<div
  className="field"
  style={{
    left:  `${pos.skillsBlock.left}%`,
    top:   `${pos.skillsBlock.top}%`,
    width: `${pos.skillsBlock.width}%`,
    zIndex: 4,
  }}
>
  <div className="skills-column">
    {Array.from({ length: 16 }).map((_, i) => {
      const val = skillChoices[i] || "";
      const opts = optionsForSlot(ALL_SKILLS, skillChoices, i);
      const merged = val && !opts.includes(val) ? [val, ...opts] : opts;

      return (
        <div key={i} className="skill-row">
          {/* Dropdown */}
          <select
            className="select-underline"
            value={val}
            onChange={(e) => {
              const next = [...skillChoices];
              next[i] = e.target.value;
              setSkillChoices(next);
            }}
          >
            <option value="">— select —</option>
            {merged.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Fixed base value */}
          <span className="skill-base">{BASE_SKILL_VALUES[i]}</span>
        </div>
      );
    })}
  </div>
</div>


{/* B) Extras block — base value + user modifier (separate column) */}
<div
  className="field"
  style={{
    left:  `${pos.skillsExtrasBlock.left}%`,
    top:   `${pos.skillsExtrasBlock.top}%`,
    width: `${pos.skillsExtrasBlock.width}%`,
    zIndex: 4,
  }}
>
  <div className="extras-column">
    {Array.from({ length: 16 }).map((_, i) => (
      <div key={i} className="extra-row">
        <input
          type="number"
          className="skill-extra"
          value={skillExtras[i] ?? 0}
          onChange={(e) => {
            const v = parseInt(e.target.value || "0", 10);
            const next = [...skillExtras];
            next[i] = Number.isNaN(v) ? 0 : v;
            setSkillExtras(next);
          }}
          placeholder="0"
        />
      </div>
    ))}
  </div>
</div>





        {/* Āhei 1 */}
        <div
          className="field field--lg field--compact"
          style={{ left: `${pos.ahei1.left}%`, top: `${pos.ahei1.top}%`, width: `${pos.ahei1.width}%` }}
        >
          <div className="field-label">
            <span className="label-white">MANA TUKU IHO | </span>
            <span className="label-black">INHERITED ABILITY</span>
          </div>
          <textarea
            className="textarea-underline ahei"
            value={ahei1}
            onChange={(e) => setAhei1(e.target.value)}
            rows={7}
          />
        </div>

        {/* Āhei 2 */}
        <div
          className="field field--lg field--compact"
          style={{ left: `${pos.ahei2.left}%`, top: `${pos.ahei2.top}%`, width: `${pos.ahei2.width}%` }}
        >
          <div className="field-label">
            <span className="label-white">MANA A ROHE | </span>
            <span className="label-black">ORIGIN ABILITY</span>
          </div>
          <textarea
            className="textarea-underline ahei"
            value={ahei2}
            onChange={(e) => setAhei2(e.target.value)}
            rows={7}
          />
        </div>

        {/* Āhei 3 */}
        <div
          className="field field--lg field--compact"
          style={{ left: `${pos.ahei3.left}%`, top: `${pos.ahei3.top}%`, width: `${pos.ahei3.width}%` }}
        >
          <div className="field-label">
            <span className="label-white">MANA ARONGA | </span>
            <span className="label-black">SPECIALIZATION</span>
          </div>
          <textarea
            className="textarea-underline ahei"
            value={ahei3}
            onChange={(e) => setAhei3(e.target.value)}
            rows={7}
          />
        </div>
        {/* Ultimate Āhei — section title only */}
<div
  className="field field--lg field--compact"
  style={{
    left:  `${pos.ultimateTitle.left}%`,
    top:   `${pos.ultimateTitle.top}%`,
    width: `${pos.ultimateTitle.width}%`,
    height: "60px",
  }}
>
  <div className="field-label">
    <span className="label-white">MANA TŪPUNA | </span>
    <span className="label-black">ANCIENT ABILITY</span>
  </div>
</div>


        {/* Ultimate Āhei — Physical effect */}
        <div
          className="field field--lg field--compact"
          style={{
            left:  `${pos.ultimate1.left}%`,
            top:   `${pos.ultimate1.top}%`,
            width: `${pos.ultimate1.width}%`,
            height: "60px",
          }}
          
        >
          <label className="mini-label ult-label" style={{ fontSize: "var(--ult-label-size)" }}>
  Physical effect
</label>
          <textarea
            className="textarea-underline ultimate"
            value={ult1}
            onChange={(e) => setUlt1(e.target.value)}
            rows={5}
          />
        </div>

        {/* Ultimate Āhei — Mental effect */}
        <div
          className="field field--lg field--compact"
          style={{
            left:  `${pos.ultimate2.left}%`,
            top:   `${pos.ultimate2.top}%`,
            width: `${pos.ultimate2.width}%`,
            height: "60px",
          }}
          
        >
         <label className="mini-label ult-label" style={{ fontSize: "var(--ult-label-size)" }}>
  Mental effect
</label>
          <textarea
            className="textarea-underline ultimate"
            value={ult2}
            onChange={(e) => setUlt2(e.target.value)}
            rows={5}
          />
        </div>

        {/* Ultimate Āhei — Spiritual effect */}
        <div
          className="field field--lg field--compact"
          style={{
            left:  `${pos.ultimate3.left}%`,
            top:   `${pos.ultimate3.top}%`,
            width: `${pos.ultimate3.width}%`,
            height: "60px",
          }}
          
        >
          <label className="mini-label ult-label" style={{ fontSize: "var(--ult-label-size)" }}>
  Spiritual effect
</label>
          <textarea
            className="textarea-underline ultimate"
            value={ult3}
            onChange={(e) => setUlt3(e.target.value)}
            rows={5}
          />
        </div>
      
{/* TINANA | PHYSICAL STRESS */}
<div
  className="field title title--stress title--tinana"
  style={{
    left:  `${pos.tinanaTitle.left}%`,
    top:   `${pos.tinanaTitle.top}%`,
    width: `${pos.tinanaTitle.width}%`,
    zIndex: 6,
  }}
>
  <div className="field-label">
    <span className="label-white">TINANA | </span>
    <span className="label-black">PHYSICAL STRESS</span>
  </div>
</div>

{/* HINENGARO | MENTAL STRESS */}
<div
  className="field title title--stress title--hinengaro"
  style={{
    left:  `${pos.hinengaroTitle.left}%`,
    top:   `${pos.hinengaroTitle.top}%`,
    width: `${pos.hinengaroTitle.width}%`,
    zIndex: 6,
  }}
>
  <div className="field-label">
    <span className="label-white">HINENGARO | </span>
    <span className="label-black">MENTAL STRESS</span>
  </div>
</div>

{/* WAIRUA | SPIRITUAL STRESS */}
<div
  className="field title title--stress title--wairua"
  style={{
    left:  `${pos.wairuaTitle.left}%`,
    top:   `${pos.wairuaTitle.top}%`,
    width: `${pos.wairuaTitle.width}%`,
    zIndex: 6,
  }}
>
  <div className="field-label">
    <span className="label-white">WAIRUA | </span>
    <span className="label-black">SPIRITUAL STRESS</span>
  </div>
</div>

{/* Title 1 */}
<div
  className="field title title--number"
  style={{
    left:  `${pos.title1.left}%`,
    top:   `${pos.title1.top}%`,
    width: `${pos.title1.width}%`,
    zIndex: 6,
  }}
>
  <div className="field-label">
    <span className="label-white">1</span>
  </div>
</div>

{/* Title 2 */}
<div
  className="field title title--number"
  style={{
    left:  `${pos.title2.left}%`,
    top:   `${pos.title2.top}%`,
    width: `${pos.title2.width}%`,
    zIndex: 6,
  }}
>
  <div className="field-label">
    <span className="label-white">2</span>
  </div>
</div>


{/* Tinana row 1 */}
<div
  className="field stress-track"
  style={{
    left:  `${pos.tinanaRow1Pos.left}%`,
    top:   `${pos.tinanaRow1Pos.top}%`,
    width: `${pos.tinanaRow1Pos.width}%`,
    ['--stress-size' as any]: '22px',
    ['--stress-size-mobile' as any]: '10px',
  }}
>
  <div className="stress-row">
    {tinanaRow1.map((val, i) => (
      <div
        key={i}
        className={`stress-box ${val ? 'checked' : ''}`}
        onClick={() => {
          const next = [...tinanaRow1];
          next[i] = !next[i];
          setTinanaRow1(next);
        }}
      />
    ))}
  </div>
</div>

{/* WHAI UTU | CONSEQUENCES */}
<div
  className="field title title--consequences"
  style={{
    left:  `${pos.consequencesTitle.left}%`,
    top:   `${pos.consequencesTitle.top}%`,
    width: `${pos.consequencesTitle.width}%`,
    zIndex: 6,
  }}
>
  <div className="field-label">
    <span className="label-white">WHAI UTU | </span>
    <span className="label-black">CONSEQUENCES</span>
  </div>
</div>
{/* Mild */}
<div
  className="field"
  style={{
    left:  `${pos.consequencesMild.left}%`,
    top:   `${pos.consequencesMild.top}%`,
    width: `${pos.consequencesMild.width}%`,
    zIndex: 6,
  }}
>
  <div className="consequence-box" style={{ background: "#fffb005d" }}> 
    <span className="consequence-label">Mild</span>
    <input
      className="consequence-input"
      type="text"
      value={consMild}
      onChange={(e) => setConsMild(e.target.value)}
      placeholder="enter consequence…"
    />
  </div>
</div>

{/* Moderate */}
<div
  className="field"
  style={{
    left:  `${pos.consequencesModerate.left}%`,
    top:   `${pos.consequencesModerate.top}%`,
    width: `${pos.consequencesModerate.width}%`,
    zIndex: 6,
  }}
>
  <div className="consequence-box" style={{ background: "#ff880036" }}>
    <span className="consequence-label">Moderate</span>
    <input
      className="consequence-input"
      type="text"
      value={consModerate}
      onChange={(e) => setConsModerate(e.target.value)}
      placeholder="enter consequence…"
    />
  </div>
</div>

{/* Severe */}
<div
  className="field"
  style={{
    left:  `${pos.consequencesSevere.left}%`,
    top:   `${pos.consequencesSevere.top}%`,
    width: `${pos.consequencesSevere.width}%`,
    zIndex: 6,
  }}
>
  <div className="consequence-box" style={{ background: "#ff000038" }}>
    <span className="consequence-label">Severe</span>
    <input
      className="consequence-input"
      type="text"
      value={consSevere}
      onChange={(e) => setConsSevere(e.target.value)}
      placeholder="enter consequence…"
    />
  </div>
</div>




    </div>
  </div>



        

    {/* Hidden audio element for dice sound (ONE only, outside the sheet) */}
    <audio
      ref={diceAudioEl}
      src="/sounds/dice.wav"
      preload="auto"
      style={{ display: "none" }}
    />

    

    
  </>
);
} // end function App

