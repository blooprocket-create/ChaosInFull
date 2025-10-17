import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const options: Prisma.PrismaClientOptions | undefined =
	process.env.NODE_ENV !== "production"
		? { log: ["error", "warn"] }
		: undefined;

export const prisma = globalForPrisma.prisma ?? new PrismaClient(options);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
