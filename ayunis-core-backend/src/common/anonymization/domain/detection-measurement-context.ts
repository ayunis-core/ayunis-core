export interface DetectionMeasurementCaller {
  source: 'user_message' | 'tool_result' | 'other';
}

export interface DetectionMeasurementContext extends DetectionMeasurementCaller {
  orgId: string;
}
