export interface EmailDeliveryReceipt {
  messageId: string;
  acceptedRecipients: string[];
  rejectedRecipients: string[];
  pendingRecipients: string[];
  statusCode: number | null;
}
