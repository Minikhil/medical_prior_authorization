
  export enum AuthStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  SUBMITTED = "SUBMITTED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED"
}

export type Auth = {
  patientName?: string;
  patientDateOfBirth?: string;
  status?: AuthStatus;
  icdCodes?: string[];
  cptCodes?: string[];
  cptCodesExplanation?: string;
  overrideExplanation?: string;
  isOverride?: boolean;
}

export type EditableAuth = {
  patientName: string;
  patientDateOfBirth: string;
  icdCodes: string[];
  cptCodes: string[];
  cptCodesExplanation: string;
}
  