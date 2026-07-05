"use client";

import React from "react";
import { Loader } from "@/components/ui/loader";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Loader />
    </div>
  );
}
