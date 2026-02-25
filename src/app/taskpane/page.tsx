"use client";

import dynamic from "next/dynamic";

const TaskpaneContent = dynamic(
  () => import("@/components/sections/taskpane-content").then((mod) => mod.TaskpaneContent),
  { ssr: false, loading: () => (
    <div className="flex h-screen items-center justify-center">
      <p className="text-gray-400">Chargement...</p>
    </div>
  )}
);

const TaskpanePage = () => {
  return <TaskpaneContent />;
};

export default TaskpanePage;
