"use client";
import Link from "next/link";
import MaxWidthWrapper from "./common/MaxWidthWrapper";
import NavbarMobile from "./NavbarMobile";
import { LayoutDashboardIcon, Presentation } from "lucide-react";
import { Button, buttonVariants } from "./ui/button";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { UserResource } from "@clerk/types";

interface NavbarProps {
  user: UserResource | null;
  isSignedIn: boolean;
}
const NavbarLarge = () => {
  const { isSignedIn, user } = useUser();
  const navbarProps: NavbarProps = {
    user: user || null,
    isSignedIn: isSignedIn || false,
  };
  return (
    <MaxWidthWrapper className="flex items-center justify-between px-8 py-4 w-full text-gray-900 border-b border-gray-100">
      {/* Left Men */}
      <div className="flex items-center space-x-8">
        <Link
          href="/"
          className="text-xl font-semibold flex gap-2 items-center"
        >
          <Presentation />
          <span>SlideGen</span>
        </Link>
        {user && (
          <div className="space-x-8 hidden md:flex text-sm">
            <Link href="/generate">Generate</Link>
          </div>
        )}
      </div>
      <NavbarMobile user={navbarProps.user} />
      {/* Right Men */}
      <div className="hidden md:flex items-center space-x-4">
        {isSignedIn ? (
          <div className="flex items-center gap-5">
            <Link href="/dashboard" className={buttonVariants()}>
              DashBoard
              <LayoutDashboardIcon className="h-6 w-6" />
            </Link>
            <UserButton />
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <SignInButton>
              <Button variant="outline">Login</Button>
            </SignInButton>
            <SignUpButton>
              <Button className={buttonVariants()}>Register</Button>
            </SignUpButton>
          </div>
        )}
      </div>
    </MaxWidthWrapper>
  );
};

export default NavbarLarge;
