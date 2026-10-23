import { NativeModule, requireOptionalNativeModule } from 'expo';

export type RecognizedLine = {
  text: string;
  /** Absatz (Textblock), zu dem die Zeile gehört */
  block: number;
  top: number;
  left: number;
  /** Zeilenhöhe in Pixeln; größer heißt meist Überschrift */
  height: number;
};

export type RecognizedText = { width: number; height: number; lines: RecognizedLine[] };

declare class TextRecognitionNative extends NativeModule {
  recognizeAsync(uri: string): Promise<RecognizedText>;
}

/**
 * Fehlt in Expo Go und auf iOS: Das Modul steckt nur im eigenen Android-Build.
 * Die App blendet die Texterkennung dann einfach aus.
 */
const native = requireOptionalNativeModule<TextRecognitionNative>('JobspurTextRecognition');

export const textRecognitionAvailable = native !== null;

export async function recognizeText(uri: string): Promise<RecognizedText | null> {
  return native ? native.recognizeAsync(uri) : null;
}
