import MaxWidthWrapper from "@/components/common/MaxWidthWrapper";
import Link from "next/link";
import { Button, buttonVariants } from "./ui/button";
import { Card } from "./ui/card";
import Image from "next/image";
import { SignInButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { LayoutDashboardIcon } from "lucide-react";
const Hero = async () => {
  const user = await currentUser();
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
      <MaxWidthWrapper>
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left text */}
          <div className="lg:text-left text-center">
            <h1 className="mb-6 text-4xl font-black leading-tight text-gray-900 lg:text-6xl">
              Generate education{" "}
              <span className="text-violet-600">Powerpoints</span> from YouTube
              videos
            </h1>
            <p className="mb-8 text-lg font-black text-gray-600">
              An online tool for teacher that allow you to convert eduction
              YouTube video into engaging presentations
            </p>
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-4">
              {user ? (
                <div className="flex items-center gap-5">
                  <Link href="/dashboard" className={buttonVariants()}>
                    DashBoard
                    <LayoutDashboardIcon className="h-6 w-6" />
                  </Link>
                  <Link
                    href="/generate"
                    className={buttonVariants({
                      variant: "secondary",
                      className: "w-full sm:w-auto",
                    })}
                  >
                    Generate Powerpoint
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <SignInButton>
                    <Button>Get Started</Button>
                  </SignInButton>
                </div>
              )}
            </div>
          </div>
          {/* Right image */}
          <div>
            <Card className="overflow-hidden shadow-2xl">
              <Image
                src="/teacher.svg"
                alt="Hero teacher image"
                className="w-full h-auto object-cover"
                width={640}
                height={640}
              />
            </Card>
          </div>
        </div>
      </MaxWidthWrapper>
    </section>
  );
};
export default Hero;
