// ZATCA "Phase 1" simplified-invoice QR payload: five TLV (Tag-Length-Value)
// fields, base64-encoded as a whole - this is the published, non-cryptographic
// baseline every KSA simplified tax invoice QR carries. Real "Phase 2"
// integration additionally requires a cryptographic invoice hash, a digital
// signature, and the signing certificate's public key - none of which this
// environment has the government-issued certificate to produce, so this
// module stops at the five base fields. See docs/ARCHITECTURE.md.
export interface ZatcaQrFields {
  sellerName: string;
  vatRegistrationNumber: string;
  timestamp: Date;
  invoiceTotal: number;
  vatTotal: number;
}

function tlv(tag: number, value: string): Buffer {
  const valueBuffer = Buffer.from(value, "utf-8");
  if (valueBuffer.length > 255) {
    throw new Error(`ZATCA QR field ${tag} exceeds the 255-byte TLV length limit`);
  }
  return Buffer.concat([Buffer.from([tag, valueBuffer.length]), valueBuffer]);
}

export function buildZatcaQrPayloadBase64(fields: ZatcaQrFields): string {
  const buffer = Buffer.concat([
    tlv(1, fields.sellerName),
    tlv(2, fields.vatRegistrationNumber),
    tlv(3, fields.timestamp.toISOString()),
    tlv(4, fields.invoiceTotal.toFixed(2)),
    tlv(5, fields.vatTotal.toFixed(2)),
  ]);
  return buffer.toString("base64");
}
