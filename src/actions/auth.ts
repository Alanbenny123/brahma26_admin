'use server';

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient, appwriteConfig } from "@/lib/appwrite";
import { Query } from "node-appwrite";

export async function login(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "Email and password are required" };
    }

    try {
        const { databases } = await createAdminClient();

        // Query admin table for the email
        const response = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.collections.admin,
            [Query.equal("email", email)]
        );

        if (response.documents.length === 0) {
            return { error: "Invalid credentials" };
        }

        const adminUser = response.documents[0];

        // Compare password (plain text comparison as per your schema)
        if (adminUser.pass !== password) {
            return { error: "Invalid credentials" };
        }

        // Record login timestamp
        const now = new Date().toISOString();
        await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.collections.admin,
            adminUser.$id,
            { log_in: now }
        );

        // Set admin session cookie
        const cookieStore = await cookies();
        cookieStore.set("admin_session", adminUser.$id, {
            httpOnly: true,
            path: "/",
            maxAge: 60 * 60 * 24 // 1 day
        });
    } catch (error) {
        console.error("Login error:", error);
        return { error: "Login failed. Please try again." };
    }
    
    // Redirect outside try-catch to prevent catching NEXT_REDIRECT
    redirect("/dashboard/users");
}

export async function logout() {
    const cookieStore = await cookies();
    const adminId = cookieStore.get("admin_session")?.value;

    if (adminId) {
        try {
            const { databases } = await createAdminClient();

            // Record logout timestamp
            const now = new Date().toISOString();
            await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.collections.admin,
                adminId,
                { log_out: now }
            );
        } catch (error) {
            console.error("Error updating logout timestamp:", error);
            // Continue with logout even if timestamp update fails
        }
    }

    // Delete the session cookie
    cookieStore.delete("admin_session");
    
    redirect("/login");
}