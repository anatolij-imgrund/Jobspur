import { recognizeText, textRecognitionAvailable } from '@modules/text-recognition';

import { extractJobInfo, type JobInfo, type OcrLine } from './extractJobInfo';
import { photoUri } from './photoFiles';

export { textRecognitionAvailable };

/** Liest den Text aller Fotos (in ihrer Reihenfolge) und errät daraus die Angaben. */
export async function recognizeJobInfo(fileNames: readonly string[]): Promise<JobInfo> {
  const lines: OcrLine[] = [];
  for (const name of fileNames) {
    const result = await recognizeText(photoUri(name));
    if (result) lines.push(...result.lines);
  }
  return extractJobInfo(lines);
}
