import { useCallback, useEffect, useRef, useState } from "react";

type FrequencyMap = Record<string, number[]>;

/**
 * Hook to measure frequency (Hz) of multiple independent events.
 * Call `trigger(id)` for each occurrence of an event.
 *
 * @param windowSize - Number of recent events to average over (default = 20)
 * @param decayTime - Time in ms after which frequency goes to 0 if no events (default = 1000ms)
 */
export function useFrequencyMeter(windowSize: number = 20, decayTime: number = 1000) {
    const timestamps = useRef<FrequencyMap>({});
    const [frequencies, setFrequencies] = useState<Record<string, number>>({});

    const trigger = useCallback((id: string) => {
        const now = performance.now();
        if (!timestamps.current[id]) timestamps.current[id] = [];

        const ts = timestamps.current[id];
        ts.push(now);

        // Keep only the last `windowSize` timestamps
        if (ts.length > windowSize) ts.shift();

        if (ts.length > 1) {
            const intervals = ts.slice(1).map((t, i) => t - ts[i]);
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const frequency = 1000 / avgInterval;

            setFrequencies((prev) => ({ ...prev, [id]: frequency }));
        }
    }, [windowSize]);

    // Decay mechanism: set frequency to 0 if no events recently
    useEffect(() => {
        const interval = setInterval(() => {
            const now = performance.now();
            setFrequencies((prev) => {
                const updated: Record<string, number> = { ...prev };
                let changed = false;

                Object.keys(timestamps.current).forEach((id) => {
                    const ts = timestamps.current[id];
                    const last = ts[ts.length - 1];
                    if (!last || now - last > decayTime) {
                        if (updated[id] !== 0) {
                            updated[id] = 0;
                            changed = true;
                        }
                    }
                });

                return changed ? updated : prev;
            });
        }, decayTime / 2); // check twice as often as decayTime

        return () => clearInterval(interval);
    }, [decayTime]);

    return { frequencies, trigger };
}
