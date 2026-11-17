"use client";

import { motion } from "motion/react";
import { SPRING } from "@/components/motion";

/** Each route fades and rises in on navigation. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}>
      {children}
    </motion.div>
  );
}
