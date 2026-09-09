import { Schema, model, models, type Model, type InferSchemaType, type HydratedDocument } from "mongoose";
import {
  baseSchemaFields,
  baseSchemaOptions,
  applySharedIndexes,
  applyPeriodOrderValidation,
  STATUS_VALUES,
} from "./base";

const dailyTaskSchema = new Schema(
  {
    ...baseSchemaFields,
    due_date: { type: Date, default: null },
    status: { type: String, enum: STATUS_VALUES, default: "todo", required: true },
    completed_at: { type: Date, default: null },
    order: { type: Number, default: 0, required: true },
    parent_id: { type: Schema.Types.ObjectId, ref: "WeeklyPlan", default: null },
  },
  baseSchemaOptions,
);

applySharedIndexes(dailyTaskSchema);
applyPeriodOrderValidation(dailyTaskSchema);
dailyTaskSchema.index({ parent_id: 1, status: 1, order: 1 });

export type DailyTaskSchema = InferSchemaType<typeof dailyTaskSchema>;
export type DailyTaskDocument = HydratedDocument<DailyTaskSchema>;

export const DailyTask =
  (models.DailyTask as Model<DailyTaskSchema>) ||
  model<DailyTaskSchema>("DailyTask", dailyTaskSchema);
