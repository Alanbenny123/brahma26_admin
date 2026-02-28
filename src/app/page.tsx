'use client';

import { motion } from "framer-motion";
import Link from "next/link";
import { Users, Ticket, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { name: "Users", icon: Users, href: "/dashboard/users", color: "from-blue-500 to-cyan-500" },
  { name: "Tickets", icon: Ticket, href: "/dashboard/tickets", color: "from-purple-500 to-pink-500" },
  { name: "Events", icon: Calendar, href: "/dashboard/events", color: "from-amber-400 to-orange-500" },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: "2s" }} />
      </div>

      <div className="z-10 text-center mb-16 space-y-4">
        <motion.h1
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400 drop-shadow-[0_0_15px_rgba(0,242,234,0.3)]"
        >
          BRAHMA
        </motion.h1>
        <motion.h2
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-3xl md:text-5xl font-light tracking-[0.2em] text-cyan-200/80 uppercase"
        >
          Ashwamedha
        </motion.h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 z-10 w-full max-w-6xl">
        {links.map((link, index) => (
          <motion.div
            key={link.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
          >
            <Link href={link.href} className="group relative block w-full">
              <motion.div
                className={cn(
                  "relative h-64 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl flex flex-col items-center justify-center gap-6 overflow-hidden",
                  "transition-all duration-500 group-hover:border-white/20 group-hover:bg-white/10 group-hover:shadow-[0_0_40px_rgba(0,0,0,0.5)]"
                )}
                whileHover={{ y: -10, scale: 1.02 }}
                animate={{ y: [0, -10, 0] }}
                transition={{
                  y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 1 },
                  scale: { duration: 0.2 }
                }}
              >
                {/* Glow Gradient */}
                <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br", link.color)} />

                {/* Icon */}
                <div className={cn("p-4 rounded-full bg-white/5 ring-1 ring-white/10 shadow-lg group-hover:scale-110 transition-transform duration-500")}>
                  <link.icon className="w-12 h-12 text-white/90" />
                </div>

                {/* Text */}
                <span className="text-2xl font-bold tracking-widest text-white/80 group-hover:text-white transition-colors">
                  {link.name.toUpperCase()}
                </span>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </div>
    </main>
  );
}
