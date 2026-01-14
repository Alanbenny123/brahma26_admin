import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function generateEventPass() {
    // Character sets
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "@#_";
    
    // Combine all characters
    const allChars = uppercase + lowercase + numbers + symbols;
    
    // Ensure at least one of each type
    let result = "";
    result += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    result += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    result += numbers.charAt(Math.floor(Math.random() * numbers.length));
    result += symbols.charAt(Math.floor(Math.random() * symbols.length));
    
    // Fill remaining 4 characters randomly from all character sets
    for (let i = 4; i < 8; i++) {
        result += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    // Shuffle the result to randomize positions
    return result.split('').sort(() => Math.random() - 0.5).join('');
}

export function generateEventId(fest: string) {
    const prefix = (fest || "EV").substring(0, 2).toUpperCase();
    const digits = Math.floor(1000 + Math.random() * 9000).toString(); // Generates 4 random digits
    return `${prefix}${digits}`;
}
