import { RACE_LENGTH, MIN_SPEED, MAX_SPEED, MAX_TICKS } from "../config";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { logger, tracer } from "../instrumentation";
import type { Racer, RaceResult } from "./types";

function randomSpeed(): number {
  return MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
}

export function simulateRace(racers: Racer[]): RaceResult {
  return tracer.startActiveSpan("race.simulate", (span) => {
    const startMs = Date.now();
    span.setAttribute("race.racer_count", racers.length);

    logger.emit({
      severityNumber: SeverityNumber.DEBUG,
      body: "Simulation started",
      attributes: { racerCount: racers.length },
    });

    const positions: Record<string, number> = {};
    const finished = new Set<string>();
    const finishOrder: string[] = [];
    const ticks: Array<Record<string, number>> = [];

    tracer.startActiveSpan("race.simulate.init", (initSpan) => {
      initSpan.setAttribute("race.racer_count", racers.length);
      for (const r of racers) {
        positions[r.id] = 0;
      }
      initSpan.end();
    });

    let earlyExit = false;
    tracer.startActiveSpan("race.simulate.tick_loop", (loopSpan) => {
      loopSpan.setAttribute("race.max_ticks", MAX_TICKS);
      for (let tick = 0; tick < MAX_TICKS; tick++) {
        const tickSpeeds: Record<string, number> = {};

        for (const r of racers) {
          if (finished.has(r.id)) continue;
          const speed = randomSpeed();
          tickSpeeds[r.id] = speed;
          const pos = (positions[r.id] ?? 0) + speed;
          positions[r.id] = pos;
          if (pos >= RACE_LENGTH) {
            finished.add(r.id);
            finishOrder.push(r.id);
          }
        }

        ticks.push(tickSpeeds);

        if (finished.size === racers.length) {
          earlyExit = true;
          break;
        }
      }
      loopSpan.setAttribute("race.actual_ticks", ticks.length);
      loopSpan.setAttribute("race.early_exit", earlyExit);
      loopSpan.end();
    });

    tracer.startActiveSpan("race.simulate.finalize", (finalizeSpan) => {
      const durationMs = Date.now() - startMs;
      finalizeSpan.setAttribute("race.winner", finishOrder[0] ?? "none");
      finalizeSpan.setAttribute("race.loser", finishOrder.at(-1) ?? "none");
      finalizeSpan.setAttribute("race.coffee_payer", finishOrder.at(-1) ?? "none");
      finalizeSpan.setAttribute("race.duration_ms", durationMs);
      span.setAttribute("race.winner", finishOrder[0] ?? "none");
      span.setAttribute("race.loser", finishOrder.at(-1) ?? "none");
      span.setAttribute("race.coffee_payer", finishOrder.at(-1) ?? "none");
      span.setAttribute("race.total_ticks", ticks.length);
      span.setAttribute("race.duration_ms", durationMs);
      finalizeSpan.end();

      logger.emit({
        severityNumber: SeverityNumber.INFO,
        body: "Simulation ended",
        attributes: {
          racerCount: racers.length,
          durationMs,
          winner: finishOrder[0] ?? null,
          totalTicks: ticks.length,
        },
      });
    });

    span.end();
    return { ticks, finishOrder };
  });
}
