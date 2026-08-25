// An illustrative, UBL-2.1-shaped invoice XML - structurally similar to
// what ZATCA's e-invoicing expects, but NOT validated against ZATCA's
// official XSD/schematron and NOT cryptographically signed. Good for
// showing the shape of the data a real integration would send; not fit to
// submit to a live system. See docs/ARCHITECTURE.md.

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export interface InvoiceXmlInput {
  invoiceNumber: string;
  date: Date;
  sellerName: string;
  sellerVatNumber: string;
  buyerName: string;
  currency: string;
  lines: Array<{ description: string; quantity: number; unitPrice: number; taxRate: number; lineTotal: number }>;
  subtotal: number;
  taxTotal: number;
  total: number;
  qrPayloadBase64: string;
}

export function buildInvoiceXml(input: InvoiceXmlInput): string {
  const lineItems = input.lines
    .map(
      (l, i) => `    <InvoiceLine>
      <ID>${i + 1}</ID>
      <ItemDescription>${esc(l.description)}</ItemDescription>
      <Quantity>${l.quantity}</Quantity>
      <PriceAmount currencyID="${input.currency}">${l.unitPrice.toFixed(2)}</PriceAmount>
      <TaxRate>${l.taxRate.toFixed(2)}</TaxRate>
      <LineExtensionAmount currencyID="${input.currency}">${l.lineTotal.toFixed(2)}</LineExtensionAmount>
    </InvoiceLine>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Illustrative ZATCA-shaped invoice XML - not schema-certified, not cryptographically signed. See docs/ARCHITECTURE.md. -->
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ID>${esc(input.invoiceNumber)}</ID>
  <IssueDate>${input.date.toISOString().slice(0, 10)}</IssueDate>
  <InvoiceTypeCode>388</InvoiceTypeCode>
  <DocumentCurrencyCode>${input.currency}</DocumentCurrencyCode>
  <AccountingSupplierParty>
    <PartyName>${esc(input.sellerName)}</PartyName>
    <PartyTaxScheme>
      <CompanyID>${esc(input.sellerVatNumber)}</CompanyID>
      <TaxScheme><ID>VAT</ID></TaxScheme>
    </PartyTaxScheme>
  </AccountingSupplierParty>
  <AccountingCustomerParty>
    <PartyName>${esc(input.buyerName)}</PartyName>
  </AccountingCustomerParty>
${lineItems}
  <TaxTotal>
    <TaxAmount currencyID="${input.currency}">${input.taxTotal.toFixed(2)}</TaxAmount>
  </TaxTotal>
  <LegalMonetaryTotal>
    <LineExtensionAmount currencyID="${input.currency}">${input.subtotal.toFixed(2)}</LineExtensionAmount>
    <TaxInclusiveAmount currencyID="${input.currency}">${input.total.toFixed(2)}</TaxInclusiveAmount>
    <PayableAmount currencyID="${input.currency}">${input.total.toFixed(2)}</PayableAmount>
  </LegalMonetaryTotal>
  <AdditionalDocumentReference>
    <ID>QR</ID>
    <Attachment>
      <EmbeddedDocumentBinaryObject mimeCode="text/plain">${input.qrPayloadBase64}</EmbeddedDocumentBinaryObject>
    </Attachment>
  </AdditionalDocumentReference>
</Invoice>
`;
}
