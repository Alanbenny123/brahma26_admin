/**
 * Convert a Firebase Timestamp to ISO string if needed.
 * Only handles Timestamp objects, not deep structures - avoids stack overflow.
 */
function tsToStr(val: any): string | any {
    if (val && typeof val === 'object' && typeof val.toDate === 'function') {
        return val.toDate().toISOString();
    }
    return val;
}

/**
 * Normalizes a Firebase document to match the shape Appwrite documents had.
 * - Firebase docs use `id`, Appwrite used `$id`.
 * - Converts known Timestamp fields to ISO strings.
 * - Intentionally NOT deep-recursive to avoid stack overflow on large datasets.
 */
export function normalizeFirebaseDoc(doc: any): any {
    if (!doc) return doc;

    const out: Record<string, any> = {};
    for (const key of Object.keys(doc)) {
        const val = doc[key];
        // Convert Timestamp fields
        if (val && typeof val === 'object' && typeof val.toDate === 'function') {
            out[key] = val.toDate().toISOString();
        } else if (Array.isArray(val)) {
            // Shallow-serialize arrays (convert any Timestamps inside)
            out[key] = val.map(tsToStr);
        } else {
            out[key] = val;
        }
    }

    return {
        ...out,
        $id: out.id ?? out.appwriteId ?? out.$id,
        $createdAt: out.createdAt ?? out.$createdAt,
        $updatedAt: out.updatedAt ?? out.$updatedAt,
    };
}

export function normalizeFirebaseDocs(docs: any[]): any[] {
    return (docs || []).map(normalizeFirebaseDoc);
}
