import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env["NODE_ENV"] === "development"
        ? [{ emit: "stdout", level: "error" }, { emit: "stdout", level: "warn" }]
        : [],
  });

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = db;
}
