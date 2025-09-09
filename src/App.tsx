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
// Turn "Mere Tūhua" -> "meretuhua", "Toki Kakauroa" -> "tokikakauroa", "Kō" -> "ko", "Tī" -> "ti"
function toWeaponSlug(label: string) {
  const macronMap: Record<string, string> = { ā:"a", ē:"e", ī:"i", ō:"o", ū:"u", Ā:"A", Ē:"E", Ī:"I", Ō:"O", Ū:"U" };
  const deMacron = label.replace(/[āēīōūĀĒĪŌŪ]/g, ch => macronMap[ch] || ch);
  return deMacron.toLowerCase().replace(/[^a-z]+/g, "");
}

// If any file is named a bit differently, override it here by *display label*:
const WEAPON_FILE_OVERRIDES: Record<string, string> = {
  "Tī": "ti",
  "Kō": "ko",
  
};





const SPECIES_IMG: Record<string, string> = {
  "Tangata | Human Folk": "/species/tangata.png",
  "Pōnāturi | Sea Folk": "/species/ponaturi.png",
  "Patupaiārehe | Forest Folk": "/species/patupaiarehe.png",
};
type InheritedAhei = { id: string; title: string; desc: string };

const SPECIES_AHEI: Record<string, InheritedAhei[]> = {
  "Patupaiārehe | Forest Folk": [
    {
      id: "huna-a-taiao",
      title: "Huna ā Taiao | Hidden in Nature",
      desc: "You are hard to spot in natural cover. You blend with plants, mist, and shadow, and you move quietly through the bush +2 Block +2 Stealth - when partly hidden. ONCE PER SESSION: Fully vanish to move or escape. ",
    },
    {
      id: "taurangi-orooro",
      title: "Taurangi Orooro | Voice of Harmony",
      desc: "Your voice carries a calming, melodic resonance. You can steady allies, ease tensions, and turn hostility aside. +1 Charisma +1 Kaikōrero +1 Takutaku +1 Makutu. ONCE PER SESSION: Captivate one low level NPC for a turn with your voice - they will do as you command ",
    },
  ],
  "Tangata | Human Folk": [
    {
      id: "reo-tupuna",
      title: "Reo Tūpuna | Ancestral Voice",
      desc: "You carry the strength of your tīpuna. You recall old knowledge, speak with conviction, and inspire resolve. +2 Intelligence +1 Kaikōrero +1 Matakite. ONCE PER SESSION: Call on an ancestor spirit to reveal something hidden or help in battle for one turn",
    },
    {
      id: "ringa-toi",
      title: "Ringa Toi | Hand of the Maker",
      desc: "You are a maker and problem solver. You adapt tools, repair on the fly, and craft useful solutions under pressure. +1 Endurance +1 Strength +1 Crafstmanship. +2 Matakite -when interacting with carvings or built spaces. ONCE PER SESSION: Use a passed-down karakia to imbue an object with a Ward or Curse",
    },
  ],
  "Pōnāturi | Sea Folk": [
    {
      id: "noho-rua",
      title: "Noho-rua | Lives in Two Worlds",
      desc: "You move between realms of sea and shore. You read tides, currents, and liminal signs with sharp instinct. While in water +1 Stealth +1 Agility and clear vision. ONCE PER SESSION: Send a deep pulse through the water, knocking nearby enemies off balance",
    },
    {
      id: "kiri-matotoru",
      title: "Kiri Mātotoru | Thick Skin",
      desc: "Your hide is tough and weathered. You endure cold, pressure, and blows that would stagger others. +2 Endurance +2 Block unaffected by environmental conditions. ONCE PER SESSION: Let out a challenging growl that draws all attacks to you - taking only half damage for one turn",
    },
  ],
};
// ---- Types for Ira + Origin ----
type RaceKey = keyof typeof SPECIES_AHEI;  // "Patupaiārehe | Forest Folk" | ...

export const ORIGIN_OPTIONS = [
  "Papakāinga | Village",
  "Pokapū | City",
  "Mōwaho | Outskirts",
] as const;

type OriginKey = typeof ORIGIN_OPTIONS[number];

type OriginAheiMap = Record<RaceKey, Record<OriginKey, InheritedAhei[]>>;



// 🔧 EXAMPLE content — tweak/expand per your game
export const ORIGIN_AHEI: OriginAheiMap = {
  "Patupaiārehe | Forest Folk": {
    "Papakāinga | Village": [
      { id: "pf-vil-1", title: "Rikoriko | Glimmer in the Dark", desc: "In a forest that never sees full daylight, you were raised among red leaves and moonlit hunts. Here, your teachers were silence and shadow, and your kin, the masters of camouflage and disguise. Living in near darkness you learnt to hunt by your own light. ONCE PER SESSION: emit a bioluminescent pulse that confuses your closest enemies, drawing them in unguarded. +1 Matakite +1 Naturalist." },
    ],
    "Pokapū | City": [
      { id: "pf-city-1", title: "Kākāriki | Voice of the Parrot", desc: "High in the canopy of a living giant, among the many voices and diverse visages, you ran as one of the unseen children and vanished from sight before you ever learned to speak. You honed your skills without being caught, the overlapping voices became your camouflage. ONCE PER SESSION: mimic an NPC voice to create a distraction or an opportunity. +2 Stealth when out of cover" },
    ],
    "Mōwaho | Outskirts": [
      { id: "pf-out-1", title: "Pāpaki | Tinkerer's Touch", desc: "Your home groaned with metal and fire. Raised beneath choking smog and bleeding roots, you worked before you walked, earning your breath in the grind. Your understanding of machinery gave you an edge. ONCE PER SESSION: repair or wreck any powered object or structure. +1 Intelligence +1 endurance +1 Craftsmanship" },
    ],
  },
  "Tangata | Human Folk": {
    "Papakāinga | Village": [
      { id: "hu-vil-1", title: "Tutū te Pūehu | Stirring Dust", desc: "Below the earth, where soft light blooms and stone walls hum, you tended glowing gardens with steady hands. Your elders assure you that the dark holds no fear, only comfort. You have mastered the art of dirt and dust. ONCE PER SESSION: kick up a cloud for cover or send a spray of grit outward to blind and stagger nearby enemies for one turn. +1 Strength +1 Agility +1 Potions and Poisons +1 Naturalist." },
    ],
    "Pokapū | City": [
      { id: "hu-city-1", title: "Tautohetohe | Debate", desc: "In great halls and star-lit ports, you watched power shift like the wind. Words once masterfully used in the courts of the Paepae, are your weapon - refined in the art of charm, humour, or a well-placed threat. You have picked up the art and power of speech and debate. ONCE PER SESSION: stun or charm any NPC (excluding Ngarara) with an unchecked Makutu. +2 Charisma +2 Kaikōrero." },
    ],
    "Mōwaho | Outskirts": [
      { id: "hu-out-1", title: "Pūhiko | Source of Power", desc: "Among the endless potential of forgotten yards and discarded treasure, your mind transformed scrap into wonders and memorised the constellations like old maps. Picking through discarded scrap and combining different parts taught you how to rewire tech to your advantage. ONCE PER SESSION: manipulate tech to  create a temporary protective barrier – everyone within gains +2 block for the next turn. +1 Takutaku +1 Craftsmanship +1 Intelligence" },
    ],
  },
  "Pōnāturi | Sea Folk": {
    "Papakāinga | Village": [
      { id: "po-vil-1", title: "Tūhonohono | Interwoven Connection", desc: "You were raised on a river of mist and ancient whispers. Here, the old ones taught you the ancient knowledge of rites and ceremony. Under the guidance of your elders, you learnt how everything is connected. ONCE PER SESSION: connect with one NPC (excluding Ngārara) to gain extra information or calm things down.. +2 Kaikōrero +1 Potions and Poisons +1 Naturalist" },
    ],
    "Pokapū | City": [
      { id: "po-city-1", title: "Pā-orooro | Reverberating Echo", desc: "In a beautiful city built around a swirling portal, you grew up among mangroves and watchful guards. An environment such as this taught you to move through the world like water through stone. You watched the old guards command with a low rumble and learnt to harness this for yourself. ONCE PER SESSION: emit a low rumble through water to call on nearby small water creatures to aid you. +1 Endurance +1 Strength when in water" },
    ],
    "Mōwaho | Outskirts": [
      { id: "po-out-1", title: "Koropuku | Mighty Bellow", desc: "Battered by brutal tides and toothy rivals, you were forged in the rough coral wilds. Quick, scrappy, and fierce, you learned to never hesitate and never flinch. To roar above the crashing waves was a gift you used well, your dominance was heard from great distances. ONCE PER SESSION: let out a mighty bellow that causes any smaller enemies to flee in terror. +2 Strike +2 Block when facing an enemy larger than you" },
    ],
  },
};
// Whare list (to get a typed HouseKey)
export const HOUSE_OPTIONS = [
  "Te Whare Taumata",
  "Te Whare Māriri",
  "Te Whare Ahuone",
  "Te Whare Pōhutukawa",
  "Te Whare Tahuaroa",
] as const;

type HouseKey = typeof HOUSE_OPTIONS[number];

// One specialization (Mana Aronga) per Whare
export const WHARE_ARONGA: Record<HouseKey, InheritedAhei[]> = {
  "Te Whare Taumata": [
    {
      id: "Light clarity focus higher learning leadership",
      title: "Pūmārama | Source of Light",
      desc: "This whare was formed under Moeāhuru and Uru-te-ngangana and embodies the learning of wisdom, diplomacy, and ancient knowledge. Students here train with the Tewhatewha and Kotiate but their focus leans more toward leadership, communication, and managing complex systems. They learn spiritual oratory, leadership, and the responsibilities of guiding entire communities or nations. As keepers of knowledge and tradition, graduates often become Tohunga, negotiators, political leaders, or heads of other whare. ONCE PER SESSION: unleash a radiant light, all allies gain +1 to mental fortitude and takutaku skill checks and all enemies within line of sight suffer -1 to all rolls. +1 Matakite +1 Intelligence",
    },
  ],
  "Te Whare Māriri": [
    {
      id: "Warfare strategy precision stealth",
      title: "Pouriri | Pillar of War",
      desc: "This school trains those best suited for combat, leadership, and mental resilience. Founded under the Atua: Hine Keira and Tūmatauenga, it focuses on physical strength, precision, and emotional control. Students learn to wield the Tī and Taiaha, sharpen their strategic thinking, and manage their inner rage without letting it consume them. Spiritual teachings focus on rituals and incantations, helping students maintain balance between the physical and spiritual realms. Those who graduate from this Whare are often leaders in defense, elite fighters, or tacticians within their communities. ONCE PER SESSION: The Player can declare a coordinated attack with an ally. Both Player Characters now attack as one - adding the total outcome of both Players dice rolls. +2 Strike after a successful Matakite Check. +2 Stealth after a succesful Naturalist Check",
    },
  ],
  "Te Whare Ahuone": [
    {
      id: "Healing  gardening  concealment",
      title: "Korowai Whenua | Natures Cloak",
      desc: "This is the school of peace, growth, and restoration. Guided by the principles of Rongo and Haumia-tiketike, it shapes students into caretakers of the land and healers of people. Their weapons are the Kō and Timotimo, tools used for cultivation and combat. Training is centered on stealth, disarming tactics, and the protection of life. Students are taught environmental karakia and learn how to harmonise with the world around them. Those who complete this path often take on roles in environmental stewardship, medicine, education, or sustainable development. ONCE PER SESSION: completely conceal your party for one turn giving a +3 bonus to any stealth skill checks. +1 Potions/Poisons +1 Craftsmanship +1 Naturalist when in outside environments",
    },
  ],
  "Te Whare Pōhutukawa": [
    {
      id: "Strength  connection  life  death",
      title: "Mauri Tū | Unyeilding Essence",
      desc: "This school sits at the intersection of life and death, under Hine-nui-te-pō and Tāne Māhuta. It shapes defenders, protectors, and those who operate with deep spiritual awareness. Students train with Toki Kakauroa and Mere Tūhua, learning to phase between realms and harness sound and energy through music and vibration. Physically, they become strong and resistant, with an emphasis on protective techniques and healing boosts. Their training strengthens both body and spirit, and many go on to become frontline guardians, spiritual warriors, or powerful healers. ONCE PER SESSION: channel the strength of your ancestors and gain +2 to any one roll and also remove 1 mild or moderate physical or mental consequence. +1 Mental Fortitude when protecting an ally +1 Strength when on solid ground.",
    },
  ],
  "Te Whare Tahuaroa": [
    {
      id: "Tidal force  speed  fluidity  power",
      title: "Tairere | Surging Tide",
      desc: "Connected to the tides and deep oceans, this school nurtures speed, fluid movement, and emotional depth. It was established under the power of Hine Moana and Tangaroa, and its students are trained in the Hoeroa and Wahaika. The physical techniques taught here are graceful but powerful, emphasising precision, rhythm, and flexibility. ONCE PER SESSION: rush nearby enemies with the full force of a tidal surge taking no damage and knocking down all minor enemies within line of sight. +1 Strike when moving toward an opponent +1 Block when moving away from a target +1 Agility when in water.",
    },
  ],
};


// All weapons (unfiltered)
const ALL_WEAPONS = [
  "Tewhatewha",
  "Kotiate",
  "Taiaha",
  "Tī",
  "Timotimo",
  "Kō",
  "Toki Kakauroa",
  "Mere Tūhua",
  "Wahaika",
  "Hoeroa",
] as const;
type WeaponKey = typeof ALL_WEAPONS[number];

const WEAPON_INFO: Record<WeaponKey, { title: string; desc: string }> = {
  "Tewhatewha": { title: "Tewhatewha", desc: "Long-handled, axe-like staff; signal allies or taunt enemies, control space, decisive strikes with the back end of the stylized axe end and stab enemies with the pointed end below the handle." },
  "Kotiate":    { title: "Kotiate",    desc: "Hand held cleaver; fast, precise, close quarter weapon with stylized notches for parrying weapons and for cracking bone with a flick of the wrist." },
  "Taiaha":     { title: "Taiaha",     desc: "two handed staff; balanced for offense and defence. the broad end is used to cut with the sharp edge, parry and strike with the flat and thrust with the hardened end, the carved ūpoko below the handle with a stylized arero is used to stab." },
  "Tī":         { title: "Tī",         desc: "Concealed narrow blades used for quick focused thrusts and close quarter style fighting. the fine serrated blade is capable of holding poison and directing it into the bloodstream" },
  "Timotimo":   { title: "Timotimo",   desc: "A traditional hand held gardening tool adapted for combat; disruptive in close-quarters and capable of disarming opponents or redirecting their strikes. The hardened point is deadly." },
  "Kō":         { title: "Kō",         desc: "A traditional two handed tool used for digging, adapted for combat the kō creates leverage, with lifts and sweeps that unbalance, strength in defence and a crippling final thrust." },
  "Toki Kakauroa": { title: "Toki Kakauroa", desc: "Long handled adze; heavy, crushing blows that break stances and bones alike with a sharpened axe-like blade fixed on the end and a strong handle capable of blocking attacks." },
  "Mere Tūhua": { title: "Mere Tūhua", desc: "Polished obsidian hand held cleaver; compact, lethal at close range. The blade along its edge is so sharp, the victim often doesn't realise they have been cut." },
  "Wahaika":    { title: "Wahaika",    desc: "Hand held striking weapon with a stylized recurved blade; used to trap limbs and weapons and control the battle at close range. The outside blade is sharpened and used for slashing while the flat face is used to block and strike at the opponent." },
  "Hoeroa":     { title: "Hoeroa",     desc: "Long curved staff carved with precision from the bones of an ancient beast; Proficient extended strikes, thrusts and blocks with whip-like arcs stun and slice opponents with ease. Once the momentum of a Hoeroa begins it is hard to stop." },
};
type WeaponUltimate = {
  id: string;
  title: string;      // the named ultimate (shows in a select-style bar)
  physical: string;   // effect text
  mental: string;
  spiritual: string;
};

export const WEAPON_ULTIMATES: Record<WeaponKey, WeaponUltimate> = {
  "Tewhatewha": {
    id: "ult-tewhatewha",
    title: "Kauwhanganui | Radiant Arc",
    physical: "Echoing the arc of Uenuku - a broad strike that cuts through the darkness, trailing sacred light. Instantly kills a lesser enemy. Explodes in blinding light, stunning all enemies in line of sight. Larger enemies are blinded. Ngārara suffers a mild burn",
    mental:   "Echoing the arc of Uenuku - a broad strike that cuts through the darkness, trailing sacred light. Disorients all enemies, including Ngārara. Forces them to attack random targets next turn",
    spiritual:"Echoing the arc of Uenuku - a broad strike that cuts through the darkness, trailing sacred light. Purges corruption from lesser enemies. Larger enemies lose spiritual/magical abilities for one turn. Ngārara is unaffected.",
  },
  "Kotiate": {
    id: "ult-kotiate",
    title: "Taiharatua | Gutrender",
    physical: "A savage side strike that rips into the torso and tears out in a spray of gore. Instantly kills a lesser enemy. Larger enemies suffer severe consequences. Ngārara takes a minor cut..",
    mental:   "A savage side strike that rips into the torso and tears out in a spray of gore. Shocks enemies in line of sight, freezing them for one turn. Ngārara is unaffected.",
    spiritual:"A savage side strike that rips into the torso and tears out in a spray of gore. Wrenches soul of larger enemies, leaving them spiritually vulnerable for three turns. Ngārara is unaffected.",
  },
  "Taiaha": {
    id: "ult-taiaha",
    title: "Kirihaehae | Razor to Flesh",
    physical: "A single fluid motion - slicing flesh and sinew with surgical precision. Instantly kills a lesser enemy with a clean cut. Larger enemies take severe or moderate damage. Ngārara suffers a shallow wound.",
    mental:   "A single fluid motion - slicing flesh and sinew with surgical precision. Sparks panic. Lesser enemies flee. Larger enemies hesitate and skip their next attack. Ngārara is unmoved.",
    spiritual:"A single fluid motion - slicing flesh and sinew with surgical precision. Severs spiritual ties. Lesser enemies become husks. Larger enemies lose spiritual bond with Ngārara.",
  },
  "Tī": {
    id: "ult-ti",
    title: "Kuratakai | Poison Fang",
    physical: "A fast-acting poisonous stab that instantly creates hallucinations. Kills a lesser enemy with a hidden heart stab. Larger enemies suffer severe damage. Ngārara receives a stinging flesh wound",
    mental:   "A fast-acting poisonous stab that instantly creates hallucinations. Enemies (including Ngārara) are disoriented. Next attack deals half damage..",
    spiritual:"A fast-acting poisonous stab that instantly creates hallucinations. Larger enemies begin fading, dying after three turns unless they are healed. Ngārara resists.",
  },
  "Timotimo": {
    id: "ult-timotimo",
    title: "Hoitōtara | Rootbound",
    physical: "Vines burst from the ground, wrapping and dragging victims into darkness. Vines burst from the ground, wrapping and dragging victims into darkness. Kills a lesser enemy via crushing/suffocation. Larger enemies are restrained for one turn with moderate damage. Ngārara receives surface lacerations.",
    mental:   "Vines burst from the ground, wrapping and dragging victims into darkness. Causes fear. Lesser enemies within line of sight skip next move/action. Larger enemies are distracted, lowering defence.",
    spiritual:"Vines burst from the ground, wrapping and dragging victims into darkness. Vines absorb spiritual residue, weakening blessings or protections.",
  },
  "Kō": {
    id: "ult-ko",
    title: "Tikikai | Devour the Fallen",
    physical: "With perfect timing, redirects the enemy weapon or power against them. Their wounds then burst with rapid growing plant life as their body disentegrates from within. Kills a lesser enemy by turning their own weapon against them. Larger enemies take moderate or severe damage. Ngārara is either grazed or injured - depending on the severity of its own previous attack.",
    mental:   "With perfect timing, redirects the enemy weapon or power against them. Their wounds then burst with rapid growing plant life as their body disentegrates from within. Nearby enemies are shocked. Smaller enemies flee. Larger enemies will attempt to aid their fallen ally, to no avail.",
    spiritual:"With perfect timing, redirects the enemy weapon or power against them. Their wounds then burst with rapid growing plant life as their body disentegrates from within. Severs aggressive intent. Spiritual enemies can't activate curses or spiritual powers next turn. Ngārara is unaffected spiritually.",
  },
  "Toki Kakauroa": {
    id: "ult-tokikakauroa",
    title: "Ngututaua | Crestfall",
    physical: "A ruthless cleave that breaks bones, lines and resolve. Kills a lesser enemy. Larger enemies (excluding Ngārara) suffer a critical hit. Ngārara receives a minor wound.",
    mental:   "A ruthless cleave that breaks bones, lines and resolve. Fractures morale. Enemies in line of sight get penalties to their next attack. DM rolls with disadvantage if rolling for an attack outcome.",
    spiritual:"A ruthless cleave that breaks bones, lines and resolve. Splits Spirit from Physical. Target (Excluding Ngārara) becomes a Kēhua | Ghost, as their body dies. If they are already a Kēhua they fade into nothing. Any previous spiritual protections are shattered.",
  },
  "Mere Tūhua": {
    id: "ult-meretuhua",
    title: "Kawau Moeara | Sleepless Blade",
    physical: "A cut so subtle, the enemy only realises they have been slain moments later. Kills a lesser enemy instantly. Larger enemies suffer delayed severe damage (triggers next turn).",
    mental:   "A cut so subtle, the enemy only realises they have been slain moments later. Silent death unnerves enemies within line of sight. Larger enemies retreat backwards out of range and re-assess their attack, unsure where it came from.",
    spiritual:"A cut so subtle, the enemy only realises they have been slain moments later. Unaware that they have been severed from their body, the spirit of a slain enemy remains in place as restless kēhua | Ghost, unless enemy is already a kēhua, in which case they fade into nothing. Ngārara receives a spiritual cut - severing connection to enemies within it's own line of sight for 2 turns",
  },
  "Wahaika": {
    id: "ult-wahaika",
    title: "Nihorere| Bladed Scales",
    physical: "A relentless flurry of slicing blows - drowning the enemy with unstoppable strikes. Instantly kills up to three lesser enemies in range. Larger enemies take severe damage.",
    mental:   "A relentless flurry of slicing blows - drowning the enemy with unstoppable strikes. Dazes observers with the speed of the attack. Remaining enemies attempt their next action with disadvantage (if rolling)",
    spiritual:"A relentless flurry of slicing blows - drowning the enemy with unstoppable strikes. Interrupts all spiritual focus. Enemies channeling powers are disrupted, including any spiritual protections. Ngārara’s Influence is lessened for one turn within line of sight",
  },
  "Hoeroa": {
    id: "ult-hoeroa",
    title: "Taiwhakaea | Tidal Surge",
    physical: "A sweeping arc carrying a surge of water that overwhelms the enemy - crushing and scattering all in its wake. Sweeps enemies off their feet. All lesser enemies within range are killed (or drowned if near water). Larger enemies are staggered. Ngārara resists the surge.",
    mental:   "A sweeping arc carrying a surge of water that overwhelms the enemy - crushing and scattering all in its wake. Instills dread. Remaining enemies hesitate on their next action.",
    spiritual:"A sweeping arc carrying a surge of water that overwhelms the enemy - crushing and scattering all in its wake. Disrupts the natural flow of spiritual energy. Larger enemies Spiritual attacks are disabled permanently. Ngārara holds its ground but its Spiritual abilities are disabled for one turn.",
  },
};


// Exactly TWO allowed weapons per Whare (edit as you like)
export const WHARE_WEAPONS: Record<HouseKey, WeaponKey[]> = {
  "Te Whare Taumata":    ["Kotiate", "Tewhatewha"],
  "Te Whare Māriri":     ["Taiaha", "Tī"],
  "Te Whare Ahuone":     ["Kō", "Timotimo"],
  "Te Whare Pōhutukawa": ["Toki Kakauroa", "Mere Tūhua"],
  "Te Whare Tahuaroa":   ["Hoeroa", "Wahaika"],
};


// All available skills (edit names to match your sheet exactly)


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
// ---- type guards for loading saved strings safely ----
const isRaceKey   = (v: any): v is RaceKey   => typeof v === "string" && v in SPECIES_AHEI;
const isOriginKey = (v: any): v is OriginKey => typeof v === "string" && (ORIGIN_OPTIONS as readonly string[]).includes(v);
const isHouseKey  = (v: any): v is HouseKey  => typeof v === "string" && (HOUSE_OPTIONS  as readonly string[]).includes(v);
const isWeaponKey = (v: any): v is WeaponKey => typeof v === "string" && (ALL_WEAPONS    as readonly string[]).includes(v);

export default function App() {
  // === SHEET STATE ===
  const [name, setName] = useState("");
  const [race, setRace]     = useState<RaceKey | "">("");
const [origin, setOrigin] = useState<OriginKey | "">("");

const [house, setHouse] = useState<HouseKey | "">("");
const [weapon, setWeapon] = useState<WeaponKey | "">("");

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

// Selected inherited Āhei for MANA TUKU IHO (non-editable box)
const [inheritedAheiId, setInheritedAheiId] = useState<string>("");
// Mobile-only: show/hide the inherited Āhei description
const [showAheiDesc, setShowAheiDesc] = useState(false);

// Mana a Rohe (Origin Ability)
const [originAheiId, setOriginAheiId] = useState<string>("");
const [showOriginDesc, setShowOriginDesc] = useState(false);

const [houseAheiId, setHouseAheiId] = useState<string>("");
const [showArongaDesc, setShowArongaDesc] = useState(false);

// Weapon popup toggle
const [showWeaponDesc, setShowWeaponDesc] = useState(false);

// auto-close the popup whenever the selected weapon changes
useEffect(() => {
  setShowWeaponDesc(false);
}, [weapon]);
// Ultimate detail toggles
const [showUltPhys, setShowUltPhys] = useState(false);
const [showUltMent, setShowUltMent] = useState(false);
const [showUltSpir, setShowUltSpir] = useState(false);

// Reset when weapon changes
useEffect(() => {
  setShowUltPhys(false);
  setShowUltMent(false);
  setShowUltSpir(false);
}, [weapon]);






// LOAD once
useEffect(() => {
  const saved = loadJSON<{
    name?: string; race?: string; origin?: string; house?: string; weapon?: string;
    ahei1?: string; ahei2?: string; ahei3?: string;
    ult1?: string;  ult2?: string;  ult3?: string;
    skillChoices?: string[];
    skillExtras?: number[];
    tinanaRow1?: boolean[]; tinanaRow2?: boolean[];
    hineRow1?:   boolean[]; hineRow2?:   boolean[];
    wairuaRow1?: boolean[]; wairuaRow2?: boolean[];
    consMild?: string;
    consModerate?: string;
    consSevere?: string;
     inheritedAheiId?: string;
     originAheiId?: string;
     houseAheiId?: string;

  }>(STORAGE_KEY_SHEET);

  if (saved) {
    if (saved.name   != null) setName(saved.name);
    if (isRaceKey(saved.race))     setRace(saved.race);     else setRace("");
    if (isOriginKey(saved.origin)) setOrigin(saved.origin); else setOrigin("");
    if (isHouseKey(saved.house))   setHouse(saved.house);   else setHouse("");
    if (isWeaponKey(saved.weapon)) setWeapon(saved.weapon); else setWeapon("");

    if (saved.ahei1  != null) setAhei1(saved.ahei1);
    if (saved.ahei2  != null) setAhei2(saved.ahei2);
    if (saved.ahei3  != null) setAhei3(saved.ahei3);
    if (saved.ult1   != null) setUlt1(saved.ult1);
    if (saved.ult2   != null) setUlt2(saved.ult2);
    if (saved.ult3   != null) setUlt3(saved.ult3);

    if (Array.isArray(saved.skillChoices)) setSkillChoices(saved.skillChoices);
    if (Array.isArray(saved.skillExtras))  setSkillExtras(saved.skillExtras);

    if (Array.isArray(saved.tinanaRow1)) setTinanaRow1(saved.tinanaRow1);
    if (Array.isArray(saved.hineRow1))   setHineRow1(saved.hineRow1);
    if (Array.isArray(saved.wairuaRow1)) setWairuaRow1(saved.wairuaRow1);

    if (saved.consMild  != null) setConsMild(saved.consMild);
    if (saved.consModerate != null) setConsModerate(saved.consModerate);
    if (saved.consSevere   != null) setConsSevere(saved.consSevere);
    if (saved?.inheritedAheiId != null) setInheritedAheiId(saved.inheritedAheiId);
    if (saved?.originAheiId != null) setOriginAheiId(saved.originAheiId);
    if (saved?.houseAheiId != null) setHouseAheiId(saved.houseAheiId);

  }

  setHasLoaded(true); // ✅ ALWAYS set this, even if nothing was saved
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

     inheritedAheiId,
     originAheiId,
     houseAheiId, 

    
  };

  saveJSON(STORAGE_KEY_SHEET, payload);
}, [
  hasLoaded,
  name, race, origin, house, weapon,
  ahei1, ahei2, ahei3,
  ult1,  ult2,  ult3,
  skillChoices, skillExtras,
  tinanaRow1, hineRow1, wairuaRow1,
  consMild, consModerate, consSevere, inheritedAheiId, originAheiId, houseAheiId,
  
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

  // --- Reactive mobile flag (define BEFORE positions so we can use it)
const [isMobile, setIsMobile] = useState<boolean>(() => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 640px)").matches;
});

useEffect(() => {
  if (typeof window === "undefined") return;
  const mq = window.matchMedia("(max-width: 640px)");
  const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
  // modern + Safari fallback
  if (mq.addEventListener) mq.addEventListener("change", handler);
  else mq.addListener(handler as any);

  setIsMobile(mq.matches);
  return () => {
    if (mq.removeEventListener) mq.removeEventListener("change", handler);
    else mq.removeListener(handler as any);
  };
}, []);

// === POSITIONS (desktop vs mobile) ===
type Rect = { left: number; top: number; width: number; rotate?: number; z?: number };
type Positions = {
  // identity + artwork
  name: Rect; race: Rect; origin: Rect; house: Rect; weapon: Rect; speciesImg: Rect;
  // skills
  skillsTitle: Rect; skillsMod: Rect; skillsBlock: Rect; skillsExtrasBlock: Rect;
  // stress titles + rows
  tinanaTitle: Rect; hinengaroTitle: Rect; wairuaTitle: Rect;
  tinanaRow1Pos: Rect; hinengaroRow1Pos: Rect; wairuaRow1Pos: Rect;
  // consequences
  consequencesTitle: Rect; consequencesMild: Rect; consequencesModerate: Rect; consequencesSevere: Rect;
  // headings / misc
  title1: Rect; title2: Rect; dicePanel: Rect;
  // ahei 1 (split)
  ahei1Select: Rect; ahei1Toggle: Rect; ahei1Desc: Rect;
  // ahei 2 (split)
    ahei2Select: Rect; ahei2Toggle: Rect; originDesc: Rect;
   // ahei 3 (split) 
    ahei3Select: Rect; ahei3Toggle: Rect; ahei3Desc: Rect;
  // ultimate
  ultimateTitle: Rect; ultimate1: Rect; ultimate2: Rect; ultimate3: Rect;
    // dice total badge
  diceTotal: Rect;
  weaponImg: Rect;
  weaponPopup: Rect;
  ultTitleBar: Rect;
  ultPhysDesc: Rect;
  ultMentDesc: Rect;
  ultSpirDesc: Rect;
  ultPhysToggle: Rect;
  ultMentToggle: Rect;
  ultSpirToggle: Rect;
  ultPhysLabel: Rect;
  ultMentLabel: Rect;
  ultSpirLabel: Rect;
  


};

const positionsDesktop: Positions = {
  // identity + artwork
  name:{left:6,top:1,width:35},
  race:{left:6,top:5.5,width:22},
  origin:{left:6,top:10,width:22},
  house:{left:6,top:14.5,width:22},
  weapon:{left:6,top:20.5,width:22},
  speciesImg:{left:28,top:8,width:18, z: 6 },
  weaponImg:{left:5, top:24, width:18, rotate: 0 },
  weaponPopup: { left: 10, top: 22.5, width: 16 },


  // skills
  skillsTitle:{left:47,top:27,width:30},
  skillsMod:{left:85,top:27,width:10},
  skillsBlock:{left:47,top:29,width:18},
  skillsExtrasBlock:{left:89,top:29,width:5},

  // stress titles + rows
  tinanaTitle:{left:52,top:6.5,width:30},
  hinengaroTitle:{left:52,top:8.1,width:30},
  wairuaTitle:{left:52,top:9.75,width:30},
  tinanaRow1Pos:{left:84.5,top:6,width:13},
  hinengaroRow1Pos:{left:52,top:8,width:30},
  wairuaRow1Pos:{left:52,top:10,width:30},

  // consequences
  consequencesTitle:{left:50,top:12,width:40},
  consequencesMild:{left:50,top:14.5,width:45},
  consequencesModerate:{left:50,top:18,width:45},
  consequencesSevere:{left:50,top:21.5,width:45},

  // ahei 1 split
  ahei1Select:{left:6,top:35,width:37},
  ahei1Toggle:{left:6,top:39.5,width:18},
  ahei1Desc:{left:8,top:39.5,width:35},

  // ahei 2 split
  ahei2Select:{ left: 6, top: 46,   width: 37 },
  ahei2Toggle:{ left: 6, top: 50.5, width: 18 },
  originDesc:  { left: 8, top: 50.5, width: 35 },

  // ahei 3 split
  // add:
ahei3Select:{ left: 6, top: 57,   width: 37 },
ahei3Toggle:{ left: 6, top: 61.5, width: 18 },
ahei3Desc:  { left: 6, top: 63,   width: 37 },


  // ultimate
  ultimateTitle:{left:6,top:69,width:37},
  ultimate1:{left:6,top:71,width:37},
  ultimate2:{left:6,top:79,width:37},
  ultimate3:{left:6,top:87,width:37},

  // headings / misc
  title1:{left:85,top:4,width:10},
  title2:{left:92,top:4,width:10},
  dicePanel:{left:45,top:82,width:80},
  diceTotal:{ left:10.5, top:79, width:18 }, // tweak these %
  ultPhysDesc:{ left: 10, top: 75,   width: 35, z: 60 },
  ultMentDesc:{ left: 10, top: 81, width: 35, z: 22 },
  ultSpirDesc:{ left: 10, top: 87,   width: 35, z: 24 },
  ultTitleBar:{ left: 6, top: 71, width: 37, z: 12 },
  ultPhysToggle:{ left: 6, top: 75, width: 19 }, // near “Physical effect”
  ultMentToggle:{ left: 6, top: 81, width: 19 }, // near “Mental effect”
  ultSpirToggle:{ left: 6, top: 87, width: 19 }, // near “Spiritual effect”
  ultPhysLabel: { left: 6,  top: 74, width: 20 },
  ultMentLabel: { left: 6,  top: 80, width: 20 },
  ultSpirLabel: { left: 6,  top: 86, width: 20 },
};

const positionsMobile: Positions = {
  // identity + artwork
  name:{left:6,top:1,width:30},
  race:{left:6,top:5.5,width:31},
  origin:{left:6,top:10,width:31},
  house:{left:6,top:14,width:31},
  weapon:{left:6,top:20,width:25},
  speciesImg:{left:32,top:20,width:18, z: 6 },
  weaponImg:{left:10, top:25, width:18},
  weaponPopup: { left: 10, top: 28, width: 30 },

  // skills
  skillsTitle:{left:50,top:34,width:30},
  skillsMod:{left:80,top:34,width:14},
  skillsBlock:{left:50,top:38,width:25},
  skillsExtrasBlock:{left:77,top:38,width:18},

  // ahei 1 split
  ahei1Select:{left:6,top:34,width:42.5},
  ahei1Toggle:{left:6,top:38,width:28},
  ahei1Desc:{left:6,top:40,width:45},

  // ahei 2 split
  ahei2Select:{ left: 6, top: 42, width: 42.5 },
  ahei2Toggle:{ left: 6, top: 46, width: 28 },
  originDesc:  { left: 6, top: 48, width: 45 },

  // ahei 3 split
  // add:
ahei3Select:{ left: 6, top: 50, width: 43 },
ahei3Toggle:{ left: 6, top: 54, width: 28 },
ahei3Desc:  { left: 6, top: 56, width: 45 },


  // ultimate
  ultimateTitle:{left:6,top:58,width:45},
  ultimate1:{left:6,top:59,width:56},
  ultimate2:{left:6,top:66.5,width:56},
  ultimate3:{left:6,top:74,width:56},
  ultPhysDesc:{ left: 12, top: 64,   width: 56, z: 20 },
  ultMentDesc:{ left: 12, top: 69, width: 56, z: 22 },
  ultSpirDesc:{ left: 12, top: 74,   width: 56, z: 24 },
  ultTitleBar:{ left: 6, top: 59, width: 37, z: 12 },
  ultPhysToggle:{ left: 6, top: 63.5, width: 24 },
  ultMentToggle:{ left: 6, top: 68.5, width: 24 },
  ultSpirToggle:{ left: 6, top: 74.2, width: 24 },
  ultPhysLabel: { left: 6,  top: 62, width: 40 },
  ultMentLabel: { left: 6,  top: 67, width: 40 },
  ultSpirLabel: { left: 6,  top: 72.5, width: 40 },

  // stress titles + rows
  tinanaTitle:{left:40,top:7.5,width:60},
  hinengaroTitle:{left:40,top:10.5,width:60},
  wairuaTitle:{left:40,top:13.5,width:60},
  tinanaRow1Pos:{left:82,top:7,width:15},
  hinengaroRow1Pos:{left:52,top:59,width:30},
  wairuaRow1Pos:{left:52,top:74,width:30},

  // headings / misc
  title1:{left:83,top:4,width:5},
  title2:{left:91.5,top:4,width:5},
  dicePanel:{left:5,top:80,width:45},
  diceTotal:{ left:6, top:37, width:50 }, // tweak these %

  // consequences
  consequencesTitle:{left:52,top:19,width:80},
  consequencesMild:{left:50,top:22,width:45},
  consequencesModerate:{left:50,top:26,width:45},
  consequencesSevere:{left:50,top:30,width:45},


};

const [pos, setPos] = useState<Positions>(isMobile ? positionsMobile : positionsDesktop);
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
      {/* Scatter box only (dice stay here) */}
<div
  style={{
    position: "relative",
    width:  isMobile ? SCATTER_MOBILE.width  : SCATTER_DESKTOP.width,
    height: isMobile ? SCATTER_MOBILE.height : SCATTER_DESKTOP.height,
    marginTop: "-20px",
    overflow: "visible",
    flex: "0 0 auto",
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
</div>

{roll && (
  <div
    className="field"
    style={{
      left:  `${pos.diceTotal.left}%`,
      top:   `${pos.diceTotal.top}%`,
      width: `${pos.diceTotal.width}%`,
      zIndex: 9,
    }}
  >
    <div
      style={{
        display: "inline-block",
        padding: "6px 8px",
        fontSize: isMobile ? 16 : 20,
        fontWeight: 700,
        background: "rgba(109, 233, 255, 0.75)",
        borderRadius: 4,
      }}
    >
      Total: {roll.total}
    </div>
  </div>
)}



      
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
<select
  className="select-underline"
  value={race}
  onChange={(e) => {
    const nextRace = e.target.value as RaceKey | "";
    setRace(nextRace);

    // 1) Keep Mana Tuku Iho (inherited) valid
    const inheritedOpts = nextRace ? SPECIES_AHEI[nextRace] : [];
    if (!inheritedOpts.some(a => a.id === inheritedAheiId)) {
      setInheritedAheiId("");
    }

    // 2) Keep Mana a Rohe (origin ability) valid for (nextRace + current origin)
    if (nextRace && origin) {
      const originOpts = ORIGIN_AHEI[nextRace][origin];
      if (!originOpts.some(a => a.id === originAheiId)) {
        setOriginAheiId("");
      }
    } else {
      setOriginAheiId("");
    }

    // 3) Close details panels
    setShowAheiDesc(false);
    setShowOriginDesc(false);
  }}
>
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
      zIndex: pos.speciesImg.z ?? 6,
      pointerEvents: "none", // so it won’t block clicks
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
        opacity: 0.98,
      }}
    />
  </div>
)}




{/* Weapon image preview (click to toggle popup) */}
{weapon && (
  <div
    className="field"
    style={{
      left:  `${pos.weaponImg.left}%`,
      top:   `${pos.weaponImg.top}%`,
      width: `${pos.weaponImg.width}%`,
      zIndex: pos.weaponImg.z ?? 12,
    }}
  >
    <div
      role="button"
      tabIndex={0}
      aria-label={`Show ${weapon} description`}
      aria-expanded={showWeaponDesc}
      onClick={() => setShowWeaponDesc(s => !s)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setShowWeaponDesc(s => !s); }}
      style={{ cursor: "pointer" }}
    >
      <img
        key={weapon}
        src={`/weapons/${(WEAPON_FILE_OVERRIDES[weapon] ?? toWeaponSlug(weapon))}.png`}
        alt={weapon}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,.25))",
          opacity: 0.98,
          transform: pos.weaponImg.rotate ? `rotate(${pos.weaponImg.rotate}deg)` : undefined,
          pointerEvents: "none",
        }}
        onError={(e) => {
          const el = e.currentTarget as HTMLImageElement;
          const fallback = `/weapons/${toWeaponSlug(weapon)}.png`;
          if (el.src.endsWith(fallback)) {
            el.style.display = "none"; // hide if fallback also missing
          } else {
            el.src = fallback;
          }
        }}
      />
    </div>
  </div>
)}

{/* Weapon description popup (to the left) */}
{weapon && showWeaponDesc && (
  <div
    className="field overlay-wrap overlay-wrap--weapon open"
    style={{
      left:  `${pos.weaponPopup.left}%`,
      top:   `${pos.weaponPopup.top}%`,
      width: `${pos.weaponPopup.width}%`,
      zIndex: 28,
    }}
  >
    <div className="overlay-box overlay-box--weapon">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <strong>{WEAPON_INFO[weapon]?.title ?? weapon}</strong>
        <button
          className="btn"
          onClick={() => setShowWeaponDesc(false)}
          aria-label="Close weapon info"
          style={{ padding: "2px 6px" }}
        >
          ✕
        </button>
      </div>
      <div className="ahei-desc" style={{ marginTop: 6 }}>
        {WEAPON_INFO[weapon]?.desc ?? "No description available."}
      </div>
    </div>
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
          <select
  className="select-underline"
  value={origin}
  onChange={(e) => {
    const next = e.target.value as OriginKey | "";
    setOrigin(next);

    // Keep Mana a Rohe valid for (current race + next origin)
    if (race && next) {
      const list = ORIGIN_AHEI[race][next];
      if (!list.some(a => a.id === originAheiId)) {
        setOriginAheiId("");
      }
    } else {
      setOriginAheiId("");
    }

    setShowOriginDesc(false);
  }}
  disabled={!race}   // must choose Ira first
>
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
          <select
  className="select-underline"
  value={house}
  onChange={(e) => {
    const next = e.target.value as HouseKey | "";
    setHouse(next);
    setShowArongaDesc(false); // close aronga details when house changes

    // enforce allowed weapons for this Whare
    if (next) {
      const allowed = WHARE_WEAPONS[next];

      if (weapon && !allowed.includes(weapon as WeaponKey)) {
        setWeapon(""); // clear invalid weapon
      }
    }
  }}
>
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
          <select
  className="select-underline"
  value={weapon}
  onChange={(e) => setWeapon(e.target.value as WeaponKey | "")}
  disabled={!house}   // must choose a Whare first
>
  <option value="">— select —</option>

  {(
    house
      ? WHARE_WEAPONS[house as HouseKey]        // the 2 allowed for this Whare
      : ALL_WEAPONS                              // fallback if no house picked
  ).map((w) => (
    <option key={w} value={w}>{w}</option>
  ))}
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
    zIndex: 7,
  }}
>
  <div className="extras-column">
    {Array.from({ length: 16 }).map((_, i) => (
      <div key={i} className="extra-row">
        <input
  type="text"
  inputMode="numeric"
  pattern="-?[0-9]*"
  className="skill-extra"
  value={String(skillExtras[i] ?? 0)}
  onChange={(e) => {
    const raw = e.target.value.trim();
    const next = [...skillExtras];
    next[i] = raw === "" || raw === "-" ? 0 : (parseInt(raw, 10) || 0);
    setSkillExtras(next);
  }}
  onFocus={(e) => e.currentTarget.select()}
  placeholder="0"
/>


      </div>
    ))}
  </div>
</div>





{/* Āhei 1 — Label + select */}
<div
  className="field field--lg field--compact"
  style={{ left: `${pos.ahei1Select.left}%`, top: `${pos.ahei1Select.top}%`, width: `${pos.ahei1Select.width}%` }}
>
  <div className="field-label">
    <span className="label-white">MANA TUKU IHO | </span>
    <span className="label-black">INHERITED ABILITY</span>
  </div>

  <select
    className="select-underline"
    value={inheritedAheiId}
    onChange={(e) => { setInheritedAheiId(e.target.value); setShowAheiDesc(false); }}
    disabled={!race}
  >
    <option value="">— choose your inherited ability —</option>
    {(SPECIES_AHEI[race] || []).map(a => (
      <option key={a.id} value={a.id}>{a.title}</option>
    ))}
  </select>
</div>

{/* Āhei 1 — Toggle button (mobile only; CSS hides on desktop) */}
{race && inheritedAheiId && (
  <div
    className="field field--toggle"
    style={{ left: `${pos.ahei1Toggle.left}%`, top: `${pos.ahei1Toggle.top}%`, width: `${pos.ahei1Toggle.width}%`}}
  >
    <button type="button" className="btn toggle-desc" onClick={() => setShowAheiDesc(s => !s)}>
      {showAheiDesc ? "Hide details" : "Show details"}
    </button>
  </div>
)}

{/* Āhei 1 — Description box (always on desktop; toggled on mobile) */}
{race && inheritedAheiId && showAheiDesc && (
  <div
  className={`field overlay-wrap overlay-wrap--inherited ${showAheiDesc ? "open" : ""}`}
  style={{ left: `${pos.ahei1Desc.left}%`, top: `${pos.ahei1Desc.top}%`, width: `${pos.ahei1Desc.width}%` }}
>

 
    <div className="overlay-box overlay-box--tuku-iho">
      <div className="ahei-desc">
        {(SPECIES_AHEI[race] || []).find(a => a.id === inheritedAheiId)?.desc}
      </div>
    </div>
  </div>
)}











        {/* Āhei 2 — Label + select (Origin ability) */}
<div
  className="field field--lg field--compact"
  style={{ left: `${pos.ahei2Select.left}%`, top: `${pos.ahei2Select.top}%`, width: `${pos.ahei2Select.width}%` }}
>
  <div className="field-label">
    <span className="label-white">MANA A ROHE | </span>
    <span className="label-black">ORIGIN ABILITY</span>
  </div>

  <select
    className="select-underline"
    value={originAheiId}
    onChange={(e) => { setOriginAheiId(e.target.value); setShowOriginDesc(false); }}
    disabled={!(race && origin)}
  >
    <option value="">— choose your origin ability —</option>
    {(race && origin ? ORIGIN_AHEI[race][origin] : []).map(a => (
      <option key={a.id} value={a.id}>{a.title}</option>
    ))}
  </select>
</div>

{/* Āhei 2 — Toggle (mobile only; CSS hides on desktop) */}
{race && origin && originAheiId && (
  <div
    className="field field--toggle"
    style={{ left: `${pos.ahei2Toggle.left}%`, top: `${pos.ahei2Toggle.top}%`, width: `${pos.ahei2Toggle.width}%` }}
  >
    <button type="button" className="btn toggle-desc" onClick={() => setShowOriginDesc(s => !s)}>
      {showOriginDesc ? "Hide details" : "Show details"}
    </button>
  </div>
)}

{race && origin && originAheiId && showOriginDesc && (() => {
  const desc = (ORIGIN_AHEI[race]?.[origin] ?? []).find(a => a.id === originAheiId)?.desc;
  return (
    <div
  className={`field overlay-wrap overlay-wrap--origin ${showOriginDesc ? "open" : ""}`}
  style={{ left: `${pos.originDesc.left}%`, top: `${pos.originDesc.top}%`, width: `${pos.originDesc.width}%` }}
>

      <div className="overlay-box overlay-box--origin">
        <div className="ahei-desc">{desc}</div>
      </div>
    </div>
  );
})()}





        {/* Āhei 3 — Mana Aronga (driven by Whare) */}
<div
  className="field field--lg field--compact"
  style={{ left: `${pos.ahei3Select.left}%`, top: `${pos.ahei3Select.top}%`, width: `${pos.ahei3Select.width}%` }}
>
  <div className="field-label">
    <span className="label-white">MANA ARONGA | </span>
    <span className="label-black">SPECIALIZATION</span>
  </div>

  <select
    className="select-underline"
    value={houseAheiId}
    onChange={(e) => setHouseAheiId(e.target.value)}
    disabled={!house}
  >
    <option value="">— auto from Whare —</option>
    {(house ? WHARE_ARONGA[house as HouseKey] : []).map(a => (

      <option key={a.id} value={a.id}>{a.title}</option>
    ))}
  </select>
</div>

{house && houseAheiId && (
  <div
    className="field field--toggle"
    style={{ left: `${pos.ahei3Toggle.left}%`, top: `${pos.ahei3Toggle.top}%`, width: `${pos.ahei3Toggle.width}%` }}
  >
    <button type="button" className="btn toggle-desc" onClick={() => setShowArongaDesc(s => !s)}>
      {showArongaDesc ? "Hide details" : "Show details"}
    </button>
  </div>
)}

{/* 5b — OVERLAY goes RIGHT HERE */}
{house && houseAheiId && showArongaDesc && (
  <div
    className="field overlay-wrap open"
    style={{
      left:  `${pos.ahei3Desc.left}%`,
      top:   `${pos.ahei3Desc.top}%`,
      width: `${pos.ahei3Desc.width}%`,
      zIndex: 13,
    }}
  >
    <div className="overlay-box overlay-box--aronga">
      <div className="ahei-desc">
        {WHARE_ARONGA[house as HouseKey].find(a => a.id === houseAheiId)?.desc}

      </div>
    </div>
  </div>
)}

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
{/* Weapon ultimate title — locked, styled like āhei select */}
{weapon && WEAPON_ULTIMATES[weapon] && (
  <div
    className="field field--lg field--compact"
    style={{
      left:  `${pos.ultTitleBar.left}%`,
      top:   `${pos.ultTitleBar.top}%`,
      width: `${pos.ultTitleBar.width}%`,
      zIndex: (pos as any).ultTitleBar?.z ?? 12,
    }}
  >
    <select
      className="select-underline"
      value="__locked"
      disabled
      aria-label="Weapon ultimate title"
      onChange={() => {}}
    >
      <option value="__locked">{WEAPON_ULTIMATES[weapon].title}</option>
    </select>
  </div>
)}



{/* Ultimate — Physical effect */}
<div
  className="field field--lg field--compact"
  style={{ left: `${pos.ultimate1.left}%`, top: `${pos.ultimate1.top}%`, width: `${pos.ultimate1.width}%` }}
>


  {weapon && WEAPON_ULTIMATES[weapon] && (
    <>
      

      
    </>
  )}
</div>
{weapon && WEAPON_ULTIMATES[weapon] && (
  <div
    className="field field--toggle"
    style={{
      left:  `${pos.ultPhysToggle.left}%`,
      top:   `${pos.ultPhysToggle.top}%`,
      width: `${pos.ultPhysToggle.width}%`,
    }}
  >
    <button
      type="button"
      className="btn toggle-desc"
      onClick={() => setShowUltPhys(s => !s)}
    >
      {showUltPhys ? "Hide details" : "Show details"}
    </button>
  </div>
)}


{/* Ultimate — Mental effect */}
<div
  className="field field--lg field--compact"
  style={{ left: `${pos.ultimate2.left}%`, top: `${pos.ultimate2.top}%`, width: `${pos.ultimate2.width}%` }}
>

  {weapon && WEAPON_ULTIMATES[weapon] && (
    <>
      

      
    </>
  )}
</div>
{weapon && WEAPON_ULTIMATES[weapon] && (
  <div
    className="field field--toggle"
    style={{
      left:  `${pos.ultMentToggle.left}%`,
      top:   `${pos.ultMentToggle.top}%`,
      width: `${pos.ultMentToggle.width}%`,
    }}
  >
    <button
      type="button"
      className="btn toggle-desc"
      onClick={() => setShowUltMent(s => !s)}
    >
      {showUltMent ? "Hide details" : "Show details"}
    </button>
  </div>
)}


{/* Ultimate — Spiritual effect */}
<div
  className="field field--lg field--compact"
  style={{ left: `${pos.ultimate3.left}%`, top: `${pos.ultimate3.top}%`, width: `${pos.ultimate3.width}%` }}
>

  {weapon && WEAPON_ULTIMATES[weapon] && (
    <>
      

      
      
    </>
  )}
</div>
{weapon && WEAPON_ULTIMATES[weapon] && (
  <div
    className="field field--toggle"
    style={{
      left:  `${pos.ultSpirToggle.left}%`,
      top:   `${pos.ultSpirToggle.top}%`,
      width: `${pos.ultSpirToggle.width}%`,
    }}
  >
    <button
      type="button"
      className="btn toggle-desc"
      onClick={() => setShowUltSpir(s => !s)}
    >
      {showUltSpir ? "Hide details" : "Show details"}
    </button>
  </div>
)}

{/* Ultimate labels (positioned) */}
<div
  className="field mini-label ult-label"
  style={{
    left:  `${pos.ultPhysLabel.left}%`,
    top:   `${pos.ultPhysLabel.top}%`,
    width: `${pos.ultPhysLabel.width}%`,
  }}
>
  Physical effect
</div>

<div
  className="field mini-label ult-label"
  style={{
    left:  `${pos.ultMentLabel.left}%`,
    top:   `${pos.ultMentLabel.top}%`,
    width: `${pos.ultMentLabel.width}%`,
  }}
>
  Mental effect
</div>

<div
  className="field mini-label ult-label"
  style={{
    left:  `${pos.ultSpirLabel.left}%`,
    top:   `${pos.ultSpirLabel.top}%`,
    width: `${pos.ultSpirLabel.width}%`,
  }}
>
  Spiritual effect
</div>
{/* === ULTIMATE OVERLAYS (top-level under .sheet) === */}
{weapon && WEAPON_ULTIMATES[weapon] && showUltPhys && (
  <div
    className="field overlay-wrap overlay-wrap--ult open"
    style={{
      left:  `${pos.ultPhysDesc.left}%`,
      top:   `${pos.ultPhysDesc.top}%`,
      width: `${pos.ultPhysDesc.width}%`,
      zIndex: pos.ultPhysDesc.z ?? 22,
    }}
  >
    <div className="overlay-box overlay-box--ult">
      <div className="ahei-desc">{WEAPON_ULTIMATES[weapon].physical}</div>
    </div>
  </div>
)}

{weapon && WEAPON_ULTIMATES[weapon] && showUltMent && (
  <div
    className="field overlay-wrap overlay-wrap--ult open"
    style={{
      left:  `${pos.ultMentDesc.left}%`,
      top:   `${pos.ultMentDesc.top}%`,
      width: `${pos.ultMentDesc.width}%`,
      zIndex: pos.ultMentDesc.z ?? 22,
    }}
  >
    <div className="overlay-box overlay-box--ult">
      <div className="ahei-desc">{WEAPON_ULTIMATES[weapon].mental}</div>
    </div>
  </div>
)}

{weapon && WEAPON_ULTIMATES[weapon] && showUltSpir && (
  <div
    className="field overlay-wrap overlay-wrap--ult open"
    style={{
      left:  `${pos.ultSpirDesc.left}%`,
      top:   `${pos.ultSpirDesc.top}%`,
      width: `${pos.ultSpirDesc.width}%`,
      zIndex: pos.ultSpirDesc.z ?? 22,
    }}
  >
    <div className="overlay-box overlay-box--ult">
      <div className="ahei-desc">{WEAPON_ULTIMATES[weapon].spiritual}</div>
    </div>
  </div>
)}


      
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

