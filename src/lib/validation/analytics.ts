import { z } from "zod";

export const analyticsQuerySchema = z.object({
  range: z.enum(["7d", "30d", "90d", "all"]).optional(),
});
