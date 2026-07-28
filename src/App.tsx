import { useEffect } from "react";
import { motion } from "motion/react";
import { routeKey, useRoute } from "./lib/router";
import { useProgress } from "./store/progress";
import { authEnabled, useAuth } from "./lib/auth";
import { startSync, stopSync } from "./lib/sync";
import { getSubject } from "./data/subjects";
import { Shell } from "./components/Shell";
import { Toaster } from "./components/Toaster";
import { SignInPrompt } from "./components/SignInPrompt";
import { pageVariants } from "./lib/ui";
import { Dashboard } from "./views/Dashboard";
import { Path } from "./views/Path";
import { TopicView } from "./views/Topic";
import { Arena } from "./views/Arena";
import { Profile } from "./views/Profile";

export default function App() {
  const { route } = useRoute();
  const subject = getSubject(route.subject);
  const theme = useProgress((s) => s.theme);
  const init = useAuth((s) => s.init);
  const profile = useAuth((s) => s.profile);

  // The persisted theme has to be reapplied to <html> after rehydration.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Completes a Cognito redirect, or restores an existing session.
  useEffect(() => {
    void init();
  }, [init]);

  // Sync only exists while signed in; guests stay on localStorage.
  useEffect(() => {
    if (!authEnabled) return;
    if (profile) void startSync();
    else stopSync();
  }, [profile]);

  // New page, new scroll position — otherwise deep pages open mid-way down.
  const scrollKey = routeKey(route);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [scrollKey]);

  return (
    <Shell route={route} subject={subject}>
      {/* Deliberately no <AnimatePresence mode="wait"> here. Page swaps are
          driven by the hash, which can change twice in a frame (a redirect, a
          fast double-tap). With "wait", the second change can leave the
          outgoing page stuck mid-exit and the incoming one never mounted —
          the whole view wedges. Keying the enter animation alone is
          unwedgeable and reads almost identically. */}
      <motion.div
        key={scrollKey}
        variants={pageVariants}
        initial="initial"
        animate="animate"
      >
        {route.name === "dashboard" && <Dashboard subject={subject} />}
        {route.name === "path" && <Path subject={subject} />}
        {route.name === "topic" && (
          <TopicView subject={subject} id={route.id} mode={route.mode} />
        )}
        {route.name === "arena" && <Arena subject={subject} />}
        {route.name === "profile" && <Profile subject={subject} />}
      </motion.div>
      <Toaster />
      <SignInPrompt />
    </Shell>
  );
}
