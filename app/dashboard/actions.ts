"use server";
import { db } from "@/lib/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { GeneratedPowerPoints } from "@prisma/client";
import { redirect } from "next/navigation";

export const getPresentations = async () => {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    if (!user) {
      redirect("/login");
    }

    const presentations: GeneratedPowerPoints[] =
      await db.generatedPowerPoints.findMany({
        where: {
          ownerId: user.id,
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
