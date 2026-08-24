import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@accountant-os/db";

// Single shared Prisma client for the whole API process. Every domain
// service depends on this instead of instantiating its own client so that
// connection pooling and (later) query middleware - e.g. audit logging - is
// centralized in one place.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
