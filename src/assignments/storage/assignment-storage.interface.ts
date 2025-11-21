// src/assignments/storage/assignment-storage.interface.ts
export interface AssignmentLocationInfo {
  state: string;
  mandal: string;
  district: string;
  schoolName: string; // best-effort; may come from register data
}

export interface SaveAssignmentOptions {
  buffer: Buffer;
  originalName: string;
  location: AssignmentLocationInfo;
}

export interface AssignmentStorage {
  saveAssignment(
    assignmentId: number,
    file: Buffer,
    originalName: string,
    meta?: {
      state: string;
      district: string;
      mandal: string;
      school: string;
    }
  ): Promise<string>;

  getFile(filePath: string): Promise<Buffer | null>;
}
