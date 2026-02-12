"use client";

import { useEffect, useState } from "react";

import { Shimmer } from "@/components/ai-elements/shimmer";
import { Spinner } from "@/components/ui/spinner";

const LOADING_VERBS = [
  "Purling",
  "Knitting",
  "Weaving in the ends",
  "Untangling the yarn",
  "Winding a skein",
  "Untangling a nest",
  "Raising the sheep",
  "Shearing the sheep",
  "Dyeing the wool",
  "Naming the design",
  "Frogging a failure",
  "Checking gauge",
  "Abandoning your project",
  "Getting distracted by a new project",
  "Abandoning the gauge",
  "Making a swatch",
  "Crafting",
  "Stitching",
  "Increasing the width",
  "Checking the stitch count",
  "Decreasing the width",
  "Ignoring the pattern",
  "Ignoring the gauge",
  "Ignoring my stash",
  "Getting RSI in my wrists",
  "Pairing colors",
  "Contemplating options",
  "Ripping out stitches",
  "Checking needle sizes",
  "Buying more yarn",
  "Trying double-pointed needles",
  "Trying circular needles",
  "Trying intarsia",
  "Figuring out continental stitching",
  "Attempting to cable",
  "Knitting without looking",
  "Forgetting my color change",
  "Getting distracted by yarn colors",
  "Critiquing your design",
  "Questioning your design",
  "Second-guessing my pattern",
];

const pickVerb = () =>
  LOADING_VERBS[Math.floor(Math.random() * LOADING_VERBS.length)] ?? "Loading";

export default function Generating() {
  const [loadingVerb, setLoadingVerb] = useState(pickVerb());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setLoadingVerb(pickVerb());
    }, 2400);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <Spinner className="size-12" />
      <Shimmer className="text-lg text-zinc-600">{loadingVerb}</Shimmer>
    </div>
  );
}
