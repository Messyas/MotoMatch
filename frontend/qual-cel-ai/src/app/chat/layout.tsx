import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moto Match",
};

export default function ChatLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <main>{children}</main>;
}
