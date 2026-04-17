declare module 'pdfjs-dist' {
    const content: any;
    export = content;
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs' {
    const content: any;
    export default content;
}

declare module 'exceljs' {
    const ExcelJS: any;
    export default ExcelJS;
}

declare namespace ExcelJS {
    type Workbook = any;
    type Worksheet = any;
    type Column = any;
    type Row = any;
    type Cell = any;
    type Alignment = any;
    type Buffer = any;
    type Font = any;
}
