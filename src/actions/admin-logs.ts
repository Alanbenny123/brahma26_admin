'use server';

import { createAdminClient, appwriteConfig } from "@/lib/appwrite";
import { ID, Query } from "node-appwrite";
import { getCurrentAdmin } from "./auth";
import { headers } from "next/headers";

export interface AdminLog {
    $id: string;
    adminEmail: string;
    action: string;
    actionType: 'view' | 'create' | 'update' | 'delete' | 'login' | 'logout' | 'sync' | 'other';
    resource?: string;
    resourceid?: string;
    ipAddress?: string;
    userAgent?: string;
    timestamp: string;
    $createdAt: string;
}

export interface CreateAdminLogParams {
    action: string;
    actionType: 'view' | 'create' | 'update' | 'delete' | 'login' | 'logout' | 'sync' | 'other';
    resource?: string;
    resourceid?: string;
}

/**
 * Create an admin activity log entry
 */
export async function createAdminLog(params: CreateAdminLogParams) {
    try {
        // Skip logging for view actions
        if (params.actionType === 'view') {
            return { success: true };
        }

        const { databases } = await createAdminClient();
        const currentAdmin = await getCurrentAdmin();

        if (!currentAdmin) {
            console.error("No admin found for logging");
            return { success: false, error: "No admin found" };
        }

        // Get IP address and user agent from headers
        const headersList = await headers();
        const ipAddress = headersList.get('x-forwarded-for') || 
                         headersList.get('x-real-ip') || 
                         'unknown';
        const userAgent = headersList.get('user-agent') || 'unknown';

        const logData = {
            adminEmail: currentAdmin.email,
            action: params.action,
            actionType: params.actionType,
            resource: params.resource || '',
            resourceid: params.resourceid || '',
            ipAddress: ipAddress.split(',')[0].trim(), // Get first IP if multiple
            userAgent: userAgent,
            timestamp: new Date().toISOString(),
        };

        await databases.createDocument(
            appwriteConfig.databaseId,
            'admin_logs', // Collection ID - needs to be created in Appwrite
            ID.unique(),
            logData
        );

        return { success: true };
    } catch (error) {
        // Log error but don't throw - logging should never break the app
        console.error("Error creating admin log:", error);
        console.error("Please ensure admin_logs collection exists with all required attributes");
        console.error("See ADMIN_LOGGING_SETUP.md for setup instructions");
        return { success: false, error: String(error) };
    }
}

/**
 * Fetch admin logs with pagination and filtering
 */
export async function getAdminLogs(options?: {
    limit?: number;
    offset?: number;
    adminEmail?: string;
    actionType?: string;
    startDate?: string;
    endDate?: string;
}) {
    try {
        const { databases } = await createAdminClient();
        
        const queries: any[] = [
            Query.orderDesc('timestamp'),
        ];

        if (options?.limit) {
            queries.push(Query.limit(options.limit));
        } else {
            queries.push(Query.limit(100));
        }

        if (options?.offset) {
            queries.push(Query.offset(options.offset));
        }

        if (options?.adminEmail) {
            queries.push(Query.equal('adminEmail', options.adminEmail));
        }

        if (options?.actionType) {
            queries.push(Query.equal('actionType', options.actionType));
        }

        if (options?.startDate) {
            queries.push(Query.greaterThanEqual('timestamp', options.startDate));
        }

        if (options?.endDate) {
            queries.push(Query.lessThanEqual('timestamp', options.endDate));
        }

        const response = await databases.listDocuments(
            appwriteConfig.databaseId,
            'admin_logs',
            queries
        );

        return {
            success: true,
            logs: response.documents as unknown as AdminLog[],
            total: response.total,
        };
    } catch (error) {
        console.error("Error fetching admin logs:", error);
        return {
            success: false,
            logs: [],
            total: 0,
            error: String(error),
        };
    }
}

/**
 * Get admin activity statistics
 */
export async function getAdminLogStats(adminEmail?: string) {
    try {
        const { databases } = await createAdminClient();
        
        const queries: any[] = [Query.limit(5000)];
        
        if (adminEmail) {
            queries.push(Query.equal('adminEmail', adminEmail));
        }

        const response = await databases.listDocuments(
            appwriteConfig.databaseId,
            'admin_logs',
            queries
        );

        const logs = response.documents as unknown as AdminLog[];

        // Calculate statistics
        const actionTypeCounts = logs.reduce((acc, log) => {
            acc[log.actionType] = (acc[log.actionType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const adminActivityCounts = logs.reduce((acc, log) => {
            acc[log.adminEmail] = (acc[log.adminEmail] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Get unique admins
        const uniqueAdmins = [...new Set(logs.map(log => log.adminEmail))];

        // Get activity in last 24 hours
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const recentActivity = logs.filter(log => log.timestamp >= last24Hours).length;

        return {
            success: true,
            stats: {
                totalLogs: response.total,
                actionTypeCounts,
                adminActivityCounts,
                uniqueAdmins: uniqueAdmins.length,
                recentActivity24h: recentActivity,
                mostActiveAdmin: Object.entries(adminActivityCounts)
                    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A',
            },
        };
    } catch (error) {
        console.error("Error fetching admin log stats:", error);
        return {
            success: false,
            stats: null,
            error: String(error),
        };
    }
}

/**
 * Delete old admin logs (for maintenance)
 */
export async function deleteOldAdminLogs(daysOld: number = 90) {
    try {
        const { databases } = await createAdminClient();
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        const response = await databases.listDocuments(
            appwriteConfig.databaseId,
            'admin_logs',
            [
                Query.lessThan('timestamp', cutoffDate.toISOString()),
                Query.limit(100),
            ]
        );

        let deletedCount = 0;
        for (const doc of response.documents) {
            await databases.deleteDocument(
                appwriteConfig.databaseId,
                'admin_logs',
                doc.$id
            );
            deletedCount++;
        }

        return {
            success: true,
            deletedCount,
            message: `Deleted ${deletedCount} logs older than ${daysOld} days`,
        };
    } catch (error) {
        console.error("Error deleting old admin logs:", error);
        return {
            success: false,
            error: String(error),
        };
    }
}
