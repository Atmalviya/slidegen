import GenerateForm from "@/components/GenerateForm";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { KindeUser } from "@kinde-oss/kinde-auth-nextjs/types";
import { redirect } from "next/navigation";
import React from "react";

const Page = async () => {
  const { getUser } = getKindeServerSession();
  const user: KindeUser<object> | null = await getUser();

  if (!user || !user.id) {
    redirect("/");
  }

  return <GenerateForm />;
};

export default Page;
