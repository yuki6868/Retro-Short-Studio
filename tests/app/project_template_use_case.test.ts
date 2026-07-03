import { describe, expect, it } from "vitest";

import { ProjectTemplateUseCase } from "../../app/src";
import { DeterministicIdGenerator } from "../../core/src";
import { projectSnapshotToProjectDto } from "../../frontend/src/react/ProjectDtoMapper";
import { ProjectJsonSerializer } from "../../storage/src";

describe("ProjectTemplateUseCase", () => {
  it("lists built-in templates for explainer shorts and Study With Me projects", () => {
    const useCase = new ProjectTemplateUseCase({ idGenerator: new DeterministicIdGenerator() });

    expect(useCase.listTemplates()).toMatchObject([
      {
        templateId: "project-template-explainer-short",
        kind: "explainer_short",
        width: 1080,
        height: 1920,
        fps: 30,
        sceneCount: 3,
      },
      {
        templateId: "project-template-study-with-me",
        kind: "study_with_me",
        width: 1920,
        height: 1080,
        fps: 30,
        sceneCount: 2,
      },
    ]);
  });

  it("creates a saveable Project from a template without storing the ProjectTemplate in Project JSON", () => {
    const useCase = new ProjectTemplateUseCase({ idGenerator: new DeterministicIdGenerator() });

    const result = useCase.createProjectFromTemplate({
      templateId: "project-template-explainer-short",
      projectName: "会計解説ショート",
    });
    const projectDto = projectSnapshotToProjectDto(result.project.toSnapshot());
    const reloadedProjectDto = new ProjectJsonSerializer().deserialize(new ProjectJsonSerializer().serialize(projectDto));

    expect(result.project.toSnapshot().projectId).toBe("project-1");
    expect(result.state.selectedTemplateId).toBe("project-template-explainer-short");
    expect(projectDto.scenes).toHaveLength(3);
    expect(projectDto.sceneTemplates).toEqual([]);
    expect(projectDto).not.toHaveProperty("projectTemplates");
    expect(reloadedProjectDto).toEqual(projectDto);
  });

  it("rejects unknown templates before creating a project", () => {
    const useCase = new ProjectTemplateUseCase({ idGenerator: new DeterministicIdGenerator() });

    expect(() =>
      useCase.createProjectFromTemplate({ templateId: "missing", projectName: "Missing" }),
    ).toThrow("ProjectTemplate does not exist: missing.");
  });
});
