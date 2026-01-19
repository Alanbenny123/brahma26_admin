/**
 * Ticket Export Utilities
 * Generates QR codes and exports ticket details as downloadable files
 */

export interface TicketExportData {
    ticketId: string;
    eventName: string;
    teamName?: string;
    eventId: string;
    createdAt?: string;
}

/**
 * Generate a simple QR code URL using external QR service
 */
export function generateQRCodeUrl(data: string, size: number = 200): string {
    // Using QR Server API (free, no dependencies needed)
    const encodedData = encodeURIComponent(data);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}`;
}

/**
 * Download ticket as HTML/PDF
 * Creates a formatted ticket document with QR code
 */
export async function downloadTicketAsHTML(ticketData: TicketExportData): Promise<void> {
    const qrCodeUrl = generateQRCodeUrl(ticketData.ticketId, 300);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket - ${ticketData.ticketId}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        
        .ticket-container {
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            width: 100%;
            overflow: hidden;
        }
        
        .ticket-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .ticket-header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .ticket-header p {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .ticket-body {
            padding: 40px;
        }
        
        .qr-section {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .qr-section img {
            width: 280px;
            height: 280px;
            border: 2px solid #f0f0f0;
            border-radius: 10px;
            background: white;
        }
        
        .qr-label {
            color: #666;
            font-size: 12px;
            margin-top: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .details-section {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .detail-row:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
        }
        
        .detail-label {
            color: #666;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
        }
        
        .detail-value {
            color: #333;
            font-size: 16px;
            font-weight: 600;
            word-break: break-all;
        }
        
        .ticket-footer {
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            color: #999;
            font-size: 12px;
        }
        
        .ticket-footer p {
            margin: 5px 0;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .ticket-container {
                box-shadow: none;
                max-width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="ticket-container">
        <div class="ticket-header">
            <h1>Event Ticket</h1>
            <p>Scan QR code to verify ticket</p>
        </div>
        
        <div class="ticket-body">
            <div class="qr-section">
                <img src="${qrCodeUrl}" alt="Ticket QR Code" />
                <p class="qr-label">Scan for verification</p>
            </div>
            
            <div class="details-section">
                <div class="detail-row">
                    <span class="detail-label">Ticket ID</span>
                    <span class="detail-value">${ticketData.ticketId}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Event</span>
                    <span class="detail-value">${ticketData.eventName}</span>
                </div>
                
                ${ticketData.teamName ? `
                <div class="detail-row">
                    <span class="detail-label">Team / Category</span>
                    <span class="detail-value">${ticketData.teamName}</span>
                </div>
                ` : ''}
                
                <div class="detail-row">
                    <span class="detail-label">Event ID</span>
                    <span class="detail-value">${ticketData.eventId}</span>
                </div>
                
                ${ticketData.createdAt ? `
                <div class="detail-row">
                    <span class="detail-label">Created</span>
                    <span class="detail-value">${ticketData.createdAt}</span>
                </div>
                ` : ''}
            </div>
        </div>
        
        <div class="ticket-footer">
            <p>This is an official event ticket</p>
            <p>Valid for single entry only</p>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
    </div>
</body>
</html>
    `;

    // Create blob and download
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ticket-${ticketData.ticketId}.html`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Download ticket as image (PNG)
 * Captures the ticket and exports as image
 */
export async function downloadTicketAsImage(ticketData: TicketExportData): Promise<void> {
    try {
        // Create canvas and draw ticket
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size (ticket dimensions)
        canvas.width = 800;
        canvas.height = 1000;

        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Header background
        ctx.fillStyle = '#667eea';
        ctx.fillRect(0, 0, canvas.width, 150);

        // Header text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('EVENT TICKET', canvas.width / 2, 80);

        // QR Code section - load and draw QR image
        const qrCodeUrl = generateQRCodeUrl(ticketData.ticketId, 300);
        const qrImg = new Image();
        qrImg.crossOrigin = 'anonymous';
        
        qrImg.onload = async () => {
            ctx.drawImage(qrImg, canvas.width / 2 - 150, 200, 300, 300);

            // Details
            ctx.fillStyle = '#333333';
            ctx.font = '16px Arial';
            ctx.textAlign = 'left';

            const startY = 550;
            const lineHeight = 60;
            let currentY = startY;

            // Draw details
            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = '#666666';
            ctx.fillText('Ticket ID:', 50, currentY);
            ctx.font = '16px Arial';
            ctx.fillStyle = '#333333';
            ctx.fillText(ticketData.ticketId, 50, currentY + 25);

            currentY += lineHeight;
            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = '#666666';
            ctx.fillText('Event:', 50, currentY);
            ctx.font = '16px Arial';
            ctx.fillStyle = '#333333';
            ctx.fillText(ticketData.eventName, 50, currentY + 25);

            if (ticketData.teamName) {
                currentY += lineHeight;
                ctx.font = 'bold 14px Arial';
                ctx.fillStyle = '#666666';
                ctx.fillText('Team:', 50, currentY);
                ctx.font = '16px Arial';
                ctx.fillStyle = '#333333';
                ctx.fillText(ticketData.teamName, 50, currentY + 25);
            }

            // Footer
            ctx.font = '12px Arial';
            ctx.fillStyle = '#999999';
            ctx.textAlign = 'center';
            ctx.fillText('Valid for single entry only', canvas.width / 2, canvas.height - 40);
            ctx.fillText(`Generated: ${new Date().toLocaleDateString()}`, canvas.width / 2, canvas.height - 20);

            // Download
            canvas.toBlob((blob) => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `ticket-${ticketData.ticketId}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            });
        };

        qrImg.onerror = () => {
            console.error('Failed to load QR code image');
        };

        qrImg.src = qrCodeUrl;
    } catch (error) {
        console.error('Error generating ticket image:', error);
    }
}

/**
 * Download ticket details as CSV
 * Useful for bulk exports
 */
export function downloadTicketAsCSV(ticketData: TicketExportData): void {
    const csv = `Ticket ID,Event,Team,Event ID,Created At
${ticketData.ticketId},"${ticketData.eventName}","${ticketData.teamName || 'N/A'}","${ticketData.eventId}","${ticketData.createdAt || new Date().toISOString()}"`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ticket-${ticketData.ticketId}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Download ticket as PDF
 * Uses browser's print-to-PDF functionality with HTML content
 * QR code is embedded directly to ensure it's scannable in PDF
 */
export async function downloadTicketAsPDF(ticketData: TicketExportData): Promise<void> {
    const qrCodeUrl = generateQRCodeUrl(ticketData.ticketId, 300);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket - ${ticketData.ticketId}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: white;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        
        .ticket-container {
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
            max-width: 600px;
            width: 100%;
            overflow: hidden;
            page-break-inside: avoid;
        }
        
        .ticket-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .ticket-header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .ticket-header p {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .ticket-body {
            padding: 40px;
        }
        
        .qr-section {
            text-align: center;
            margin-bottom: 40px;
            page-break-inside: avoid;
            padding: 20px;
            background: white;
            border: 1px dashed #ccc;
            border-radius: 8px;
        }
        
        .qr-section img {
            width: 300px;
            height: 300px;
            border: 3px solid #333;
            border-radius: 8px;
            background: white;
            display: block;
            margin: 0 auto;
            image-rendering: pixelated;
            -ms-interpolation-mode: nearest-neighbor;
        }
        
        .qr-label {
            color: #333;
            font-size: 14px;
            margin-top: 15px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .qr-info {
            color: #666;
            font-size: 11px;
            margin-top: 8px;
            font-style: italic;
        }
        
        .details-section {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e0e0e0;
            page-break-inside: avoid;
        }
        
        .detail-row:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
        }
        
        .detail-label {
            color: #666;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
        }
        
        .detail-value {
            color: #333;
            font-size: 16px;
            font-weight: 600;
            word-break: break-all;
            text-align: right;
        }
        
        .ticket-footer {
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            color: #999;
            font-size: 12px;
            page-break-inside: avoid;
            border-top: 1px solid #ddd;
        }
        
        .ticket-footer p {
            margin: 5px 0;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
                display: block;
                align-items: unset;
                justify-content: unset;
                min-height: auto;
            }
            .ticket-container {
                box-shadow: none;
                max-width: 100%;
                border-radius: 0;
                margin: 0;
            }
            .qr-section {
                border: 1px solid #333;
            }
            .qr-section img {
                width: 300px;
                height: 300px;
                border: 3px solid #000;
            }
        }
        
        @page {
            margin: 10mm;
            size: A4;
        }
    </style>
</head>
<body>
    <div class="ticket-container">
        <div class="ticket-header">
            <h1>EVENT TICKET</h1>
            <p>Scan QR code to verify ticket</p>
        </div>
        
        <div class="ticket-body">
            <div class="qr-section">
                <p class="qr-label">📱 Scan QR Code</p>
                <img id="qrCode" src="${qrCodeUrl}" alt="Ticket QR Code - Scannable" />
                <p class="qr-info">Ticket ID: ${ticketData.ticketId}</p>
            </div>
            
            <div class="details-section">
                <div class="detail-row">
                    <span class="detail-label">🎫 Ticket ID</span>
                    <span class="detail-value">${ticketData.ticketId}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">📅 Event</span>
                    <span class="detail-value">${ticketData.eventName}</span>
                </div>
                
                ${ticketData.teamName ? `
                <div class="detail-row">
                    <span class="detail-label">👥 Team / Category</span>
                    <span class="detail-value">${ticketData.teamName}</span>
                </div>
                ` : ''}
                
                <div class="detail-row">
                    <span class="detail-label">🔗 Event ID</span>
                    <span class="detail-value" style="font-size: 12px;">${ticketData.eventId}</span>
                </div>
                
                ${ticketData.createdAt ? `
                <div class="detail-row">
                    <span class="detail-label">⏰ Created</span>
                    <span class="detail-value">${ticketData.createdAt}</span>
                </div>
                ` : ''}
            </div>
        </div>
        
        <div class="ticket-footer">
            <p>✓ Official Event Ticket</p>
            <p>Valid for single entry only</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <p style="margin-top: 10px; font-size: 10px; color: #aaa;">Keep this ticket safe for verification at the venue</p>
        </div>
    </div>
    
    <script>
        // Wait for QR image to load, then print
        const qrImg = document.getElementById('qrCode');
        
        function printTicket() {
            window.print();
        }
        
        // If image already loaded (cached)
        if (qrImg.complete) {
            setTimeout(printTicket, 500);
        } else {
            // Wait for image to load
            qrImg.onload = function() {
                setTimeout(printTicket, 500);
            };
            
            // Fallback in case image fails to load
            qrImg.onerror = function() {
                console.warn('QR code image failed to load, printing anyway...');
                setTimeout(printTicket, 1000);
            };
        }
    </script>
</body>
</html>
    `;

    // Open in new window for printing to PDF
    const printWindow = window.open('', '', 'width=900,height=1100');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
    }
}
