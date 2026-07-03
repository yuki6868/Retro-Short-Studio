export type CharacterImageMapDto = {
  expression: Record<string, string>;
  eye: Record<string, string>;
  mouth: Record<string, string>;
  motion: Record<string, string>;
  variant?: Record<string, string>;
};

export type CharacterDto = {
  characterId: string;
  characterName: string;
  defaultExpression?: string;
  defaultEye?: string;
  defaultMouth?: string;
  defaultMotion?: string;
  imageMap?: CharacterImageMapDto;
  imageMapId: string | null;
};
