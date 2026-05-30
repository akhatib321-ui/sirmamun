// src/jobs/queue-names.ts
export const Queues = {
  MATCH_SALES_ITEMS:  'match-sales-items',
  GENERATE_REORDER:   'generate-reorder',
} as const;

export type QueueName = (typeof Queues)[keyof typeof Queues];

// Job data shapes — typed inputs to each queue
export interface MatchSalesItemsJobData {
  salesReportId: string;
  organizationId: number;
}

export interface GenerateReorderJobData {
  locationId: string;
  organizationId: number;
  triggerType: 'SALES_IMPORT' | 'ORDER_RECEIVED' | 'SCHEDULED' | 'MANUAL';
  triggerSourceId?: string;
  windowDays?: number;
}
