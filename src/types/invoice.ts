// Auto-generated from prisma/schema.prisma — canonical Invoice shape.
// The API serializes these exact field names; UI components read them.
// Do not hand-edit — regenerate from the schema instead.

export interface Invoice {
  id: string;
  createdAt: string;
  updatedAt: string;
  clientId: string;
  description: string;
  amount: string;
  dueDate: string;
  expectedPaymentDate: string;
  paidAt?: string | null;
  invoiceNumber?: number | null;
}
