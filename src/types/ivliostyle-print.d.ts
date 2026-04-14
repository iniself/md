/* eslint-disable */
declare module '@vivliostyle/print' {
  export function printHTML(
    html: string,
    config?: {
      title?: string;
      printCallback?: (iframeWin: Window) => void;
      errorCallback?: (err: unknown) => void;
    }
  ): void;
}
