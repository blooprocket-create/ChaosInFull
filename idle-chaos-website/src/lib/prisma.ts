import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const url = process.env.DATABASE_URL;
const baseOptions: Prisma.PrismaClientOptions = {
	...(process.env.NODE_ENV !== "production" ? { log: ["error", "warn"] } : {}),
	...(url ? { datasources: { db: { url } } } : {}),
};

if (process.env.NODE_ENV !== "production") {
	const prefix = url ? url.slice(0, 16) : "(no DATABASE_URL)";
	// eslint-disable-next-line no-console
	console.log(`[prisma] initializing client (provider=postgresql) urlPrefix=${prefix}`);
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(baseOptions);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
