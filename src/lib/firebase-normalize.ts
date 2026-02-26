/**
 * Normalizes a Firebase document to match the shape Appwrite documents had.
 * Firebase docs use `id`, Appwrite used `$id`.
 * Client pages reference `$id`, `$createdAt`, `$updatedAt` so we map them here.
 */
export function normalizeFirebaseDoc(doc: any): any {
    if (!doc) return doc;
    return {
        ...doc,
        $id: doc.id ?? doc.appwriteId ?? doc.$id,
        $createdAt: doc.createdAt ?? doc.$createdAt,
        $updatedAt: doc.updatedAt ?? doc.$updatedAt,
    };
}

export function normalizeFirebaseDocs(docs: any[]): any[] {
    return (docs || []).map(normalizeFirebaseDoc);
}
