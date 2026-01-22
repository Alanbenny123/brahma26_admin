import { NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";
import { createAdminClient, appwriteConfig } from "@/lib/appwrite"; 

export async function POST(req: Request) {
  try {
    const { databases } = await createAdminClient();
    const body = await req.json();
    
    const { 
      event_id, 
      student_ids, // Array of strings from frontend
      team_name, 
      razorpay_payment_id, 
      order_id,
      amount 
    } = body;

    const dbId = appwriteConfig.databaseId;
    const cols = appwriteConfig.collections;

    // 1️⃣ Step 1: Create Transaction Record
    // We pass transition_id explicitly here to satisfy the "Required" constraint
    // 1️⃣ Step 1: Create Transaction Record
const transaction = await databases.createDocument(
  dbId,
  cols.transactions,
  ID.unique(),
  {
    transition_id: razorpay_payment_id, 
    razorpay_payment_id: razorpay_payment_id,
    razorpay_order_id: order_id,
    event_id: event_id,
    stud_id: student_ids[0], 
    // FIX: Convert the number to a string to match Appwrite's attribute type
    amount: String(amount), 
  }
);

    // 2️⃣ Step 2: Create Ticket Document
    const ticket = await databases.createDocument(
      dbId,
      cols.tickets,
      ID.unique(),
      {
        event_id: event_id,
        stud_id: student_ids, // Tickets table uses array for stud_id
        team_name: team_name || "Solo",
        active: true
      }
    );

    // 3️⃣ Step 3: Link Ticket ID back to the Transaction
    // This ensures the ticket_id is no longer NULL in your transaction table
    await databases.updateDocument(
      dbId,
      cols.transactions,
      transaction.$id,
      {
        ticket_id: ticket.$id
      }
    );

    // 4️⃣ Step 4: Update Users' rosters
    // We update the tickets[] array for every student in the list
    const userUpdatePromises = student_ids.map(async (stud_id: string) => {
      try {
        const userDoc = await databases.getDocument(dbId, cols.users, stud_id);
        const currentTickets = Array.isArray(userDoc.tickets) ? userDoc.tickets : [];
        
        return databases.updateDocument(
          dbId,
          cols.users,
          stud_id,
          { 
            tickets: [...currentTickets, ticket.$id] 
          }
        );
      } catch (err) {
        console.error(`Roster update failed for ${stud_id}:`, err);
        return null;
      }
    });

    await Promise.all(userUpdatePromises);

    return NextResponse.json({
      ok: true,
      ticket_id: ticket.$id,
      transaction_id: transaction.$id,
      message: "Manual issuance successful and records cross-linked."
    });

  } catch (error: any) {
    console.error("Manual Issue Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}