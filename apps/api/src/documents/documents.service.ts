import { Injectable, NotFoundException } from "@nestjs/common";
import { createReadStream } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { RequestUser } from "../common/types";

const STORAGE_ROOT = process.env.DOCUMENT_STORAGE_DIR ?? join(process.cwd(), "uploads");

// Document intelligence (SRS 40-41) storage backend. Phase 1 uses local
// disk with a content-addressed-ish key (uuid + original filename) and
// keeps all searchable metadata in SQLite; swapping this for S3/object
// storage later only touches this one service (storageKey stays a stable
// opaque string either way).
@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(clientId: string) {
    return this.prisma.document.findMany({ where: { clientId }, orderBy: { createdAt: "desc" } });
  }

  async upload(
    actor: RequestUser,
    clientId: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    category?: string,
  ) {
    const storageKey = `${clientId}/${randomUUID()}-${file.originalname}`;
    const fullPath = join(STORAGE_ROOT, storageKey);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.buffer);

    const document = await this.prisma.document.create({
      data: {
        firmId: actor.firmId,
        clientId,
        uploadedById: actor.id,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey,
        category,
      },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "DOCUMENT_UPLOADED",
      entityType: "Document",
      entityId: document.id,
      after: { fileName: document.fileName, category: document.category },
    });

    return document;
  }

  async getStream(clientId: string, documentId: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document || document.clientId !== clientId) throw new NotFoundException("Document not found");
    const stream = createReadStream(join(STORAGE_ROOT, document.storageKey));
    return { document, stream };
  }

  // Used by DocumentIntelligenceService to read the raw bytes for
  // extraction, rather than streaming to an HTTP response.
  async getDocumentAndPath(clientId: string, documentId: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document || document.clientId !== clientId) throw new NotFoundException("Document not found");
    return { document, absolutePath: join(STORAGE_ROOT, document.storageKey) };
  }
}
