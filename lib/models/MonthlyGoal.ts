import { Schema, model, models, type Model, type InferSchemaType, type HydratedDocument } from "mongoose";
import {
  baseSchemaFields,
  baseSchemaOptions,
  applySharedIndexes,
  applyPeriodOrderValidation,
} from "./base";

const monthlyGoalSchema = new Schema(
  {
    ...baseSchemaFields,
    progress: { type: Number, default: 0, min: 0, max: 100, required: true },
    parent_id: { type: Schema.Types.ObjectId, ref: "YearlyGoal", default: null },
  },
  baseSchemaOptions,
);

applySharedIndexes(monthlyGoalSchema);
applyPeriodOrderValidation(monthlyGoalSchema);

export type MonthlyGoalSchema = InferSchemaType<typeof monthlyGoalSchema>;
export type MonthlyGoalDocument = HydratedDocument<MonthlyGoalSchema>;

export const MonthlyGoal =
  (models.MonthlyGoal as Model<MonthlyGoalSchema>) ||
  model<MonthlyGoalSchema>("MonthlyGoal", monthlyGoalSchema);
