import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function generateEventPass() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed similar looking chars like I, O, 0, 1
    let result = "";
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export function generateEventId(fest: string) {
    const prefix = (fest || "EV").substring(0, 2).toUpperCase();
    const digits = Math.floor(1000 + Math.random() * 9000).toString(); // Generates 4 random digits
    return `${prefix}${digits}`;
}
