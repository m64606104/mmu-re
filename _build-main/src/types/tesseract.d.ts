declare module 'tesseract.js' {
  export interface RecognizeResult {
    data?: {
      text?: string;
    };
  }

  export function recognize(
    image: string | HTMLImageElement | HTMLCanvasElement,
    lang?: string,
    options?: Record<string, any>
  ): Promise<RecognizeResult>;
}

