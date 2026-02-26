/**
 * Converts a Firebase Timestamp or any non-plain value to a serializable primitive.
 */
function serializeValue(value: any): any {
    if (value === null || value === undefined) return value;
    // Firebase Timestamp has seconds + nanoseconds and a toDate() method
    if (typeof value === 'object' && typeof value.toDate === 'function') {
        return value.toDate().toISOString();
    }
    if (Array.isArray(value)) {
        return value.map(serializeValue);
    }
    if (typeof value === 'object' && value.constructor === Object) {
        const out: Record<string, any> = {};
        for (const key of Object.keys(value)) {
            out[key] = serializeValue(value[key]);
        }
        return out;
    }
    return value;
}

/**
 * Normalizes a Firebase document to match the shape Appwrite documents had.
 * - Firebase docs use `id`, Appwrite used `$id`.
 * - Converts Firebase Timestamp objects to ISO strings (not serializable otherwise).
 */
export function normalizeFirebaseDoc(doc: any): any {
    if (!doc) return doc;
    const serialized = serializeValue(doc);
    return {
        ...serialized,
        $id: serialized.id ?? serialized.appwriteId ?? serialized.$id,
        $createdAt: serialized.createdAt ?? serialized.$createdAt,
        $updatedAt: serialized.updatedAt ?? serialized.$updatedAt,
    };
}

export function normalizeFirebaseDocs(docs: any[]): any[] {
    return (docs || []).map(normalizeFirebaseDoc);
}
