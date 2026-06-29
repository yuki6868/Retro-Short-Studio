export type VoiceRequest = {
  projectId: string;
  talkActionId: string;
  text: string;
  speakerId: string;
  outputPath: string;
};

export type VoiceResult = {
  voiceAssetId: string | null;
  wavPath: string;
  duration: number;
};
