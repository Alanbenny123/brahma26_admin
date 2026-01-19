'use server';

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient, appwriteConfig } from "@/lib/appwrite";
import { Query, ID } from "node-appwrite";
import bcrypt from "bcryptjs";

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

        // Compare password with bcrypt hash
        const isPasswordValid = await bcrypt.compare(password, adminUser.pass);
        
        if (!isPasswordValid) {
            return { error: "Invalid credentials" };
        }

        // Generate unique session token for this login
        const sessionToken = crypto.randomUUID();
        const now = new Date().toISOString();

        // Try to update admin with new session token
        try {
            await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.collections.admin,
                adminUser.$id,
                { 
                    log_in: now,
                    session_token: sessionToken
                }
            );
        } catch (error) {
            // If session_token field doesn't exist yet, just update log_in
            console.warn("Could not update session_token (field may not exist yet):", error);
            await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.collections.admin,
                adminUser.$id,
                { log_in: now }
            );
        }

        // Set session cookie with admin ID and session token
        const cookieStore = await cookies();
        cookieStore.set("admin_session", `${adminUser.$id}:${sessionToken}`, {
            httpOnly: true,
            path: "/",
            maxAge: 60 * 60 * 24, // 1 day
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
        });
    } catch (error) {
        console.error("Login error:", error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { error: `Login failed: ${errorMsg}` };
    }
    
    // Redirect outside try-catch to prevent catching NEXT_REDIRECT
    redirect("/dashboard/users");
}

export async function logout() {
    const cookieStore = await cookies();
    const sessionData = cookieStore.get("admin_session")?.value;

    if (sessionData) {
        const [adminId] = sessionData.split(':');
        try {
            const { databases } = await createAdminClient();

            // Record logout timestamp and clear session token
            const now = new Date().toISOString();
            await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.collections.admin,
                adminId,
                { 
                    log_out: now,
                    session_token: null
                }
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

// Get current logged-in admin info
export async function getCurrentAdmin() {
    const cookieStore = await cookies();
    const sessionData = cookieStore.get("admin_session")?.value;

    if (!sessionData) {
        return null;
    }

    const [adminId, sessionToken] = sessionData.split(':');

    if (!adminId || !sessionToken) {
        return null;
    }

    try {
        const { databases } = await createAdminClient();
        const admin = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.collections.admin,
            adminId
        );
        
        // Verify session token matches the one in database (only if field exists)
        if (admin.session_token && admin.session_token !== sessionToken) {
            // Session invalid - admin logged in elsewhere
            cookieStore.delete("admin_session");
            return null;
        }
        
        return {
            id: admin.$id,
            email: admin.email,
            logIn: admin.log_in
        };
    } catch (error) {
        console.error("Error fetching current admin:", error);
        return null;
    }
}

// Admin Management Functions

export async function getAdmins(fetchAll: boolean = false) {
    const { databases } = await createAdminClient();
    try {
        if (!fetchAll) {
            // Default behavior: fetch with limit
            const response = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.collections.admin,
                [Query.orderDesc('$createdAt'), Query.limit(100)]
            );
            return { documents: response.documents, total: response.total };
        }

        // Fetch ALL documents using pagination
        const allDocuments: any[] = [];
        let offset = 0;
        const limit = 100; // Appwrite max limit per request
        let hasMore = true;

        while (hasMore) {
            const response = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.collections.admin,
                [Query.orderDesc('$createdAt'), Query.limit(limit), Query.offset(offset)]
            );
            
            allDocuments.push(...response.documents);
            offset += limit;
            hasMore = response.documents.length === limit;
        }

        return { documents: allDocuments, total: allDocuments.length };
    } catch (error) {
        console.error('Error fetching admins:', error);
        return { documents: [], total: 0 };
    }
}

export async function createAdmin(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { success: false, error: "Email and password are required" };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { success: false, error: "Invalid email format" };
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
        return { success: false, error: "Password must be at least 6 characters long" };
    }

    try {
        const { databases } = await createAdminClient();

        // Check if admin with this email already exists
        const existingAdmin = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.collections.admin,
            [Query.equal("email", email)]
        );

        if (existingAdmin.documents.length > 0) {
            return { success: false, error: "Admin with this email already exists" };
        }

        // Hash password with bcrypt
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create admin document
        await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.collections.admin,
            ID.unique(),
            {
                email: email,
                pass: hashedPassword
            }
        );

        return { success: true };
    } catch (error) {
        console.error("Error creating admin:", error);
        return { success: false, error: "Failed to create admin. Please try again." };
    }
}

export async function deleteAdmin(adminId: string) {
    try {
        const { databases } = await createAdminClient();
        
        // Prevent deleting yourself (get current session)
        const cookieStore = await cookies();
        const currentAdminId = cookieStore.get("admin_session")?.value;
        
        if (adminId === currentAdminId) {
            return { success: false, error: "Cannot delete your own admin account" };
        }

        await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.collections.admin,
            adminId
        );

        return { success: true };
    } catch (error) {
        console.error("Error deleting admin:", error);
        return { success: false, error: "Failed to delete admin" };
    }
}

export async function updateAdmin(adminId: string, formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email) {
        return { success: false, error: "Email is required" };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { success: false, error: "Invalid email format" };
    }

    // If password is provided, validate strength
    if (password && password.length < 6) {
        return { success: false, error: "Password must be at least 6 characters long" };
    }

    try {
        const { databases } = await createAdminClient();

        // Check if email is already used by another admin
        const existingAdmin = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.collections.admin,
            [Query.equal("email", email)]
        );

        if (existingAdmin.documents.length > 0 && existingAdmin.documents[0].$id !== adminId) {
            return { success: false, error: "Email is already used by another admin" };
        }

        // Prepare update data
        const updateData: any = { email };

        // Only update password if provided
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            updateData.pass = hashedPassword;
        }

        // Update admin document
        await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.collections.admin,
            adminId,
            updateData
        );

        return { success: true };
    } catch (error) {
        console.error("Error updating admin:", error);
        return { success: false, error: "Failed to update admin. Please try again." };
    }
}