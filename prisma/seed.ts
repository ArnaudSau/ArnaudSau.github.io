import { PrismaClient, Role, PortfolioType, Broker, TransactionType, DividendFrequency, ReportType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create demo user
  const hashedPassword = await bcrypt.hash("demo123", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@investtrack.fr" },
    update: { password: hashedPassword },
    create: {
      email: "demo@investtrack.fr",
      name: "Demo Investor",
      password: hashedPassword,
      role: Role.STUDENT,
      tmi: 30,
    },
  });

  console.log("Created user:", user.email);

  // Create PEA Fortuneo
  const pea = await prisma.portfolio.upsert({
    where: { id: "pea-fortuneo-demo" },
    update: {},
    create: {
      id: "pea-fortuneo-demo",
      userId: user.id,
      name: "PEA Fortuneo",
      type: PortfolioType.PEA,
      broker: Broker.FORTUNEO,
      currency: "EUR",
      openDate: new Date("2022-06-15"),
    },
  });

  // Create CTO Boursobank
  const cto = await prisma.portfolio.upsert({
    where: { id: "cto-boursobank-demo" },
    update: {},
    create: {
      id: "cto-boursobank-demo",
      userId: user.id,
      name: "CTO Boursobank",
      type: PortfolioType.CTO,
      broker: Broker.BOURSOBANK,
      currency: "EUR",
      openDate: new Date("2023-01-10"),
    },
  });

  console.log("Created portfolios:", pea.name, cto.name);

  // PEA Holdings
  const cw8 = await prisma.holding.upsert({
    where: { id: "holding-cw8" },
    update: {},
    create: {
      id: "holding-cw8",
      portfolioId: pea.id,
      ticker: "CW8.PA",
      name: "Amundi MSCI World UCITS ETF",
      isin: "LU1681043599",
      quantity: 50,
      averagePurchasePrice: 380,
      sector: "Diversifié",
      geographicZone: "Monde Développé",
      currency: "EUR",
    },
  });

  const ewld = await prisma.holding.upsert({
    where: { id: "holding-ewld" },
    update: {},
    create: {
      id: "holding-ewld",
      portfolioId: pea.id,
      ticker: "EWLD.PA",
      name: "Lyxor MSCI World UCITS ETF",
      isin: "FR0011869353",
      quantity: 30,
      averagePurchasePrice: 42,
      sector: "Diversifié",
      geographicZone: "Monde Développé",
      currency: "EUR",
    },
  });

  const paeem = await prisma.holding.upsert({
    where: { id: "holding-paeem" },
    update: {},
    create: {
      id: "holding-paeem",
      portfolioId: pea.id,
      ticker: "PAEEM.PA",
      name: "Amundi PEA MSCI Emerging Markets",
      isin: "FR0013412020",
      quantity: 100,
      averagePurchasePrice: 22,
      sector: "Diversifié",
      geographicZone: "Émergents",
      currency: "EUR",
    },
  });

  // CTO Holdings
  const mc = await prisma.holding.upsert({
    where: { id: "holding-mc" },
    update: {},
    create: {
      id: "holding-mc",
      portfolioId: cto.id,
      ticker: "MC.PA",
      name: "LVMH Moët Hennessy Louis Vuitton",
      isin: "FR0000121014",
      quantity: 2,
      averagePurchasePrice: 650,
      sector: "Consommation",
      geographicZone: "Zone Euro",
      currency: "EUR",
    },
  });

  const tte = await prisma.holding.upsert({
    where: { id: "holding-tte" },
    update: {},
    create: {
      id: "holding-tte",
      portfolioId: cto.id,
      ticker: "TTE.PA",
      name: "TotalEnergies SE",
      isin: "FR0000120271",
      quantity: 15,
      averagePurchasePrice: 58,
      sector: "Énergie",
      geographicZone: "Zone Euro",
      currency: "EUR",
    },
  });

  console.log("Created holdings");

  // Transactions for PEA
  const now = new Date();
  const transactions = [
    // CW8 buys over 18 months
    { holdingId: cw8.id, portfolioId: pea.id, type: TransactionType.BUY, ticker: "CW8.PA", quantity: 20, price: 370, fees: 1.5, date: new Date(now.getFullYear() - 1, now.getMonth() - 6, 15) },
    { holdingId: cw8.id, portfolioId: pea.id, type: TransactionType.BUY, ticker: "CW8.PA", quantity: 15, price: 385, fees: 1.5, date: new Date(now.getFullYear() - 1, now.getMonth(), 10) },
    { holdingId: cw8.id, portfolioId: pea.id, type: TransactionType.BUY, ticker: "CW8.PA", quantity: 15, price: 388, fees: 1.5, date: new Date(now.getFullYear(), now.getMonth() - 3, 5) },
    // EWLD buys
    { holdingId: ewld.id, portfolioId: pea.id, type: TransactionType.BUY, ticker: "EWLD.PA", quantity: 30, price: 42, fees: 0.99, date: new Date(now.getFullYear() - 1, now.getMonth() - 4, 20) },
    // PAEEM buys
    { holdingId: paeem.id, portfolioId: pea.id, type: TransactionType.BUY, ticker: "PAEEM.PA", quantity: 50, price: 21, fees: 0.99, date: new Date(now.getFullYear() - 1, now.getMonth() - 3, 1) },
    { holdingId: paeem.id, portfolioId: pea.id, type: TransactionType.BUY, ticker: "PAEEM.PA", quantity: 50, price: 23, fees: 0.99, date: new Date(now.getFullYear(), now.getMonth() - 1, 15) },
    // CTO transactions
    { holdingId: mc.id, portfolioId: cto.id, type: TransactionType.BUY, ticker: "MC.PA", quantity: 2, price: 650, fees: 5, date: new Date(now.getFullYear() - 1, now.getMonth() - 2, 8) },
    { holdingId: tte.id, portfolioId: cto.id, type: TransactionType.BUY, ticker: "TTE.PA", quantity: 10, price: 56, fees: 2, date: new Date(now.getFullYear() - 1, now.getMonth() - 5, 12) },
    { holdingId: tte.id, portfolioId: cto.id, type: TransactionType.BUY, ticker: "TTE.PA", quantity: 5, price: 62, fees: 2, date: new Date(now.getFullYear(), now.getMonth() - 2, 20) },
    // TotalEnergies dividends received
    { holdingId: tte.id, portfolioId: cto.id, type: TransactionType.DIVIDEND, ticker: "TTE.PA", quantity: 10, price: 0.74, fees: 0, date: new Date(now.getFullYear() - 1, 2, 20), notes: "Dividende trimestriel T1" },
    { holdingId: tte.id, portfolioId: cto.id, type: TransactionType.DIVIDEND, ticker: "TTE.PA", quantity: 10, price: 0.74, fees: 0, date: new Date(now.getFullYear() - 1, 5, 20), notes: "Dividende trimestriel T2" },
    { holdingId: tte.id, portfolioId: cto.id, type: TransactionType.DIVIDEND, ticker: "TTE.PA", quantity: 10, price: 0.74, fees: 0, date: new Date(now.getFullYear() - 1, 8, 20), notes: "Dividende trimestriel T3" },
    { holdingId: tte.id, portfolioId: cto.id, type: TransactionType.DIVIDEND, ticker: "TTE.PA", quantity: 15, price: 0.79, fees: 0, date: new Date(now.getFullYear(), 0, 15), notes: "Dividende trimestriel T4" },
  ];

  for (const tx of transactions) {
    await prisma.transaction.create({ data: tx });
  }

  console.log("Created transactions");

  // Dividend events
  const dividendEvents = [
    { holdingId: tte.id, ticker: "TTE.PA", exDate: new Date(now.getFullYear(), 3, 10), paymentDate: new Date(now.getFullYear(), 3, 25), amountPerShare: 0.79, frequency: DividendFrequency.QUARTERLY },
    { holdingId: tte.id, ticker: "TTE.PA", exDate: new Date(now.getFullYear(), 6, 10), paymentDate: new Date(now.getFullYear(), 6, 25), amountPerShare: 0.79, frequency: DividendFrequency.QUARTERLY },
    { holdingId: tte.id, ticker: "TTE.PA", exDate: new Date(now.getFullYear(), 9, 10), paymentDate: new Date(now.getFullYear(), 9, 25), amountPerShare: 0.79, frequency: DividendFrequency.QUARTERLY },
    { ticker: "MC.PA", exDate: new Date(now.getFullYear(), 5, 5), paymentDate: new Date(now.getFullYear(), 5, 15), amountPerShare: 6.5, frequency: DividendFrequency.SEMI_ANNUAL },
    { ticker: "MC.PA", exDate: new Date(now.getFullYear(), 11, 5), paymentDate: new Date(now.getFullYear(), 11, 15), amountPerShare: 6.5, frequency: DividendFrequency.SEMI_ANNUAL },
  ];

  for (const de of dividendEvents) {
    await prisma.dividendEvent.create({ data: de });
  }

  console.log("Created dividend events");

  // Earnings calendar
  const earnings = [
    { ticker: "MC.PA", companyName: "LVMH", reportDate: new Date(now.getFullYear(), 3, 15), estimatedEPS: 7.5, reportType: ReportType.QUARTERLY },
    { ticker: "TTE.PA", companyName: "TotalEnergies", reportDate: new Date(now.getFullYear(), 3, 25), estimatedEPS: 2.1, reportType: ReportType.QUARTERLY },
    { ticker: "MC.PA", companyName: "LVMH", reportDate: new Date(now.getFullYear(), 6, 24), estimatedEPS: 8.2, reportType: ReportType.QUARTERLY },
    { ticker: "TTE.PA", companyName: "TotalEnergies", reportDate: new Date(now.getFullYear(), 6, 27), estimatedEPS: 2.3, reportType: ReportType.QUARTERLY },
    { ticker: "AAPL", companyName: "Apple Inc.", reportDate: new Date(now.getFullYear(), 3, 30), estimatedEPS: 1.52, reportType: ReportType.QUARTERLY },
    { ticker: "MSFT", companyName: "Microsoft", reportDate: new Date(now.getFullYear(), 3, 22), estimatedEPS: 2.82, reportType: ReportType.QUARTERLY },
  ];

  for (const e of earnings) {
    await prisma.earningsCalendar.create({ data: e });
  }

  console.log("Created earnings calendar");
  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
