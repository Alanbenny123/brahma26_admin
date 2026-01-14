'use client';

import { useEffect, useState } from 'react';
import { initializeRealtimeSync, stopRealtimeSync } from '@/lib/realtime-sync';

export default function RealtimeSyncProvider() {
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        // Initialize real-time sync when app loads
        try {
            initializeRealtimeSync();
            setIsInitialized(true);
            console.log('🔥 Real-time Appwrite → Firebase sync active');
        } catch (error) {
            console.error('Failed to initialize real-time sync:', error);
        }

        // Cleanup on unmount
        return () => {
            stopRealtimeSync();
            console.log('🛑 Real-time sync stopped');
        };
    }, []);

    // Optional: Show sync status indicator
    if (process.env.NODE_ENV === 'development' && isInitialized) {
        return (
            <div className="fixed bottom-4 right-4 z-50 bg-green-500/10 border border-green-500/50 rounded-lg px-3 py-2 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-green-400 font-medium">Real-time Sync Active</span>
                </div>
            </div>
        );
    }

    return null;
}

