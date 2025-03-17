"use client";

import { motion } from "framer-motion";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
  index?: number;
}

export const FeatureCard = ({
  title,
  description,
  icon,
  index = 0,
}: FeatureCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + (index * 0.1), duration: 0.5 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className="flex flex-col items-center p-6 rounded-xl bg-black/5 dark:bg-white/5 backdrop-blur-sm border border-black/10 dark:border-white/10"
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-center text-neutral-600 dark:text-neutral-300">{description}</p>
    </motion.div>
  );
}; 