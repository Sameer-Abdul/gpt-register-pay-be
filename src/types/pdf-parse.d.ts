declare module 'pdf-parse' {
  interface PDFParseResult {
    text: string;
    metadata: any;
    version: string;
    info: any;
    numpages: number;
    numrender: number;
  }

  function pdfParse(data: Buffer | ArrayBuffer | Uint8Array, options?: any): Promise<PDFParseResult>;
  
  export = pdfParse;
}
