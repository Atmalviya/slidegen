import React from "react";
import { GeneratedPowerPoints } from "@prisma/client";
import MaxWidthWrapper from "@/components/common/MaxWidthWrapper";
import DashboardPresentation from "@/components/DashboardPresentation";
import { getPresentations } from "./actions";

const Page = async () => {
  const presentation: GeneratedPowerPoints[] = await getPresentations();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-200 via-white to-violet-100 py-12">
      <MaxWidthWrapper className="min-h-screen bg-gradiant-to-br from-indigo-50 via-white to-purple-50 py-12">
        <h1 className="text-4xl font-bold px-4 text-gray-800 mb-12">
          Your Presentations
        </h1>
        <DashboardPresentation presentations={presentation} />
      </MaxWidthWrapper>
    </div>
  );
};

export default Page;
