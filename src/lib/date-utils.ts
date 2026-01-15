/**
 * Utility functions for consistent date and time formatting
 * Time format: 9:00 AM (12-hour with AM/PM, no seconds)
 * Date format: dd-mm-yyyy
 */

/**
 * Convert any time format to 12-hour format without seconds (e.g., "9:00 AM")
 * Handles: "10:00:00 AM", "14:30", "14:30:00", "9:00 AM"
 */
export function formatTime(timeStr: string): string {
    if (!timeStr) return '';
    
    // Remove any existing seconds and extra whitespace
    let cleaned = timeStr.trim();
    
    // Check if already has AM/PM
    const hasAMPM = /AM|PM/i.test(cleaned);
    
    if (hasAMPM) {
        // Remove seconds if present (e.g., "10:00:00 AM" -> "10:00 AM")
        cleaned = cleaned.replace(/(\d+):(\d+):\d+\s*(AM|PM)/i, '$1:$2 $3');
        // Normalize AM/PM to uppercase
        cleaned = cleaned.replace(/am/i, 'AM').replace(/pm/i, 'PM');
        return cleaned;
    }
    
    // Parse 24-hour format (with or without seconds)
    const match = cleaned.match(/^(\d+):(\d+)(?::\d+)?$/);
    if (!match) return timeStr; // Return original if can't parse
    
    const hours = parseInt(match[1]);
    const minutes = match[2];
    
    if (hours < 0 || hours > 23 || parseInt(minutes) < 0 || parseInt(minutes) > 59) {
        return timeStr; // Invalid time
    }
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    
    return `${hours12}:${minutes} ${period}`;
}

/**
 * Convert date to dd-mm-yyyy format
 * Handles: Date objects, ISO strings, yyyy-mm-dd, mm/dd/yyyy, etc.
 */
export function formatDate(dateInput: string | Date): string {
    if (!dateInput) return '';
    
    let date: Date;
    
    if (typeof dateInput === 'string') {
        const str = dateInput.trim();
        
        // If already in dd-mm-yyyy format, return as is
        if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
            return str;
        }
        
        // Check for ISO format (yyyy-mm-dd or yyyy-mm-ddT...)
        const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
            const [, year, month, day] = isoMatch;
            return `${day}-${month}-${year}`;
        }
        
        // Parse other formats using Date constructor
        date = new Date(str);
    } else {
        date = dateInput;
    }
    
    if (isNaN(date.getTime())) {
        return dateInput.toString(); // Return original if can't parse
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
}

/**
 * Convert dd-mm-yyyy to yyyy-mm-dd (for database storage if needed)
 */
export function toISODateFormat(dateStr: string): string {
    if (!dateStr) return '';
    
    // If already in yyyy-mm-dd format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    
    // Parse dd-mm-yyyy format
    const match = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match) {
        const [, day, month, year] = match;
        return `${year}-${month}-${day}`;
    }
    
    // Try to parse as Date and convert
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    return dateStr;
}

/**
 * Parse dd-mm-yyyy to Date object
 */
export function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    
    const match = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match) {
        const [, day, month, year] = match;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Validate time format (9:00 AM)
 */
export function isValidTimeFormat(timeStr: string): boolean {
    if (!timeStr) return false;
    return /^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(timeStr.trim());
}

/**
 * Validate date format (dd-mm-yyyy)
 */
export function isValidDateFormat(dateStr: string): boolean {
    if (!dateStr) return false;
    const match = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!match) return false;
    
    const [, day, month, year] = match;
    const d = parseInt(day);
    const m = parseInt(month);
    const y = parseInt(year);
    
    return d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100;
}
