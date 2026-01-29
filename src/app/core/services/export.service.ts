import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Injectable({
    providedIn: 'root'
})
export class ExportService {

    constructor() { }

    /**
     * Export data to Excel file
     * @param data Array of objects to export
     * @param filename Name of the file (without extension)
     * @param sheetName Name of the sheet (default: 'Data')
     */
    exportToExcel(data: any[], filename: string, sheetName: string = 'Data'): void {
        if (!data || data.length === 0) {
            console.warn('No data to export');
            return;
        }

        try {
            // Create worksheet from data
            const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);

            // Auto-size columns
            const columnWidths = this.calculateColumnWidths(data);
            worksheet['!cols'] = columnWidths;

            // Create workbook
            const workbook: XLSX.WorkBook = {
                Sheets: { [sheetName]: worksheet },
                SheetNames: [sheetName]
            };

            // Generate Excel file
            const excelBuffer: any = XLSX.write(workbook, {
                bookType: 'xlsx',
                type: 'array'
            });

            // Save file
            this.saveAsExcelFile(excelBuffer, filename);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            throw error;
        }
    }

    /**
     * Calculate optimal column widths based on content
     */
    private calculateColumnWidths(data: any[]): any[] {
        if (!data || data.length === 0) return [];

        const keys = Object.keys(data[0]);
        const widths = keys.map(key => {
            const maxLength = Math.max(
                key.length,
                ...data.map(row => {
                    const value = row[key];
                    return value ? String(value).length : 0;
                })
            );
            return { wch: Math.min(maxLength + 2, 50) }; // Max width of 50
        });

        return widths;
    }

    /**
     * Save Excel buffer as file
     */
    private saveAsExcelFile(buffer: any, fileName: string): void {
        const data: Blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        // Add timestamp to filename
        const timestamp = new Date().toISOString().split('T')[0];
        const fullFileName = `${fileName}_${timestamp}.xlsx`;

        saveAs(data, fullFileName);
    }

    /**
     * Format data for export by removing unwanted fields and formatting dates
     */
    formatDataForExport(data: any[], excludeFields: string[] = []): any[] {
        return data.map(item => {
            const formatted: any = {};

            Object.keys(item).forEach(key => {
                // Skip excluded fields
                if (excludeFields.includes(key)) return;

                const value = item[key];

                // Format dates
                if (value instanceof Date) {
                    formatted[key] = value.toLocaleDateString('fr-FR');
                }
                // Handle nested objects (take first level only)
                else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    formatted[key] = JSON.stringify(value);
                }
                // Handle arrays
                else if (Array.isArray(value)) {
                    formatted[key] = value.join(', ');
                }
                // Regular values
                else {
                    formatted[key] = value;
                }
            });

            return formatted;
        });
    }
}
