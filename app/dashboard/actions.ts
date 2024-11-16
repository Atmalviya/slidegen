"use server";
import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { GeneratedPowerPoints } from "@prisma/client";

export const getPresentations = async () => {
  try {
    const user = await currentUser();

    const presentations: GeneratedPowerPoints[] =
      await db.generatedPowerPoints.findMany({
        where: {
          ownerId: user?.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    return presentations;
  } catch (error) {
    console.log(error);
    return [];
  }
};
