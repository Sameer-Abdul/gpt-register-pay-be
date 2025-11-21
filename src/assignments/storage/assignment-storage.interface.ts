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
  // Saves an assignment file and returns a POSIX-style relative path from the base path
  saveAssignment(options: SaveAssignmentOptions): Promise<string>;
  
  // Retrieves an assignment file by ID
  getFile(assignmentId: number): Promise<Buffer | null>;
}
