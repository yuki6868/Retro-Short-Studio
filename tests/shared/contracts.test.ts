import { describe, expect, it } from "vitest";

import type {
  EngineRequestDto,
  EngineResponseDto,
  IEngineClient,
  IProjectSerializer,
  ProjectDto,
} from "../../shared";

describe("IEngineClient", () => {
  it("can return a success response for the matching request", async () => {
    class EchoEngineClient implements IEngineClient {
      async execute<TRequestPayload, TResponsePayload>(
        request: EngineRequestDto<TRequestPayload>,
      ): Promise<EngineResponseDto<TResponsePayload>> {
        return {
          requestId: request.requestId,
          success: true,
          payload: request.payload as unknown as TResponsePayload,
          errorMessage: null,
        };
      }
    }

    await expect(
      new EchoEngineClient().execute<{ frame: number }, { frame: number }>({
        requestId: "req-1",
        requestType: "preview",
        payload: { frame: 10 },
      }),
    ).resolves.toEqual({
      requestId: "req-1",
      success: true,
      payload: { frame: 10 },
      errorMessage: null,
    });
  });

  it("can return a failure response with an error channel", async () => {
    class FailingEngineClient implements IEngineClient {
      async execute<TRequestPayload, TResponsePayload>(
        request: EngineRequestDto<TRequestPayload>,
      ): Promise<EngineResponseDto<TResponsePayload>> {
        return {
          requestId: request.requestId,
          success: false,
          payload: null,
          errorMessage: "engine failed",
        };
      }
    }

    await expect(
      new FailingEngineClient().execute({
        requestId: "req-1",
        requestType: "render",
        payload: {},
      }),
    ).resolves.toEqual({
      requestId: "req-1",
      success: false,
      payload: null,
      errorMessage: "engine failed",
    });
  });
});

describe("IProjectSerializer", () => {
  it("can be implemented for a ProjectDto round trip", () => {
    class JsonProjectSerializer implements IProjectSerializer {
      serialize(project: ProjectDto): string {
        return JSON.stringify(project);
      }

      deserialize(serializedProject: string): ProjectDto {
        return JSON.parse(serializedProject) as ProjectDto;
      }
    }

    const project: ProjectDto = {
      projectId: "p-1",
      projectName: "Sample",
      settings: { width: 1080, height: 1920, fps: 30 },
      assets: [],
      characters: [],
      scenes: [],
    };

    const serializer = new JsonProjectSerializer();

    expect(serializer.deserialize(serializer.serialize(project))).toEqual(project);
  });
});
