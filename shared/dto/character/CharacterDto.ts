export type CharacterImageMapDto = {
  expression: Record<string, string>;
  eye: Record<string, string>;
  mouth: Record<string, string>;
  motion: Record<string, string>;
  variant?: Record<string, string>;
};

export type CharacterVariantSelectionDto = {
  expression: string;
  eye: string;
  mouth: string;
};

export type AutoMotionDisableConditionDto = {
  expression?: string[];
  eye?: string[];
  mouth?: string[];
};

export type AutoMotionDto = {
  type: "blink";
  interval: number;
  duration: number;
  randomRange?: number;
  disableCondition?: AutoMotionDisableConditionDto;
};

export type CharacterDto = {
  characterId: string;
  characterName: string;
  defaultExpression?: string;
  defaultEye?: string;
  defaultMouth?: string;
  defaultMotion?: string;
  imageMap?: CharacterImageMapDto;
  currentVariant?: CharacterVariantSelectionDto;
  autoMotions?: AutoMotionDto[];
  imageMapId: string | null;
};
