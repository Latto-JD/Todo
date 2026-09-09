import { Schema, model, models, type Model, type InferSchemaType, type HydratedDocument } from "mongoose";
import {
  baseSchemaFields,
  baseSchemaOptions,
  applySharedIndexes,
  applyPeriodOrderValidation,
} from "./base";

const yearlyGoalSchema = new Schema(
  {
    ...baseSchemaFields,
    progress: { type: Number, default: 0, min: 0, max: 100, required: true },
  },
  baseSchemaOptions,
);

applySharedIndexes(yearlyGoalSchema);
applyPeriodOrderValidation(yearlyGoalSchema);

export type YearlyGoalSchema = InferSchemaType<typeof yearlyGoalSchema>;
export type YearlyGoalDocument = HydratedDocument<YearlyGoalSchema>;

export const YearlyGoal =
  (models.YearlyGoal as Model<YearlyGoalSchema>) ||
  model<YearlyGoalSchema>("YearlyGoal", yearlyGoalSchema);
