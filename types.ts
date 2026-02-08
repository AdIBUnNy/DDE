
export type StepStatus = 'pending' | 'running' | 'completed' | 'error';
export type StepType = 'source' | 'transform' | 'sink' | 'utility';

export interface PipelineStep {
  id: string;
  name: string;
  description: string;
  dependencies: string[];
  status?: StepStatus;
  type?: StepType;
}

export interface ValidationIssue {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

export interface GeneratedPipeline {
  id?: string;
  name: string;
  description: string;
  airflowCode: string;
  requirements: string[];
  dockerConfig: string;
  steps: PipelineStep[];
  monitoringMetrics: string[];
  validationSummary?: ValidationIssue[];
  isAccepted?: boolean;
  version?: string;
  timestamp?: number;
}

export type PipelineStatus = 'idle' | 'generating' | 'completed' | 'error';
export type ScheduleType = 'once' | 'hourly' | 'weekly' | 'monthly' | 'cron';

export interface PipelineSchedule {
  type: ScheduleType;
  cronValue?: string;
}
