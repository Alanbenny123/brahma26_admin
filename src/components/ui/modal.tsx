"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    description?: string;
    watermark?: string;
}

export function Modal({ isOpen, onClose, title, children, description, watermark }: ModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-white/10 bg-[#0a0a0a] p-6 shadow-2xl duration-200 sm:rounded-lg ring-1 ring-cyan-500/20 overflow-hidden"
                    >
                        {/* Watermark Rendering */}
                        {watermark && (
                            <div
                                className="absolute inset-0 z-0 pointer-events-none opacity-[0.05] flex items-center justify-center overflow-hidden"
                            >
                                <img
                                    src={watermark}
                                    alt="Watermark"
                                    className="w-full h-full object-contain scale-150 rotate-[-12deg]"
                                />
                            </div>
                        )}

                        <div className="relative z-10 flex flex-col gap-4">
                            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold leading-none tracking-tight text-cyan-400">
                                        {title}
                                    </h2>
                                    <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                {description && (
                                    <p className="text-sm text-muted-foreground">
                                        {description}
                                    </p>
                                )}
                            </div>
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
