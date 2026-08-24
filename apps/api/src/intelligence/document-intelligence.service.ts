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
        fields: fields as any,
        confidence,
        processedAt: new Date(),
      },
      create: {
        documentId,
        status: "COMPLETED",
        extractedText: text.slice(0, MAX_STORED_TEXT_LENGTH),
        fields: fields as any,
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

    return extraction;
  }

  async get(clientId: string, documentId: string) {
    await this.documents.getDocumentAndPath(clientId, documentId); // tenancy check
    return this.prisma.documentExtraction.findUnique({ where: { documentId } });
  }

  private async saveFailed(actor: RequestUser, clientId: string, documentId: string, reason: string) {
    const extraction = await this.prisma.documentExtraction.upsert({
      where: { documentId },
      update: { status: "FAILED", fields: { error: reason } as any, confidence: 0, processedAt: new Date() },
      create: { documentId, status: "FAILED", fields: { error: reason } as any, confidence: 0, processedAt: new Date() },
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
