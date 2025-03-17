"use client";

import { motion } from "framer-motion";

interface TestimonialProps {
  quote: string;
  author: string;
  role?: string;
  delay?: number;
}

export const Testimonial = ({
  quote,
  author,
  role,
  delay = 1,
}: TestimonialProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.8 }}
      className="bg-black/5 dark:bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-black/10 dark:border-white/10 max-w-2xl"
    >
      <p className="italic text-neutral-700 dark:text-neutral-300 text-center">
        "{quote}"
      </p>
      <p className="text-right mt-4 font-medium">
        — {author}{role && `, ${role}`}
      </p>
    </motion.div>
  );
}; 