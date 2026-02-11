"use client";

import Project from "../components/Project";
import Sketchstrip from "../components/Sketchstrip";

export default function Home() {
  return (
    <Project>
      <Project.Canvas />
      <Project.Panel>
        <Project.Chat />
        <Sketchstrip />
      </Project.Panel>
    </Project>
  );
}
