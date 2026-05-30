import { PrismaClient, MenuCategory } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const menu = [
    { name: "ຕຳຫມາກຫຸ່ງ", price: "35000", category: MenuCategory.TUM },
    { name: "ຕຳໝາກຮຸ່ງ", price: "30000", category: MenuCategory.TUM },
    { name: "ຕຳທະເລ", price: "45000", category: MenuCategory.TUM },
    { name: "ຂ້າວໜຽວ", price: "15000", category: MenuCategory.GENERAL },
    { name: "ເບຍລາວ", price: "15000", category: MenuCategory.GENERAL },
    { name: "ນ້ຳດື່ມ", price: "5000", category: MenuCategory.GENERAL },
  ];

  for (const m of menu) {
    const exists = await prisma.menuItem.findFirst({ where: { name: m.name } });
    if (!exists) await prisma.menuItem.create({ data: m });
  }

  const stock = [
    { name: "ມະເຂືອ", quantity: 10, unit: "ກິໂລ" },
    { name: "ຜັກຊີ", quantity: 5, unit: "ມັດ" },
    { name: "ນ້ຳປາ", quantity: 20, unit: "ຂວດ" },
  ];

  for (const s of stock) {
    const exists = await prisma.inventoryItem.findFirst({ where: { name: s.name } });
    if (!exists) await prisma.inventoryItem.create({ data: s });
  }

  console.log("Seed OK");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
