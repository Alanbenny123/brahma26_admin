'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

/**
 * IssueTicketPage Component
 * Provides an interface for admins to manually generate tickets.
 * Logic: payment_id and transition_id share the same value.
 */
export default function IssueTicketPage() {
  // --- State Management ---
  const [eventId, setEventId] = useState("");
  const [studentIds, setStudentIds] = useState<string[]>([""]); 
  const [teamName, setTeamName] = useState("");
  const [paymentId, setPaymentId] = useState("ADMIN_MANUAL"); // Used for both payment_id and transition_id
  const [orderId, setOrderId] = useState("ADMIN_ORDER");
  const [amount, setAmount] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // --- Input Handlers ---

  const handleStudentIdChange = (index: number, value: string) => {
    const newStudentIds = [...studentIds];
    newStudentIds[index] = value;
    setStudentIds(newStudentIds);
  };

  const addStudentField = () => setStudentIds([...studentIds, ""]);

  const removeStudentField = (index: number) => {
    setStudentIds(studentIds.filter((_, i) => i !== index));
  };

  /**
   * Form Submission Logic
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    const payload = {
      event_id: eventId,
      student_ids: studentIds.filter(id => id.trim() !== ""),
      team_name: teamName || "Solo",
      // Based on your requirement: payment_id and transition_id are the same value
      razorpay_payment_id: paymentId || "ADMIN_MANUAL",
      transition_id: paymentId || "ADMIN_MANUAL", 
      order_id: orderId || "ADMIN_ORDER",
      amount: Number(amount),
    };

    try {
      const response = await fetch("/api/ticket/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Failed to execute issuance.");
      }

      setStatus({ 
        type: 'success', 
        msg: `SUCCESS: Ticket ${result.ticket_id} issued.` 
      });
      
      // Reset form
      setEventId("");
      setStudentIds([""]);
      setTeamName("");
      setAmount("");
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-zinc-950 p-8 rounded-xl border border-white/10 shadow-2xl text-white">
      <header className="mb-8 border-b border-white/5 pb-4">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-cyan-400">
          Manual Issuance <span className="text-white/20">/</span> Admin Panel
        </h1>
        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em] mt-2">
          Syncing Payment ID with Transition ID
        </p>
      </header>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row 1: Event and Team */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-zinc-500">Event_UID</label>
            <Input 
              value={eventId} 
              onChange={e => setEventId(e.target.value)} 
              placeholder="EVT-001" 
              required 
              className="bg-white/5 border-white/10" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-zinc-500">Team_Identity</label>
            <Input 
              value={teamName} 
              onChange={e => setTeamName(e.target.value)} 
              placeholder="Team Name or Solo" 
              className="bg-white/5 border-white/10" 
            />
          </div>
        </div>

        {/* Dynamic Students List */}
        <div className="space-y-3">
          <label className="text-[10px] font-mono uppercase text-zinc-500">Target Student IDs</label>
          {studentIds.map((id, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={id}
                onChange={e => handleStudentIdChange(index, e.target.value)}
                placeholder={`STUDENT_ID_${index + 1}`}
                required
                className="font-mono text-xs bg-white/5 border-white/10"
              />
              {studentIds.length > 1 && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="icon" 
                  onClick={() => removeStudentField(index)} 
                  className="shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            className="text-[10px] font-mono border-white/10 hover:bg-cyan-400/10"
            onClick={addStudentField}
          >
            <Plus className="h-3 w-3 mr-2" /> APPEND_STUDENT
          </Button>
        </div>

        {/* Payment & Audit Section */}
        <div className="p-4 bg-white/5 rounded-lg border border-white/5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-zinc-500">Payment ID (Transition Link)</label>
              <Input 
                value={paymentId} 
                onChange={e => setPaymentId(e.target.value)} 
                className="bg-zinc-900 border-white/10 font-mono text-xs" 
                placeholder="Ex: MANUAL_TRANS_01"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-zinc-500">Order ID</label>
              <Input 
                value={orderId} 
                onChange={e => setOrderId(e.target.value)} 
                className="bg-zinc-900 border-white/10 font-mono text-xs" 
                placeholder="Ex: MANUAL_ORDER_01"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-zinc-500">Transaction Amount (₹)</label>
            <Input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder="0.00" 
              required 
              className="bg-zinc-900 border-white/10" 
            />
          </div>
          <p className="text-[8px] font-mono text-zinc-600 italic">
            * Backend logic will duplicate the Payment ID into the required transition_id field.
          </p>
        </div>

        {/* Action Button */}
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-[0.4em] h-14 transition-all active:scale-[0.98]"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>COMMITTING_TO_DATABASE...</span>
            </div>
          ) : (
            "EXECUTE_ISSUANCE"
          )}
        </Button>

        {/* Status Messaging */}
        {status && (
          <div className={`p-4 rounded-lg border flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] transition-all ${
            status.type === 'success' 
            ? 'bg-green-500/10 border-green-500/20 text-green-400' 
            : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {status.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {status.msg}
          </div>
        )}
      </form>
    </div>
  );
}