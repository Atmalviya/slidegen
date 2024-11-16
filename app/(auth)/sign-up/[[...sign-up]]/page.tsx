import MaxWidthWrapper from "@/components/common/MaxWidthWrapper";
import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-200 via-white to-violet-100 py-12 ">
      <MaxWidthWrapper className="flex flex-col justify-center items-center">
        <SignUp path="/sign-up" />;
      </MaxWidthWrapper>
    </div>
  );
}
