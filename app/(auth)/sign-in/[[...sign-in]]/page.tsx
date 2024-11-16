import MaxWidthWrapper from "@/components/common/MaxWidthWrapper";
import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-200 via-white to-violet-100 py-12 ">
      <MaxWidthWrapper className="flex flex-col justify-center items-center">
        <SignIn path="/sign-in" redirectUrl="/auht-callback" />
      </MaxWidthWrapper>
    </div>
  );
}
