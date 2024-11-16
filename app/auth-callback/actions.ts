"use server";
import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
export const createUserIfNull = async () => {
  try {
    const user = await currentUser();

    if (!user || !user.id || !user?.emailAddresses[0].emailAddress) {
      return { success: false };
    }
    const existingUser = await db.user.findUnique({
      where: {
        id: user.id,
      },
    });
    if (!existingUser) {
      await db.user.create({
        data: {
          id: user.id,
          name: user.firstName + " " + user.lastName,
          email: user?.emailAddresses[0].emailAddress,
        },
      });
    }
    return { success: true };
  } catch (error) {
    console.log(error);
    return { success: false };
  }
};
