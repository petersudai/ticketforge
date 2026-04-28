/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Prisma seed — run with: npm run db:seed
 * Requires: npx prisma generate && npx prisma db push
 */

// @ts-nocheck
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  await prisma.scan.deleteMany();
  await prisma.attendee.deleteMany();
  await prisma.tier.deleteMany();
  await prisma.event.deleteMany();

  const event = await prisma.event.create({
    data: {
      name: "Nairobi Jazz Night 2025",
      slug: "nairobi-jazz-night-2025",
      date: "2025-09-20",
      time: "7:00 PM",
      venue: "KICC Rooftop, Nairobi",
      organizer: "Kenya Jazz Collective",
      category: "Music & Entertainment",
      description: "An unforgettable evening of live jazz under the Nairobi skyline.",
      capacity: 300,
      currency: "KES",
      accent: "#6C5CE7",
      published: true,
      tiers: {
        create: [
          { name: "Early Bird", price: 1500, quantity: 50,  color: "#00b894" },
          { name: "General",    price: 2500, quantity: 200, color: "#6C5CE7" },
          { name: "VIP",        price: 5000, quantity: 40,  color: "#fdcb6e" },
          { name: "VVIP",       price: 10000, quantity: 10, color: "#e17055" },
        ],
      },
    },
    include: { tiers: true },
  });

  console.log(`✅ Created event: ${event.name}`);

  const general = event.tiers.find((t: any) => t.name === "General");
  const vip     = event.tiers.find((t: any) => t.name === "VIP");

  const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const genId = () => {
    let s = "TF-";
    for (let i = 0; i < 4; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
    s += "-";
    for (let i = 0; i < 6; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
    return s;
  };

  const attendees = [
    { name: "Amara Okonkwo",  email: "amara@example.com",   phone: "0712345678", tier: "VIP",     tierId: vip.id,     payStatus: "paid",    pricePaid: 5000, seat: "V-01" },
    { name: "Brian Kamau",    email: "brian@example.com",   phone: "0723456789", tier: "General", tierId: general.id, payStatus: "paid",    pricePaid: 2500, seat: "G-01" },
    { name: "Cynthia Wanjiru",email: "cynthia@example.com", phone: "0734567890", tier: "General", tierId: general.id, payStatus: "paid",    pricePaid: 2500, seat: "G-02" },
    { name: "David Mutua",    email: "david@example.com",   phone: "0745678901", tier: "VIP",     tierId: vip.id,     payStatus: "paid",    pricePaid: 5000, seat: "V-02" },
    { name: "Esther Njeri",   email: "esther@example.com",  phone: "0756789012", tier: "General", tierId: general.id, payStatus: "pending", pricePaid: 0,    seat: "G-03" },
  ];

  for (const att of attendees) {
    await prisma.attendee.create({
      data: { ...att, ticketId: genId(), checkedIn: false, emailSent: false, source: "seed", eventId: event.id },
    });
  }

  console.log(`✅ Created ${attendees.length} attendees`);
  console.log('\n🎉 Seed complete! Run `npm run db:studio` to browse.');
}

main()
  .catch(e => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
