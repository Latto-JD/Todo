import mongoose, { type Model } from "mongoose";
import { notFound } from "@/lib/api-error";
import { connectToDatabase } from "@/lib/db";

export type ChildProgress = { id: string; title: string; progress: number };

/** Connect, reject a malformed id, and load the document or throw 404. */
export async function loadOr404<T>(model: Model<T>, id: string) {
  if (!mongoose.isValidObjectId(id)) throw notFound();
  await connectToDatabase();
  const doc = await model.findById(id);
  if (!doc) throw notFound();
  return doc;
}

/**
 * The `{ id, title, progress }` list a dashboard card renders for one level's
 * children, in period order. `progress` is read from the denormalised field —
 * the cascade in `lib/services/progressService.ts` keeps it current.
 */
export async function childProgressList<T>(
  childModel: Model<T>,
  parentId: string,
): Promise<ChildProgress[]> {
  const docs = await childModel
    .find({ parent_id: parentId }, { title: 1, progress: 1 })
    .sort({ period_start: 1, createdAt: 1 });

  return docs.map((doc) => {
    const { id, title, progress } = doc.toJSON() as unknown as ChildProgress;
    return { id, title, progress };
  });
}
