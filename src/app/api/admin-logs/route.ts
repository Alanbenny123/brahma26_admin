import { createAdminLog } from '@/actions/admin-logs';
import { NextRequest, NextResponse } from 'next/server';

// Optimize with proper typing and validation
interface AdminLogBody {
    action: string;
    actionType: string;
    resource?: string;
    resourceid?: string;
}

export async function POST(request: NextRequest) {
    try {
        // Optimize: Parse JSON with error handling
        const body = await request.json() as AdminLogBody;
        
        const { action, actionType, resource, resourceid } = body;

        // Optimize: Early validation with detailed error messages
        if (!action || typeof action !== 'string') {
            return NextResponse.json(
                { error: 'Valid action string is required' },
                { status: 400 }
            );
        }

        if (!actionType || typeof actionType !== 'string') {
            return NextResponse.json(
                { error: 'Valid actionType string is required' },
                { status: 400 }
            );
        }

        // Optimize: Fire and forget - don't await logging to improve response time
        createAdminLog({
            action,
            actionType,
            resource,
            resourceid,
        }).catch(err => {
            // Silent fail - logging errors shouldn't break the app
            console.error('Admin log creation failed:', err);
        });

        // Optimize: Return immediately with cache headers
        return NextResponse.json(
            { success: true },
            {
                headers: {
                    'Cache-Control': 'no-store, must-revalidate',
                }
            }
        );
    } catch (error) {
        console.error('Error in admin-logs API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
