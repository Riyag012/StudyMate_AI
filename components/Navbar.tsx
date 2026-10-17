import Link from "next/link";
import Image from "next/image";
import NavItems from "./NavItems";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

const Navbar = () => {
  return (
    <nav className="navbar">
      <Link href="/" aria-label="Study Companion home">
        <div className="flex cursor-pointer items-center gap-2.5">
          <Image
            src="/images/logo.svg"
            alt="Study Companion logo"
            width={46}
            height={44}
            priority
          />
        </div>
      </Link>

      <div className="flex items-center gap-4">
        <NavItems />

        <Link
          href="/study-material"
          className="rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100"
        >
          AI Study Lab
        </Link>

        <SignedOut>
          <div className="flex items-center gap-2">
            <SignInButton>
              <button type="button" className="btn-signin">
                Sign In
              </button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </nav>
  );
};

export default Navbar;