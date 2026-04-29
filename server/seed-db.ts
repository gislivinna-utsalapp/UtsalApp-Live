// server/seed-db.ts
// Keyrir við ræsingu ef gagnagrunnurinn er tómur.
// Skrifar beint í database.json til að varðveita rétt ID og tengsl.

import fs from "fs";
import path from "path";

function resolveDbFile(): string {
  const prodPath = "/var/data/database.json";
  try {
    if (fs.existsSync(path.dirname(prodPath))) return prodPath;
  } catch {}
  return path.join(process.cwd(), "database.json");
}

const SEED_DATA = {
  users: [
    {
      id: "7a6bcdd6-4090-488f-b84d-baf4eaad6220",
      email: "gisli@utsalapp.is",
      passwordHash: "$2b$10$506EpDVjJdY/UfTqG1PsGul/gA2xtF/001CjLAF65iciXp2RoEG5y",
      role: "store",
      storeId: "404d8fb6-15fc-4552-a710-f6d6c7d27659",
      isAdmin: true,
    },
    {
      id: "3978e0f2-03e2-4a3a-aa7c-376457026e5a",
      email: "utsalapp@utsalapp.is",
      passwordHash: "$2b$10$rk9rE4hUu.2rMVmuIQ4sN..JWHEGhsDZwcox1/0mw2bZUdqBprLqO",
      role: "store",
      storeId: "c5384bfd-5dd1-4322-91e0-5fdc9f6aa51a",
      isAdmin: false,
    },
  ],
  stores: [
    {
      id: "1d1ba5c3-a7b5-4757-b954-cdfa9e4ba908",
      name: "Krónan",
      category: "matvorur",
      address: "Grensásvegur 9, 108 Reykjavík",
      phone: "5401700",
      website: "https://kronan.is",
      billingStatus: "active",
      trialEndsAt: null,
      createdAt: "2026-04-20T23:24:28.940Z",
      plan: "pro",
    },
    {
      id: "92b8c7dc-37ad-4e92-85b0-93a014745158",
      name: "Elko",
      category: "raftaeki",
      address: "Skeifan 9, 108 Reykjavík",
      phone: "5158000",
      website: "https://elko.is",
      billingStatus: "active",
      trialEndsAt: null,
      createdAt: "2026-04-20T23:24:28.940Z",
      plan: "premium",
    },
    {
      id: "b39cbbfd-9faa-4b5c-96c2-b3855d93b749",
      name: "Hagkaup",
      category: "fatnad",
      address: "Hagasmára 1, 201 Kópavogur",
      phone: "5655500",
      website: "https://hagkaup.is",
      billingStatus: "active",
      trialEndsAt: null,
      createdAt: "2026-04-20T23:24:28.940Z",
      plan: "pro",
    },
    {
      id: "d0568224-6096-42fa-b24a-f3ca3c9b4798",
      name: "Skrúður",
      category: "husgogn",
      address: "Miklabraut 79, 105 Reykjavík",
      phone: "5337700",
      website: "https://skrudur.is",
      billingStatus: "active",
      trialEndsAt: null,
      createdAt: "2026-04-20T23:24:28.940Z",
      plan: "basic",
    },
    {
      id: "dac35f9b-784a-4bb2-8a20-0365e4af2213",
      name: "66°North",
      category: "fatnad",
      address: "Bankastræti 5, 101 Reykjavík",
      phone: "5357660",
      website: "https://66north.com",
      billingStatus: "active",
      trialEndsAt: null,
      createdAt: "2026-04-20T23:24:28.940Z",
      plan: "premium",
    },
    {
      id: "c5384bfd-5dd1-4322-91e0-5fdc9f6aa51a",
      name: "ÚtsalApp",
      address: "",
      phone: "",
      website: "https://utsalapp-live.onrender.com",
      ownerEmail: "utsalapp@utsalapp.is",
      plan: "unlimited",
      billingStatus: "active",
      trialEndsAt: null,
      createdAt: "2026-04-21T13:25:12.831Z",
    },
  ],
  posts: [
    {
      id: "45da641c-dbf2-4dd5-b5ef-f344d1603014",
      storeId: "1d1ba5c3-a7b5-4757-b954-cdfa9e4ba908",
      title: "Mjólk 1L — stór framboðsútsala",
      description: "Nýfrískt mjólk frá íslenskum bændum. Til í léttmjólk og heilmjólk. Verð gildir þar til birgðir tæmast.",
      priceOriginal: 279, priceSale: 189, category: "matvorur",
      startsAt: "2026-04-17T23:24:28.940Z", endsAt: "2027-12-31T23:59:59.000Z",
      isActive: true, createdAt: "2026-04-17T23:24:28.940Z", viewCount: 1,
      images: [{ url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&h=600&fit=crop", alt: "Mjólkurflaska" }],
    },
    {
      id: "48ca46a6-fffc-46f0-9a75-137ca7f26262",
      storeId: "1d1ba5c3-a7b5-4757-b954-cdfa9e4ba908",
      title: "Skyr — 4 dósir á sérkjörum",
      description: "Íslenskur skyr í fjórum bragðtegundum. Prótínríkur og hollur.",
      priceOriginal: 899, priceSale: 599, category: "matvorur",
      startsAt: "2026-04-17T23:24:28.940Z", endsAt: "2027-12-31T23:59:59.000Z",
      isActive: true, createdAt: "2026-04-17T23:24:28.940Z", viewCount: 2,
      images: [{ url: "https://images.unsplash.com/photo-1488477181899-ab9f07f95b07?w=800&h=600&fit=crop", alt: "Skyr dósir" }],
    },
    {
      id: "89615302-a1f9-4cff-8c5d-6da1b29ded99",
      storeId: "1d1ba5c3-a7b5-4757-b954-cdfa9e4ba908",
      title: "Lambakjöt — íslenskt, 500g",
      description: "Ferskt íslenskt lambakjöt, beint frá bóndanum. Til í hakkakjöti og steik.",
      priceOriginal: 2490, priceSale: 1690, category: "matvorur",
      startsAt: "2026-04-17T23:24:28.940Z", endsAt: "2027-12-31T23:59:59.000Z",
      isActive: true, createdAt: "2026-04-17T23:24:28.940Z", viewCount: 3,
      images: [{ url: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800&h=600&fit=crop", alt: "Lambakjöt" }],
    },
    {
      id: "ab8d39e7-d4b1-4abc-8def-111122223333",
      storeId: "92b8c7dc-37ad-4e92-85b0-93a014745158",
      title: "Samsung QLED 55\" sjónvarp",
      description: "Snertilegt QLED skjár með 4K upplausn og HDR10+. Fullkomið fyrir heimilisbíó.",
      priceOriginal: 189900, priceSale: 139900, category: "raftaeki",
      startsAt: "2026-04-17T23:24:28.940Z", endsAt: "2027-12-31T23:59:59.000Z",
      isActive: true, createdAt: "2026-04-17T23:24:28.940Z", viewCount: 5,
      images: [{ url: "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800&h=600&fit=crop", alt: "Samsung sjónvarp" }],
    },
    {
      id: "d350644d-d4b1-4abc-8def-111122223334",
      storeId: "92b8c7dc-37ad-4e92-85b0-93a014745158",
      title: "Apple AirPods Pro 2. kynslóð",
      description: "Hljóðdempun í heimsklassa ásamt Transparency Mode. USB-C hleðsluhulstur innifalinn.",
      priceOriginal: 69900, priceSale: 54900, category: "raftaeki",
      startsAt: "2026-04-17T23:24:28.940Z", endsAt: "2027-12-31T23:59:59.000Z",
      isActive: true, createdAt: "2026-04-17T23:24:28.940Z", viewCount: 8,
      images: [{ url: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&h=600&fit=crop", alt: "AirPods Pro" }],
    },
    {
      id: "3e0ef3d3-d4b1-4abc-8def-111122223335",
      storeId: "92b8c7dc-37ad-4e92-85b0-93a014745158",
      title: "Dyson V15 Detect þráðlaus ryksuga",
      description: "Kraftmesta þráðlausa ryksuga Dysons með laser-ryk skynjara og LCD skjá.",
      priceOriginal: 109900, priceSale: 79900, category: "raftaeki",
      startsAt: "2026-04-17T23:24:28.940Z", endsAt: "2027-12-31T23:59:59.000Z",
      isActive: true, createdAt: "2026-04-17T23:24:28.940Z", viewCount: 12,
      images: [{ url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop", alt: "Dyson V15" }],
    },
    {
      id: "105b5c75-d4b1-4abc-8def-111122223336",
      storeId: "b39cbbfd-9faa-4b5c-96c2-b3855d93b749",
      title: "Levi's 501 gallabuxur",
      description: "Klassískar Levi's 501 Original — tímalausar gallabuxur í sléttu skerðingarverði.",
      priceOriginal: 19900, priceSale: 12900, category: "fatnad",
      startsAt: "2026-04-17T23:24:28.940Z", endsAt: "2027-12-31T23:59:59.000Z",
      isActive: true, createdAt: "2026-04-17T23:24:28.940Z", viewCount: 7,
      images: [{ url: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&h=600&fit=crop", alt: "Levis gallabuxur" }],
    },
    {
      id: "d0c020b0-d4b1-4abc-8def-111122223337",
      storeId: "b39cbbfd-9faa-4b5c-96c2-b3855d93b749",
      title: "Nike Air Max 270 — kvenna",
      description: "Þægilegar íþróttaskór með Air Max einingu. Til í mörgum litum.",
      priceOriginal: 29900, priceSale: 19900, category: "fatnad",
      startsAt: "2026-04-17T23:24:28.940Z", endsAt: "2027-12-31T23:59:59.000Z",
      isActive: true, createdAt: "2026-04-17T23:24:28.940Z", viewCount: 9,
      images: [{ url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=600&fit=crop", alt: "Nike Air Max" }],
    },
    {
      id: "398be689-d4b1-4abc-8def-111122223338",
      storeId: "d0568224-6096-42fa-b24a-f3ca3c9b4798",
      title: "Hillur BESTÅ — 3 hólf",
      description: "Glæsileg BESTÅ hillu í hvítu með þremur hólfum. Auðveld uppsetning.",
      priceOriginal: 34900, priceSale: 24900, category: "husgogn",
      startsAt: "2026-04-17T23:24:28.940Z", endsAt: "2027-12-31T23:59:59.000Z",
      isActive: true, createdAt: "2026-04-17T23:24:28.940Z", viewCount: 4,
      images: [{ url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop", alt: "BESTÅ hillu" }],
    },
    {
      id: "e5ccb374-d4b1-4abc-8def-111122223339",
      storeId: "d0568224-6096-42fa-b24a-f3ca3c9b4798",
      title: "Borðstólar í Skandinavíu-stíl",
      description: "Fallegir borðstólar með massívum eikartrefjum og ryðfríu stáli. Seldir í pörum.",
      priceOriginal: 49900, priceSale: 34900, category: "husgogn",
      startsAt: "2026-04-17T23:24:28.940Z", endsAt: "2027-12-31T23:59:59.000Z",
      isActive: true, createdAt: "2026-04-17T23:24:28.940Z", viewCount: 6,
      images: [{ url: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&h=600&fit=crop", alt: "Borðstólar" }],
    },
    {
      id: "f24d49e5-d4b1-4abc-8def-111122223340",
      storeId: "dac35f9b-784a-4bb2-8a20-0365e4af2213",
      title: "Snæfell GoreTex úlpa",
      description: "Þétt GoreTex útikápa sem heldur þér hlýjum og þurrum í öllum veðrum.",
      priceOriginal: 64900, priceSale: 44900, category: "fatnad",
      startsAt: "2026-04-17T23:24:28.940Z", endsAt: "2027-12-31T23:59:59.000Z",
      isActive: true, createdAt: "2026-04-17T23:24:28.940Z", viewCount: 5,
      images: [{ url: "https://images.unsplash.com/photo-1544441893-675973e31985?w=800&h=600&fit=crop", alt: "GoreTex úlpa" }],
    },
    {
      id: "4dd5a946-d4b1-4abc-8def-111122223341",
      storeId: "dac35f9b-784a-4bb2-8a20-0365e4af2213",
      title: "Keilir Fleece Peysa",
      description: "Hlý fleece peysa úr endurvinnum efnum. Fullkomin fyrir fjallgöngu og daglegt líf.",
      priceOriginal: 39900, priceSale: 27900, category: "fatnad",
      startsAt: "2026-04-17T23:24:28.940Z", endsAt: "2027-12-31T23:59:59.000Z",
      isActive: true, createdAt: "2026-04-17T23:24:28.940Z", viewCount: 4,
      images: [{ url: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&h=600&fit=crop", alt: "Fleece peysa" }],
    },
    {
      id: "52b404d9-d4b1-4abc-8def-111122223342",
      storeId: "dac35f9b-784a-4bb2-8a20-0365e4af2213",
      title: "Laugavegur veðurjakki",
      description: "Uppfærður Laugavegur jakki með fullnægjandi einangrun og GoreTex yfirburðum.",
      priceOriginal: 74900, priceSale: 54900, category: "fatnad",
      startsAt: "2026-04-20T23:24:28.940Z", endsAt: "2027-12-31T23:59:59.000Z",
      isActive: true, createdAt: "2026-04-20T23:24:28.940Z", viewCount: 3,
      images: [{ url: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&h=600&fit=crop", alt: "Veðurjakki" }],
    },
  ],
};

export async function seedDatabaseIfEmpty(): Promise<void> {
  const dbFile = resolveDbFile();

  try {
    const raw = fs.readFileSync(dbFile, "utf8");
    const db = JSON.parse(raw);

    if (Array.isArray(db.users) && db.users.length > 0) {
      return;
    }

    console.log("[seed] Tómur gagnagrunnur — set inn upphafsgögn...");
    fs.writeFileSync(dbFile, JSON.stringify(SEED_DATA, null, 2), "utf8");
    console.log(
      `[seed] Tilbúið: ${SEED_DATA.users.length} notendur, ${SEED_DATA.stores.length} verslanir, ${SEED_DATA.posts.length} færslur`
    );
  } catch (err: any) {
    console.error("[seed] Villa við seed:", err.message);
  }
}
