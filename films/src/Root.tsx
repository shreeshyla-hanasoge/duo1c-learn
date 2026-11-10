import React from "react";
import { Composition } from "remotion";
import { FILM, FlowFilm, filmFrames } from "./kit/FlowFilm";
import { SPECS } from "./specs";

/** One composition per film; the id is the lesson's topic id. `specs/index.ts` is generated. */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      {SPECS.map((spec) => (
        <Composition
          key={spec.id}
          id={spec.id}
          component={FlowFilm}
          defaultProps={{ spec }}
          width={FILM.width}
          height={FILM.height}
          fps={FILM.fps}
          durationInFrames={filmFrames(spec)}
        />
      ))}
    </>
  );
};
