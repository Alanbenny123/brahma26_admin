'use client';

import { login } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    // Clear any cached data when login page loads
    useEffect(() => {
        // Force a hard reload of the router cache
        router.refresh();
    }, [router]);

    async function handleSubmit(formData: FormData) {
        setError(null);
        setIsLoading(true);

        try {
            const result = await login(formData);
            if (result?.error) {
                setError(result.error);
            }
        } catch (err: unknown) {
            // Next.js redirect() throws - don't treat as error
            if (err && typeof err === 'object' && 'digest' in err && String((err as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
                return;
            }
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="z-10 w-full max-w-md p-4"
            >
                <Card className="glass-card border-white/10">
                    <CardHeader className="text-center pb-8">
                        <CardTitle className="text-3xl text-cyan-400">Admin Access</CardTitle>
                        <p className="text-white/50 text-sm mt-2">Brahma Ashwamedha</p>
                    </CardHeader>
                    <CardContent>
                        <form action={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Email</label>
                                <Input name="email" type="email" placeholder="Enter admin email" required className="bg-white/5 border-white/10" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Password</label>
                                <Input type="password" name="password" placeholder="••••••••" required className="bg-white/5 border-white/10" />
                            </div>
                            {error && (
                                <p className="text-red-400 text-sm text-center">{error}</p>
                            )}
                            <Button
                                type="submit"
                                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black mt-4"
                                disabled={isLoading}
                            >
                                {isLoading ? "Logging in..." : "Enter Dashboard"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
