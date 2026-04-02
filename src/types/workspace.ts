export interface WorkspaceConfig {
  name: string;
  bknId: string;
  createdAt: string;
  updatedAt: string;
}

/** Entry in ~/.bkn-studio/workspaces.json */
export interface WorkspaceIndexEntry {
  name: string;
  bknId: string;
  createdAt: string;
}

export interface ResourceFile {
  name: string;
  size: number;
  modifiedAt: string;
}

export interface ArtifactFile {
  name: string;
  size: number;
  type: string;
  modifiedAt: string;
}
