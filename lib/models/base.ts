import { Schema } from "mongoose";

export const STATUS_VALUES = ["todo", "doing", "done"] as const;
export type Status = (typeof STATUS_VALUES)[number];

/** Fields shared by every period entity (DailyTask / WeeklyPlan / MonthlyGoal / YearlyGoal). */
export const baseSchemaFields = {
  title: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
  description: { type: String, default: "", maxlength: 2000 },
  period_start: { type: Date, required: true },
  period_end: { type: Date, required: true },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const toJSONTransform = (_doc: any, ret: any) => {
  ret.id = String(ret._id);
  delete ret._id;
  delete ret.__v;
  if (ret.parent_id != null) ret.parent_id = String(ret.parent_id);
  return ret;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export const baseSchemaOptions = {
  timestamps: true,
  toJSON: { transform: toJSONTransform },
  toObject: { transform: toJSONTransform },
};

/** Indexes every collection carries: period range lookups and parent-chain lookups. */
export function applySharedIndexes(schema: Schema): void {
  schema.index({ period_start: 1, period_end: 1 });
  schema.index({ parent_id: 1 });
}

/**
 * Enforce `period_end >= period_start` at the model layer — on create *and* on
 * partial updates via `doc.set(patch); doc.save()`, where a schema-level
 * `.refine()` that only fires when both bounds are present in the patch cannot
 * see the merged document. The check runs on the persisted merged values, so a
 * PATCH that moves only one bound past the other is rejected with a Mongoose
 * `ValidationError` (path `period_end`); `lib/api-error.ts` `serializeError`
 * maps that to `400 { error: { code: 'VALIDATION', ... } }`.
 *
 * Applied to every entity schema alongside {@link applySharedIndexes}.
 */
export function applyPeriodOrderValidation(schema: Schema): void {
  schema.pre("validate", function periodOrderGuard() {
    const start = this.get("period_start");
    const end = this.get("period_end");
    if (start instanceof Date && end instanceof Date && end.getTime() < start.getTime()) {
      this.invalidate(
        "period_end",
        "period_end must be greater than or equal to period_start",
      );
    }
  });
}
