import { describe, expect, it } from "vitest";

import {
  Asset,
  AssetId,
  AssetName,
  AssetPath,
  AssetType,
  BackgroundAsset,
  BgmAsset,
  CharacterImageAsset,
  SeAsset,
  VoiceAsset,
} from "../../core/src";

describe("Asset Core", () => {
  it("creates an asset snapshot from validated value objects", () => {
    const asset = Asset.create({
      assetId: " a-1 ",
      assetName: " 背景 ",
      assetType: "background",
      assetPath: " assets/backgrounds/room.png ",
    });

    expect(asset.toSnapshot()).toEqual({
      assetId: "a-1",
      assetName: "背景",
      assetType: "background",
      assetPath: "assets/backgrounds/room.png",
    });
  });

  it("rejects empty id, name, and path", () => {
    expect(() => AssetId.create("   ")).toThrow("AssetId is required.");
    expect(() => AssetName.create("   ")).toThrow("AssetName is required.");
    expect(() => AssetPath.create("   ")).toThrow("AssetPath is required.");
  });

  it("rejects unsupported asset types", () => {
    expect(() => AssetType.create("movie")).toThrow("Unsupported AssetType: movie.");
  });

  it("keeps typed asset factories as thin Asset constructors", () => {
    expect(
      BackgroundAsset.create({ assetId: "bg-1", assetName: "背景", assetPath: "assets/bg.png" })
        .toSnapshot()
        .assetType,
    ).toBe("background");
    expect(
      CharacterImageAsset.create({ assetId: "ci-1", assetName: "通常", assetPath: "assets/ch.png" })
        .toSnapshot()
        .assetType,
    ).toBe("character_image");
    expect(
      VoiceAsset.create({ assetId: "v-1", assetName: "セリフ", assetPath: "voices/talk.wav" })
        .toSnapshot()
        .assetType,
    ).toBe("voice");
    expect(BgmAsset.create({ assetId: "b-1", assetName: "BGM", assetPath: "assets/bgm.wav" }).toSnapshot().assetType).toBe(
      "bgm",
    );
    expect(SeAsset.create({ assetId: "s-1", assetName: "SE", assetPath: "assets/se.wav" }).toSnapshot().assetType).toBe(
      "se",
    );
  });

  it("can rename and move an asset without changing id or type", () => {
    const asset = Asset.create({
      assetId: "a-1",
      assetName: "Old",
      assetType: "voice",
      assetPath: "voices/old.wav",
    });

    asset.rename("New");
    asset.changePath("voices/new.wav");

    expect(asset.toSnapshot()).toEqual({
      assetId: "a-1",
      assetName: "New",
      assetType: "voice",
      assetPath: "voices/new.wav",
    });
  });
});
