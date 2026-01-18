'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface UseActivityLoggerOptions {
    enabled?: boolean;
    action?: string;
    actionType?: 'view' | 'create' | 'update' | 'delete' | 'login' | 'logout' | 'sync' | 'other';
    resource?: string;
    resourceid?: string;
}

/**
 * Client-side hook to automatically log admin activity
 * 
 * Usage:
 * ```tsx
 * // Automatically log page views
 * useActivityLogger();
 * 
 * // Log specific actions
 * useActivityLogger({
 *   action: "Viewed user details",
 *   actionType: "view",
 *   resource: "users",
 *   resourceId: userId
 * });
 * ```
 */
export function useActivityLogger(options?: UseActivityLoggerOptions) {
    const pathname = usePathname();
    const hasLogged = useRef(false);
    const enabled = options?.enabled !== false;

    useEffect(() => {
        // Skip if disabled or already logged
        if (!enabled || hasLogged.current) return;

        const logActivity = async () => {
            try {
                // Extract page name from pathname
                const pageName = pathname.split('/').filter(Boolean).pop() || 'dashboard';
                
                // Determine action and resource from options or pathname
                const action = options?.action || `Viewed ${pageName} page`;
                const actionType = options?.actionType || 'view';
                const resource = options?.resource || pageName;

                // Call API endpoint to log the activity
                await fetch('/api/admin-logs', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action,
                        actionType,
                        resource,
                        resourceid: options?.resourceid,
                    }),
                });

                hasLogged.current = true;
            } catch (error) {
                console.error('Failed to log activity:', error);
            }
        };

        logActivity();
    }, [pathname, enabled, options]);
}

/**
 * Function to manually log an admin action
 * 
 * Usage:
 * ```tsx
 * await logAdminAction({
 *   action: "Deleted user",
 *   actionType: "delete",
 *   resource: "users",
 *   resourceid: userId
 * });
 * ```
 */
export async function logAdminAction(params: {
    action: string;
    actionType: 'view' | 'create' | 'update' | 'delete' | 'login' | 'logout' | 'sync' | 'other';
    resource?: string;
    resourceid?: string;
}) {
    try {
        await fetch('/api/admin-logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        });
    } catch (error) {
        console.error('Failed to log admin action:', error);
    }
}
