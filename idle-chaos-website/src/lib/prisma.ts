import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const options = process.env.NODE_ENV !== "production"
	? ({ log: ["error", "warn"] } as const)
	: undefined;

export const prisma = globalForPrisma.prisma ?? new PrismaClient(options as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
