'use server';

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import {
    getFirestoreAdmins,
    createFirestoreAdmin,
    updateFirestoreAdmin,
    deleteFirestoreAdmin,
} from "@/actions/firebase";
import { normalizeFirebaseDoc, normalizeFirebaseDocs } from "@/lib/firebase-normalize";

export async function login(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "Email and password are required" };
    }

    try {
        const { admins } = await getFirestoreAdmins();
        const adminUser = admins.find((a: any) => a.email === email) as any;

        if (!adminUser) {
            return { error: "Invalid credentials" };
        }

        const isPasswordValid = await bcrypt.compare(password, adminUser.pass);

        if (!isPasswordValid) {
            return { error: "Invalid credentials" };
        }

        const sessionToken = crypto.randomUUID();
        const now = new Date().toISOString();

        try {
            await updateFirestoreAdmin(adminUser.id, {
                log_in: now,
                session_token: sessionToken,
            });
        } catch (error) {
            console.warn("Could not update session_token:", error);
        }

        const cookieStore = await cookies();
        cookieStore.set("admin_session", `${adminUser.id}:${sessionToken}`, {
            httpOnly: true,
            path: "/",
            maxAge: 60 * 60 * 24,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
        });
        redirect("/dashboard/users");
    } catch (error) {
        console.error("Login error:", error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { error: `Login failed: ${errorMsg}` };
    }
}

export async function logout() {
    const cookieStore = await cookies();
    const sessionData = cookieStore.get("admin_session")?.value;

    if (sessionData) {
        const [adminId] = sessionData.split(':');
        try {
            const now = new Date().toISOString();
            await updateFirestoreAdmin(adminId, {
                log_out: now,
                session_token: null,
            });
        } catch (error) {
            console.error("Error updating logout timestamp:", error);
        }
    }

    cookieStore.delete("admin_session");
    redirect("/login");
}

export async function getCurrentAdmin() {
    const cookieStore = await cookies();
    const sessionData = cookieStore.get("admin_session")?.value;

    if (!sessionData) return null;

    const [adminId, sessionToken] = sessionData.split(':');
    if (!adminId || !sessionToken) return null;

    try {
        const { admins } = await getFirestoreAdmins();
        const admin = admins.find((a: any) => a.id === adminId) as any;
        if (!admin) {
            cookieStore.delete("admin_session");
            return null;
        }

        if (admin.session_token && admin.session_token !== sessionToken) {
            cookieStore.delete("admin_session");
            return null;
        }

        return {
            id: admin.id,
            email: admin.email,
            logIn: admin.log_in,
        };
    } catch (error) {
        console.error("Error fetching current admin:", error);
        return null;
    }
}

export async function getAdmins(fetchAll: boolean = false) {
    try {
        const { admins, total } = await getFirestoreAdmins();
        const normalized = normalizeFirebaseDocs(admins);
        return { documents: normalized, total };
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { success: false, error: "Invalid email format" };
    }

    if (password.length < 6) {
        return { success: false, error: "Password must be at least 6 characters long" };
    }

    try {
        const { admins } = await getFirestoreAdmins();
        const existing = admins.find((a: any) => a.email === email);
        if (existing) {
            return { success: false, error: "Admin with this email already exists" };
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await createFirestoreAdmin({ email, pass: hashedPassword });
        if (!result.success) {
            return { success: false, error: result.error || 'Failed to create admin' };
        }
        return { success: true };
    } catch (error) {
        console.error("Error creating admin:", error);
        return { success: false, error: "Failed to create admin. Please try again." };
    }
}

export async function deleteAdmin(adminId: string) {
    try {
        const cookieStore = await cookies();
        const sessionData = cookieStore.get("admin_session")?.value;
        const currentAdminId = sessionData?.split(':')[0];

        if (adminId === currentAdminId) {
            return { success: false, error: "Cannot delete your own admin account" };
        }

        const result = await deleteFirestoreAdmin(adminId);
        return result;
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { success: false, error: "Invalid email format" };
    }

    if (password && password.length < 6) {
        return { success: false, error: "Password must be at least 6 characters long" };
    }

    try {
        const { admins } = await getFirestoreAdmins();
        const existing = admins.find((a: any) => a.email === email && a.id !== adminId);
        if (existing) {
            return { success: false, error: "Email is already used by another admin" };
        }

        const updateData: any = { email };

        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            updateData.pass = await bcrypt.hash(password, salt);
        }

        const result = await updateFirestoreAdmin(adminId, updateData);
        return result;
    } catch (error) {
        console.error("Error updating admin:", error);
        return { success: false, error: "Failed to update admin. Please try again." };
    }
}
