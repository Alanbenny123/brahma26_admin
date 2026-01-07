'use server';

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
    const username = formData.get("username");
    const password = formData.get("password");

    if (
        username === process.env.ADMIN_USERNAME &&
        password === process.env.ADMIN_PASSWORD
    ) {
        // Set a simple cookie for "auth"
        const cookieStore = await cookies();
        cookieStore.set("admin_session", "true", {
            httpOnly: true,
            path: "/",
            maxAge: 60 * 60 * 24 // 1 day
        });
        redirect("/"); // Redirect to homepage instead of dashboard
    } else {
        return { error: "Invalid credentials" };
    }
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete("admin_session");
    redirect("/");
}