import { createAdminLog } from '@/actions/admin-logs';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        const { action, actionType, resource, resourceid } = body;

        if (!action || !actionType) {
            return NextResponse.json(
                { error: 'Action and actionType are required' },
                { status: 400 }
            );
        }

        const result = await createAdminLog({
            action,
            actionType,
            resource,
            resourceid,
        });

        // Always return success to client - logging failures shouldn't break the app
        // Errors are logged to console for debugging
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in admin-logs API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
