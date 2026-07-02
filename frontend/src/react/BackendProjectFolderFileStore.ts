import type { AssetFileStore, AssetFileWriteInput } from "../../../app/src";

export type BackendProjectFolderFileStoreConfig = {
  getProjectId(): string;
  backendBaseUrl?: string;
};

export type BackendProjectWriteResult = {
  folderName: string;
  projectJsonPath: "project.json";
};

export class BackendProjectFolderFileStore implements AssetFileStore {
  private readonly backendBaseUrl: string;

  constructor(private readonly config: BackendProjectFolderFileStoreConfig) {
    this.backendBaseUrl = config.backendBaseUrl ?? "http://localhost:8000";
  }

  get hasProjectFolder(): boolean {
    return true;
  }

  get projectFolderName(): string {
    return `projects/${this.projectId}`;
  }

  async chooseProjectFolder(): Promise<string> {
    return this.ensureProjectFolderSelected();
  }

  async ensureProjectFolderSelected(): Promise<string> {
    return this.projectFolderName;
  }

  async exists(relativePath: string): Promise<boolean> {
    const response = await fetch(this.createProjectFileUrl("exists", relativePath));

    if (!response.ok) {
      throw new Error(await createBackendErrorMessage(response, "Asset existence check failed"));
    }

    const body = (await response.json()) as { exists?: unknown };
    return body.exists === true;
  }

  async write(input: AssetFileWriteInput): Promise<void> {
    const uploadBody = new ArrayBuffer(input.data.byteLength);
    new Uint8Array(uploadBody).set(input.data);

    const response = await fetch(this.createProjectFileUrl("write", input.relativePath), {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: uploadBody,
    });

    if (!response.ok) {
      throw new Error(await createBackendErrorMessage(response, "Asset upload failed"));
    }
  }

  async writeProjectJson(projectJson: string): Promise<BackendProjectWriteResult> {
    const response = await fetch(this.createProjectFileUrl("write", "project.json"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: projectJson,
    });

    if (!response.ok) {
      throw new Error(await createBackendErrorMessage(response, "Project json save failed"));
    }

    return {
      folderName: this.projectFolderName,
      projectJsonPath: "project.json",
    };
  }

  private get projectId(): string {
    const projectId = this.config.getProjectId().trim();

    if (projectId.length === 0) {
      throw new Error("Project id is required before writing project files.");
    }

    return projectId;
  }

  private createProjectFileUrl(kind: "exists" | "write", relativePath: string): string {
    const projectId = encodeURIComponent(this.projectId);
    const path = encodeURIComponent(relativePath);
    const suffix = kind === "exists" ? "/exists" : "";

    return `${this.backendBaseUrl}/api/projects/${projectId}/files${suffix}?relativePath=${path}`;
  }
}

async function createBackendErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    return typeof body.detail === "string" ? body.detail : `${fallback}: ${response.status}`;
  } catch {
    return `${fallback}: ${response.status}`;
  }
}
