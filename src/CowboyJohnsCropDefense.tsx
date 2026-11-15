import { useState, useEffect, useRef, useCallback, useGrokTheme } from "./grok";
import type { CSSProperties, ChangeEvent, ReactNode } from "./grok";

/* ============================================================
   Cowboy John's Crop Defense
   Mobile-first tower defense. Import surface matches grok/canvas.
   ============================================================ */

type Screen = "title" | "help" | "play" | "paused" | "victory" | "defeat";
type TowerId = "ladybug" | "neem" | "sticky" | "scarecrow" | "mantis" | "predatory" | "uv" | "duster";
type EnemyId = "mite" | "aphid" | "beetle" | "caterpillar" | "inchworm" | "gnat" | "mildew" | "queen" | "locust" | "king" | "joe";
type Speaker = "john" | "joe" | "narrator";
type TargetMode = "first" | "last" | "close" | "strong";
type Pt = { x: number; y: number };

interface Upg { name: string; desc: string; cost: number }
interface TowerDef {
  id: TowerId; name: string; short: string; cost: number; role: string; onPath: boolean; key: string; color: string;
  paths: [Upg[], Upg[]];
}
interface EnemyDef {
  id: EnemyId; name: string; hp: number; spd: number; reward: number; leak: number; r: number;
  flying?: boolean; camo?: boolean; armor?: number; split?: { id: EnemyId; n: number }; boss?: boolean;
}
interface TStats {
  range: number; rof: number; dmg: number; air: boolean; camo: boolean; pierce: number; slow: number; slowT: number;
  cone: number; targets: number; detectAura: number; dot: number; dotT: number; stacks: number; splash: number;
  projectile: boolean; pSpeed: number; onPath: boolean; charges: number; planeCd: number; planeDmg: number; planeN: number;
  execute: number; stun: number; bounce: number; bonus: Partial<Record<EnemyId, number>>; instaSmall: boolean;
  spread: number; burn: number; camoDmg: number; permanent: boolean;
}
interface Tower {
  id: number; kind: TowerId; x: number; y: number; a: number; b: number; tgt: TargetMode;
  cd: number; charges: number; spent: number; lastAng: number; anim?: number;
}
interface Enemy {
  id: number; kind: EnemyId; dist: number; hp: number; max: number; r: number; slow: number; slowT: number;
  stun: number; dots: { dps: number; t: number }[]; armor: number; born: number; leak: number; reward: number;
  flying: boolean; camo: boolean; split?: { id: EnemyId; n: number }; boss: boolean; spawnT: number; hitT: number;
  x: number; y: number; ang: number; spd: number;
}
interface Shot {
  id: number; x: number; y: number; vx: number; vy: number; dmg: number; pierce: number; splash: number;
  life: number; kind: "bullet" | "beam" | "slash" | "bomb" | "spray" | "dust"; target?: number; bounce: number; camoOk: boolean; airOk: boolean; color: string; r: number;
}
interface Plane { id: number; x: number; y: number; vx: number; vy: number; drops: number; gap: number; t: number; dmg: number; splash: number; pierce: number; camoOk: boolean; pathDust: boolean; ang: number }
interface FloatT { id: number; x: number; y: number; text: string; c: string; t: number; max: number }
interface Fx { id: number; x: number; y: number; t: number; max: number; kind: "puff" | "flash" | "ring" | "slash" | "spark" | "splat" | "spray" | "bug"; c: string; r: number; ang?: number }
interface SpawnG { kind: EnemyId; n: number; gap: number; delay: number }
interface JohnMsg { text: string; t: number; modal: boolean; who?: Speaker; beat?: "intro" | "joeHello" | "reveal" | "johnReact" }
interface Cutscene { kind: "betrayal"; t: number; phase: 0 | 1 | 2 }
interface SaveData {
  v: 1; mapId: string; wave: number; cash: number; lives: number; maxLives: number; won40: boolean;
  towers: { kind: TowerId; x: number; y: number; a: number; b: number; tgt: TargetMode; charges: number; spent: number }[];
  seen: EnemyId[]; revealed?: boolean; freeUsed?: boolean;
}
interface Sim {
  screen: Screen; mapId: string; wave: number; waving: boolean; cash: number; lives: number; maxLives: number;
  speed: number; towers: Tower[]; enemies: Enemy[]; shots: Shot[]; planes: Plane[]; floats: FloatT[]; fx: Fx[];
  spawnQ: { at: number; kind: EnemyId }[]; waveT: number; selected: number | null; placing: TowerId | null;
  hover: Pt | null; john: JohnMsg | null; intro: boolean; won40: boolean; time: number; uid: number;
  seen: EnemyId[]; dirty: boolean; over: boolean; pendingEnd: number; shake: number;
  revealed: boolean; joeHere: boolean; johnHere: boolean;
  freeUsed: boolean; cut: Cutscene | null;
}

const WW = 1000, WH = 800, PATH_W = 44, START_CASH = 0, START_LIVES = 100, SELL = 0.7, MAX_WAVE = 40, SAVE_KEY = "cjcd-save-v1", CODE_PFX = "CJ1.";
const TARGETS: TargetMode[] = ["first", "last", "close", "strong"];
const MAP_ID = "johns-south-field";

const PATH_RAW: Pt[] = [
  { x: -30, y: 250 }, { x: 90, y: 250 }, { x: 280, y: 248 }, { x: 470, y: 250 },
  { x: 550, y: 280 }, { x: 590, y: 350 }, { x: 588, y: 450 }, { x: 540, y: 520 },
  { x: 430, y: 555 }, { x: 280, y: 565 }, { x: 180, y: 568 }, { x: 130, y: 610 },
  { x: 118, y: 680 }, { x: 170, y: 735 }, { x: 280, y: 758 }, { x: 480, y: 762 },
  { x: 680, y: 740 }, { x: 800, y: 680 }, { x: 860, y: 580 }, { x: 885, y: 490 },
  { x: 920, y: 430 }, { x: 970, y: 410 },
];
const PLANT: Pt = { x: 958, y: 408 };
const JOE_SPOT: Pt = { x: 108, y: 198 };
const JOHN_SPOT: Pt = { x: 655, y: 195 };
const JOE_LINE = "A cup of Joe never hurt anything, right?";
const BARN = { x: 720, y: 18, w: 210, h: 150 };
const POND = { x: 78, y: 418, r: 64 };
const NOBUILD: { x: number; y: number; r?: number; w?: number; h?: number }[] = [
  { x: BARN.x, y: BARN.y, w: BARN.w, h: BARN.h },
  { x: PLANT.x, y: PLANT.y, r: 62 },
  { x: POND.x, y: POND.y, r: POND.r },
];

const TOWERS: TowerDef[] = [
  { id: "ladybug", name: "Ladybug Nest", short: "Ladybug", cost: 175, role: "Eats mites and small pests.", onPath: false, key: "1", color: "#c43c2c",
    paths: [
      [{ name: "Hungry Brood", desc: "Ladybugs strike 30% faster.", cost: 150 }, { name: "Swarm", desc: "Two ladybugs hunt at once.", cost: 320 }, { name: "Colony", desc: "Three hunters and a wider range.", cost: 800 }, { name: "Blight Feast", desc: "Tiny pests are snapped up instantly.", cost: 2200 }],
      [{ name: "Strong Jaws", desc: "+4 damage per bite.", cost: 160 }, { name: "Iron Mandibles", desc: "Chew through armor.", cost: 380 }, { name: "Sky Leap", desc: "Ladybugs can pounce on flying pests.", cost: 950 }, { name: "Apex Predator", desc: "Brutal bites that finish wounded foes.", cost: 2600 }],
    ] },
  { id: "neem", name: "Neem Oil Sprayer", short: "Neem", cost: 250, role: "Cone of oil that slows a pack.", onPath: false, key: "2", color: "#5a8a2a",
    paths: [
      [{ name: "Wide Fan", desc: "A much broader spray cone.", cost: 180 }, { name: "Heavy Mist", desc: "The mist reaches flying pests and clings longer.", cost: 400 }, { name: "Sap Flood", desc: "Pests crawl through heavy, lasting sap.", cost: 950 }, { name: "Amber Prison", desc: "Soaked pests are briefly stuck fast.", cost: 2800 }],
      [{ name: "Caustic Mix", desc: "The oil burns as it coats.", cost: 200 }, { name: "Toxin Vat", desc: "Stronger burn, longer tick.", cost: 450 }, { name: "Blight Sight", desc: "Reveals mildew and scorches it.", cost: 1000 }, { name: "Harvest Burn", desc: "A devastating, widening spray.", cost: 3000 }],
    ] },
  { id: "sticky", name: "Sticky Trap", short: "Trap", cost: 60, role: "On-path glue. Slows, then wears out.", onPath: true, key: "3", color: "#e0a84a",
    paths: [
      [{ name: "Extra Glue", desc: "Holds twice as many pests.", cost: 80 }, { name: "Tarpit", desc: "A deep, lasting pit of sap.", cost: 200 }, { name: "Webbed Pit", desc: "Pests that step in are briefly stopped.", cost: 500 }, { name: "Endless Sap", desc: "The trap no longer wears out.", cost: 1200 }],
      [{ name: "Barbs", desc: "Glue-covered thorns deal damage.", cost: 80 }, { name: "Spike Pot", desc: "Heavier spikes, some armor bite.", cost: 220 }, { name: "Bear Trap", desc: "A sharp snap stuns the caught.", cost: 550 }, { name: "Thresher", desc: "A grinding damage zone on the path.", cost: 1400 }],
    ] },
  { id: "scarecrow", name: "Scarecrow Gunslinger", short: "Gunslinger", cost: 425, role: "Long-range revolver, one shot at a time.", onPath: false, key: "4", color: "#c47a2c",
    paths: [
      [{ name: "Quick Draw", desc: "Fires much faster.", cost: 250 }, { name: "Fan the Hammer", desc: "Faster still, and can wing flying pests.", cost: 550 }, { name: "Dual Wield", desc: "Two revolvers, two shots.", cost: 1300 }, { name: "Ricochet", desc: "Bullets bounce to a nearby pest.", cost: 3200 }],
      [{ name: "Long Barrel", desc: "More range and punch.", cost: 280 }, { name: "Hollow Point", desc: "Pierces armor.", cost: 650 }, { name: "Deadeye", desc: "Sees mildew. Chance of a critical shot.", cost: 1500 }, { name: "High Noon", desc: "A long, heavy snipe.", cost: 3800 }],
    ] },
  { id: "mantis", name: "Praying Mantis Post", short: "Mantis", cost: 350, role: "Short-range melee slashes.", onPath: false, key: "5", color: "#6a9a3a",
    paths: [
      [{ name: "Fast Claws", desc: "Strikes much faster.", cost: 220 }, { name: "Cleave", desc: "Hits up to three pests in reach.", cost: 500 }, { name: "Whirlwind", desc: "Slices every pest in range.", cost: 1100 }, { name: "Dance of Blades", desc: "A blur of claws and a longer reach.", cost: 2800 }],
      [{ name: "Piercing Hook", desc: "Heavier blades.", cost: 250 }, { name: "Armor Crack", desc: "Rips through shells.", cost: 600 }, { name: "Execute", desc: "Finishes wounded (non-boss) pests.", cost: 1400 }, { name: "Reaper", desc: "Devastating slashes, even on bosses.", cost: 3500 }],
    ] },
  { id: "predatory", name: "Predatory Mite Release", short: "Predators", cost: 300, role: "Releases mites that chew over time.", onPath: false, key: "6", color: "#8a5a2a",
    paths: [
      [{ name: "Brood Box", desc: "Two stacks of mites at once.", cost: 200 }, { name: "Infest", desc: "Three stacks, applied faster.", cost: 480 }, { name: "Plague Jump", desc: "Mites leap to a nearby pest on death.", cost: 1100 }, { name: "Pandemic", desc: "Longer infestations that jump farther.", cost: 2900 }],
      [{ name: "Vicious Strain", desc: "Much stronger chewing.", cost: 220 }, { name: "Winged Mites", desc: "They can catch flying pests.", cost: 520 }, { name: "Burrowers", desc: "Ignore armor and find mildew.", cost: 1200 }, { name: "Hemorrhage", desc: "Brutal chew, bursting as they finish.", cost: 3100 }],
    ] },
  { id: "uv", name: "UV Lamp", short: "UV Lamp", cost: 475, role: "Reveals mildew and burns pests.", onPath: false, key: "7", color: "#7a5cff",
    paths: [
      [{ name: "Floodlight", desc: "A wider detection and burn range.", cost: 280 }, { name: "Beacon", desc: "Nearby towers can see mildew too.", cost: 620 }, { name: "Watchtower", desc: "A large detect aura and a hotter lamp.", cost: 1500 }, { name: "Sunburst", desc: "Periodic pulse that scorches hidden pests.", cost: 3600 }],
      [{ name: "UV Burn", desc: "Hotter light, especially on mildew.", cost: 300 }, { name: "Sterilizer", desc: "A lingering burn.", cost: 700 }, { name: "Scorch Beam", desc: "The beam leaps to a second pest.", cost: 1600 }, { name: "Solar Flare", desc: "A fierce, chaining flare.", cost: 4000 }],
    ] },
  { id: "duster", name: "Crop Duster", short: "Duster", cost: 800, role: "A biplane runs the field on a timer.", onPath: false, key: "8", color: "#4a7ab0",
    paths: [
      [{ name: "Frequent Runs", desc: "The plane comes around sooner.", cost: 400 }, { name: "Crop Cover", desc: "More drops, and they find mildew.", cost: 900 }, { name: "Carpet Run", desc: "Bombs the whole dirt path.", cost: 2200 }, { name: "Air Show", desc: "Two planes, very often.", cost: 5000 }],
      [{ name: "Payload", desc: "Heavier dust charges.", cost: 450 }, { name: "Bunker Buster", desc: "Bigger blasts that bite armor.", cost: 1000 }, { name: "Tank Buster", desc: "Devastating vs shells and bosses.", cost: 2400 }, { name: "Harvest Moon", desc: "A massive, burning payload.", cost: 5600 }],
    ] },
];
const TDEF: Record<TowerId, TowerDef> = Object.fromEntries(TOWERS.map((d) => [d.id, d])) as Record<TowerId, TowerDef>;
const TIDS = TOWERS.map((d) => d.id);

const EDEFS: Record<EnemyId, EnemyDef> = {
  mite: { id: "mite", name: "Spider Mite", hp: 10, spd: 58, reward: 1, leak: 1, r: 8 },
  aphid: { id: "aphid", name: "Fast Aphid", hp: 7, spd: 100, reward: 1, leak: 1, r: 7 },
  beetle: { id: "beetle", name: "Armored Beetle", hp: 48, spd: 40, reward: 3, leak: 2, r: 11, armor: 4 },
  caterpillar: { id: "caterpillar", name: "Split Caterpillar", hp: 32, spd: 50, reward: 2, leak: 2, r: 12, split: { id: "inchworm", n: 2 } },
  inchworm: { id: "inchworm", name: "Inchworm", hp: 12, spd: 72, reward: 1, leak: 1, r: 7 },
  gnat: { id: "gnat", name: "Fungus Gnat", hp: 18, spd: 84, reward: 2, leak: 2, r: 9, flying: true },
  mildew: { id: "mildew", name: "Powdery Mildew", hp: 26, spd: 62, reward: 3, leak: 2, r: 13, camo: true },
  queen: { id: "queen", name: "Mite Queen", hp: 220, spd: 34, reward: 22, leak: 5, r: 16 },
  locust: { id: "locust", name: "Locust", hp: 28, spd: 78, reward: 3, leak: 2, r: 10, flying: true },
  king: { id: "king", name: "Locust Swarm King", hp: 900, spd: 32, reward: 80, leak: 20, r: 22, armor: 3, boss: true },
  joe: { id: "joe", name: "Joe", hp: 1400, spd: 30, reward: 120, leak: 25, r: 22, armor: 4, boss: true },
};
const EIDS = Object.keys(EDEFS) as EnemyId[];

const JOHN_INTRO = "Howdy, farmhand. Name's Cowboy John, and this here's my hemp farm. Them spider mites been eatin' us out of house and home. I'll stake you one Ladybug Nest on the house — it's marked FREE in the shop. Plant it beside the dirt path. After that, cash comes from squashed pests and cleared waves. Hold the line, partner.";
const JOHN_TIPS = [
  "Towers sit beside the path, not on it — except Sticky Traps, which belong right in the dirt.",
  "Each tower has two upgrade paths. You can take one path all the way and the other up to tier 2.",
  "Tap a placed tower to upgrade, change its target, or sell it back for a partial refund.",
  "Space starts the next wave. You can also hammer that Start Wave button.",
  "A half-pushed plan is still a plan. Place a couple towers before you open the gate.",
  "If it flies, a regular nest can't catch it. UV Lamps, the Crop Duster, or the right upgrades will.",
  "Mildew hides in plain sight. A UV Lamp lights it up, and a Beacon lets nearby towers see it too.",
  "Armored beetles shrug off light bites. Gunslingers, mantises, and iron mandibles crack shells.",
  "Caterpillars split when they drop. Finish the little ones or they'll sneak through.",
  "The Mite Queen sheds mites as she waddles. Burn her down or you'll be swimming in 'em.",
  "Every tenth wave, the Locust Swarm King comes stompin'. He sheds flying locusts — be ready.",
  "Sell a tower if you placed it wrong. You'll get most of your spendin' money back.",
  "The plant wilts as it takes hits. Don't let that crop go brown on my watch.",
  "Two-times speed is there when you trust your line. I still watch with both eyes.",
  "Your farm autosaves between waves. Copy a save code if you want a spare in your pocket.",
];
const JOHN_NEW: Partial<Record<EnemyId, string>> = {
  aphid: "Aphids comin' — quick little green meanies. They'll slip a slow nest if you aren't covering the bends.",
  beetle: "Armored beetles on the path. Light bites just bounce off that shell. Bring some punch.",
  caterpillar: "Split caterpillars. Squash one and two inchworms wriggle out. Don't celebrate early.",
  gnat: "Fungus gnats in the air, farmhand. Regular nests can't jump that high — grab a lamp, a duster, or upgrade a gunslinger.",
  mildew: "Powdery mildew — you can't hit what you can't see. A UV Lamp is the cure.",
  queen: "Mite Queen comin' through. She'll birth a stream of mites unless you put her down quick.",
  king: "That's the Locust Swarm King. Big, ugly, and he sheds flyers. Everything you've got, now.",
};

const JOE_AWAY = [4, 8, 10, 14, 18, 20, 24, 28, 30, 34, 36, 38, 40];
function joeAwayFor(wave: number): boolean { return JOE_AWAY.indexOf(wave) >= 0; }

const JOE_HELLO = JOE_LINE + " Name's Joe. I lend a hand on South Field when John needs one — fence line, mostly.";
const JOE_REVEAL = "You finally noticed. I was wonderin' how many walks it'd take. Those mites? They've always been mine to send. This farm just didn't know it yet. " + JOE_LINE;
const JOHN_ON_REVEAL = "Joe... you were on my payroll. Get off my land. Farmhand — take him down. That's an order.";

function joeHereAt(wave: number, revealed: boolean, won40: boolean, waving: boolean): boolean {
  if (won40) return false;
  if (revealed && wave >= 40) return !waving; // on the porch for the reveal, then he's the boss
  if (revealed) return false;
  return !joeAwayFor(wave);
}

function visitAfter(cleared: number): { text: string; who: Speaker } | null {
  const next = cleared + 1;
  if (joeAwayFor(next)) {
    const leaves: Record<number, { text: string; who: Speaker }> = {
      3: { who: "joe", text: "Path looks fine from here. I'll go walk the north fence — holler if you need me." },
      7: { who: "joe", text: "I'm gonna stretch my legs down the far line. You hold the gate." },
      9: { who: "joe", text: "Something I want to check in the far field. Won't be long." },
      13: { who: "joe", text: "Routine walk. I'll be back before the next bunch, I'm sure." },
      17: { who: "joe", text: "Fence ain't gonna check itself. You keep supper on the plant." },
      19: { who: "joe", text: "I'll just be out a spell. Don't wait on me." },
      23: { who: "joe", text: "Same walk as always. See you in a bit." },
      27: { who: "joe", text: "I know the way. You know the gate." },
      29: { who: "joe", text: "Don't follow me on my rounds, farmhand. Just hold the line." },
      33: { who: "joe", text: "I've got business down the fence. That's all you need to know." },
      35: { who: "joe", text: "I'll be out. Try not to lose the crop while I'm gone." },
      37: { who: "joe", text: "One more walk. You'll manage." },
    };
    return leaves[cleared] ?? { who: "joe", text: "I'm gonna walk the fence. Won't be long." };
  }
  const visits: Record<number, { text: string; who: Speaker }> = {
    1: { who: "joe", text: "Just makin' my usual stop. You keep those ladybugs fed, I'll keep the fence honest." },
    2: { who: "joe", text: "Same time as yesterday. That's how a farm runs — routine." },
    4: { who: "joe", text: "Miss anything? I was down the fence line. Darn things always sneak in when I've just walked off." },
    5: { who: "john", text: "Joe stopped by again. He's a good hand, even if he's got his own clock." },
    6: { who: "joe", text: "Nice line you've built. I'll be around the usual spot if you want a second set of eyes." },
    8: { who: "joe", text: "Back again. Rotten luck, those mites waitin' till I stepped out." },
    10: { who: "john", text: "Locusts the minute Joe takes a walk. Rotten timing... or a funny clock." },
    11: { who: "joe", text: "You held the king without me. Almost like they knew I'd be gone, huh?" },
    12: { who: "john", text: "Joe's leanin' on that fence like always. Can't shake how quiet it gets when he isn't." },
    14: { who: "joe", text: "See? I take one walk and they come pourin' in. Farm life's like that." },
    15: { who: "john", text: "I walked the fence Joe said he was checkin'. Didn't see him out there." },
    16: { who: "joe", text: "Don't you worry what I get up to on my rounds. You just keep the plant green." },
    18: { who: "john", text: "There it is again. Joe's usual spot is empty, and the path fills. I don't love that pattern." },
    19: { who: "john", text: "Joe's back, smilin' like nothin' happened. Keep your eyes open, farmhand." },
    20: { who: "john", text: "Every tenth wave, he's gone, and a king comes stompin'. I don't like how this lines up." },
    21: { who: "joe", text: "You keep lookin' at me like that. I was checkin' the fence, that's all." },
    22: { who: "john", text: "I want you workin' this farm, farmhand — and I want you noticin' things I might miss." },
    24: { who: "john", text: "Same story. He leaves. They come. I ain't callin' a good hand a liar yet, but..." },
    25: { who: "joe", text: "A man can't be two places. You handle the path; I handle the walk." },
    26: { who: "john", text: "If that pattern holds, he'll vanish before the next bad wave. Watch the fence post." },
    28: { who: "john", text: "Empty post, full path. I'm startin' to think it ain't luck." },
    30: { who: "john", text: "I don't think it's luck, farmhand. Keep your eyes on Joe." },
    31: { who: "joe", text: "You and John can stare all you want. I've got rounds." },
    32: { who: "john", text: "He's still comin' around like a neighbor. I don't trust that smile anymore." },
    39: { who: "john", text: "If he shows his face after this, I want you standin' with me." },
  };
  return visits[cleared] ?? null;
}

function awayLine(wave: number): { text: string; who: Speaker } {
  if (wave <= 8) return { who: "narrator", text: "Joe hasn't stopped by the fence. The dirt path is already stirring." };
  if (wave === 10 || wave === 20 || wave === 30) return { who: "john", text: "Joe's usual spot is empty — and something big is on the wind. Hold the line." };
  if (wave < 20) return { who: "narrator", text: "The usual spot by the fence is empty. Then the path starts to tremble." };
  if (wave < 30) return { who: "john", text: "Same as last time. Joe's gone. They're not." };
  return { who: "john", text: "He's gone again. I think we know what that means. Get ready." };
}

function clamp(n: number, a: number, b: number): number { return n < a ? a : n > b ? b : n; }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function dist(ax: number, ay: number, bx: number, by: number): number { return Math.hypot(bx - ax, by - ay); }
function angOf(ax: number, ay: number, bx: number, by: number): number { return Math.atan2(by - ay, bx - ax); }
function rint(n: number): number { return Math.round(n); }
function mulberry(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

type Lut = { x: number; y: number; ang: number; d: number };
const LUT: Lut[] = [];
let PLEN = 0;
(function buildPath(): void {
  LUT.length = 0;
  let d = 0;
  LUT.push({ x: PATH_RAW[0].x, y: PATH_RAW[0].y, ang: 0, d: 0 });
  for (let i = 1; i < PATH_RAW.length; i++) {
    const a = PATH_RAW[i - 1], b = PATH_RAW[i];
    const seg = dist(a.x, a.y, b.x, b.y);
    const ang = angOf(a.x, a.y, b.x, b.y);
    const steps = Math.max(1, Math.ceil(seg));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      d += seg / steps;
      LUT.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), ang, d });
    }
  }
  PLEN = d;
  if (LUT.length) LUT[0].ang = LUT[Math.min(2, LUT.length - 1)].ang;
})();

function posAt(d: number): Lut {
  if (d <= 0) return LUT[0];
  if (d >= PLEN) return LUT[LUT.length - 1];
  let lo = 0, hi = LUT.length - 1;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (LUT[m].d < d) lo = m + 1; else hi = m;
  }
  return LUT[lo];
}

function nearPath(x: number, y: number): { d: number; s: number } {
  let best = 1e9, s = 0;
  // sample every 4px
  for (let i = 0; i < LUT.length; i += 3) {
    const p = LUT[i];
    const dd = dist(x, y, p.x, p.y);
    if (dd < best) { best = dd; s = p.d; }
  }
  return { d: best, s };
}

function inBarn(x: number, y: number): boolean {
  return x > BARN.x - 8 && x < BARN.x + BARN.w + 8 && y > BARN.y - 8 && y < BARN.y + BARN.h + 8;
}

function blockedLand(x: number, y: number): boolean {
  if (x < 18 || y < 18 || x > WW - 18 || y > WH - 18) return true;
  if (inBarn(x, y)) return true;
  if (dist(x, y, PLANT.x, PLANT.y) < 62) return true;
  if (dist(x, y, POND.x, POND.y) < POND.r - 4) return true;
  return false;
}

function canPlaceAt(s: Sim, kind: TowerId, x: number, y: number, ignoreId?: number): boolean {
  const def = TDEF[kind];
  const np = nearPath(x, y);
  if (def.onPath) {
    if (np.d > PATH_W * 0.42) return false;
    if (blockedLand(x, y) && dist(x, y, PLANT.x, PLANT.y) >= 62) {
      // still allow path under the gate
    }
    if (dist(x, y, PLANT.x, PLANT.y) < 50) return false;
  } else {
    if (np.d < PATH_W * 0.55 + 16) return false;
    if (blockedLand(x, y)) return false;
  }
  for (const tw of s.towers) {
    if (ignoreId !== undefined && tw.id === ignoreId) continue;
    const min = def.onPath || TDEF[tw.kind].onPath ? 28 : 46;
    if (dist(x, y, tw.x, tw.y) < min) return false;
  }
  return true;
}

/* ---------- save / load ---------- */
function getLS(): Storage | null { try { return window.localStorage; } catch { return null; } }
function getSS(): Storage | null { try { return window.sessionStorage; } catch { return null; } }
function kvGet(k: string): string | null {
  try { const v = getLS()?.getItem(k); if (v) return v; } catch { /* ignore */ }
  try { const v = getSS()?.getItem(k); if (v) return v; } catch { /* ignore */ }
  return MEM_SAVE;
}
function kvSet(k: string, v: string | null): boolean {
  let ok = false;
  for (const st of [getLS(), getSS()]) {
    if (!st) continue;
    try { if (v === null) st.removeItem(k); else st.setItem(k, v); ok = true; } catch { /* ignore */ }
  }
  MEM_SAVE = v;
  return ok;
}
let MEM_SAVE: string | null = null;

function b64url(s: string): string {
  const b = btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return b;
}
function unb64url(s: string): string {
  let t = s.replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  return atob(t);
}
function checksum(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function simToSave(s: Sim): SaveData {
  return {
    v: 1, mapId: s.mapId, wave: s.wave, cash: s.cash, lives: s.lives, maxLives: s.maxLives, won40: s.won40,
    towers: s.towers.map((t) => ({ kind: t.kind, x: t.x, y: t.y, a: t.a, b: t.b, tgt: t.tgt, charges: t.charges, spent: t.spent })),
    seen: s.seen.slice(), revealed: s.revealed, freeUsed: s.freeUsed,
  };
}
function exportCodeFrom(data: SaveData): string {
  const raw = JSON.stringify(data);
  return CODE_PFX + b64url(raw) + "." + checksum(raw).toString(36);
}
function parseCode(code: string): SaveData | null {
  const c = code.trim().replace(/\s+/g, "");
  if (!c.startsWith(CODE_PFX)) return null;
  const rest = c.slice(CODE_PFX.length);
  const dot = rest.lastIndexOf(".");
  if (dot < 0) return null;
  const body = rest.slice(0, dot), sum = rest.slice(dot + 1);
  try {
    const raw = unb64url(body);
    if (checksum(raw).toString(36) !== sum) return null;
    const j: unknown = JSON.parse(raw);
    if (!j || typeof j !== "object") return null;
    const d = j as SaveData;
    if (d.v !== 1 || typeof d.wave !== "number" || typeof d.cash !== "number" || typeof d.lives !== "number") return null;
    if (!Array.isArray(d.towers)) return null;
    return d;
  } catch { return null; }
}
function persist(s: Sim): void {
  if (s.screen === "defeat") { kvSet(SAVE_KEY, null); return; }
  try { kvSet(SAVE_KEY, exportCodeFrom(simToSave(s))); s.dirty = false; } catch { /* ignore */ }
}
function loadSaved(): SaveData | null {
  const raw = kvGet(SAVE_KEY);
  if (!raw) return null;
  return parseCode(raw);
}

/* ---------- waves ---------- */
function scaleHp(base: number, wave: number): number {
  const w = wave <= MAX_WAVE ? wave : MAX_WAVE + (wave - MAX_WAVE);
  const extra = wave > MAX_WAVE ? Math.pow(1.08, wave - MAX_WAVE) : 1;
  return Math.max(1, Math.round(base * (1 + (Math.min(w, MAX_WAVE) - 1) * 0.13) * extra));
}
function scaleKing(wave: number): number {
  const tier = Math.max(1, Math.ceil(wave / 10));
  const free = wave > MAX_WAVE ? Math.pow(1.1, wave - MAX_WAVE) : 1;
  return Math.max(1, Math.round(EDEFS.king.hp * Math.pow(1.48, tier - 1) * free));
}

function waveGroups(wave: number): SpawnG[] {
  const w = wave < 1 ? 1 : wave;
  const loop = w > MAX_WAVE ? ((w - 1) % 10) + 31 : w;
  const n = (base: number): number => w > MAX_WAVE ? Math.round(base * (1 + (w - MAX_WAVE) * 0.06)) : base;
  const g: SpawnG[] = [];
  const add = (kind: EnemyId, count: number, gap = 0.5, delay = 0): void => { g.push({ kind, n: n(count), gap, delay }); };

  if (loop === 1) add("mite", 7, 0.7);
  else if (loop === 2) add("mite", 10, 0.55);
  else if (loop === 3) { add("mite", 8, 0.5); add("aphid", 5, 0.4, 5); }
  else if (loop === 4) add("aphid", 12, 0.38);
  else if (loop === 5) { add("mite", 9, 0.45); add("aphid", 8, 0.35, 3.5); }
  else if (loop === 6) { add("mite", 8, 0.4); add("beetle", 4, 0.9, 3); }
  else if (loop === 7) { add("beetle", 6, 0.7); add("aphid", 10, 0.3, 2); }
  else if (loop === 8) { add("mite", 10, 0.35); add("gnat", 6, 0.5, 3); add("aphid", 8, 0.3, 5); }
  else if (loop === 9) { add("beetle", 6, 0.65); add("gnat", 8, 0.4, 2); add("mite", 12, 0.3, 4); }
  else if (loop === 10 || loop === 20 || loop === 30) {
    add("mite", 12 + (loop / 10) * 4, 0.28);
    add("locust", 6 + loop / 10, 0.55, 2);
    add("king", 1, 1, 5);
    add("locust", 8 + loop / 5, 0.45, 8);
    if (loop >= 20) add("beetle", 8, 0.5, 6);
    if (loop >= 30) add("mildew", 6, 0.5, 7);
  } else if (loop === 40) {
    add("mite", 16, 0.28);
    add("locust", 10, 0.5, 2);
    add("joe", 1, 1, 5);
    add("locust", 12, 0.4, 8);
    add("beetle", 8, 0.5, 6);
    add("queen", 2, 1.2, 9);
  } else if (loop === 11) { add("caterpillar", 6, 0.7); add("mite", 10, 0.35, 3); }
  else if (loop === 12) { add("caterpillar", 8, 0.55); add("aphid", 12, 0.28, 2); }
  else if (loop === 13) { add("gnat", 10, 0.4); add("caterpillar", 6, 0.6, 3); add("beetle", 5, 0.7, 4); }
  else if (loop === 14) { add("beetle", 8, 0.55); add("mite", 16, 0.25, 2); }
  else if (loop === 15) { add("caterpillar", 10, 0.45); add("gnat", 10, 0.35, 3); }
  else if (loop === 16) { add("gnat", 14, 0.32); add("aphid", 16, 0.22, 2); }
  else if (loop === 17) { add("mildew", 6, 0.6); add("mite", 12, 0.3, 2); }
  else if (loop === 18) { add("mildew", 8, 0.45); add("beetle", 6, 0.6, 3); add("gnat", 8, 0.4, 4); }
  else if (loop === 19) { add("mildew", 10, 0.4); add("caterpillar", 8, 0.5, 2); add("aphid", 14, 0.25, 5); }
  else if (loop === 21) { add("queen", 1, 1); add("mite", 16, 0.25, 1); add("aphid", 10, 0.3, 4); }
  else if (loop === 22) { add("queen", 2, 2.2); add("beetle", 8, 0.5, 2); }
  else if (loop === 23) { add("mildew", 10, 0.35); add("gnat", 12, 0.3, 2); add("caterpillar", 8, 0.45, 4); }
  else if (loop === 24) { add("beetle", 12, 0.4); add("queen", 1, 1, 4); add("mite", 20, 0.2, 2); }
  else if (loop === 25) { add("mildew", 12, 0.35); add("gnat", 14, 0.28, 2); add("beetle", 8, 0.5, 4); }
  else if (loop === 26) { add("queen", 2, 1.6); add("caterpillar", 10, 0.4, 2); add("aphid", 18, 0.2, 3); }
  else if (loop === 27) { add("gnat", 18, 0.25); add("mildew", 10, 0.35, 2); add("beetle", 10, 0.45, 4); }
  else if (loop === 28) { add("queen", 2, 1.4); add("mildew", 10, 0.35, 1); add("caterpillar", 10, 0.4, 3); }
  else if (loop === 29) { add("beetle", 14, 0.35); add("gnat", 16, 0.25, 2); add("mildew", 10, 0.3, 4); add("queen", 1, 1, 6); }
  else if (loop === 31) { add("mite", 24, 0.18); add("aphid", 20, 0.18, 2); add("beetle", 10, 0.4, 4); }
  else if (loop === 32) { add("caterpillar", 14, 0.35); add("gnat", 16, 0.25, 2); add("mildew", 10, 0.3, 4); }
  else if (loop === 33) { add("queen", 3, 1.3); add("beetle", 12, 0.35, 2); add("aphid", 18, 0.2, 3); }
  else if (loop === 34) { add("mildew", 14, 0.28); add("gnat", 18, 0.22, 2); add("caterpillar", 12, 0.35, 4); }
  else if (loop === 35) { add("beetle", 16, 0.3); add("queen", 2, 1.2, 3); add("mildew", 12, 0.28, 5); }
  else if (loop === 36) { add("gnat", 22, 0.2); add("locust", 12, 0.3, 2); add("aphid", 20, 0.16, 3); }
  else if (loop === 37) { add("queen", 3, 1.1); add("caterpillar", 14, 0.3, 2); add("beetle", 12, 0.35, 4); }
  else if (loop === 38) { add("mildew", 16, 0.24); add("gnat", 18, 0.2, 2); add("locust", 12, 0.28, 4); }
  else if (loop === 39) { add("queen", 3, 1); add("beetle", 16, 0.28, 1); add("mildew", 14, 0.24, 3); add("gnat", 16, 0.2, 5); }
  else { add("mite", 16, 0.25); add("aphid", 12, 0.25, 2); }
  return g;
}

function newEnemyLine(wave: number, seen: EnemyId[]): string | null {
  const groups = waveGroups(wave);
  const kinds: EnemyId[] = [];
  for (const g of groups) if (kinds.indexOf(g.kind) < 0) kinds.push(g.kind);
  for (const k of kinds) {
    if (k === "joe") continue;
    if (seen.indexOf(k) < 0 && JOHN_NEW[k]) return JOHN_NEW[k] as string;
  }
  if ((wave === 10 || wave === 20 || wave === 30) && seen.indexOf("king") < 0) return JOHN_NEW.king as string;
  return null;
}
function waveHint(wave: number, seen: EnemyId[]): string | null {
  const neu = newEnemyLine(wave, seen);
  if (neu) return neu;
  if (wave === MAX_WAVE + 1) return "The land's quieter without Joe. The pests aren't. Freeplay starts now — stay sharp.";
  if (joeAwayFor(wave)) return null;
  return JOHN_TIPS[(wave - 1) % JOHN_TIPS.length];
}

/* ---------- tower stats ---------- */
function baseStats(kind: TowerId): TStats {
  const z: TStats = {
    range: 90, rof: 0.7, dmg: 6, air: false, camo: false, pierce: 0, slow: 0, slowT: 0, cone: 0, targets: 1,
    detectAura: 0, dot: 0, dotT: 0, stacks: 1, splash: 0, projectile: false, pSpeed: 420, onPath: false, charges: 0,
    planeCd: 0, planeDmg: 0, planeN: 0, execute: 0, stun: 0, bounce: 0, bonus: {}, instaSmall: false, spread: 0, burn: 0, camoDmg: 1, permanent: false,
  };
  if (kind === "ladybug") { z.range = 92; z.rof = 0.7; z.dmg = 6; z.bonus = { mite: 1.6, aphid: 1.45, inchworm: 1.4 }; }
  if (kind === "neem") { z.range = 112; z.rof = 1.1; z.dmg = 3; z.slow = 0.3; z.slowT = 1.5; z.cone = 48; z.targets = 8; }
  if (kind === "sticky") { z.range = 24; z.rof = 0.25; z.dmg = 1; z.slow = 0.7; z.slowT = 0.5; z.onPath = true; z.charges = 10; z.camo = true; }
  if (kind === "scarecrow") { z.range = 188; z.rof = 0.85; z.dmg = 13; z.projectile = true; z.pSpeed = 520; }
  if (kind === "mantis") { z.range = 58; z.rof = 0.65; z.dmg = 20; }
  if (kind === "predatory") { z.range = 102; z.rof = 1.15; z.dmg = 1; z.dot = 5; z.dotT = 3.5; z.stacks = 1; }
  if (kind === "uv") { z.range = 126; z.rof = 0.5; z.dmg = 5; z.air = true; z.camo = true; z.camoDmg = 1.35; }
  if (kind === "duster") { z.range = 40; z.rof = 7; z.dmg = 10; z.air = true; z.planeCd = 7; z.planeDmg = 10; z.planeN = 8; z.splash = 28; }
  return z;
}

function statsFor(kind: TowerId, a: number, b: number): TStats {
  const s = baseStats(kind);
  const A = clamp(a, 0, 4), B = clamp(b, 0, 4);
  if (kind === "ladybug") {
    if (A >= 1) s.rof *= 0.7;
    if (A >= 2) s.targets = 2;
    if (A >= 3) { s.targets = 3; s.range += 18; }
    if (A >= 4) { s.instaSmall = true; s.rof *= 0.8; }
    if (B >= 1) s.dmg += 4;
    if (B >= 2) { s.pierce += 3; s.dmg += 3; }
    if (B >= 3) { s.air = true; s.range += 16; }
    if (B >= 4) { s.dmg += 14; s.execute = 0.25; }
  } else if (kind === "neem") {
    if (A >= 1) s.cone = 70;
    if (A >= 2) { s.air = true; s.slowT += 0.7; s.slow += 0.08; }
    if (A >= 3) { s.slow = 0.6; s.slowT = 2.6; }
    if (A >= 4) s.stun = 0.45;
    if (B >= 1) { s.dmg += 2; s.dot = 3; s.dotT = 2; }
    if (B >= 2) { s.dot = 6; s.dotT = 3; s.dmg += 1; }
    if (B >= 3) { s.camo = true; s.camoDmg = 1.5; s.dot += 2; }
    if (B >= 4) { s.dmg += 8; s.cone = Math.max(s.cone, 80); s.range += 16; }
  } else if (kind === "sticky") {
    if (A >= 1) s.charges = 20;
    if (A >= 2) { s.charges = 40; s.slow = 0.8; s.range = 28; }
    if (A >= 3) { s.charges = 80; s.stun = 0.35; }
    if (A >= 4) { s.permanent = true; s.charges = 9999; }
    if (B >= 1) s.dmg = 5;
    if (B >= 2) { s.dmg = 12; s.pierce = 3; }
    if (B >= 3) { s.dmg = 18; s.stun = Math.max(s.stun, 0.6); }
    if (B >= 4) { s.dmg = 28; s.rof = 0.18; }
  } else if (kind === "scarecrow") {
    if (A >= 1) s.rof = 0.55;
    if (A >= 2) { s.rof = 0.4; s.air = true; }
    if (A >= 3) s.targets = 2;
    if (A >= 4) s.bounce = 2;
    if (B >= 1) { s.range += 40; s.dmg += 6; }
    if (B >= 2) { s.pierce = 5; s.dmg += 6; }
    if (B >= 3) { s.camo = true; s.dmg += 4; } // crit handled in fire
    if (B >= 4) { s.dmg += 28; s.range += 50; s.rof *= 1.05; }
  } else if (kind === "mantis") {
    if (A >= 1) s.rof = 0.4;
    if (A >= 2) s.targets = 3;
    if (A >= 3) { s.targets = 12; s.rof *= 0.9; }
    if (A >= 4) { s.range += 16; s.rof = 0.22; }
    if (B >= 1) s.dmg += 8;
    if (B >= 2) { s.pierce = 8; s.dmg += 4; }
    if (B >= 3) s.execute = 0.2;
    if (B >= 4) { s.dmg += 22; s.execute = 0.22; }
  } else if (kind === "predatory") {
    if (A >= 1) s.stacks = 2;
    if (A >= 2) { s.stacks = 3; s.rof = 0.8; }
    if (A >= 3) s.spread = 90;
    if (A >= 4) { s.spread = 140; s.dotT += 1.6; }
    if (B >= 1) s.dot = 9;
    if (B >= 2) s.air = true;
    if (B >= 3) { s.pierce = 99; s.camo = true; }
    if (B >= 4) { s.dot = 18; s.burn = 22; }
  } else if (kind === "uv") {
    if (A >= 1) s.range += 34;
    if (A >= 2) s.detectAura = 110;
    if (A >= 3) { s.detectAura = 170; s.dmg += 4; s.range += 16; }
    if (A >= 4) { s.splash = 1; } // sunburst flag via splash===1 + planeCd unused; handled in fire
    if (B >= 1) { s.dmg += 4; s.camoDmg = 2; }
    if (B >= 2) { s.dot = 4; s.dotT = 2; }
    if (B >= 3) s.targets = 2;
    if (B >= 4) { s.targets = 4; s.dmg += 10; }
  } else if (kind === "duster") {
    if (A >= 1) { s.planeCd = 5; s.rof = 5; }
    if (A >= 2) { s.planeN = 12; s.camo = true; }
    if (A >= 3) { s.planeN = 22; } // carpet: drop along path
    if (A >= 4) { s.planeCd = 3.2; s.rof = 3.2; s.targets = 2; }
    if (B >= 1) { s.planeDmg = 18; s.dmg = 18; }
    if (B >= 2) { s.pierce = 6; s.splash = 38; }
    if (B >= 3) { s.planeDmg += 16; s.bonus = { beetle: 1.6, king: 1.5, queen: 1.3 }; }
    if (B >= 4) { s.planeDmg += 22; s.dot = 8; s.dotT = 2.5; s.splash = 46; }
  }
  return s;
}

function investOf(t: Tower): number {
  const def = TDEF[t.kind];
  let n = def.cost;
  for (let i = 0; i < t.a; i++) n += def.paths[0][i].cost;
  for (let i = 0; i < t.b; i++) n += def.paths[1][i].cost;
  return n;
}
function refundOf(t: Tower): number { return Math.floor(t.spent * SELL); }
function canUpgrade(t: Tower, path: 0 | 1): boolean {
  const cur = path === 0 ? t.a : t.b;
  const other = path === 0 ? t.b : t.a;
  if (cur >= 4) return false;
  if (cur >= 2 && other >= 3) return false;
  return true;
}

function hpMultWave(wave: number, kind: EnemyId): number {
  if (kind === "king" || kind === "joe") return scaleKing(wave) / EDEFS.king.hp;
  return scaleHp(EDEFS[kind].hp, wave) / EDEFS[kind].hp;
}


/* ---------- art helpers ---------- */
function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rad = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rad, y);
  c.arcTo(x + w, y, x + w, y + h, rad);
  c.arcTo(x + w, y + h, x, y + h, rad);
  c.arcTo(x, y + h, x, y, rad);
  c.arcTo(x, y, x + w, y, rad);
  c.closePath();
}
function ellipse(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}
function goldGrad(c: CanvasRenderingContext2D, x: number, y: number, r: number, a: string, b: string): CanvasGradient {
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, a); g.addColorStop(1, b); return g;
}

function drawHempLeaf(c: CanvasRenderingContext2D, x: number, y: number, s: number, ang: number, col: string, wilt: number): void {
  c.save(); c.translate(x, y); c.rotate(ang);
  const droop = wilt * 0.85;
  c.rotate(droop * (ang >= 0 ? 1 : -1) * 0.25);
  c.fillStyle = col;
  c.beginPath();
  const leaflets = 7;
  for (let i = 0; i < leaflets; i++) {
    const a = -Math.PI / 2 + (i - (leaflets - 1) / 2) * (0.34 + wilt * 0.12);
    const len = s * (i === 3 ? 1.18 : i === 2 || i === 4 ? 0.96 : i === 1 || i === 5 ? 0.7 : 0.48) * (1 - wilt * 0.28);
    const w = s * (i === 3 ? 0.24 : 0.16);
    const lx = Math.cos(a) * len, ly = Math.sin(a) * len * (1 + wilt * 0.35);
    const px = Math.cos(a + Math.PI / 2) * w, py = Math.sin(a + Math.PI / 2) * w;
    c.moveTo(0, 0);
    c.quadraticCurveTo(px * 1.7, py * 1.7, lx, ly);
    c.quadraticCurveTo(-px * 1.7, -py * 1.7, 0, 0);
  }
  c.fill();
  ink(c, Math.max(1.2, s * 0.07)); c.stroke();
  c.restore();
}

const INK = "#1a1008";
const HILL_H = 112;
function ink(c: CanvasRenderingContext2D, w = 2.4): void {
  c.strokeStyle = INK; c.lineWidth = w; c.lineJoin = "round"; c.lineCap = "round";
}
function fillStroke(c: CanvasRenderingContext2D, fill: string, w = 2.4): void {
  c.fillStyle = fill; c.fill(); ink(c, w); c.stroke();
}
function disc(c: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, w = 2.2): void {
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); fillStroke(c, fill, w);
}
function oval(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, w = 2.2): void {
  ellipse(c, x, y, rx, ry); fillStroke(c, fill, w);
}
function shadowBlob(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a = 0.28): void {
  c.fillStyle = `rgba(40,24,8,${a})`; ellipse(c, x, y, rx, ry); c.fill();
}
function toonEyes(c: CanvasRenderingContext2D, x: number, y: number, s: number, blink = false, lx = 0, ly = 0, mad = false): void {
  const gap = s * 0.72;
  for (const side of [-1, 1]) {
    const ex = x + side * gap, ey = y;
    if (blink) {
      ink(c, Math.max(1.6, s * 0.22));
      c.beginPath(); c.moveTo(ex - s * 0.55, ey); c.quadraticCurveTo(ex, ey + s * 0.12, ex + s * 0.55, ey); c.stroke();
      continue;
    }
    oval(c, ex, ey, s * 0.62, s * 0.72, "#fffdf0", Math.max(1.6, s * 0.18));
    const px = ex + lx * s * 0.25, py = ey + ly * s * 0.22 + (mad ? s * 0.08 : 0);
    c.fillStyle = INK; c.beginPath(); c.arc(px, py, s * 0.28, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#fff"; c.beginPath(); c.arc(px - s * 0.1, py - s * 0.12, s * 0.1, 0, Math.PI * 2); c.fill();
    if (mad) {
      ink(c, Math.max(1.8, s * 0.2));
      c.beginPath();
      c.moveTo(ex - side * s * 0.7, ey - s * 0.95);
      c.lineTo(ex + side * s * 0.15, ey - s * 0.3);
      c.stroke();
    }
  }
}
function toonMouth(c: CanvasRenderingContext2D, x: number, y: number, w: number, open: number, smile = true): void {
  ink(c, 2.1);
  if (open > 0.12) {
    c.fillStyle = "#4a1020";
    c.beginPath(); c.ellipse(x, y, w * 0.48, w * 0.18 + open * w * 0.32, 0, 0, Math.PI * 2);
    c.fill(); c.stroke();
    if (open > 0.35) {
      c.fillStyle = "#e07080";
      c.beginPath(); c.ellipse(x, y + w * 0.14, w * 0.22, w * 0.1, 0, 0, Math.PI * 2); c.fill();
    }
  } else {
    c.beginPath();
    if (smile) c.arc(x, y - w * 0.02, w * 0.36, 0.2, Math.PI - 0.2);
    else c.arc(x, y + w * 0.18, w * 0.28, Math.PI + 0.25, -0.25);
    c.stroke();
  }
}

function drawPlant(c: CanvasRenderingContext2D, wilt: number, t: number): void {
  const sway = Math.sin(t * 1.6) * 0.14 * (1 - wilt * 0.45);
  c.save();
  shadowBlob(c, 0, 16, 36, 14, 0.32);
  // top-down tub
  oval(c, 0, 14, 34, 18, wilt > 0.55 ? "#6a4a28" : "#8a5a2a", 3);
  oval(c, 0, 10, 28, 14, wilt > 0.55 ? "#3d6a28" : "#2f7a28", 2.2);
  const col = wilt < 0.25 ? "#3cc84a" : wilt < 0.5 ? "#7cb830" : wilt < 0.75 ? "#c4a030" : "#a06828";
  c.save();
  c.rotate(sway);
  c.translate(0, wilt * 8);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + sway * 0.4;
    const r = 22 + (i % 3) * 7;
    drawHempLeaf(c, Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.28 - 8, 22 - i, a + Math.PI / 2, col, wilt);
  }
  drawHempLeaf(c, 0, -10, 28, sway, col, wilt);
  // bud face
  disc(c, 0, -4, 9, wilt > 0.6 ? "#c8b060" : "#7ae05a", 2);
  const blink = ((t * 0.7) % 4.2) > 4.0;
  toonEyes(c, 0, -6, 3.1, blink || wilt > 0.8, 0, wilt * 0.8, false);
  toonMouth(c, 0, -1.2, 5, wilt > 0.7 ? 0 : 0.05, wilt < 0.5);
  c.restore();
  c.restore();
}

function drawPathDirt(c: CanvasRenderingContext2D): void {
  c.lineJoin = "round"; c.lineCap = "round";
  const stroke = (w: number, col: string): void => {
    c.strokeStyle = col; c.lineWidth = w;
    c.beginPath();
    c.moveTo(PATH_RAW[0].x, PATH_RAW[0].y);
    for (let i = 1; i < PATH_RAW.length; i++) c.lineTo(PATH_RAW[i].x, PATH_RAW[i].y);
    c.stroke();
  };
  stroke(PATH_W + 14, INK);
  stroke(PATH_W + 8, "#6a3e14");
  stroke(PATH_W, "#d4a054");
  stroke(PATH_W - 10, "#e8b86a");
  const rng = mulberry(77);
  for (let i = 0; i < 90; i++) {
    const d = rng() * PLEN;
    const p = posAt(d);
    const ox = (rng() - 0.5) * PATH_W * 0.55, oy = (rng() - 0.5) * PATH_W * 0.4;
    c.fillStyle = rng() > 0.5 ? "#c4843c" : "#f0c878";
    c.beginPath(); c.ellipse(p.x + ox, p.y + oy, 2 + rng() * 3, 1.2 + rng() * 2, rng() * 4, 0, Math.PI * 2); c.fill();
  }
}

function drawHillside(c: CanvasRenderingContext2D): void {
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(WW, 0);
  c.lineTo(WW, 70);
  c.quadraticCurveTo(820, 128, 640, 100);
  c.quadraticCurveTo(480, 78, 300, 118);
  c.quadraticCurveTo(160, 142, 0, 96);
  c.closePath();
  fillStroke(c, "#4aa83c", 3.2);
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(WW, 0);
  c.lineTo(WW, 36);
  c.quadraticCurveTo(700, 70, 400, 44);
  c.quadraticCurveTo(180, 28, 0, 52);
  c.closePath();
  fillStroke(c, "#6fd24a", 2.4);
  // ridge tufts
  const rng = mulberry(19);
  for (let i = 0; i < 28; i++) {
    const x = 20 + rng() * (WW - 40), y = 18 + rng() * 70;
    c.fillStyle = rng() > 0.5 ? "#2e8a28" : "#8ae05a";
    c.beginPath();
    c.moveTo(x, y + 6);
    c.quadraticCurveTo(x + 4, y - 8, x + 8, y + 5);
    c.quadraticCurveTo(x + 2, y - 2, x, y + 6);
    c.fill();
  }
  // little dirt crease where the swarm will pour over
  c.beginPath();
  c.moveTo(80, 86);
  c.quadraticCurveTo(400, 60, 900, 78);
  ink(c, 2.2); c.strokeStyle = "#5a3810"; c.stroke();
}

function drawBarnRoof(c: CanvasRenderingContext2D): void {
  const { x, y, w, h } = BARN;
  shadowBlob(c, x + w * 0.5, y + h * 0.7, w * 0.48, 16, 0.25);
  // top-down barn: rectangle with peaked ridge and south doors
  c.beginPath(); rr(c, x + 6, y + 10, w - 12, h - 16, 8);
  fillStroke(c, "#c43c2c", 3.2);
  // ridge
  c.beginPath(); c.moveTo(x + 10, y + 18); c.lineTo(x + w - 10, y + 18);
  ink(c, 4); c.strokeStyle = "#8a2018"; c.stroke();
  // roof boards
  ink(c, 1.6); c.strokeStyle = "#8a2018";
  for (let i = 1; i < 6; i++) {
    const yy = y + 22 + i * ((h - 36) / 6);
    c.beginPath(); c.moveTo(x + 14, yy); c.lineTo(x + w - 14, yy); c.stroke();
  }
  // south door
  c.beginPath(); rr(c, x + w * 0.38, y + h - 38, w * 0.24, 26, 4);
  fillStroke(c, "#6a3a18", 2.2);
  disc(c, x + w * 0.58, y + h - 24, 2.4, "#e8c050", 1);
  // weather vane
  disc(c, x + w * 0.5, y + 12, 4, "#e8c050", 2);
  c.beginPath(); c.moveTo(x + w * 0.5, y + 12); c.lineTo(x + w * 0.5, y - 6); ink(c, 2); c.stroke();
  c.beginPath(); c.moveTo(x + w * 0.5, y - 6); c.lineTo(x + w * 0.5 + 12, y - 2); c.lineTo(x + w * 0.5, y + 2); c.closePath();
  fillStroke(c, "#f0d060", 1.6);
}

function drawPondBasin(c: CanvasRenderingContext2D): void {
  shadowBlob(c, POND.x + 4, POND.y + 8, POND.r + 4, POND.r * 0.72, 0.22);
  oval(c, POND.x, POND.y, POND.r, POND.r * 0.78, "#1a6a8a", 3);
  oval(c, POND.x - 6, POND.y - 4, POND.r * 0.72, POND.r * 0.52, "#2ab0c8", 2);
  oval(c, POND.x - 12, POND.y - 8, POND.r * 0.32, POND.r * 0.2, "#8ae8f0", 0);
  // lily pads
  for (const p of [{ x: -18, y: 8 }, { x: 16, y: -6 }, { x: 6, y: 18 }]) {
    oval(c, POND.x + p.x, POND.y + p.y, 10, 7, "#3cb848", 2);
    disc(c, POND.x + p.x + 2, POND.y + p.y, 2.2, "#f0d060", 1.2);
  }
  // cattails
  for (const p of [{ x: -48, y: -20 }, { x: 44, y: 16 }, { x: -36, y: 28 }]) {
    ink(c, 2.2);
    c.beginPath(); c.moveTo(POND.x + p.x, POND.y + p.y); c.lineTo(POND.x + p.x + 2, POND.y + p.y - 16); c.stroke();
    oval(c, POND.x + p.x + 2, POND.y + p.y - 20, 3.2, 6, "#8a3a18", 1.6);
  }
}

function drawTractor(c: CanvasRenderingContext2D, x: number, y: number): void {
  shadowBlob(c, x, y + 8, 28, 12, 0.28);
  c.save(); c.translate(x, y); c.rotate(-0.25);
  // body top-down
  c.beginPath(); rr(c, -22, -10, 36, 20, 5); fillStroke(c, "#d43c28", 2.6);
  c.beginPath(); rr(c, 6, -8, 16, 16, 4); fillStroke(c, "#f0d24a", 2.2);
  disc(c, -16, 8, 8, "#2a2418", 2.4);
  disc(c, -16, 8, 3.5, "#c4b090", 1.5);
  disc(c, 14, 9, 6, "#2a2418", 2.2);
  disc(c, 14, 9, 2.6, "#c4b090", 1.4);
  disc(c, 12, -2, 3, "#7ad4f0", 1.6);
  c.restore();
}

function drawHay(c: CanvasRenderingContext2D, x: number, y: number, rot: number): void {
  c.save(); c.translate(x, y); c.rotate(rot);
  shadowBlob(c, 2, 6, 16, 8, 0.25);
  c.beginPath(); rr(c, -16, -10, 32, 20, 6); fillStroke(c, "#e8c04a", 2.4);
  ink(c, 1.5); c.strokeStyle = "#b88820";
  for (let i = -8; i <= 8; i += 5) { c.beginPath(); c.moveTo(-14, i); c.lineTo(14, i); c.stroke(); }
  c.beginPath(); c.moveTo(0, -10); c.lineTo(0, 10); c.stroke();
  c.restore();
}

function drawFenceSeg(c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  ink(c, 3.2); c.strokeStyle = "#6a3e18";
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  const n = Math.max(2, Math.round(dist(x1, y1, x2, y2) / 28));
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = x1 + (x2 - x1) * u, y = y1 + (y2 - y1) * u;
    c.beginPath(); rr(c, x - 3, y - 8, 6, 16, 1.5); fillStroke(c, "#8a5a28", 1.8);
  }
}

function drawCropTuft(c: CanvasRenderingContext2D, x: number, y: number, phase: number, col: string): void {
  c.save(); c.translate(x, y);
  const sway = Math.sin(phase) * 0.35;
  c.rotate(sway * 0.25);
  for (let i = -1; i <= 1; i++) {
    c.beginPath();
    c.moveTo(i * 3, 5);
    c.quadraticCurveTo(i * 3 + sway * 6, -6, i * 4 + sway * 8, -14);
    ink(c, 2); c.strokeStyle = col; c.stroke();
    // tiny top-down hemp star
    c.fillStyle = col;
    c.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + k * 0.45 + sway * 0.2;
      const len = 7;
      c.moveTo(i * 4, -12);
      c.lineTo(i * 4 + Math.cos(a) * len, -12 + Math.sin(a) * len * 0.7);
    }
    c.fill();
  }
  c.restore();
}

function cropAllowed(x: number, y: number): boolean {
  if (y < HILL_H + 8) return false;
  if (nearPath(x, y).d < PATH_W * 0.7 + 8) return false;
  if (inBarn(x, y)) return false;
  if (dist(x, y, POND.x, POND.y) < POND.r + 18) return false;
  if (dist(x, y, PLANT.x, PLANT.y) < 70) return false;
  if (dist(x, y, 250, 155) < 40) return false;
  return true;
}

function drawFarmBg(c: CanvasRenderingContext2D): void {
  c.fillStyle = "#4cb83c";
  c.fillRect(0, 0, WW, WH);
  const rng = mulberry(4);
  for (let i = 0; i < 220; i++) {
    const x = rng() * WW, y = rng() * WH;
    c.fillStyle = rng() > 0.5 ? "#3aa32e" : "#6ad24c";
    c.beginPath(); c.ellipse(x, y, 18 + rng() * 40, 10 + rng() * 22, rng() * 3, 0, Math.PI * 2); c.fill();
  }
  drawHillside(c);
  // field patches
  for (let i = 0; i < 16; i++) {
    const x = 40 + rng() * 900, y = 160 + rng() * 580;
    if (!cropAllowed(x, y)) continue;
    c.fillStyle = i % 2 ? "#8a5a28" : "#6a4020";
    c.globalAlpha = 0.18;
    c.beginPath(); c.ellipse(x, y, 50, 18, rng() * 2, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
  }
  drawPathDirt(c);
  drawPondBasin(c);
  drawBarnRoof(c);
  drawTractor(c, 250, 155);
  drawHay(c, 390, 205, -0.3);
  drawHay(c, 428, 222, 0.4);
  drawHay(c, 362, 228, 0.1);
  // fences
  drawFenceSeg(c, 16, HILL_H + 4, 220, HILL_H + 10);
  drawFenceSeg(c, 300, HILL_H - 2, 500, HILL_H + 6);
  drawFenceSeg(c, 18, 200, 18, 360);
  drawFenceSeg(c, 620, 30, 700, 30);
  drawFenceSeg(c, 980, 480, 980, 760);
  drawFenceSeg(c, 20, 780, 200, 780);
  // windmill base (blades live)
  disc(c, 522, 86, 8, "#e8d8c0", 2.4);
  c.beginPath(); rr(c, 514, 86, 16, 22, 3); fillStroke(c, "#d0c0a0", 2);
  // little sign near entrance
  c.beginPath(); rr(c, 70, 210, 44, 22, 4); fillStroke(c, "#f0dca0", 2);
  c.fillStyle = INK; c.font = "bold 8px Georgia, serif"; c.textAlign = "center"; c.textBaseline = "middle";
  c.fillText("SOUTH", 92, 218); c.fillText("FIELD", 92, 227);
}

function drawCropLayer(c: CanvasRenderingContext2D, frame: number): void {
  const rng = mulberry(21);
  let n = 0;
  for (let i = 0; i < 220 && n < 120; i++) {
    const x = 30 + rng() * 940, y = 130 + rng() * 640;
    if (!cropAllowed(x, y)) continue;
    n++;
    const col = n % 3 === 0 ? "#2f9a32" : n % 3 === 1 ? "#4cd05a" : "#7ae048";
    drawCropTuft(c, x, y, frame * 1.1 + n * 0.4, col);
  }
}

function blinkAt(t: number, seed = 0): boolean {
  return ((t * 0.85 + seed) % 3.6) > 3.38;
}
function talkOpen(t: number, talking: boolean): number {
  if (!talking) return 0;
  const p = (t * 6.5) % 1;
  return p < 0.55 ? 0.15 + Math.sin(p * Math.PI * 2) * 0.55 : 0.05;
}

/* ---------- enemies (top-down cartoon) ---------- */
function drawMite(c: CanvasRenderingContext2D, t: number, hurt: boolean): void {
  const w = 1 + Math.sin(t * 14) * 0.08;
  c.save(); c.scale(w, 2 - w);
  shadowBlob(c, 0, 7, 8, 4, 0.25);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.sin(t * 10 + i) * 0.25;
    ink(c, 2); c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 11, Math.sin(a) * 8); c.stroke();
  }
  oval(c, 0, 0, 8, 6.5, hurt ? "#f07070" : "#e04038", 2.3);
  disc(c, 6, 0, 4.2, hurt ? "#f0a0a0" : "#ff7a6a", 2);
  toonEyes(c, 6, -0.5, 2.1, blinkAt(t, 1), 0.6, 0);
  toonMouth(c, 8.4, 2.2, 2.6, 0.08, true);
  c.restore();
}
function drawAphid(c: CanvasRenderingContext2D, t: number, hurt: boolean): void {
  const w = 1 + Math.sin(t * 16) * 0.1;
  c.save(); c.scale(w, 2 - w);
  shadowBlob(c, 0, 7, 7, 3.5, 0.22);
  oval(c, 0, 0, 8.5, 5.5, hurt ? "#d0f070" : "#7ce03a", 2.2);
  disc(c, 6, 0, 3.6, "#b8f060", 1.8);
  toonEyes(c, 6, -0.4, 1.9, blinkAt(t, 2), 0.7, 0);
  ink(c, 1.6);
  c.beginPath(); c.moveTo(8, -2); c.quadraticCurveTo(12, -8, 10, -10); c.stroke();
  c.beginPath(); c.moveTo(8, -1); c.quadraticCurveTo(13, -6, 12, -8); c.stroke();
  c.restore();
}
function drawBeetle(c: CanvasRenderingContext2D, t: number, hurt: boolean): void {
  shadowBlob(c, 0, 9, 11, 5, 0.28);
  oval(c, 0, 1, 11, 8, hurt ? "#5a5a7a" : "#3a3a58", 2.6);
  ink(c, 2); c.beginPath(); c.moveTo(0, -6); c.lineTo(0, 8); c.stroke();
  disc(c, 8, 0, 5, "#2a2a40", 2.2);
  toonEyes(c, 8, 0, 2.3, blinkAt(t, 3), 0.5, 0);
  c.fillStyle = "#8af0ff"; disc(c, -4, -3, 2, "#7ae0f0", 1);
  disc(c, -4, 3, 2, "#7ae0f0", 1);
}
function drawCaterpillar(c: CanvasRenderingContext2D, t: number, hurt: boolean): void {
  shadowBlob(c, 0, 8, 13, 4, 0.22);
  const col = hurt ? "#f0c070" : "#f0a018";
  for (let i = 3; i >= 0; i--) {
    const squ = Math.sin(t * 9 + i) * 1.4;
    oval(c, -8 + i * 6 + squ * 0.3, Math.sin(t * 9 + i) * 0.8, 5.2, 5.4, i === 3 ? "#ffc04a" : col, 2);
  }
  toonEyes(c, 12, -1, 2.2, blinkAt(t, 4), 0.6, 0);
  toonMouth(c, 15, 2, 3, 0.15, true);
}
function drawInchworm(c: CanvasRenderingContext2D, t: number, hurt: boolean): void {
  const arch = 3 + Math.sin(t * 12) * 3;
  shadowBlob(c, 0, 7, 8, 3, 0.2);
  ink(c, 2.4);
  c.fillStyle = hurt ? "#c0f080" : "#8ce050";
  c.beginPath(); c.moveTo(-8, 3); c.quadraticCurveTo(0, -arch, 8, 3); c.quadraticCurveTo(0, 6 - arch * 0.2, -8, 3); c.fill(); c.stroke();
  disc(c, 8, 2, 3.2, "#b0f070", 1.6);
  toonEyes(c, 8, 1, 1.5, blinkAt(t, 5), 0.5, 0);
}
function drawGnat(c: CanvasRenderingContext2D, t: number, hurt: boolean): void {
  const flap = Math.sin(t * 28) * 0.5;
  shadowBlob(c, 0, 14, 7, 3, 0.18);
  c.save(); c.translate(0, Math.sin(t * 10) * -2);
  c.save(); c.rotate(-0.6 + flap); oval(c, -2, -2, 8, 3.2, "rgba(230,245,255,0.85)", 1.5); c.restore();
  c.save(); c.rotate(0.6 - flap); oval(c, -2, 2, 8, 3.2, "rgba(230,245,255,0.85)", 1.5); c.restore();
  oval(c, 0, 0, 6, 4.5, hurt ? "#c0a0d0" : "#6a5078", 2);
  disc(c, 4, 0, 3, "#8a70a0", 1.6);
  toonEyes(c, 4.2, -0.4, 1.8, blinkAt(t, 6), 0.7, 0);
  c.restore();
}
function drawMildew(c: CanvasRenderingContext2D, t: number, hurt: boolean): void {
  c.globalAlpha = 0.82;
  const j = Math.sin(t * 4) * 1.5;
  oval(c, 0, j, 12, 9, hurt ? "#f0e8c0" : "#e8e0c8", 2);
  for (let i = 0; i < 6; i++) disc(c, Math.cos(i) * 6, j + Math.sin(i * 1.7) * 4, 2.4, "#f8f4dc", 1);
  toonEyes(c, 2, j - 1, 2.4, blinkAt(t, 7), 0.2, 0);
  toonMouth(c, 3, j + 3, 3.5, 0.2, false);
  c.globalAlpha = 1;
}
function drawQueen(c: CanvasRenderingContext2D, t: number, hurt: boolean): void {
  shadowBlob(c, 0, 12, 14, 6, 0.3);
  oval(c, -2, 2, 13, 10, hurt ? "#f06090" : "#c01858", 2.8);
  // crown
  c.beginPath(); c.moveTo(4, -10); c.lineTo(7, -16); c.lineTo(10, -9); c.lineTo(13, -15); c.lineTo(16, -8);
  fillStroke(c, "#f0c030", 2);
  disc(c, 10, -2, 6, "#ff6a8a", 2.2);
  toonEyes(c, 10, -3, 2.6, blinkAt(t, 8), 0.4, 0);
  toonMouth(c, 13, 1, 4, 0.2, true);
}
function drawLocust(c: CanvasRenderingContext2D, t: number, hurt: boolean): void {
  const flap = Math.sin(t * 16) * 0.35;
  shadowBlob(c, 0, 14, 9, 4, 0.2);
  c.save(); c.translate(0, Math.sin(t * 8) * -2);
  c.save(); c.rotate(-0.7 + flap); oval(c, -1, -3, 10, 4, "#c8e878", 2); c.restore();
  oval(c, 0, 0, 9, 6, hurt ? "#c0d060" : "#6a9a28", 2.3);
  disc(c, 7, 0, 4, "#8ab830", 2);
  toonEyes(c, 7, -0.5, 2, blinkAt(t, 9), 0.6, 0);
  c.restore();
}
function drawKing(c: CanvasRenderingContext2D, t: number, hurt: boolean): void {
  shadowBlob(c, 0, 16, 18, 7, 0.32);
  oval(c, 0, 2, 18, 13, hurt ? "#d0c040" : "#3a6a18", 3);
  disc(c, 12, 0, 8, "#5a8a20", 2.4);
  toonEyes(c, 12, -1, 3.2, blinkAt(t, 10), 0.5, 0, true);
  toonMouth(c, 16, 4, 6, 0.35, false);
  c.fillStyle = "#f0c030"; c.font = "bold 9px Georgia, serif"; c.textAlign = "center";
  c.fillText("KING", 0, 8);
}
function drawJoeBoss(c: CanvasRenderingContext2D, t: number, hurt: boolean): void {
  shadowBlob(c, 0, 16, 16, 7, 0.3);
  // top-down Joe with mean face and straw hat brim
  oval(c, 0, 4, 13, 11, hurt ? "#f0b090" : "#e0a070", 2.6);
  oval(c, 0, -2, 16, 8, "#d8b04a", 2.6); // hat brim
  disc(c, 0, -2, 6, "#c49028", 2);
  toonEyes(c, 0, 3, 2.8, blinkAt(t, 11), 0, 0.4, true);
  toonMouth(c, 0, 8, 5, 0.25, false);
  // tin cup
  c.save(); c.translate(10, 8); c.rotate(0.3);
  c.beginPath(); rr(c, -5, -4, 10, 8, 2); fillStroke(c, "#c0c8d0", 1.6);
  c.restore();
}

function drawEnemySprite(c: CanvasRenderingContext2D, kind: EnemyId, t: number, hurt: boolean): void {
  if (kind === "mite") drawMite(c, t, hurt);
  else if (kind === "aphid") drawAphid(c, t, hurt);
  else if (kind === "beetle") drawBeetle(c, t, hurt);
  else if (kind === "caterpillar") drawCaterpillar(c, t, hurt);
  else if (kind === "inchworm") drawInchworm(c, t, hurt);
  else if (kind === "gnat") drawGnat(c, t, hurt);
  else if (kind === "mildew") drawMildew(c, t, hurt);
  else if (kind === "queen") drawQueen(c, t, hurt);
  else if (kind === "locust") drawLocust(c, t, hurt);
  else if (kind === "king") drawKing(c, t, hurt);
  else if (kind === "joe") drawJoeBoss(c, t, hurt);
}

/* ---------- towers ---------- */
function starBurst(c: CanvasRenderingContext2D, x: number, y: number, r: number, n: number, fill: string): void {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath(); fillStroke(c, fill, 2);
}

function drawLadybugTower(c: CanvasRenderingContext2D, a: number, b: number, t: number, anim: number, ang: number): void {
  shadowBlob(c, 0, 10, 16, 7, 0.28);
  oval(c, 0, 2, 16, 12, "#c47828", 2.8);
  // sticks / nest weave
  ink(c, 1.5); c.strokeStyle = "#6a3a10";
  for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(0, 2, 6 + i * 2, 0.2, Math.PI - 0.2); c.stroke(); }
  const bugs = 1 + (a >= 2 ? 1 : 0) + (a >= 3 ? 1 : 0);
  for (let i = 0; i < bugs; i++) {
    const a0 = ang + i * 0.9 + t * 0.4;
    const fly = anim > 0 ? 10 + (1 - anim / 0.32) * 16 : 0;
    const lx = Math.cos(a0) * (6 + fly), ly = Math.sin(a0) * (5 + fly * 0.6);
    disc(c, lx, ly, 5, "#e23a2c", 2);
    c.fillStyle = INK;
    c.fillRect(lx - 0.6, ly - 3, 1.2, 6);
    disc(c, lx + 2.4, ly - 1.2, 1.5, "#fffdf0", 1);
  }
  if (b > 0) disc(c, 0, 2, 3, "#f0d060", 1.4);
}

function drawNeemTower(c: CanvasRenderingContext2D, a: number, b: number, t: number, anim: number, ang: number): void {
  shadowBlob(c, 0, 12, 14, 7, 0.26);
  c.beginPath(); rr(c, -11, -10, 22, 22, 5); fillStroke(c, "#3d7a24", 2.6);
  oval(c, 0, -2, 8, 6, "#b6e05a", 2);
  c.save(); c.rotate(ang);
  c.beginPath(); rr(c, 8, -4, 14, 8, 3); fillStroke(c, "#d8e070", 2);
  if (anim > 0) {
    c.globalAlpha = anim / 0.32;
    oval(c, 28, 0, 12 + (0.32 - anim) * 20, 8, "rgba(180,224,90,0.55)", 0);
    c.globalAlpha = 1;
  }
  c.restore();
  c.fillStyle = "#e8f090"; c.font = "bold 8px Georgia, serif"; c.textAlign = "center"; c.fillText("NEEM", 0, 6);
  void t; void a; void b;
}

function drawStickyTower(c: CanvasRenderingContext2D, a: number, b: number, t = 0, anim = 0): void {
  oval(c, 0, 0, 18, 12, "#e8b84a", 2.6);
  oval(c, 0, 0, 12, 8, "#f4d878", 1.8);
  const wob = Math.sin(t * 4) * 1;
  disc(c, -4 + wob, -2, 3, "rgba(80,40,10,0.35)", 0);
  disc(c, 5, 2, 2.2, "rgba(80,40,10,0.3)", 0);
  if (b > 0) {
    ink(c, 2); c.beginPath(); c.moveTo(-10, 0); c.lineTo(0, -8); c.lineTo(10, 0); c.stroke();
  }
  void a; void anim;
}

function drawScarecrowTower(c: CanvasRenderingContext2D, a: number, b: number, t: number, anim: number, ang: number): void {
  shadowBlob(c, 0, 12, 14, 6, 0.26);
  const rec = anim > 0 ? -6 * (anim / 0.32) : 0;
  c.save(); c.rotate(ang);
  c.translate(rec, 0);
  // coat + hat from above
  oval(c, 0, 2, 13, 11, "#c46a28", 2.6);
  oval(c, 2, 0, 10, 8, "#d88a40", 2);
  oval(c, 1, -6, 14, 7, "#6a3a14", 2.4); // hat brim
  disc(c, 1, -6, 5, "#4a2810", 2);
  toonEyes(c, 4, 0, 2.2, blinkAt(t, 20), 0.5, 0);
  // revolver
  c.beginPath(); rr(c, 10, -3, 14, 6, 2); fillStroke(c, "#2a2418", 2);
  if (anim > 0) {
    c.globalAlpha = anim / 0.32;
    starBurst(c, 26, 0, 8 + (0.32 - anim) * 10, 6, "#fff3a0");
    c.globalAlpha = 1;
  }
  c.restore();
  void a; void b;
}

function drawMantisTower(c: CanvasRenderingContext2D, a: number, b: number, t: number, anim: number, ang: number): void {
  shadowBlob(c, 0, 12, 13, 6, 0.26);
  disc(c, 0, 4, 7, "#8a6a30", 2.2); // post
  const swipe = anim > 0 ? (0.32 - anim) * 2.4 - 0.6 : Math.sin(t * 2) * 0.15;
  oval(c, 0, -2, 9, 11, "#6ec02a", 2.6);
  disc(c, 3, -8, 5.5, "#8ae048", 2);
  toonEyes(c, 4, -9, 2.3, blinkAt(t, 21), 0.4, -0.2);
  c.save(); c.rotate(ang + swipe);
  ink(c, 3); c.strokeStyle = "#3a8a18";
  c.beginPath(); c.moveTo(4, -2); c.lineTo(18, -10); c.lineTo(22, -4); c.stroke();
  c.beginPath(); c.moveTo(4, 2); c.lineTo(18, 10); c.lineTo(22, 4); c.stroke();
  if (anim > 0) {
    c.globalAlpha = anim / 0.32;
    c.strokeStyle = "#d0ff80"; c.lineWidth = 3;
    c.beginPath(); c.arc(0, 0, 22, ang - 0.9, ang + 0.9); c.stroke();
    c.globalAlpha = 1;
  }
  c.restore();
  void a; void b;
}

function drawPredatoryTower(c: CanvasRenderingContext2D, a: number, b: number, t: number): void {
  shadowBlob(c, 0, 12, 13, 6, 0.26);
  c.beginPath(); rr(c, -12, -10, 24, 20, 4); fillStroke(c, "#8a5a2a", 2.6);
  c.beginPath(); rr(c, -9, -7, 18, 12, 3); fillStroke(c, "#c49050", 2);
  for (let i = 0; i < 3; i++) {
    const ax = Math.cos(t * 3 + i * 2) * 5, ay = Math.sin(t * 4 + i) * 3;
    disc(c, ax, ay, 2.6, "#5a3020", 1.4);
    disc(c, ax + 1.4, ay - 0.6, 0.8, "#fff", 0);
  }
  void a; void b;
}

function drawUvTower(c: CanvasRenderingContext2D, a: number, b: number, t: number, anim: number): void {
  shadowBlob(c, 0, 12, 12, 6, 0.24);
  c.beginPath(); rr(c, -6, -4, 12, 16, 3); fillStroke(c, "#3a2a68", 2.4);
  const glow = 6 + Math.sin(t * 6) * 1.5 + (anim > 0 ? 4 : 0);
  disc(c, 0, -8, glow, "#b8a0ff", 2);
  disc(c, 0, -8, 4, "#f0e8ff", 1.5);
  void a; void b;
}

function drawDusterTower(c: CanvasRenderingContext2D, a: number, b: number, t: number): void {
  shadowBlob(c, 0, 12, 16, 7, 0.26);
  disc(c, 0, 2, 14, "#6a90c0", 2.6);
  disc(c, 0, 2, 8, "#d0e4f8", 2);
  // windsock
  const w = Math.sin(t * 3) * 0.4;
  c.save(); c.rotate(-0.4 + w);
  c.beginPath(); c.moveTo(6, -10); c.lineTo(22, -14); c.lineTo(22, -4); c.lineTo(6, -8); c.closePath();
  fillStroke(c, "#f0c030", 2);
  c.restore();
  oval(c, 0, 2, 5, 3, "#f0d060", 1.6);
  void a; void b;
}

function drawTowerSprite(c: CanvasRenderingContext2D, kind: TowerId, a: number, b: number, t = 0, anim = 0, ang = 0): void {
  if (kind === "ladybug") drawLadybugTower(c, a, b, t, anim, ang);
  else if (kind === "neem") drawNeemTower(c, a, b, t, anim, ang);
  else if (kind === "sticky") drawStickyTower(c, a, b, t, anim);
  else if (kind === "scarecrow") drawScarecrowTower(c, a, b, t, anim, ang);
  else if (kind === "mantis") drawMantisTower(c, a, b, t, anim, ang);
  else if (kind === "predatory") drawPredatoryTower(c, a, b, t);
  else if (kind === "uv") drawUvTower(c, a, b, t, anim);
  else if (kind === "duster") drawDusterTower(c, a, b, t);
}

function drawPlane(c: CanvasRenderingContext2D, p: Plane): void {
  // flyover shadow first
  c.save();
  c.translate(p.x + 8, p.y + 22);
  c.rotate(p.ang);
  c.fillStyle = "rgba(20,12,4,0.35)";
  c.beginPath(); c.ellipse(0, 0, 28, 10, 0, 0, Math.PI * 2); c.fill();
  c.restore();
  c.save();
  c.translate(p.x, p.y);
  c.rotate(p.ang);
  // top-down cartoon biplane
  oval(c, 0, 0, 22, 7, "#f0d24a", 2.4);
  c.beginPath(); rr(c, -6, -16, 12, 32, 3); fillStroke(c, "#e8c040", 2.2);
  c.beginPath(); rr(c, 8, -5, 14, 10, 2); fillStroke(c, "#d43c28", 2);
  disc(c, -16, 0, 5, "#c0d8e8", 2);
  disc(c, 2, 0, 3, "#7ad4f0", 1.5);
  c.restore();
}

type FarmAct = "idle" | "talk" | "hat" | "sip" | "mean";
function drawFarmhand(c: CanvasRenderingContext2D, who: "john" | "joe", t: number, act: FarmAct = "idle"): void {
  const bob = Math.sin(t * 2.4) * 1.6;
  c.save(); c.translate(0, bob);
  shadowBlob(c, 0, 14, 12, 6, 0.28);
  const shirt = who === "john" ? "#3a6aaa" : "#6a8a3a";
  oval(c, 0, 6, 11, 9, shirt, 2.4);
  const skin = who === "john" ? "#e0a070" : "#e8b888";
  disc(c, 0, -2, 8.5, skin, 2.2);
  // hat
  const tip = act === "hat" ? -10 - Math.sin(t * 6) * 2 : 0;
  const tilt = act === "hat" ? -0.35 : 0;
  c.save(); c.translate(0, -6 + tip); c.rotate(tilt);
  if (who === "john") {
    oval(c, 0, 2, 14, 6, "#4a3010", 2.3);
    c.beginPath(); rr(c, -6, -6, 12, 8, 2); fillStroke(c, "#3a240c", 2);
  } else {
    oval(c, 0, 2, 14, 6, "#d8b04a", 2.3);
    c.beginPath(); rr(c, -6, -5, 12, 7, 2); fillStroke(c, "#c49028", 2);
  }
  c.restore();
  const mad = who === "joe" && act === "mean";
  toonEyes(c, 0, -3, 2.4, blinkAt(t, who === "john" ? 30 : 31), 0, mad ? 0.4 : 0, mad);
  if (who === "john") {
    // mustache
    ink(c, 2); c.beginPath(); c.arc(0, 1.5, 3.2, 0.15, Math.PI - 0.15); c.stroke();
  }
  const open = talkOpen(t, act === "talk" || act === "hat" || act === "sip");
  toonMouth(c, 0, 3.4, 4.2, act === "sip" ? 0.4 : open, !mad);
  if (who === "joe") {
    const sip = act === "sip";
    c.save();
    c.translate(sip ? 4 : 10, sip ? -2 : 8);
    c.rotate(sip ? -0.9 : 0.4);
    c.beginPath(); rr(c, -5, -4, 9, 8, 2); fillStroke(c, "#c8d0d6", 1.6);
    c.beginPath(); c.arc(5, 0, 3, -0.8, 0.8); ink(c, 1.6); c.stroke();
    if (sip) {
      c.fillStyle = "#5a3a18"; c.globalAlpha = 0.5;
      c.beginPath(); c.ellipse(0, -6, 3, 2, 0, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
    }
    c.restore();
  }
  c.restore();
}

function portraitBg(c: CanvasRenderingContext2D, w: number, h: number, mean = false): void {
  const g = c.createLinearGradient(0, 0, 0, h);
  if (mean) { g.addColorStop(0, "#4a2030"); g.addColorStop(1, "#1a0c10"); }
  else { g.addColorStop(0, "#5a9a48"); g.addColorStop(1, "#c4a060"); }
  c.fillStyle = g; c.fillRect(0, 0, w, h);
}

function drawJohnPortrait(c: CanvasRenderingContext2D, w: number, h: number, t = 0, talk = false, hatTip = false): void {
  portraitBg(c, w, h, false);
  const cx = w * 0.5, cy = h * 0.58;
  // shoulders
  c.beginPath(); rr(c, cx - 58, cy + 28, 116, 70, 16); fillStroke(c, "#3a6aaa", 3);
  c.beginPath(); rr(c, cx - 14, cy + 20, 28, 40, 6); fillStroke(c, "#c43c2c", 2.4); // bandana
  // neck + head
  oval(c, cx, cy + 16, 16, 12, "#e0a070", 2);
  disc(c, cx, cy - 6, 36, "#e0a070", 3);
  // ears
  disc(c, cx - 34, cy, 8, "#e0a070", 2);
  disc(c, cx + 34, cy, 8, "#e0a070", 2);
  const tipY = hatTip ? -18 - Math.sin(t * 7) * 3 : 0;
  const tipR = hatTip ? -0.28 : 0;
  c.save(); c.translate(cx, cy - 34 + tipY); c.rotate(tipR);
  oval(c, 0, 10, 58, 14, "#4a3010", 3);
  c.beginPath(); rr(c, -28, -22, 56, 32, 8); fillStroke(c, "#3a240c", 3);
  c.beginPath(); rr(c, -22, 4, 44, 8, 2); fillStroke(c, "#c43c2c", 2);
  c.restore();
  toonEyes(c, cx, cy - 10, 9, blinkAt(t, 40), talk ? Math.sin(t * 2) * 0.2 : 0, 0.1, false);
  // mustache
  c.fillStyle = "#5a3a18";
  c.beginPath(); c.ellipse(cx - 12, cy + 8, 14, 6, -0.2, 0, Math.PI * 2); c.fill(); ink(c, 2); c.stroke();
  c.beginPath(); c.ellipse(cx + 12, cy + 8, 14, 6, 0.2, 0, Math.PI * 2); c.fill(); c.stroke();
  toonMouth(c, cx, cy + 20, 16, talkOpen(t, talk), true);
}

function drawJoePortrait(c: CanvasRenderingContext2D, w: number, h: number, mean = false, t = 0, talk = false, sip = false): void {
  portraitBg(c, w, h, mean);
  const cx = w * 0.5, cy = h * 0.58;
  c.beginPath(); rr(c, cx - 58, cy + 28, 116, 70, 16); fillStroke(c, mean ? "#4a3020" : "#6a8a3a", 3);
  oval(c, cx, cy + 16, 16, 12, "#e8b888", 2);
  disc(c, cx, cy - 4, 36, "#e8b888", 3);
  disc(c, cx - 34, cy + 2, 8, "#e8b888", 2);
  disc(c, cx + 34, cy + 2, 8, "#e8b888", 2);
  c.save(); c.translate(cx, cy - 32);
  oval(c, 0, 12, 60, 14, "#d8b04a", 3);
  c.beginPath(); rr(c, -26, -18, 52, 28, 8); fillStroke(c, "#c49028", 3);
  // straw lines
  ink(c, 1.2); c.strokeStyle = "#8a6010";
  for (let i = -18; i <= 18; i += 6) { c.beginPath(); c.moveTo(i, -14); c.lineTo(i, 8); c.stroke(); }
  c.restore();
  toonEyes(c, cx, cy - 8, 9.5, blinkAt(t, 41), 0, mean ? 0.45 : 0.1, mean);
  toonMouth(c, cx, cy + 16, 18, sip ? 0.55 : talkOpen(t, talk), !mean);
  // tin cup
  c.save();
  const cupX = sip ? cx + 16 : cx + 52, cupY = sip ? cy + 8 : cy + 42;
  c.translate(cupX, cupY); c.rotate(sip ? -0.9 : 0.15);
  c.beginPath(); rr(c, -14, -12, 28, 26, 5); fillStroke(c, "#c8d0d6", 2.4);
  c.beginPath(); rr(c, -10, -8, 20, 10, 3); fillStroke(c, "#5a3a18", 1.6);
  c.beginPath(); c.arc(14, 0, 8, -1, 1); ink(c, 2.4); c.stroke();
  if (sip) {
    c.fillStyle = "rgba(90,50,20,0.4)";
    c.beginPath(); c.ellipse(-2, -16, 8, 5, 0, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

function drawClouds(c: CanvasRenderingContext2D, t: number): void {
  const clouds = [
    { x: 80, y: 40, s: 1, v: 8 },
    { x: 420, y: 22, s: 1.3, v: 5 },
    { x: 760, y: 50, s: 0.9, v: 7 },
  ];
  c.fillStyle = "rgba(244,240,224,0.5)";
  for (const cl of clouds) {
    const x = ((cl.x + t * cl.v) % (WW + 160)) - 80;
    c.beginPath(); c.ellipse(x, cl.y, 36 * cl.s, 14 * cl.s, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(x + 22 * cl.s, cl.y + 2, 24 * cl.s, 12 * cl.s, 0, 0, Math.PI * 2); c.fill();
  }
}

function drawWindmillBlades(c: CanvasRenderingContext2D, t: number): void {
  c.save(); c.translate(522, 74); c.rotate(t * 1.2);
  for (let i = 0; i < 4; i++) {
    c.rotate(Math.PI / 2);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(6, 4); c.lineTo(6, 28); c.lineTo(-6, 28); c.lineTo(-6, 4); c.closePath();
    fillStroke(c, i % 2 ? "#f0e8d0" : "#d0b070", 2);
  }
  disc(c, 0, 0, 5, "#e8c050", 2);
  c.restore();
}

function drawPondShimmer(c: CanvasRenderingContext2D, t: number): void {
  c.globalAlpha = 0.35 + Math.sin(t * 2) * 0.12;
  oval(c, POND.x - 8 + Math.sin(t) * 3, POND.y - 6, 16, 6, "#c8f4ff", 0);
  c.globalAlpha = 0.25;
  oval(c, POND.x + 10, POND.y + 4 + Math.cos(t * 1.3) * 2, 10, 4, "#e8ffff", 0);
  c.globalAlpha = 1;
}

function drawBetrayalSwarm(c: CanvasRenderingContext2D, t: number): void {
  const kinds: EnemyId[] = ["mite", "beetle", "locust", "caterpillar", "aphid", "gnat", "queen"];
  for (let i = 0; i < 36; i++) {
    const lane = (i % 10) / 9;
    const x0 = 30 + lane * 940 + Math.sin(i * 1.7) * 28;
    const delay = (i % 12) * 0.16;
    const prog = Math.max(0, t - delay);
    if (prog <= 0) continue;
    const y = -36 + prog * (48 + (i % 7) * 6);
    if (y > 320) continue;
    const x = x0 + Math.sin(prog * 3.2 + i) * 18;
    c.save();
    c.translate(x, y);
    c.rotate(Math.PI / 2 + Math.sin(prog * 8 + i) * 0.2);
    const sq = 1 + Math.sin(prog * 10 + i) * 0.1;
    c.scale(0.9 * sq, 0.9 / sq);
    drawEnemySprite(c, kinds[i % kinds.length], t + i, false);
    c.restore();
  }
}

const SPR: { farm?: HTMLCanvasElement; plant: HTMLCanvasElement[]; enemy: Partial<Record<EnemyId, HTMLCanvasElement[]>> } = { plant: [], enemy: {} };
function makeC(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas"); c.width = w; c.height = h; return c;
}
function ensureSprites(): void {
  if (SPR.farm) return;
  const farm = makeC(WW, WH);
  const fc = farm.getContext("2d");
  if (fc) { fc.imageSmoothingEnabled = true; drawFarmBg(fc); drawCropLayer(fc, 1); }
  SPR.farm = farm;
  for (let i = 0; i < 5; i++) {
    const p = makeC(140, 140);
    const pc = p.getContext("2d");
    if (pc) { pc.imageSmoothingEnabled = true; pc.translate(70, 70); drawPlant(pc, i / 4, 0); }
    SPR.plant.push(p);
  }
  for (const kind of EIDS) {
    const frames: HTMLCanvasElement[] = [];
    for (let f = 0; f < 3; f++) {
      const p = makeC(72, 72);
      const pc = p.getContext("2d");
      if (pc) {
        pc.imageSmoothingEnabled = true;
        pc.translate(36, 36);
        drawEnemySprite(pc, kind, f * 0.22, false);
      }
      frames.push(p);
    }
    SPR.enemy[kind] = frames;
  }
}


function wiltIndex(lives: number, max: number): number {
  const w = 1 - clamp(lives / Math.max(1, max), 0, 1);
  return clamp(Math.floor(w * 4.999), 0, 4);
}

/* ---------- simulation ---------- */
function nid(s: Sim): number { s.uid += 1; return s.uid; }

function say(s: Sim, text: string, modal = false, hold = 7, who: Speaker = "john", beat?: JohnMsg["beat"]): void {
  s.john = { text, t: hold, modal, who, beat };
}

function addFx(s: Sim, x: number, y: number, kind: Fx["kind"], c: string, r = 12, max = 0.35, ang = 0): void {
  if (s.fx.length > 22) s.fx.splice(0, s.fx.length - 22);
  s.fx.push({ id: nid(s), x, y, t: max, max, kind, c, r, ang });
}
function addFloat(s: Sim, x: number, y: number, text: string, col: string): void {
  s.floats.push({ id: nid(s), x, y, text, c: col, t: 1.1, max: 1.1 });
}

function posEnemy(e: Enemy): void {
  const p = posAt(e.dist);
  e.x = p.x; e.y = p.y; e.ang = p.ang;
  if (e.flying) { e.y -= 16; }
}

function spawnEnemy(s: Sim, kind: EnemyId, dist0 = 0): Enemy {
  const d = EDEFS[kind];
  const hp = (kind === "king" || kind === "joe") ? scaleKing(s.wave) * (kind === "joe" ? 1.15 : 1) : scaleHp(d.hp, s.wave);
  const e: Enemy = {
    id: nid(s), kind, dist: dist0, hp, max: hp, r: d.r, slow: 0, slowT: 0, stun: 0, dots: [],
    armor: d.armor ?? 0, born: s.time, leak: d.leak, reward: d.reward, flying: !!d.flying, camo: !!d.camo,
    split: d.split, boss: !!d.boss, spawnT: kind === "queen" || kind === "king" ? 1.8 : 0, hitT: 0,
    x: 0, y: 0, ang: 0, spd: d.spd,
  };
  posEnemy(e);
  s.enemies.push(e);
  if (s.seen.indexOf(kind) < 0) s.seen.push(kind);
  return e;
}

function applyDmg(s: Sim, e: Enemy, raw: number, pierce: number, bonus?: number): number {
  let dmg = raw * (bonus ?? 1);
  const mit = Math.max(0, e.armor - pierce);
  dmg = Math.max(1, dmg - mit);
  e.hp -= dmg;
  e.hitT = 0.12;
  return dmg;
}

function killEnemy(s: Sim, e: Enemy, from: Tower | null): void {
  if (e.hp > 0) return;
  e.hp = 0;
  s.cash += e.reward;
  const pop = e.boss ? "WHAM!" : e.kind === "mildew" ? "POOF!" : e.kind === "gnat" ? "ZAP!" : (e.id % 2 ? "SPLAT!" : "BAM!");
  addFloat(s, e.x, e.y - 18, pop, e.boss ? "#ffcc33" : "#ff3d6e");
  addFloat(s, e.x + 8, e.y - 4, `+$${e.reward}`, "#ffe066");
  addFx(s, e.x, e.y, "splat", e.kind === "mildew" ? "#f4f0d0" : "#ff4d6a", e.r + 16, 0.42);
  if (e.split) {
    for (let i = 0; i < e.split.n; i++) {
      const ch = spawnEnemy(s, e.split.id, Math.max(0, e.dist - 8 + i * 12));
      ch.slow = e.slow; ch.slowT = e.slowT * 0.5;
    }
  }
  // plague jump
  if (from) {
    const st = statsFor(from.kind, from.a, from.b);
    if (st.spread > 0) {
      let best: Enemy | null = null, bd = 1e9;
      for (const o of s.enemies) {
        if (o.id === e.id || o.hp <= 0) continue;
        const dd = dist(e.x, e.y, o.x, o.y);
        if (dd < st.spread && dd < bd) { bd = dd; best = o; }
      }
      if (best) addDot(best, st.dot, st.dotT, st.stacks);
    }
    if (st.burn > 0) {
      applyDmg(s, e, st.burn, st.pierce);
    }
  }
}

function addDot(e: Enemy, dps: number, dur: number, stacks: number): void {
  if (dps <= 0 || dur <= 0) return;
  e.dots.push({ dps, t: dur });
  while (e.dots.length > stacks) {
    // drop weakest
    let wi = 0;
    for (let i = 1; i < e.dots.length; i++) if (e.dots[i].dps < e.dots[wi].dps) wi = i;
    e.dots.splice(wi, 1);
  }
}

function leakEnemy(s: Sim, e: Enemy): void {
  e.hp = 0;
  s.lives = Math.max(0, s.lives - e.leak);
  s.shake = Math.min(0.45, s.shake + 0.18);
  addFloat(s, PLANT.x, PLANT.y - 50, `-${e.leak}`, "#e85d4c");
  addFx(s, PLANT.x, PLANT.y - 20, "ring", "#e85d4c", 30, 0.4);
  if (s.lives <= 0) {
    s.lives = 0;
    s.over = true;
    s.screen = "defeat";
    s.waving = false;
    say(s, s.revealed ? "Joe took the crop. We'll run him off next time, farmhand. That's a promise." : "The crop wilted... We'll plant again, farmhand. Dust yourself off.", true, 99, "john");
    kvSet(SAVE_KEY, null);
  }
}

function enemyRevealed(s: Sim, e: Enemy): boolean {
  if (!e.camo) return true;
  for (const u of s.towers) {
    if (u.kind !== "uv") continue;
    const us = statsFor(u.kind, u.a, u.b);
    if (dist(e.x, e.y, u.x, u.y) <= us.range) return true;
  }
  return false;
}

function canTarget(st: TStats, e: Enemy, detected: boolean): boolean {
  if (e.hp <= 0) return false;
  if (e.flying && !st.air) return false;
  if (e.camo && !st.camo && !detected) return false;
  return true;
}

function detectAt(s: Sim, x: number, y: number): boolean {
  for (const tw of s.towers) {
    if (tw.kind !== "uv") continue;
    const st = statsFor(tw.kind, tw.a, tw.b);
    const r = st.detectAura > 0 ? Math.max(st.range, st.detectAura) : st.range;
    // self always detects in range; aura is extra for others — here we check if point is in any UV range
    if (dist(x, y, tw.x, tw.y) <= r) return true;
  }
  return false;
}
function towerDetect(s: Sim, tw: Tower, e: Enemy): boolean {
  const st = statsFor(tw.kind, tw.a, tw.b);
  if (st.camo) return true;
  if (tw.kind === "sticky") return true;
  for (const u of s.towers) {
    if (u.kind !== "uv") continue;
    const us = statsFor(u.kind, u.a, u.b);
    if (us.detectAura > 0 && dist(tw.x, tw.y, u.x, u.y) <= us.detectAura) return true;
    // enemies already in UV self-range are visible to everyone? Only beacon shares. Self UV still needed.
  }
  // if the enemy itself is inside a UV lamp range, the lamp lights it (others still need detect unless we want map-wide reveal in lamp radius)
  // Beacon (A2+) shares; otherwise only the lamp hits camo. Extra: enemy standing in lamp light is revealed to all.
  for (const u of s.towers) {
    if (u.kind !== "uv") continue;
    const us = statsFor(u.kind, u.a, u.b);
    if (dist(e.x, e.y, u.x, u.y) <= us.range) return true;
  }
  void detectAt;
  return false;
}

function pickTargets(s: Sim, tw: Tower, st: TStats, range: number, n: number): Enemy[] {
  const cands: { e: Enemy; score: number }[] = [];
  for (const e of s.enemies) {
    if (!canTarget(st, e, towerDetect(s, tw, e))) continue;
    const dd = dist(tw.x, tw.y, e.x, e.y);
    if (dd > range + e.r) continue;
    let score = 0;
    if (tw.tgt === "first") score = e.dist;
    else if (tw.tgt === "last") score = -e.dist;
    else if (tw.tgt === "close") score = -dd;
    else score = e.hp + (e.boss ? 200 : 0);
    cands.push({ e, score });
  }
  cands.sort((a, b) => b.score - a.score);
  const out: Enemy[] = [];
  for (const c of cands) { out.push(c.e); if (out.length >= n) break; }
  return out;
}

function inCone(tx: number, ty: number, ang: number, cone: number, ex: number, ey: number): boolean {
  const a = angOf(tx, ty, ex, ey);
  let d = a - ang;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d) <= (cone * Math.PI / 180) / 2;
}

function hurtWithStats(s: Sim, tw: Tower, st: TStats, e: Enemy, dmgMul = 1): void {
  let bonus = st.bonus[e.kind] ?? 1;
  if (e.camo) bonus *= st.camoDmg;
  if (st.instaSmall && !e.boss && (e.kind === "mite" || e.kind === "aphid" || e.kind === "inchworm") && e.hp <= 22) {
    e.hp = 0;
  } else if (st.execute > 0 && !e.boss && e.hp / e.max <= st.execute) {
    e.hp = 0;
  } else if (st.execute > 0 && e.boss && e.hp / e.max <= st.execute) {
    applyDmg(s, e, st.dmg * 3 * dmgMul, st.pierce, bonus);
  } else {
    applyDmg(s, e, st.dmg * dmgMul, st.pierce, bonus);
  }
  if (st.slow > 0) { e.slow = Math.max(e.slow, st.slow); e.slowT = Math.max(e.slowT, st.slowT); }
  if (st.stun > 0 && Math.random() < (tw.kind === "neem" ? 0.35 : 1)) e.stun = Math.max(e.stun, st.stun);
  if (st.dot > 0) addDot(e, st.dot, st.dotT, st.stacks);
  if (e.hp <= 0) killEnemy(s, e, tw);
}

function fireTower(s: Sim, tw: Tower, st: TStats): void {
  tw.anim = 0.32;
  if (tw.kind === "duster") {
    const nPlanes = st.targets >= 2 ? 2 : 1;
    for (let i = 0; i < nPlanes; i++) {
      const startY = 40 + i * 80 + (Math.random() * 40);
      const carpet = tw.a >= 3;
      s.planes.push({
        id: nid(s), x: -40, y: carpet ? 80 + i * 120 : startY, vx: 280 + i * 20, vy: carpet ? 40 : 20,
        drops: st.planeN, gap: carpet ? 0.08 : 0.12, t: 0.1 + i * 0.25, dmg: st.planeDmg, splash: st.splash || 28,
        pierce: st.pierce, camoOk: st.camo, pathDust: carpet, ang: 0.15,
      });
    }
    addFx(s, tw.x, tw.y - 10, "flash", "#cfd6de", 16, 0.25);
    return;
  }
  if (tw.kind === "sticky") return;
  if (tw.kind === "neem") {
    const tg = pickTargets(s, tw, st, st.range, 1);
    if (!tg.length) { tw.cd = 0.05; return; }
    const ang = angOf(tw.x, tw.y, tg[0].x, tg[0].y);
    tw.lastAng = ang;
    for (const e of s.enemies) {
      if (!canTarget(st, e, towerDetect(s, tw, e))) continue;
      if (dist(tw.x, tw.y, e.x, e.y) > st.range + e.r) continue;
      if (!inCone(tw.x, tw.y, ang, st.cone, e.x, e.y)) continue;
      hurtWithStats(s, tw, st, e);
    }
    addFx(s, tw.x + Math.cos(ang) * 20, tw.y + Math.sin(ang) * 20, "spray", "#b6e05a", 22, 0.28, ang);
    return;
  }
  if (tw.kind === "uv" && tw.a >= 4 && Math.floor(s.time * 2) % 8 === 0) {
    // sunburst occasionally — handled below as extra when firing
  }
  const n = st.targets;
  const tg = pickTargets(s, tw, st, st.range, n);
  if (!tg.length) { tw.cd = 0.05; return; }
  for (const e of tg) {
    tw.lastAng = angOf(tw.x, tw.y, e.x, e.y);
    if (st.projectile) {
      let dmg = st.dmg;
      if (tw.kind === "scarecrow" && tw.b >= 3 && Math.random() < 0.25) dmg *= 2;
      const ang = tw.lastAng;
      const sp = st.pSpeed;
      s.shots.push({
        id: nid(s), x: tw.x + Math.cos(ang) * 12, y: tw.y + Math.sin(ang) * 8, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        dmg, pierce: st.pierce, splash: 0, life: 1.2, kind: "bullet", target: e.id, bounce: st.bounce, camoOk: st.camo, airOk: st.air,
        color: "#e8d080", r: 3,
      });
      addFx(s, tw.x + Math.cos(ang) * 18, tw.y + Math.sin(ang) * 18, "flash", "#fff3a0", 12, 0.14, ang);
    } else if (tw.kind === "mantis") {
      hurtWithStats(s, tw, st, e);
      addFx(s, e.x, e.y, "slash", "#b0d060", 16, 0.18, tw.lastAng);
    } else if (tw.kind === "predatory") {
      addDot(e, st.dot, st.dotT, st.stacks);
      applyDmg(s, e, st.dmg, st.pierce, st.bonus[e.kind]);
      if (e.hp <= 0) killEnemy(s, e, tw);
      addFx(s, e.x, e.y, "spark", "#8a5a2a", 8, 0.2);
    } else if (tw.kind === "uv") {
      hurtWithStats(s, tw, st, e);
      s.shots.push({
        id: nid(s), x: tw.x, y: tw.y - 16, vx: 0, vy: 0, dmg: 0, pierce: 0, splash: 0, life: 0.08, kind: "beam",
        target: e.id, bounce: 0, camoOk: true, airOk: true, color: "#b0a0ff", r: 2,
      });
      if (tw.a >= 4) {
        // sunburst tick: damage camo/air in range occasionally
        if (Math.random() < 0.2) {
          for (const o of s.enemies) {
            if (o.hp <= 0) continue;
            if (!(o.camo || o.flying)) continue;
            if (dist(tw.x, tw.y, o.x, o.y) <= st.range + 40) hurtWithStats(s, tw, st, o, 0.6);
          }
          addFx(s, tw.x, tw.y - 16, "ring", "#b0a0ff", st.range * 0.4, 0.3);
        }
      }
    } else {
      hurtWithStats(s, tw, st, e);
      if (tw.kind === "ladybug") addFx(s, tw.x, tw.y, "bug", "#e23a2c", 10, 0.3, tw.lastAng);
    }
  }
}

function updateShots(s: Sim, dt: number): void {
  const keep: Shot[] = [];
  for (const sh of s.shots) {
    sh.life -= dt;
    if (sh.kind === "beam") {
      if (sh.life > 0) keep.push(sh);
      continue;
    }
    sh.x += sh.vx * dt; sh.y += sh.vy * dt;
    if (sh.x < -40 || sh.y < -40 || sh.x > WW + 40 || sh.y > WH + 40 || sh.life <= 0) continue;
    let hit: Enemy | null = null;
    for (const e of s.enemies) {
      if (e.hp <= 0) continue;
      if (e.flying && !sh.airOk) continue;
      if (e.camo && !sh.camoOk && !enemyRevealed(s, e)) continue;
      if (dist(sh.x, sh.y, e.x, e.y) <= e.r + sh.r + 4) { hit = e; break; }
    }
    if (hit) {
      applyDmg(s, hit, sh.dmg, sh.pierce);
      if (hit.hp <= 0) killEnemy(s, hit, null);
      if (sh.splash > 0) {
        for (const o of s.enemies) {
          if (o.id === hit.id || o.hp <= 0) continue;
          if (dist(sh.x, sh.y, o.x, o.y) <= sh.splash) {
            applyDmg(s, o, sh.dmg * 0.5, sh.pierce);
            if (o.hp <= 0) killEnemy(s, o, null);
          }
        }
        addFx(s, sh.x, sh.y, "puff", "#c9b48a", sh.splash * 0.5, 0.25);
      }
      if (sh.bounce > 0) {
        sh.bounce -= 1;
        let best: Enemy | null = null, bd = 1e9;
        for (const o of s.enemies) {
          if (o.id === hit.id || o.hp <= 0) continue;
          const dd = dist(sh.x, sh.y, o.x, o.y);
          if (dd < 140 && dd < bd) { bd = dd; best = o; }
        }
        if (best) {
          const ang = angOf(sh.x, sh.y, best.x, best.y);
          const sp = Math.hypot(sh.vx, sh.vy) || 500;
          sh.vx = Math.cos(ang) * sp; sh.vy = Math.sin(ang) * sp;
          sh.target = best.id; sh.life = 0.8;
          keep.push(sh);
        }
      }
      continue;
    }
    keep.push(sh);
  }
  s.shots = keep;
}

function bombAt(s: Sim, x: number, y: number, dmg: number, splash: number, pierce: number, camoOk: boolean, stBonus?: TStats): void {
  addFx(s, x, y, "puff", "#c9d080", splash * 0.45, 0.3);
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    if (e.camo && !camoOk && !towerDetect(s, { id: -1, kind: "duster", x, y, a: 0, b: camoOk ? 2 : 0, tgt: "first", cd: 0, charges: 0, spent: 0, lastAng: 0 }, e)) continue;
    if (dist(x, y, e.x, e.y) <= splash + e.r) {
      let bonus = 1;
      if (stBonus) bonus = stBonus.bonus[e.kind] ?? 1;
      applyDmg(s, e, dmg, pierce, bonus);
      if (stBonus && stBonus.dot > 0) addDot(e, stBonus.dot, stBonus.dotT, 2);
      if (e.hp <= 0) killEnemy(s, e, null);
    }
  }
}

function updatePlanes(s: Sim, dt: number): void {
  const keep: Plane[] = [];
  for (const p of s.planes) {
    p.t -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.ang = Math.atan2(p.vy, p.vx);
    if (p.t <= 0 && p.drops > 0) {
      p.drops -= 1;
      p.t = p.gap;
      let x = p.x, y = p.y;
      if (p.pathDust) {
        const d = clamp((p.x / WW) * PLEN, 0, PLEN);
        const at = posAt(d);
        x = at.x; y = at.y;
      }
      bombAt(s, x, y + 8, p.dmg, p.splash, p.pierce, p.camoOk);
    }
    if (p.x < WW + 80 && p.y < WH + 80 && p.x > -80) keep.push(p);
  }
  s.planes = keep;
}

function updateSticky(s: Sim, tw: Tower, st: TStats, dt: number): void {
  void dt;
  tw.cd -= 0; // processed via enemy overlap each frame
  const inside: Enemy[] = [];
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    if (e.flying) continue;
    if (dist(tw.x, tw.y, e.x, e.y) <= st.range + e.r) inside.push(e);
  }
  for (const e of inside) {
    e.slow = Math.max(e.slow, st.slow);
    e.slowT = Math.max(e.slowT, 0.4);
    if (st.stun > 0) e.stun = Math.max(e.stun, st.stun * 0.25);
  }
  // charges tick when an enemy first enters — use hit flag via spawnT unused? Use a set on tower via lastAng as scratch? Better: decrement on rof vs any inside
  tw.cd -= dt;
  if (inside.length && tw.cd <= 0) {
    tw.cd = st.rof;
    if (!st.permanent) {
      tw.charges -= 1;
    }
    for (const e of inside) {
      applyDmg(s, e, st.dmg, st.pierce);
      if (st.stun > 0 && tw.b >= 3) e.stun = Math.max(e.stun, st.stun);
      if (e.hp <= 0) killEnemy(s, e, tw);
    }
    if (tw.charges <= 0 && !st.permanent) {
      addFx(s, tw.x, tw.y, "puff", "#e0a84a", 16, 0.3);
      addFloat(s, tw.x, tw.y, "spent", "#c9b48a");
      s.towers = s.towers.filter((t) => t.id !== tw.id);
      if (s.selected === tw.id) s.selected = null;
      s.dirty = true;
    }
  }
}

function updateEnemy(s: Sim, e: Enemy, dt: number): void {
  if (e.hp <= 0) return;
  e.hitT = Math.max(0, e.hitT - dt);
  // dots
  if (e.dots.length) {
    const keep: { dps: number; t: number }[] = [];
    for (const d of e.dots) {
      applyDmg(s, e, d.dps * dt, 99);
      d.t -= dt;
      if (d.t > 0) keep.push(d);
    }
    e.dots = keep;
    if (e.hp <= 0) { killEnemy(s, e, null); return; }
  }
  e.slowT -= dt;
  if (e.slowT <= 0) { e.slow = 0; e.slowT = 0; }
  e.stun -= dt;
  let spd = e.spd * (1 - clamp(e.slow, 0, 0.85));
  if (e.stun > 0) spd = 0;
  e.dist += spd * dt;
  posEnemy(e);
  if (e.dist >= PLEN - 6) { leakEnemy(s, e); return; }
  // queen / king spawn
  if (e.kind === "queen" || e.kind === "king" || e.kind === "joe") {
    e.spawnT -= dt;
    if (e.spawnT <= 0) {
      e.spawnT = e.kind === "joe" ? 2.2 : e.kind === "king" ? 2.4 : 2.6;
      const k: EnemyId = e.kind === "queen" ? "mite" : "locust";
      spawnEnemy(s, k, Math.max(0, e.dist - 18));
    }
  }
}

function startWave(s: Sim): boolean {
  if (s.waving || s.screen !== "play" || s.over || s.cut) return false;
  const groups = waveGroups(s.wave);
  s.spawnQ = [];
  for (const g of groups) {
    for (let i = 0; i < g.n; i++) s.spawnQ.push({ at: g.delay + i * g.gap, kind: g.kind });
  }
  s.spawnQ.sort((a, b) => a.at - b.at);
  s.waving = true;
  s.waveT = 0;
  s.pendingEnd = 0;
  if (s.wave === 40 && s.revealed) {
    s.joeHere = false;
    s.johnHere = true;
    if (!s.john?.modal) say(s, "Take him down, farmhand. That's an order.", false, 7, "john");
  } else if (!s.john?.modal) {
    const hint = waveHint(s.wave, s.seen);
    if (hint) say(s, hint, false, 6.5, "john");
    else if (joeAwayFor(s.wave) && !s.revealed) {
      const a = awayLine(s.wave);
      say(s, a.text, false, 7, a.who);
    }
  }
  if (joeAwayFor(s.wave) && !s.revealed) s.joeHere = false;
  if (s.revealed && s.wave >= 40) s.joeHere = false;
  return true;
}

function endWave(s: Sim): void {
  s.waving = false;
  s.spawnQ = [];
  const bonus = 50 + s.wave * 5;
  s.cash += bonus;
  addFloat(s, WW * 0.5, 80, `Wave ${s.wave} cleared  +$${bonus}`, "#7bc96f");
  if (s.wave === MAX_WAVE && !s.won40) {
    s.won40 = true;
    s.revealed = true;
    s.joeHere = false;
    s.johnHere = true;
    s.screen = "victory";
    say(s, "The crop stands, and that snake is done. You did good work, farmhand. South Field's still ours. Freeplay's open if you've still got fight in you.", true, 99, "john");
  }
  s.wave += 1;
  applyStoryAfterWave(s);
  s.dirty = true;
  persist(s);
}

function applyStoryAfterWave(s: Sim): void {
  if (s.won40) { s.joeHere = false; s.johnHere = true; return; }
  const next = s.wave;
  s.johnHere = true;
  if (next === 40 && !s.revealed) {
    s.revealed = true;
    s.joeHere = true;
    s.johnHere = true;
    s.cut = { kind: "betrayal", t: 0, phase: 0 };
    s.john = null;
    s.selected = null;
    s.placing = null;
    return;
  }
  s.joeHere = joeHereAt(next, s.revealed, s.won40, false);
  const beat = visitAfter(next - 1);
  if (beat && !s.john?.modal) say(s, beat.text, false, 7.5, beat.who);
}

function actFor(who: "john" | "joe", s: Sim): FarmAct {
  const j = s.john;
  if (who === "joe") {
    if (s.cut?.kind === "betrayal" && s.cut.phase >= 1) return (s.cut.t % 2.6 < 1.0 && s.cut.phase === 1) ? "sip" : "mean";
    if (j?.who === "joe") return (s.time % 2.8 < 1.05) ? "sip" : "talk";
    return "idle";
  }
  if (j?.who === "john") {
    if (j.beat === "johnReact" || s.cut?.phase === 2) return "hat";
    if (j.beat === "intro") return (s.time % 3.2 < 1.15) ? "hat" : "talk";
    return "talk";
  }
  return "idle";
}

function skipCutscene(s: Sim): void {
  if (!s.cut) return;
  if (s.cut.phase === 0) {
    s.cut.phase = 1;
    s.cut.t = 0;
    say(s, JOE_REVEAL, true, 99, "joe", "reveal");
  } else if (s.cut.phase === 1) {
    s.cut.phase = 2;
    s.cut.t = 0;
    say(s, JOHN_ON_REVEAL, true, 99, "john", "johnReact");
  } else {
    s.cut = null;
    s.john = null;
    s.joeHere = joeHereAt(s.wave, s.revealed, s.won40, false);
  }
}

function step(s: Sim, dt: number): void {
  if (s.screen !== "play" || s.over) return;
  if (s.cut) {
    const t = Math.min(0.05, dt);
    s.time += t;
    s.cut.t += t;
    if (s.cut.phase === 0 && s.cut.t >= 2.8) {
      s.cut.phase = 1;
      say(s, JOE_REVEAL, true, 99, "joe", "reveal");
    }
    return;
  }
  const t = Math.min(0.05, dt) * s.speed;
  s.time += t;
  s.shake = Math.max(0, s.shake - t);
  if (s.john && !s.john.modal) {
    s.john.t -= t;
    if (s.john.t <= 0) s.john = null;
  }
  if (s.waving) {
    s.waveT += t;
    const rest: { at: number; kind: EnemyId }[] = [];
    for (const q of s.spawnQ) {
      if (q.at <= s.waveT) spawnEnemy(s, q.kind, 0);
      else rest.push(q);
    }
    s.spawnQ = rest;
  }
  for (const e of s.enemies) updateEnemy(s, e, t);
  s.enemies = s.enemies.filter((e) => e.hp > 0);
  for (const tw of s.towers.slice()) {
    const st = statsFor(tw.kind, tw.a, tw.b);
    if (tw.anim) tw.anim = Math.max(0, (tw.anim || 0) - t);
    if (tw.kind === "sticky") { updateSticky(s, tw, st, t); continue; }
    tw.cd -= t;
    if (tw.cd <= 0) {
      fireTower(s, tw, st);
      if (tw.cd <= 0) tw.cd = st.rof;
    }
  }
  updateShots(s, t);
  updatePlanes(s, t);
  for (const f of s.fx) f.t -= t;
  s.fx = s.fx.filter((f) => f.t > 0);
  for (const f of s.floats) f.t -= t;
  s.floats = s.floats.filter((f) => f.t > 0);
  if (s.waving && s.spawnQ.length === 0 && s.enemies.length === 0 && s.planes.every((p) => p.drops <= 0 || p.x > WW)) {
    s.pendingEnd += t;
    if (s.pendingEnd > 0.4) endWave(s);
  }
}

function isFreeStarter(s: Sim, kind: TowerId): boolean { return !s.freeUsed && kind === "ladybug"; }

function placeTower(s: Sim, kind: TowerId, x: number, y: number): Tower | null {
  if (!canPlaceAt(s, kind, x, y)) return null;
  const def = TDEF[kind];
  const free = isFreeStarter(s, kind);
  if (!free && s.cash < def.cost) return null;
  const st = statsFor(kind, 0, 0);
  const tw: Tower = { id: nid(s), kind, x, y, a: 0, b: 0, tgt: "first", cd: 0.3, charges: st.charges, spent: free ? 0 : def.cost, lastAng: 0, anim: 0 };
  if (free) s.freeUsed = true;
  else s.cash -= def.cost;
  s.towers.push(tw);
  s.selected = tw.id;
  s.placing = null;
  s.dirty = true;
  persist(s);
  return tw;
}

function upgradeTower(s: Sim, tw: Tower, path: 0 | 1): boolean {
  if (!canUpgrade(tw, path)) return false;
  const def = TDEF[tw.kind];
  const tier = path === 0 ? tw.a : tw.b;
  const up = def.paths[path][tier];
  if (s.cash < up.cost) return false;
  s.cash -= up.cost;
  if (path === 0) tw.a += 1; else tw.b += 1;
  tw.spent += up.cost;
  const st = statsFor(tw.kind, tw.a, tw.b);
  if (st.charges && tw.kind === "sticky") tw.charges = st.charges;
  s.dirty = true;
  persist(s);
  return true;
}

function sellTower(s: Sim, tw: Tower): void {
  const r = refundOf(tw);
  s.cash += r;
  addFloat(s, tw.x, tw.y, `+$${r}`, "#e8c050");
  s.towers = s.towers.filter((t) => t.id !== tw.id);
  if (s.selected === tw.id) s.selected = null;
  s.dirty = true;
  persist(s);
}

function freshSim(): Sim {
  const s: Sim = {
    screen: "play", mapId: MAP_ID, wave: 1, waving: false, cash: START_CASH, lives: START_LIVES, maxLives: START_LIVES,
    speed: 1, towers: [], enemies: [], shots: [], planes: [], floats: [], fx: [], spawnQ: [], waveT: 0,
    selected: null, placing: null, hover: null, john: null, intro: true, won40: false, time: 0, uid: 1,
    seen: [], dirty: false, over: false, pendingEnd: 0, shake: 0,
    revealed: false, joeHere: true, johnHere: true, freeUsed: false, cut: null,
  };
  say(s, JOHN_INTRO, true, 99, "john", "intro");
  return s;
}

function applySave(d: SaveData): Sim {
  const s = freshSim();
  s.intro = false;
  s.john = null;
  s.wave = Math.max(1, d.wave | 0);
  s.cash = Math.max(0, d.cash);
  s.lives = clamp(d.lives, 0, 999);
  s.maxLives = d.maxLives || START_LIVES;
  s.won40 = !!d.won40;
  s.revealed = !!d.revealed || s.won40 || s.wave >= 40;
  s.joeHere = joeHereAt(s.wave, s.revealed, s.won40, false);
  s.johnHere = true;
  s.mapId = d.mapId || MAP_ID;
  s.seen = Array.isArray(d.seen) ? d.seen.filter((k) => EIDS.indexOf(k) >= 0) : [];
  s.towers = [];
  for (const t of d.towers) {
    if (TIDS.indexOf(t.kind) < 0) continue;
    const st = statsFor(t.kind, t.a || 0, t.b || 0);
    s.towers.push({
      id: nid(s), kind: t.kind, x: t.x, y: t.y, a: clamp(t.a || 0, 0, 4), b: clamp(t.b || 0, 0, 4),
      tgt: TARGETS.indexOf(t.tgt) >= 0 ? t.tgt : "first", cd: 0.2, charges: t.charges ?? st.charges, spent: typeof t.spent === "number" ? Math.max(0, t.spent) : TDEF[t.kind].cost, lastAng: 0, anim: 0,
    });
  }
  if (s.lives <= 0) { s.lives = 1; }
  s.cut = null;
  if (d.freeUsed !== undefined) s.freeUsed = !!d.freeUsed;
  else s.freeUsed = d.towers.length > 0 || d.cash > 0 || d.wave > 1;
  s.screen = "play";
  return s;
}

/* ---------- draw frame ---------- */
function drawRange(c: CanvasRenderingContext2D, x: number, y: number, r: number, ok: boolean): void {
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = ok ? "rgba(80,200,80,0.14)" : "rgba(200,50,40,0.16)";
  c.fill();
  c.strokeStyle = ok ? "rgba(80,220,90,0.85)" : "rgba(230,70,60,0.85)";
  c.lineWidth = 2; c.stroke();
}

function drawFrame(c: CanvasRenderingContext2D, s: Sim, cssW: number, cssH: number, dpr: number, fit: "contain" | "cover" = "contain"): { scale: number; ox: number; oy: number } {
  ensureSprites();
  const scale = (fit === "cover" ? Math.max(cssW / WW, cssH / WH) : Math.min(cssW / WW, cssH / WH));
  const ox = (cssW - WW * scale) / 2;
  const oy = (cssH - WH * scale) / 2;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, cssW * dpr, cssH * dpr);
  c.fillStyle = "#1c140c";
  c.fillRect(0, 0, cssW * dpr, cssH * dpr);
  const shx = (s.shake ? (Math.random() - 0.5) * 10 * s.shake : 0);
  const shy = (s.shake ? (Math.random() - 0.5) * 8 * s.shake : 0);
  c.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (ox + shx), dpr * (oy + shy));
  c.imageSmoothingEnabled = false;
  if (SPR.farm) c.drawImage(SPR.farm, 0, 0);
  // a handful of live swaying tufts (cheap); the field itself is prerendered
  drawCropTuft(c, 200, 330, s.time * 2.2, "#4cd05a");
  drawCropTuft(c, 360, 480, s.time * 2.2 + 1, "#2f9a32");
  drawCropTuft(c, 700, 300, s.time * 2.2 + 2, "#7ae048");
  drawCropTuft(c, 820, 620, s.time * 2.2 + 0.6, "#4cd05a");
  drawCropTuft(c, 140, 700, s.time * 2.2 + 1.4, "#2f9a32");
  drawWindmillBlades(c, s.time);
  drawPondShimmer(c, s.time);
  drawClouds(c, s.time);
  if (s.cut && s.cut.kind === "betrayal") drawBetrayalSwarm(c, s.cut.t + (s.cut.phase > 0 ? 2.8 : 0));
  // plant
  const wilt = 1 - clamp(s.lives / Math.max(1, s.maxLives), 0, 1);
  const pfr = SPR.plant[clamp(Math.floor(wilt * 4.999), 0, 4)];
  c.save();
  c.translate(PLANT.x, PLANT.y);
  c.rotate(Math.sin(s.time * 1.6) * 0.14 * (1 - wilt * 0.45));
  if (pfr) c.drawImage(pfr, -70, -70);
  else drawPlant(c, wilt, s.time);
  c.restore();
  // hired help
  if (s.johnHere && !(s.revealed && s.waving && s.wave >= 40)) {
    c.save(); c.translate(JOHN_SPOT.x, JOHN_SPOT.y); drawFarmhand(c, "john", s.time, actFor("john", s)); c.restore();
  }
  if (s.joeHere && (!s.waving || !!s.cut)) {
    c.save(); c.translate(JOE_SPOT.x, JOE_SPOT.y); drawFarmhand(c, "joe", s.time + 1, actFor("joe", s)); c.restore();
  } else if (!s.revealed && !s.won40 && joeAwayFor(s.wave)) {
    c.fillStyle = "rgba(90,70,40,0.35)"; ellipse(c, JOE_SPOT.x, JOE_SPOT.y + 14, 14, 5); c.fill();
  }
  for (const tw of s.towers) {
    if (tw.kind !== "uv") continue;
    const st = statsFor(tw.kind, tw.a, tw.b);
    c.beginPath(); c.arc(tw.x, tw.y, st.range, 0, Math.PI * 2);
    c.fillStyle = "rgba(140,120,255,0.05)"; c.fill();
  }
  for (const tw of s.towers) {
    c.save();
    const bob = Math.sin(s.time * 3.2 + tw.x * 0.04) * 1.4;
    const punch = tw.anim || 0;
    c.translate(tw.x, tw.y + bob);
    if (punch > 0) c.scale(1 + punch * 0.12, 1 - punch * 0.08);
    drawTowerSprite(c, tw.kind, tw.a, tw.b, s.time, punch, tw.lastAng);
    c.restore();
    if (s.selected === tw.id) drawRange(c, tw.x, tw.y, statsFor(tw.kind, tw.a, tw.b).range, true);
  }
  if (s.placing && s.hover) {
    const st = statsFor(s.placing, 0, 0);
    const ok = canPlaceAt(s, s.placing, s.hover.x, s.hover.y) && (isFreeStarter(s, s.placing) || s.cash >= TDEF[s.placing].cost);
    drawRange(c, s.hover.x, s.hover.y, st.range, ok);
    c.globalAlpha = ok ? 0.85 : 0.45;
    c.save(); c.translate(s.hover.x, s.hover.y);
    drawTowerSprite(c, s.placing, 0, 0, s.time, 0, 0);
    c.restore();
    c.globalAlpha = 1;
  }
  for (const pass of [false, true]) {
  for (const e of s.enemies) {
    if (e.flying !== pass) continue;
    if (e.camo) c.globalAlpha = 0.55;
    c.save();
    c.translate(e.x, e.y);
    c.rotate(e.ang);
    if (e.flying) c.translate(0, Math.sin(s.time * 10 + e.id) * -3);
    const frames = SPR.enemy[e.kind];
    const fr = frames ? frames[Math.floor(s.time * 8 + e.id) % frames.length] : null;
    if (fr) c.drawImage(fr, -36, -36);
    else drawEnemySprite(c, e.kind, s.time + e.id * 0.2, e.hitT > 0);
    c.restore();
    if (e.hitT > 0) { c.fillStyle = "rgba(255,255,255,0.4)"; ellipse(c, e.x, e.y, e.r + 3, e.r + 2); c.fill(); }
    c.globalAlpha = 1;
    if (e.hp < e.max || e.boss) {
      const w = Math.max(16, e.r * 2.2), h = e.boss ? 5 : 3;
      c.fillStyle = "rgba(0,0,0,0.55)"; c.fillRect(e.x - w / 2, e.y - e.r - 10, w, h);
      c.fillStyle = e.boss ? "#e8a03c" : (e.hp / e.max > 0.4 ? "#6bc96f" : "#e85d4c");
      c.fillRect(e.x - w / 2, e.y - e.r - 10, w * clamp(e.hp / e.max, 0, 1), h);
    }
  }
  }
  for (const sh of s.shots) {
    if (sh.kind === "beam") {
      const tgt = s.enemies.find((e) => e.id === sh.target);
      if (tgt) {
        c.strokeStyle = sh.color; c.lineWidth = 2; c.globalAlpha = 0.8;
        c.beginPath(); c.moveTo(sh.x, sh.y); c.lineTo(tgt.x, tgt.y); c.stroke();
        c.globalAlpha = 1;
      }
    } else if (sh.kind === "bullet") {
      c.fillStyle = sh.color; c.beginPath(); c.arc(sh.x, sh.y, sh.r, 0, Math.PI * 2); c.fill();
    }
  }
  for (const p of s.planes) drawPlane(c, p);
  for (const f of s.fx) {
    const k = 1 - f.t / f.max;
    c.globalAlpha = 1 - k;
    if (f.kind === "puff") {
      c.fillStyle = f.c; ellipse(c, f.x, f.y, f.r * (0.6 + k), f.r * (0.4 + k * 0.8)); c.fill();
    } else if (f.kind === "flash") {
      c.fillStyle = f.c; ellipse(c, f.x, f.y, f.r * (1 - k * 0.5), f.r * 0.6); c.fill();
    } else if (f.kind === "ring") {
      c.strokeStyle = f.c; c.lineWidth = 2; c.beginPath(); c.arc(f.x, f.y, f.r * (0.4 + k), 0, Math.PI * 2); c.stroke();
    } else if (f.kind === "slash") {
      c.strokeStyle = f.c; c.lineWidth = 3; c.beginPath();
      c.arc(f.x, f.y, f.r, (f.ang ?? 0) - 0.8, (f.ang ?? 0) + 0.8); c.stroke();
    } else if (f.kind === "splat") {
      c.fillStyle = f.c;
      c.beginPath(); c.arc(f.x, f.y, f.r * (0.5 + k * 0.6), 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(f.x + f.r * k * 0.6, f.y - f.r * k * 0.3, 4, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(f.x - f.r * k * 0.5, f.y + f.r * k * 0.2, 3, 0, Math.PI * 2); c.fill();
    } else if (f.kind === "spray") {
      const ang = f.ang ?? 0;
      c.save(); c.translate(f.x, f.y); c.rotate(ang);
      c.fillStyle = f.c; c.globalAlpha = (1 - k) * 0.5;
      ellipse(c, 12 + k * 20, 0, 14 + k * 16, 8 + k * 8); c.fill();
      c.restore();
    } else if (f.kind === "bug") {
      const ang = f.ang ?? 0;
      const d = k * 28;
      disc(c, f.x + Math.cos(ang) * d, f.y + Math.sin(ang) * d, 5, "#e23a2c", 2);
    } else {
      c.fillStyle = f.c; c.fillRect(f.x - 1, f.y - 1, 2, 2);
    }
    c.globalAlpha = 1;
  }
  for (const f of s.floats) {
    const k = 1 - f.t / f.max;
    c.globalAlpha = 1 - k;
    const bang = f.text.charCodeAt(f.text.length - 1) === 33;
    c.fillStyle = f.c; c.font = bang ? "bold 18px Georgia, serif" : "bold 13px Georgia, serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.strokeStyle = "rgba(0,0,0,0.55)"; c.lineWidth = 3;
    c.strokeText(f.text, f.x, f.y - k * 22);
    c.fillText(f.text, f.x, f.y - k * 22);
    c.globalAlpha = 1;
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  return { scale, ox, oy };
}

function worldFromEvent(el: HTMLCanvasElement, ev: { clientX: number; clientY: number }, view: { scale: number; ox: number; oy: number }): Pt {
  const r = el.getBoundingClientRect();
  const x = (ev.clientX - r.left - view.ox) / view.scale;
  const y = (ev.clientY - r.top - view.oy) / view.scale;
  return { x, y };
}

/* ---------- React app ---------- */
type Hud = {
  screen: Screen; cash: number; lives: number; maxLives: number; wave: number; waving: boolean; speed: number;
  placing: TowerId | null; selected: number | null; john: JohnMsg | null; intro: boolean; won40: boolean;
  over: boolean; toast: string; exitAsk: boolean; saveOpen: boolean; confirmNew: boolean; hasSave: boolean;
  codeMsg: string; showingHelp: boolean; freeUsed: boolean; cut: Cutscene | null;
};

const INIT_HUD: Hud = {
  screen: "title", cash: 0, lives: 0, maxLives: START_LIVES, wave: 1, waving: false, speed: 1,
  placing: null, selected: null, john: null, intro: false, won40: false, over: false, toast: "",
  exitAsk: false, saveOpen: false, confirmNew: false, hasSave: false, codeMsg: "", showingHelp: false, freeUsed: false, cut: null,
};

function snapHud(s: Sim | null, extra: Partial<Hud> = {}): Hud {
  const base: Hud = { ...INIT_HUD, hasSave: !!loadSaved(), ...extra };
  if (!s) return { ...base, screen: extra.screen ?? "title", showingHelp: extra.showingHelp === true || extra.screen === "help" };
  return {
    ...base,
    screen: extra.showingHelp ? "help" : s.screen, cash: s.cash, lives: s.lives, maxLives: s.maxLives, wave: s.wave, waving: s.waving,
    speed: s.speed, placing: s.placing, selected: s.selected, john: s.john, intro: s.intro, won40: s.won40, over: s.over,
    showingHelp: extra.showingHelp === true, freeUsed: s.freeUsed, cut: s.cut,
  };
}

function copyCode(text: string, done: (ok: boolean) => void): void {
  if (!text) { done(false); return; }
  let reported = false;
  const report = (ok: boolean): void => { if (reported) return; reported = true; done(ok); };
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.left = "-9999px";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) { report(true); return; }
  } catch { /* fall through */ }
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).then(() => report(true), () => report(false));
      return;
    }
  } catch { /* ignore */ }
  report(false);
}

let LEAVING = false;
let TRAP_OK = false;
function trapBack(): void { try { window.history.pushState({ cjcdTrap: Date.now() }, ""); TRAP_OK = true; } catch { TRAP_OK = false; } }

export default function CowboyJohnsCropDefense() {
  const theme = useGrokTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const johnCv = useRef<HTMLCanvasElement>(null);
  const sim = useRef<Sim | null>(null);
  const view = useRef({ scale: 1, ox: 0, oy: 0 });
  const [hud, setHud] = useState<Hud>(() => ({ ...INIT_HUD, hasSave: !!loadSaved() }));
  const [vp, setVp] = useState({ w: typeof window !== "undefined" ? window.innerWidth : 390, h: typeof window !== "undefined" ? window.innerHeight : 844 });
  const [paste, setPaste] = useState("");
  const hudRef = useRef(hud);
  hudRef.current = hud;
  const bump = useCallback((extra: Partial<Hud> = {}): void => {
    setHud((h) => snapHud(sim.current, { ...h, toast: extra.toast ?? h.toast, exitAsk: extra.exitAsk ?? h.exitAsk, saveOpen: extra.saveOpen ?? h.saveOpen, confirmNew: extra.confirmNew ?? h.confirmNew, codeMsg: extra.codeMsg ?? h.codeMsg, showingHelp: extra.showingHelp ?? h.showingHelp, hasSave: !!loadSaved(), ...extra }));
  }, []);
  const toast = useCallback((t: string): void => { bump({ toast: t }); window.setTimeout(() => { setHud((h) => h.toast === t ? { ...h, toast: "" } : h); }, 2400); }, [bump]);

  const flush = useCallback((): void => { const s = sim.current; if (s && s.screen !== "defeat" && s.screen !== "title") persist(s); }, []);

  useEffect(() => {
    ensureSprites();
    const onRs = (): void => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onRs);
    window.addEventListener("orientationchange", onRs);
    const onVis = (): void => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", flush);
    const onBU = (e: BeforeUnloadEvent): void => { flush(); if (LEAVING) return; try { e.preventDefault(); e.returnValue = ""; } catch { /* ignore */ } };
    window.addEventListener("beforeunload", onBU);
    const onPop = (): void => {
      if (LEAVING) return;
      flush();
      trapBack();
      const s = sim.current;
      if (s && (s.screen === "play" || s.screen === "paused" || s.screen === "victory")) {
        if (s.screen === "play") s.screen = "paused";
        bump({ exitAsk: true });
      } else {
        bump({ exitAsk: true });
      }
    };
    window.addEventListener("popstate", onPop);
    trapBack();
    return () => {
      window.removeEventListener("resize", onRs);
      window.removeEventListener("orientationchange", onRs);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", onBU);
      window.removeEventListener("popstate", onPop);
    };
  }, [bump, flush]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number): void => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = sim.current;
      const cv = canvasRef.current;
      if (s && (s.screen === "play" || s.screen === "paused" || s.screen === "victory" || s.screen === "defeat")) {
        if (s.screen === "play") step(s, dt);
        if (cv) {
          const r = cv.getBoundingClientRect();
          const dpr = Math.min(1.5, window.devicePixelRatio || 1);
          const w = Math.max(1, r.width), h = Math.max(1, r.height);
          if (cv.width !== Math.floor(w * dpr) || cv.height !== Math.floor(h * dpr)) { cv.width = Math.floor(w * dpr); cv.height = Math.floor(h * dpr); }
          const ctx = cv.getContext("2d");
          if (ctx) view.current = drawFrame(ctx, s, w, h, dpr);
        }
        const h = hudRef.current;
        const need = h.cash !== s.cash || h.lives !== s.lives || h.wave !== s.wave || h.waving !== s.waving || h.screen !== s.screen || h.selected !== s.selected || h.placing !== s.placing || (h.john?.text !== s.john?.text) || h.speed !== s.speed || h.freeUsed !== s.freeUsed || (h.cut?.phase !== s.cut?.phase);
        if (need) {
          const urgent = h.screen !== s.screen || h.selected !== s.selected || h.placing !== s.placing || h.waving !== s.waving || (h.john?.text !== s.john?.text);
          const nowB = now;
          if (urgent || nowB - ((window as unknown as { __cjcdBump?: number }).__cjcdBump ?? 0) > 120) {
            (window as unknown as { __cjcdBump?: number }).__cjcdBump = nowB;
            bump();
          }
        }
      } else if (cv) {
        const r = cv.getBoundingClientRect();
        const dpr = Math.min(1.5, window.devicePixelRatio || 1);
        const w = Math.max(1, r.width), h = Math.max(1, r.height);
        if (cv.width !== Math.floor(w * dpr) || cv.height !== Math.floor(h * dpr)) { cv.width = Math.floor(w * dpr); cv.height = Math.floor(h * dpr); }
        const ctx = cv.getContext("2d");
        if (ctx) {
          ensureSprites();
          const dummy = freshSim(); dummy.john = null; dummy.intro = false; dummy.screen = "play";
          view.current = drawFrame(ctx, dummy, w, h, dpr, "cover");
        }
      }
      const jc = johnCv.current;
      if (jc) {
        const dpr = Math.min(1.5, window.devicePixelRatio || 1);
        const r = jc.getBoundingClientRect();
        const cw = Math.max(1, r.width), ch = Math.max(1, r.height);
        if (jc.width !== Math.floor(cw * dpr) || jc.height !== Math.floor(ch * dpr)) { jc.width = Math.floor(cw * dpr); jc.height = Math.floor(ch * dpr); }
        const jx = jc.getContext("2d");
        if (jx) {
          jx.setTransform(dpr, 0, 0, dpr, 0, 0); jx.clearRect(0, 0, cw, ch);
          const s0 = sim.current;
          const who = s0?.john?.who ?? "john";
          const beat = s0?.john?.beat;
          const time = s0 ? s0.time : now / 1000;
          const talk = !!s0?.john && s0.john.who === who && who !== "narrator";
          if (who === "joe") {
            const mean = beat === "reveal" || (s0?.revealed === true && (s0.cut?.phase ?? 0) >= 1);
            const sip = talk && ((time % 2.8) < 1.05);
            drawJoePortrait(jx, cw, ch, mean, time, talk, sip);
          } else {
            const hat = talk && (beat === "intro" || beat === "johnReact" || (s0?.cut?.phase === 2) || (time % 3.2) < 1.15);
            drawJohnPortrait(jx, cw, ch, time, talk, hat);
          }
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [bump]);

  const startNew = useCallback((): void => {
    const s = freshSim();
    sim.current = s;
    bump({ confirmNew: false, exitAsk: false, saveOpen: false });
  }, [bump]);

  const resume = useCallback((): void => {
    const d = loadSaved();
    if (!d) { toast("No farm saved yet."); return; }
    sim.current = applySave(d);
    bump({ exitAsk: false, saveOpen: false });
    toast("Resumed your farm.");
  }, [bump, toast]);

  const goTitle = useCallback((): void => {
    flush();
    sim.current = null;
    bump({ screen: "title", exitAsk: false, saveOpen: false, confirmNew: false });
    setHud((h) => ({ ...INIT_HUD, hasSave: !!loadSaved(), toast: h.toast }));
  }, [flush, bump]);

  const leaveNow = useCallback((): void => {
    LEAVING = true;
    flush();
    try { window.history.go(TRAP_OK ? -2 : -1); } catch { /* ignore */ }
    window.setTimeout(() => { LEAVING = false; }, 1500);
  }, [flush]);

  const onCanvasPtr = useCallback((ev: { clientX: number; clientY: number; type: string; preventDefault: () => void }, kind: "down" | "move" | "up"): void => {
    const s = sim.current;
    const el = canvasRef.current;
    if (!s || !el || s.screen === "title" || s.screen === "help") return;
    if (s.screen === "paused" || s.screen === "victory" || s.screen === "defeat") return;
    if (s.john?.modal) return;
    ev.preventDefault();
    const p = worldFromEvent(el, ev, view.current);
    if (kind === "move" || kind === "down") s.hover = p;
    if (s.cut) { if (kind === "up") { skipCutscene(s); bump(); } return; }
    if (kind !== "up") { if (kind === "move" && s.placing) bump(); return; }
    if (s.placing) {
      const tw = placeTower(s, s.placing, p.x, p.y);
      if (!tw) toast(s.cash < TDEF[s.placing].cost ? "Not enough cash." : "Can't plant that there.");
      bump();
      return;
    }
    // select tower?
    let best: Tower | null = null, bd = 28;
    for (const tw of s.towers) {
      const dd = dist(p.x, p.y, tw.x, tw.y);
      if (dd < bd) { bd = dd; best = tw; }
    }
    s.selected = best ? best.id : null;
    bump();
  }, [bump, toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const h = hudRef.current;
      if (h.exitAsk) {
        if (e.key === "Escape") { bump({ exitAsk: false }); e.preventDefault(); }
        return;
      }
      if (h.saveOpen && e.key === "Escape") { bump({ saveOpen: false }); return; }
      const s = sim.current;
      if (e.key === "Escape") {
        e.preventDefault();
        if (!s || h.screen === "title" || h.screen === "help") { bump({ exitAsk: true }); return; }
        if (s.cut) { skipCutscene(s); bump(); return; }
        if (s.placing) { s.placing = null; bump(); return; }
        if (s.selected !== null) { s.selected = null; bump(); return; }
        if (s.john?.modal) { s.john = null; s.intro = false; bump(); return; }
        s.screen = s.screen === "paused" ? "play" : (s.screen === "play" ? "paused" : s.screen);
        bump();
        return;
      }
      if (!s || s.screen !== "play") {
        if ((e.key === " " || e.key === "Enter") && s && s.screen === "victory") { s.screen = "play"; bump(); e.preventDefault(); }
        return;
      }
      if (s.cut) {
        if (e.key === " " || e.key === "Enter") { skipCutscene(s); bump(); e.preventDefault(); }
        return;
      }
      if (s.john?.modal) {
        if (e.key === " " || e.key === "Enter") { s.john = null; s.intro = false; bump(); e.preventDefault(); }
        return;
      }
      if (e.key === " " || e.code === "Space") { e.preventDefault(); if (!s.waving) { startWave(s); bump(); } return; }
      if (e.key === "f" || e.key === "F") { s.speed = s.speed === 1 ? 2 : 1; bump(); return; }
      if (e.key === "x" || e.key === "X" || e.key === "Sell" || e.key === "s" && e.shiftKey) {
        const tw = s.towers.find((t) => t.id === s.selected);
        if (tw) { sellTower(s, tw); bump(); }
        return;
      }
      if (e.key === "q" || e.key === "Q") {
        const tw = s.towers.find((t) => t.id === s.selected);
        if (tw) { upgradeTower(s, tw, 0); bump(); }
        return;
      }
      if (e.key === "e" || e.key === "E") {
        const tw = s.towers.find((t) => t.id === s.selected);
        if (tw) { upgradeTower(s, tw, 1); bump(); }
        return;
      }
      if (e.key === "t" || e.key === "T") {
        const tw = s.towers.find((t) => t.id === s.selected);
        if (tw) { tw.tgt = TARGETS[(TARGETS.indexOf(tw.tgt) + 1) % TARGETS.length]; bump(); }
        return;
      }
      const num = e.key;
      const idx = "12345678".indexOf(num);
      if (idx >= 0) {
        const id = TIDS[idx];
        s.placing = s.placing === id ? null : id;
        s.selected = null;
        bump();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bump]);

  useEffect(() => {
    type Api = {
      get: () => Record<string, unknown>;
      cash: (n: number) => void;
      lives: (n: number) => void;
      place: (id: string, x: number, y: number) => string;
      startWave: () => boolean;
      speed: (n: number) => void;
      leak: (n?: number) => void;
      save: () => string;
      load: (code: string) => string;
      skipIntro: () => void;
      endWave: () => void;
      sellSelected: () => void;
      upgrade: (path: 0 | 1) => boolean;
      selectNear: (x: number, y: number) => boolean;
      spawn: (id: string, n: number, dist0?: number) => number;
      setWave: (n: number) => void;
      skipCut: () => void;
      playBetrayal: (phase?: number) => void;
    };
    const api: Api = {
      get: () => {
        const s = sim.current;
        if (!s) return { screen: hudRef.current.screen, hasSave: !!loadSaved() };
        return { screen: s.screen, cash: s.cash, lives: s.lives, wave: s.wave, waving: s.waving, towers: s.towers.length, enemies: s.enemies.length, speed: s.speed, selected: s.selected, placing: s.placing, won40: s.won40, intro: !!s.john?.modal, freeUsed: s.freeUsed, cut: s.cut ? s.cut.phase : null, revealed: s.revealed, who: s.john?.who ?? null, beat: s.john?.beat ?? null };
      },
      cash: (n: number) => { const s = sim.current; if (s) { s.cash = n; bump(); } },
      lives: (n: number) => { const s = sim.current; if (s) { s.lives = n; bump(); } },
      place: (id: string, x: number, y: number) => {
        const s = sim.current;
        if (!s) return "no sim";
        if (TIDS.indexOf(id as TowerId) < 0) return "bad id";
        const tw = placeTower(s, id as TowerId, x, y);
        bump();
        return tw ? "ok" : "fail";
      },
      startWave: () => { const s = sim.current; if (!s) return false; const ok = startWave(s); bump(); return ok; },
      speed: (n: number) => { const s = sim.current; if (s) { s.speed = Math.max(0.25, n); bump(); } },
      leak: (n?: number) => { const s = sim.current; if (!s) return; const e = spawnEnemy(s, "mite", PLEN - 4); if (n && n > 1) e.leak = n; bump(); },
      save: () => { const s = sim.current; if (!s) return ""; persist(s); return exportCodeFrom(simToSave(s)); },
      load: (code: string) => { const d = parseCode(code); if (!d) return "bad"; sim.current = applySave(d); bump(); return "ok"; },
      skipIntro: () => { const s = sim.current; if (s) { s.john = null; s.intro = false; bump(); } },
      setWave: (n: number) => { const s = sim.current; if (!s) return; s.wave = Math.max(1, n | 0); s.waving = false; s.enemies = []; s.spawnQ = []; applyStoryAfterWave(s); bump(); },
      endWave: () => { const s = sim.current; if (!s) return; s.enemies = []; s.spawnQ = []; s.planes = []; if (s.waving) endWave(s); bump(); },
      sellSelected: () => { const s = sim.current; const tw = s?.towers.find((t) => t.id === s.selected); if (s && tw) { sellTower(s, tw); bump(); } },
      upgrade: (path: 0 | 1) => { const s = sim.current; const tw = s?.towers.find((t) => t.id === s.selected); if (!s || !tw) return false; const ok = upgradeTower(s, tw, path); bump(); return ok; },
      spawn: (id: string, n: number, dist0?: number) => {
        const s = sim.current; if (!s) return 0;
        if (EIDS.indexOf(id as EnemyId) < 0) return 0;
        const step = PLEN / Math.max(1, n + 1);
        for (let i = 0; i < n; i++) spawnEnemy(s, id as EnemyId, dist0 ?? step * (i + 1));
        bump();
        return n;
      },
      selectNear: (x: number, y: number) => {
        const s = sim.current; if (!s) return false;
        let best: Tower | null = null, bd = 40;
        for (const tw of s.towers) { const dd = dist(x, y, tw.x, tw.y); if (dd < bd) { bd = dd; best = tw; } }
        s.selected = best ? best.id : null; bump(); return !!best;
      },
      skipCut: () => { const s = sim.current; if (s) { skipCutscene(s); bump(); } },
      playBetrayal: (phase?: number) => {
        const s = sim.current; if (!s) return;
        s.revealed = true; s.wave = 40; s.waving = false; s.intro = false; s.enemies = []; s.spawnQ = [];
        s.joeHere = true; s.johnHere = true; s.selected = null; s.placing = null;
        const ph = (phase === 1 || phase === 2) ? phase : 0;
        s.cut = { kind: "betrayal", t: ph === 0 ? 1.2 : 0.6, phase: ph };
        if (ph === 1) say(s, JOE_REVEAL, true, 99, "joe", "reveal");
        else if (ph === 2) say(s, JOHN_ON_REVEAL, true, 99, "john", "johnReact");
        else s.john = null;
        bump();
      },
    };
    (window as unknown as { __CJCD: Api }).__CJCD = api;
    return () => { try { delete (window as unknown as { __CJCD?: Api }).__CJCD; } catch { /* ignore */ } };
  }, [bump]);

  const land = vp.w > vp.h;
  const padTop = "max(8px, env(safe-area-inset-top))";
  const padBot = "max(8px, env(safe-area-inset-bottom))";
  const padL = "max(8px, env(safe-area-inset-left))";
  const padR = "max(8px, env(safe-area-inset-right))";
  const t = theme;
  const sel = sim.current && hud.selected !== null ? sim.current.towers.find((tw) => tw.id === hud.selected) : undefined;

  const btn = (label: string, onClick: () => void, opts: { tone?: "pri" | "danger" | "ghost" | "ok"; grow?: boolean; test?: string; disabled?: boolean; small?: boolean } = {}): JSX.Element => (
    <button
      type="button"
      data-testid={opts.test}
      disabled={opts.disabled}
      onClick={onClick}
      style={{
        flex: opts.grow ? "1 1 120px" : undefined,
        minHeight: opts.small ? 36 : 48,
        padding: opts.small ? "6px 10px" : "10px 14px",
        borderRadius: 12,
        border: `1px solid ${opts.tone === "pri" ? t.border.focus : t.border.default}`,
        background: opts.disabled ? t.fill.secondary : opts.tone === "pri" ? t.fill.primary : opts.tone === "danger" ? t.fill.dangerSubtle : opts.tone === "ok" ? t.fill.successSubtle : t.fill.secondary,
        color: opts.disabled ? t.text.tertiary : opts.tone === "pri" ? t.text.onPrimary : opts.tone === "danger" ? t.text.danger : opts.tone === "ok" ? t.text.success : t.text.primary,
        fontFamily: "inherit", fontSize: opts.small ? 13 : 15, fontWeight: 700, cursor: opts.disabled ? "default" : "pointer",
        opacity: opts.disabled ? 0.55 : 1, WebkitTapHighlightColor: "transparent",
      }}
    >{label}</button>
  );

  const root: CSSProperties = {
    height: "100dvh",
    background: t.bg.base, color: t.text.primary, fontFamily: t.font.family,
    display: "flex", flexDirection: "column", overflow: "hidden",
    paddingTop: padTop, paddingBottom: padBot, paddingLeft: padL, paddingRight: padR,
    boxSizing: "border-box", userSelect: "none",
  } as CSSProperties;

  const shopBtn = (d: TowerDef): JSX.Element => {
    const isFree = !hud.freeUsed && d.id === "ladybug";
    const afford = isFree || hud.cash >= d.cost;
    const on = hud.placing === d.id;
    return (
      <button type="button" key={d.id} data-testid={`shop-${d.id}`} onClick={() => {
        const s = sim.current; if (!s || s.screen !== "play") return;
        s.placing = s.placing === d.id ? null : d.id; s.selected = null; bump();
      }} style={{
        width: land ? "100%" : 76, minWidth: 70, flex: land ? "0 0 auto" : "0 0 76px",
        borderRadius: 12, border: `2px solid ${on ? t.border.focus : t.border.default}`,
        background: on ? t.fill.accentSubtle : t.fill.secondary, color: t.text.primary,
        padding: 6, cursor: "pointer", textAlign: "center", fontFamily: "inherit",
        opacity: afford ? 1 : 0.55,
      }}>
        <div style={{ height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ShopIcon kind={d.id} />
        </div>
        <div style={{ fontSize: 10, fontWeight: 800, lineHeight: 1.15, marginTop: 2 }}>{d.short}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: isFree ? t.text.success : afford ? t.text.warning : t.text.danger }}>{isFree ? "FREE" : `$${d.cost}`}</div>
        <div style={{ fontSize: 9, color: t.text.tertiary }}>{d.key}</div>
      </button>
    );
  };

  const playHud = hud.screen !== "title" && hud.screen !== "help";

  const topBar = playHud ? (
    <div data-testid="hud" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
      <div style={{ fontWeight: 800, fontSize: 16, color: t.text.warning }} data-testid="cash">${hud.cash}</div>
      <div style={{ fontWeight: 800, fontSize: 16, color: hud.lives < 30 ? t.text.danger : t.text.success }} data-testid="lives">🌿 {hud.lives}/{hud.maxLives}</div>
      <div style={{ fontWeight: 700, fontSize: 14, color: t.text.secondary, flex: 1 }} data-testid="wave">Wave {hud.wave}{hud.wave > MAX_WAVE ? " · Freeplay" : ""}{hud.waving ? " · INCOMING" : ""}</div>
      {btn(hud.speed === 1 ? "2×" : "1×", () => { const s = sim.current; if (s) { s.speed = s.speed === 1 ? 2 : 1; bump(); } }, { test: "speed", small: true })}
      {btn(hud.waving ? "Wave running" : "Start Wave", () => { const s = sim.current; if (s && s.screen === "play") { startWave(s); bump(); } }, { tone: "pri", test: "start-wave", disabled: hud.waving || hud.screen !== "play" || !!hud.cut, small: true })}
      {btn("Menu", () => { const s = sim.current; if (s && (s.screen === "play" || s.screen === "paused")) { s.screen = s.screen === "paused" ? "play" : "paused"; bump(); } }, { test: "menu", small: true })}
    </div>
  ) : null;

  const selPanel = sel && playHud && hud.screen === "play" && !hud.cut ? (
    <div data-testid="upgrade-panel" style={{ background: t.bg.elevated, border: `1px solid ${t.border.default}`, borderRadius: 14, padding: 10, marginTop: 6 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 800, flex: 1, fontSize: 14 }}>{TDEF[sel.kind].name}  {sel.a}/{sel.b}</div>
        {btn(`Target: ${sel.tgt}`, () => { sel.tgt = TARGETS[(TARGETS.indexOf(sel.tgt) + 1) % TARGETS.length]; bump(); }, { small: true, test: "targeting" })}
        {btn(`Sell $${refundOf(sel)}`, () => { sellTower(sim.current as Sim, sel); bump(); }, { tone: "danger", small: true, test: "sell" })}
      </div>
      {sel.kind === "sticky" && <div style={{ fontSize: 12, color: t.text.secondary, marginBottom: 6 }}>{statsFor(sel.kind, sel.a, sel.b).permanent ? "Endless sap — this trap stays." : `Charges left: ${sel.charges}`}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {([0, 1] as const).map((path) => {
          const def = TDEF[sel.kind];
          const tier = path === 0 ? sel.a : sel.b;
          const locked = !canUpgrade(sel, path);
          const next = tier < 4 ? def.paths[path][tier] : null;
          return (
            <div key={path} style={{ background: t.bg.subtle, borderRadius: 10, padding: 8, border: `1px solid ${t.border.default}` }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: t.text.accent, marginBottom: 4 }}>Path {path === 0 ? "A" : "B"} · {tier}/4</div>
              {next && !locked ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{next.name}</div>
                  <div style={{ fontSize: 11, color: t.text.secondary, margin: "4px 0 6px" }}>{next.desc}</div>
                  {btn(`Upgrade $${next.cost}`, () => { if (sim.current) upgradeTower(sim.current, sel, path); bump(); }, { tone: hud.cash >= next.cost ? "pri" : "ghost", small: true, test: `upg-${path}`, disabled: hud.cash < next.cost })}
                </>
              ) : (
                <div style={{ fontSize: 12, color: t.text.tertiary }}>{tier >= 4 ? "MAX" : "Locked — the other path is past tier 2."}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  ) : null;

  const shop = playHud && hud.screen === "play" && !hud.cut ? (
    <div data-testid="shop" style={{ display: "flex", flexDirection: land ? "column" : "row", gap: 6, overflowX: land ? "hidden" : "auto", overflowY: land ? "auto" : "hidden", maxHeight: land ? "100%" : undefined, paddingBottom: 2 }}>
      {TOWERS.map(shopBtn)}
    </div>
  ) : null;

  const johnBanner = hud.john && !hud.john.modal && playHud && !hud.cut ? (
    <div data-testid="john-tip" onClick={() => { const s = sim.current; if (s) s.john = null; bump(); }} style={{ display: "flex", gap: 8, alignItems: "center", background: t.bg.elevated, border: `1px solid ${t.border.default}`, borderRadius: 12, padding: 8, marginTop: 6, cursor: "pointer" }}>
      <canvas ref={johnCv} width={80} height={90} style={{ width: 48, height: 54, borderRadius: 8, flex: "0 0 auto", background: t.bg.subtle }} />
      <div style={{ fontSize: 13, lineHeight: 1.35, flex: 1, fontStyle: hud.john.who === "narrator" ? "italic" : "normal" }}>{hud.john.who === "narrator" ? null : <b style={{ color: hud.john.who === "joe" ? "#c4d080" : t.text.accent }}>{hud.john.who === "joe" ? "Joe: " : "Cowboy John: "}</b>}{hud.john.text}</div>
    </div>
  ) : null;

  const overlay = (): JSX.Element | null => {
    if (hud.showingHelp && !hud.exitAsk && !hud.saveOpen) return null;
    if (hud.exitAsk) {
      return (
        <Modal title="Leave the farm?" test="exit-ask">
          <div style={{ fontSize: 14, color: t.text.secondary, marginBottom: 12 }}>Your progress is saved between waves. Leave Cowboy John's farm?</div>
          <div style={{ display: "flex", gap: 8 }}>{btn("Stay", () => { const s = sim.current; if (s && s.screen === "paused") s.screen = "play"; bump({ exitAsk: false }); }, { grow: true, test: "stay" })}{btn("Leave", leaveNow, { tone: "danger", grow: true, test: "leave" })}</div>
        </Modal>
      );
    }
    if (hud.saveOpen) {
      const code = sim.current ? exportCodeFrom(simToSave(sim.current)) : (kvGet(SAVE_KEY) ?? "");
      return (
        <Modal title="Save code" test="save-sheet" onBack={() => bump({ saveOpen: false })}>
          <div style={{ fontSize: 13, color: t.text.secondary, marginBottom: 8 }}>Copy this code and paste it later to resume this farm. It also autosaves on this device.</div>
          <textarea data-testid="save-code" readOnly value={code} style={taStyle(t)} />
          <div style={{ display: "flex", gap: 8, margin: "8px 0" }}>{btn("Copy code", () => copyCode(code, (ok) => toast(ok ? "Save code copied." : "Couldn't copy — select it yourself.")), { tone: "pri", grow: true, test: "copy-code" })}</div>
          <div style={{ fontSize: 13, fontWeight: 700, margin: "8px 0 4px" }}>Paste a code</div>
          <textarea data-testid="paste-code" value={paste} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPaste(e.target.value)} placeholder="Paste CJ1.… here" style={taStyle(t)} />
          {hud.codeMsg && <div style={{ color: t.text.danger, fontSize: 13, marginTop: 4 }}>{hud.codeMsg}</div>}
          {btn("Load code", () => {
            const d = parseCode(paste);
            if (!d) { bump({ codeMsg: "Couldn't read that code. Make sure you pasted the whole thing." }); return; }
            sim.current = applySave(d); persist(sim.current); bump({ saveOpen: false, codeMsg: "" }); toast("Farm loaded.");
          }, { grow: true, test: "load-code" })}
        </Modal>
      );
    }
    if (hud.john?.modal && playHud && !hud.cut) {
      return (
        <Modal title={hud.john?.who === "joe" ? (hud.john?.beat === "reveal" ? "Joe" : "Joe") : "Cowboy John"} test={hud.john?.beat === "reveal" ? "joe-reveal" : hud.john?.beat === "joeHello" ? "joe-hello" : "john-intro"}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <canvas ref={johnCv} width={160} height={180} style={{ width: 88, height: 100, borderRadius: 10, flex: "0 0 auto", background: t.bg.subtle }} />
            <div style={{ fontSize: 14, lineHeight: 1.45, flex: 1 }}>{hud.john.text}</div>
          </div>
          <div style={{ marginTop: 14 }}>{btn(hud.john?.beat === "reveal" ? "Let's end this" : hud.john?.beat === "joeHello" ? "Alright" : "Let's get to work", () => {
            const s = sim.current; if (!s) { bump(); return; }
            if (s.john?.beat === "intro") { s.intro = false; say(s, JOE_HELLO, true, 99, "joe", "joeHello"); }
            else if (s.john?.beat === "reveal") { say(s, JOHN_ON_REVEAL, false, 8, "john"); }
            else { s.john = null; s.intro = false; }
            bump();
          }, { tone: "pri", grow: true, test: hud.john?.beat === "intro" ? "skip-intro" : hud.john?.beat === "reveal" ? "skip-reveal" : "skip-joe" })}</div>
        </Modal>
      );
    }
    if (hud.screen === "paused") {
      return (
        <Modal title="Paused" test="paused">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {btn("Resume", () => { const s = sim.current; if (s) s.screen = "play"; bump(); }, { tone: "pri", grow: true, test: "resume" })}
            {btn("How to Play", () => { const s = sim.current; if (s && s.screen === "play") s.screen = "paused"; bump({ showingHelp: true }); }, { grow: true, test: "help-from-pause" })}
            {btn("Save code", () => bump({ saveOpen: true }), { grow: true, test: "save-from-pause" })}
            {btn("Title screen", () => goTitle(), { grow: true, test: "to-title" })}
            {btn("Quit farm", () => bump({ exitAsk: true }), { tone: "danger", grow: true })}
          </div>
        </Modal>
      );
    }
    if (hud.screen === "victory") {
      return (
        <Modal title="The crop stands!" test="victory">
          <div style={{ fontSize: 14, color: t.text.secondary, marginBottom: 12 }}>You held South Field through 40 waves, and ran Joe off the land. Cowboy John is proud. Continue into freeplay, or head back to the title.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {btn("Freeplay", () => { const s = sim.current; if (s) { s.screen = "play"; s.john = null; persist(s); } bump(); }, { tone: "pri", grow: true, test: "freeplay" })}
            {btn("Title", goTitle, { grow: true })}
          </div>
        </Modal>
      );
    }
    if (hud.screen === "defeat") {
      return (
        <Modal title="The crop wilted" test="defeat">
          <div style={{ fontSize: 14, color: t.text.secondary, marginBottom: 12 }}>{sim.current?.revealed ? "Joe took the crop this time. John tips his hat. “We run him off next time.”" : "Cowboy John tips his hat. “We'll plant again, farmhand.”"} Your run ended on wave {Math.max(1, hud.wave)}.</div>
          <div style={{ display: "flex", gap: 8 }}>{btn("Try again", startNew, { tone: "pri", grow: true, test: "retry" })}{btn("Title", goTitle, { grow: true })}</div>
        </Modal>
      );
    }
    return null;
  };

  const helpBody = (
    <div data-testid="help" style={{ overflow: "auto", flex: 1, padding: "8px 4px 20px", fontSize: 14, lineHeight: 1.5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 22, color: t.text.accent, flex: 1 }}>How to Play</h2>
        {btn("Back", () => {
          if (sim.current) bump({ showingHelp: false });
          else setHud((h) => ({ ...INIT_HUD, hasSave: !!loadSaved(), showingHelp: false, screen: "title" }));
        }, { tone: "pri", test: "help-back", small: true })}
      </div>
      <p>You're hired help on Cowboy John's hemp farm. Pests march the dirt path toward his plant. Place towers beside the path and don't let the crop wilt. Lives are the plant's health — it droops as it takes hits. John stops by with tips, and other hands on the farm have a routine of their own. There's no forced tutorial.</p>
      <h3 style={{ color: t.text.warning, fontSize: 16 }}>Placing</h3>
      <p>Tap a tower in the shop, then tap a valid spot (green range circle). Red means you can't plant there. Sticky Traps must sit <b>on</b> the path; everything else sits off it. Tap a placed tower to upgrade or sell.</p>
      <h3 style={{ color: t.text.warning, fontSize: 16 }}>Upgrades</h3>
      <p>Each tower has two paths of four tiers. You can take one path all the way to 4 and the other up to 2 (4/2 or 2/4). Selling refunds 70% of what you spent.</p>
      <h3 style={{ color: t.text.warning, fontSize: 16 }}>Pests</h3>
      <ul style={{ paddingLeft: 18, margin: 0 }}>
        <li>Spider mites — basic.</li>
        <li>Fast aphids — speedy.</li>
        <li>Armored beetles — shells shrug off light damage.</li>
        <li>Split caterpillars — drop two inchworms when killed.</li>
        <li>Fungus gnats — flying; need anti-air.</li>
        <li>Powdery mildew — hidden; needs detection (UV Lamp).</li>
        <li>Mite Queen — sheds mites as she walks.</li>
        <li>Locust Swarm King — every 10 waves, sheds flying locusts.</li>
        <li>Something worse may be waiting at the end of South Field.</li>
      </ul>
      <h3 style={{ color: t.text.warning, fontSize: 16 }}>Waves</h3>
      <p>40 waves on South Field, then freeplay. Press <b>Start Wave</b> or Space when you're ready. Use 2× (or F) when you trust the line. There's room later for more plants and maps.</p>
      <h3 style={{ color: t.text.warning, fontSize: 16 }}>Saving</h3>
      <p>The farm autosaves between waves on this device. Copy a save code from the menu if you want a backup or to move to another phone.</p>
      <h3 style={{ color: t.text.warning, fontSize: 16 }}>Keys</h3>
      <p>1–8 select towers, Space starts a wave, F toggles 2×, Q / E upgrade path A / B, T cycles targeting, X or Shift+S sells, Esc pauses or backs out. The phone back button asks before leaving.</p>

    </div>
  );

  const titleBody = (
    <div data-testid="title" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.55 }}
      />
      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 16, background: "linear-gradient(180deg,rgba(28,20,12,0.2),rgba(28,20,12,0.82))" }}>
        <div style={{ fontFamily: "Georgia, 'Palatino Linotype', serif", fontSize: "clamp(28px, 8vw, 46px)", fontWeight: 800, textAlign: "center", color: t.text.warning, textShadow: "0 2px 0 #3a2410, 0 8px 24px rgba(0,0,0,0.5)", lineHeight: 1.05 }}>Cowboy John's</div>
        <div style={{ fontFamily: "Georgia, serif", fontSize: "clamp(22px, 7vw, 40px)", fontWeight: 800, textAlign: "center", color: t.text.primary, marginBottom: 8, textShadow: "0 2px 8px #000" }}>Crop Defense</div>
        <div style={{ fontSize: 14, color: t.text.secondary, marginBottom: 18, textAlign: "center" }}>Hold South Field. Don't let the crop wilt.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "min(360px, 100%)" }}>
          {hud.hasSave && btn("Continue", resume, { tone: "pri", grow: true, test: "continue" })}
          {btn("New Game", () => { if (hud.hasSave) bump({ confirmNew: true }); else startNew(); }, { tone: hud.hasSave ? "ghost" : "pri", grow: true, test: "new-game" })}
          {btn("How to Play", () => setHud((h) => ({ ...h, screen: "help", showingHelp: true })), { grow: true, test: "how-to-play" })}
          {btn("Paste save code", () => bump({ saveOpen: true }), { grow: true, test: "paste-save" })}
        </div>
        {hud.confirmNew && (
          <div style={{ marginTop: 12, width: "min(360px, 100%)", background: t.bg.elevated, border: `1px solid ${t.border.default}`, borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 13, marginBottom: 8 }}>Start a new farm? This overwrites your saved run.</div>
            <div style={{ display: "flex", gap: 8 }}>{btn("Overwrite", startNew, { tone: "danger", grow: true, test: "confirm-new" })}{btn("Cancel", () => bump({ confirmNew: false }), { grow: true })}</div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={root}>
      <style>{`html,body,#root{height:100%;background:${t.bg.base}} textarea{color:${t.text.primary}}`}</style>
      {hud.toast && <div data-testid="toast" style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 40, background: t.bg.elevated, border: `1px solid ${t.border.focus}`, borderRadius: 12, padding: "8px 14px", fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>{hud.toast}</div>}
      {hud.screen === "title" && !hud.showingHelp && titleBody}
      {(hud.screen === "help" || hud.showingHelp) && <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, padding: 8 }}>{helpBody}</div>}
      {playHud && !hud.showingHelp && (
        <div style={{ flex: 1, display: "flex", flexDirection: land ? "row" : "column", minHeight: 0, gap: 8 }}>
          <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
            {topBar}
            <div style={{ width: "100%", aspectRatio: `${WW} / ${WH}`, flex: "0 1 auto", minHeight: 140, maxHeight: land ? "100%" : "min(58dvh, calc(100dvw * 0.8))", position: "relative", borderRadius: 14, overflow: "hidden", border: `1px solid ${t.border.default}`, background: "#1c140c" }}>
              <canvas
                ref={canvasRef}
                data-testid="field"
                style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
                onPointerDown={(e) => { (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId); onCanvasPtr(e, "down"); }}
                onPointerMove={(e) => onCanvasPtr(e, "move")}
                onPointerUp={(e) => onCanvasPtr(e, "up")}
                onPointerCancel={() => { const s = sim.current; if (s) s.hover = null; }}
                onContextMenu={(e) => e.preventDefault()}
              />
              {hud.cut && (
                <div data-testid={hud.cut.phase === 0 ? "betrayal-cut" : (hud.john?.beat === "reveal" ? "joe-reveal" : "john-react")}
                  onClick={() => { const s = sim.current; if (s) { skipCutscene(s); bump(); } }}
                  style={{ position: "absolute", left: 8, right: 8, bottom: 8, zIndex: 6, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <div style={{ background: "rgba(20,12,4,0.78)", color: "#f3e6c8", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800, border: "1px solid #8a6238" }}>Tap to skip</div>
                  {hud.cut.phase > 0 && hud.john ? (
                    <div style={{ width: "100%", background: "rgba(42,30,18,0.94)", border: "1px solid #8a6238", borderRadius: 14, padding: 10, display: "flex", gap: 10, boxShadow: "0 10px 28px rgba(0,0,0,0.45)" }}>
                      <canvas ref={johnCv} width={160} height={180} style={{ width: 72, height: 82, borderRadius: 10, flex: "0 0 auto", background: t.bg.subtle }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 16, color: "#f3e6c8", fontFamily: "Georgia, serif", marginBottom: 4 }}>{hud.john.who === "joe" ? "Joe" : "Cowboy John"}</div>
                        <div style={{ fontSize: 13, lineHeight: 1.4, color: "#f3e6c8" }}>{hud.john.text}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: "100%", background: "rgba(42,30,18,0.92)", border: "1px solid #8a6238", borderRadius: 14, padding: 10, color: "#f3e6c8", fontSize: 14, fontWeight: 700, textAlign: "center" }}>A swarm is pouring over the hillside...</div>
                  )}
                </div>
              )}
            </div>
            {johnBanner}
            {!land && selPanel}
          </div>
          <div style={{ flex: land ? "0 0 168px" : "0 0 auto", display: "flex", flexDirection: "column", minHeight: 0 }}>
            {shop}
            {land && selPanel}
          </div>
        </div>
      )}
      {overlay()}
    </div>
  );
}

function Modal({ title, children, test, onBack }: { title: string; children: ReactNode; test?: string; onBack?: () => void }): ReactNode {
  return (
    <div data-testid={test} style={{ position: "fixed", inset: 0, zIndex: 30, background: "rgba(10,6,2,0.62)", display: "flex", alignItems: "center", justifyContent: "center", padding: "max(16px, env(safe-area-inset-top)) 16px" }}>
      <div style={{ width: "min(460px, 100%)", background: "#2a1e12", border: "1px solid #8a6238", borderRadius: 16, padding: 16, boxShadow: "0 16px 48px rgba(0,0,0,0.5)", maxHeight: "90dvh", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 20, flex: 1, color: "#f3e6c8", fontFamily: "Georgia, serif" }}>{title}</div>
          {onBack && <button type="button" onClick={onBack} style={{ background: "transparent", border: 0, color: "#c9b48a", fontWeight: 700, cursor: "pointer" }}>Close</button>}
        </div>
        {children}
      </div>
    </div>
  );
}

function taStyle(t: { bg: { subtle: string }; border: { default: string }; text: { primary: string }; font: { mono: string } }): CSSProperties {
  return { width: "100%", minHeight: 80, boxSizing: "border-box", borderRadius: 10, border: `1px solid ${t.border.default}`, background: t.bg.subtle, color: t.text.primary, padding: 8, fontFamily: t.font.mono, fontSize: 11, resize: "vertical" };
}

function ShopIcon({ kind }: { kind: TowerId }): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    el.width = 48 * dpr; el.height = 36 * dpr;
    const c = el.getContext("2d"); if (!c) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, 48, 36);
    c.translate(24, 26);
    c.scale(0.85, 0.85);
    drawTowerSprite(c, kind, 0, 0);
  }, [kind]);
  return <canvas ref={ref} style={{ width: 48, height: 36 }} />;
}
