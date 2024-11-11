import Link from "next/link";
import MaxWidthWrapper from "./common/MaxWidthWrapper";
import NavbarMobile from "./NavbarMobile";
import { LayoutDashboardIcon, LogOut, Presentation } from "lucide-react";
import { buttonVariants } from "./ui/button";
import {
  RegisterLink,
  LoginLink,
  LogoutLink,
} from "@kinde-oss/kinde-auth-nextjs/components";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { KindeUser } from "@kinde-oss/kinde-auth-nextjs/types";

const NavbarLarge = async () => {
  const { getUser } = getKindeServerSession();
  const user: KindeUser<object> | null = await getUser();
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
        <div className="space-x-8 hidden md:flex text-sm">
          <Link href="/generate">Generate</Link>
          <Link href="/guidelines">Guidelines</Link>
        </div>
      </div>
      <NavbarMobile user={user} />
      {/* Right Men */}
      <div className="hidden md:flex items-center space-x-4">
        {user ? (
          <>
            <Link href="/dashboard" className={buttonVariants()}>
              DashBoard
              <LayoutDashboardIcon className="h-6 w-6" />
            </Link>
            <LogoutLink className={buttonVariants({ variant: "ghost" })}>
              <LogOut className="h-6 w-6" />
            </LogoutLink>
          </>
        ) : (
          <div className="flex items-center gap-0">
            <LoginLink
              // href="/login"
              className={buttonVariants({ variant: "ghost" })}
            >
              Login
            </LoginLink>
            <RegisterLink
              // href="/register"
              className={buttonVariants()}
            >
              Register
            </RegisterLink>
          </div>
        )}
      </div>
    </MaxWidthWrapper>
  );
};

export default NavbarLarge;
