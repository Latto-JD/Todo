import { Schema, model, models, type Model, type InferSchemaType, type HydratedDocument } from "mongoose";
import {
  baseSchemaFields,
  baseSchemaOptions,
  applySharedIndexes,
  applyPeriodOrderValidation,
} from "./base";

const weeklyPlanSchema = new Schema(
  {
    ...baseSchemaFields,
    progress: { type: Number, default: 0, min: 0, max: 100, required: true },
    parent_id: { type: Schema.Types.ObjectId, ref: "MonthlyGoal", default: null },
  },
  baseSchemaOptions,
);

applySharedIndexes(weeklyPlanSchema);
applyPeriodOrderValidation(weeklyPlanSchema);

export type WeeklyPlanSchema = InferSchemaType<typeof weeklyPlanSchema>;
export type WeeklyPlanDocument = HydratedDocument<WeeklyPlanSchema>;

export const WeeklyPlan =
  (models.WeeklyPlan as Model<WeeklyPlanSchema>) ||
  model<WeeklyPlanSchema>("WeeklyPlan", weeklyPlanSchema);
