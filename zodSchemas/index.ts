import { z } from "zod";

export const titleAndDescriptionSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

export const arrayOfObjectsSchema = z.object({
  arrayOfObjects: z.array(
    z.object({
      title: z.string().min(1),
      content: z.array(z.string()),
    }),
  ),
});
