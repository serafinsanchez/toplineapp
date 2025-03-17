"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface FooterLinkProps {
  href: string;
  icon: string;
  children: React.ReactNode;
}

export const FooterLink = ({ href, icon, children }: FooterLinkProps) => {
  return (
    <motion.a
      whileHover={{ scale: 1.05 }}
      className="flex items-center gap-2 hover:underline hover:underline-offset-4"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Image
        aria-hidden
        src={icon}
        alt={`${children} icon`}
        width={16}
        height={16}
      />
      {children}
    </motion.a>
  );
}; 