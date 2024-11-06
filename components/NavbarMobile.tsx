"use client";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Button, buttonVariants } from "./ui/button";
import { MenuIcon } from "lucide-react";
import Link, { LinkProps } from "next/link";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";
import {
  RegisterLink,
  LoginLink,
  LogoutLink,
} from "@kinde-oss/kinde-auth-nextjs/components";
import { KindeUser } from "@kinde-oss/kinde-auth-nextjs/types";

const NavbarMobile = ({ user }: { user: KindeUser<object> | null }) => {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild className="flex md:hidden">
        <Button className={buttonVariants({ variant: "ghost" })}>
          <MenuIcon className="text-gray-900 h-6 w-6" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="">
        <ScrollArea className="my-4 h-[calc(100vh-8rem)] pb-10">
          <div className="flex flex-col space-y-3">
            <MobileLink
              href="/generate"
              className="text-normal font-semibold flex gap-2 items-center"
            >
              Generate
            </MobileLink>
            <MobileLink href="/guidelines" onOpenChange={setOpen}>
              Guidelines
            </MobileLink>
            {user ? (
              <div className=" flex flex-col space-y-3">
                <MobileLink href="/dashboard">Dashboard</MobileLink>
                <LogoutLink className={buttonVariants()}>Logout</LogoutLink>
              </div>
            ) : (
              <div className=" flex flex-col space-y-3">
                <LoginLink className={buttonVariants({ variant: "secondary" })}>
                  Login
                </LoginLink>
                <RegisterLink
                  className={buttonVariants({ variant: "default" })}
                >
                  Register
                </RegisterLink>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default NavbarMobile;

interface MobileLinkProps extends LinkProps {
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

const MobileLink = ({
  href,
  onOpenChange,
  className,
  children,
  ...props
}: MobileLinkProps) => {
  return (
    <Link
      href={href}
      onClick={() => onOpenChange?.(false)}
      className={cn(className)}
      {...props}
    >
      {children}
    </Link>
  );
};
