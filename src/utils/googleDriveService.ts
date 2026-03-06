/**
 * googleDriveService.ts
 * Handlers for uploading Excel buffers to Google Drive API as Google Sheets
 */

export const uploadExcelToGoogleDrive = async (
    excelBuffer: ArrayBuffer,
    fileName: string,
    accessToken: string
) => {
    // We use multipart/related upload to upload both metadata and file content simultaneously
    const metadata = {
        name: fileName,
        mimeType: "application/vnd.google-apps.spreadsheet", // Converts Excel to Google Sheet
    };

    const form = new FormData();
    form.append(
        "metadata",
        new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append(
        "file",
        new Blob([excelBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
    );

    const response = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                // Note: Do not set Content-Type header manually when using FormData
                // fetch will automatically set it with the correct boundary
            },
            body: form,
        }
    );

    if (!response.ok) {
        const errorBody = await response.text();
        const err = new Error(
            `Google Drive API error (${response.status}): ${errorBody}`,
        ) as Error & { isAuthError?: boolean };
        if (response.status === 401) err.isAuthError = true;
        throw err;
    }

    const result = await response.json();
    // `result.id` is the Google Drive document ID
    // To construct the spreadsheet URL:
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${result.id}/edit`;
    return sheetUrl;
};
