export type Role = "farmer" | "agent" | "admin";
export interface User { id: string; name: string; phone: string; county: string; farm_type: string; role: Role; active: boolean; created_at: string; agent_id?: string; email?: string }
export interface Harvest { id: string; farmer_id: string; crop: string; quantity_kg: number; grade: "A" | "B" | "C" | null; date: string; batch_code: string; location: string }
export interface Expense { id: string; farmer_id: string; category: string; amount: number; description: string; date: string; season_id?: string | null; activity_id?: string | null }
export interface CropSeason { id: string; farmer_id: string; name: string; crop: string; variety: string; plot: string; planting_date: string; batch_code: string | null; status: "active" | "completed"; created_at: string }
export interface CropActivity { id: string; farmer_id: string; season_id: string; title: string; planned_date: string; planned_end_date: string | null; notes: string; status: "planned" | "completed" | "skipped"; actual_date: string | null; actual_notes: string; skip_reason: string; recurrence_days: number | null; approved_for_public: boolean; created_at: string }
export interface LossRecord { id: string; farmer_id: string; crop: string; quantity_kg: number; cause: string; date: string }
export interface InventoryTx { id: string; farmer_id: string; item: string; type: "in" | "out"; quantity: number; unit: string; date: string; note: string }
export interface Trace { id: string; farmer_id: string; batch_code: string; stage: "Harvest" | "Storage" | "Transfer" | "Sale"; location: string; actor: string; date: string }
export interface FarmReport { id: string; farmer_id: string; title: string; period: string; created_at: string; summary: Record<string, number> }
export interface AuditLog { id: string; actor: string; action: string; date: string }
