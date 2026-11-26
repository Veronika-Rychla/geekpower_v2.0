import { RobotLoader } from "@/components/mascot/robot-loader";

/** Switching sections keeps the lesson sidebar; only the content area shows the robot. */
export default function LessonLoading() {
  return <RobotLoader size="inline" />;
}
