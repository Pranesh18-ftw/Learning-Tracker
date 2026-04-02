import { useContext } from "react";
import { RoadmapContext } from "../context/RoadmapContext";

export default function useRoadmap() {
  const context = useContext(RoadmapContext);

  if (!context) {
    throw new Error("useRoadmap must be used inside RoadmapProvider");
  }

  return context;
}
