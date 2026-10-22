import { Injectable } from "@nestjs/common";
import { readFile } from "fs/promises";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { DocumentsService } from "../documents/documents.service";
import { extractFields } from "./field-extraction";
import type { RequestUser } from "../common/types";

// pdf-parse ships as a CJS module with no usable ESM/type-safe default
// export shape under our tsconfig, so it's required directly.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = require("pdf-parse");

const MAX_STORED_TEXT_LENGTH = 20000;

// SQLite has no Json column type, so `fields` is stored as a JSON string.
// Parse it back on the way out so the public API shape stays unchanged.
function parseFields<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

// Document Intelligence v1 (SRS 40). Handles text-based PDFs and plain
// text/CSV; image-based (scanned) documents are explicitly unsupported
// here - image OCR (e.g. Tesseract) needs a system binary this environment
// doesn't have, so extraction fails fast with a clear reason rather than
// silently returning nothing.
@Injectable()
export class DocumentIntelligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly audit: AuditService,
  ) {}

  async extract(actor: RequestUser, clientId: string, documentId: string) {
    const { document, absolutePath } = await this.documents.getDocumentAndPath(clientId, documentId);

    let text: string;
    if (document.mimeType === "application/pdf") {
      const buffer = await readFile(absolutePath);
      const result = await pdfParse(buffer).catch(() => null);
      if (!result || !result.text.trim()) {
        return this.saveFailed(actor, clientId, documentId, "Could not extract text from this PDF (it may be a scanned image)");
      }
      text = result.text;
    } else if (document.mimeType.startsWith("text/") || document.mimeType === "application/csv") {
      text = await readFile(absolutePath, "utf-8");
    } else {
      return this.saveFailed(
        actor,
        clientId,
        documentId,
        `Extraction not supported for ${document.mimeType} - image OCR is not available in this deployment`,
      );
    }

    const { fields, confidence } = extractFields(text);

    const extraction = await this.prisma.documentExtraction.upsert({
      where: { documentId },
      update: {
        status: "COMPLETED",
        extractedText: text.slice(0, MAX_STORED_TEXT_LENGTH),
        fields: JSON.stringify(fields),
        confidence,
        processedAt: new Date(),
      },
      create: {
        documentId,
        status: "COMPLETED",
        extractedText: text.slice(0, MAX_STORED_TEXT_LENGTH),
        fields: JSON.stringify(fields),
        confidence,
        processedAt: new Date(),
      },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "DOCUMENT_EXTRACTION_COMPLETED",
      entityType: "DocumentExtraction",
      entityId: extraction.id,
      after: { fields, confidence },
    });

    return { ...extraction, fields: parseFields(extraction.fields) };
  }

  async get(clientId: string, documentId: string) {
    await this.documents.getDocumentAndPath(clientId, documentId); // tenancy check
    const extraction = await this.prisma.documentExtraction.findUnique({ where: { documentId } });
    return extraction ? { ...extraction, fields: parseFields(extraction.fields) } : extraction;
  }

  private async saveFailed(actor: RequestUser, clientId: string, documentId: string, reason: string) {
    const extraction = await this.prisma.documentExtraction.upsert({
      where: { documentId },
      update: { status: "FAILED", fields: JSON.stringify({ error: reason }), confidence: 0, processedAt: new Date() },
      create: { documentId, status: "FAILED", fields: JSON.stringify({ error: reason }), confidence: 0, processedAt: new Date() },
    });
    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "DOCUMENT_EXTRACTION_FAILED",
      entityType: "DocumentExtraction",
      entityId: extraction.id,
      after: { reason },
    });
    return extraction;
  }
}
