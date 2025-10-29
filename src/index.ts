import { useEffect, useRef, useState } from "react";

// ------------------- Constants -------------------
export const JOYSTICK_EMIT_ALWAYS = "JoystickEmitAlways";
export const JOYSTICK_EMIT_ON_CHANGE = "JoystickEmitOnChange";

export const STANDARD_BUTTONS = [
    "Face1", "Face2", "Face3", "Face4",
    "LeftBumper", "RightBumper", "LeftTrigger", "RightTrigger",
    "Share", "Options", "LeftStick", "RightStick",
    "DPadUp", "DPadDown", "DPadLeft", "DPadRight",
    "Home"
];

type Side = "left" | "right";

// ------------------- Types -------------------
export interface GamepadInfo {
    connected: boolean;
    id?: string;
    index?: number;
    mapping?: string;
    axes?: number;
    buttons?: number;
    battery?: number | null;
    busy?: boolean;
}

export interface GamepadManagerHook {
    gamepads: GamepadInfo[];
    nextAvailable: () => number | null;
    markBusy: (index: number, busy: boolean) => void;
}

export interface GamepadJoystickProps {
    id: number;
    onLeftJoystickMove?: (dx: number, dy: number) => void;
    onRightJoystickMove?: (dx: number, dy: number) => void;
    onButtonBinary?: (name: string, value: boolean) => void;
    onButtonAnalog?: (name: string, value: number) => void;
    joystickRateHz?: number;
    joystickEmitMode?: typeof JOYSTICK_EMIT_ALWAYS | typeof JOYSTICK_EMIT_ON_CHANGE;
    deadzone?: number;
    triggerThreshold?: number;
    triggerEpsilon?: number;
}

// ------------------- useGamepadManager -------------------
export const useGamepadManager = (): GamepadManagerHook => {
    const [gamepads, setGamepads] = useState<GamepadInfo[]>([]);

    const updateGamepads = () => {
        const gps = navigator.getGamepads ? navigator.getGamepads() : [];
        const gpInfos: GamepadInfo[] = [];

        for (const gp of gps) {
            if (!gp) continue;
            gpInfos.push({
                connected: gp.connected,
                id: gp.id,
                index: gp.index,
                mapping: gp.mapping,
                axes: gp.axes.length,
                buttons: gp.buttons.length,
                battery: (gp as any).batteryLevel ?? null,
                busy: gamepads.find(g => g.index === gp.index)?.busy ?? false,
            });
        }

        setGamepads(gpInfos);
    };

    useEffect(() => {
        updateGamepads();
        const handle = () => updateGamepads();

        window.addEventListener("gamepadconnected", handle);
        window.addEventListener("gamepaddisconnected", handle);

        const poll = setInterval(updateGamepads, 1000);

        return () => {
            window.removeEventListener("gamepadconnected", handle);
            window.removeEventListener("gamepaddisconnected", handle);
            clearInterval(poll);
        };
    }, []);

    const nextAvailable = () => {
        const gp = gamepads.find(g => g.connected && !g.busy);
        return gp ? gp.index ?? null : null;
    };

    const markBusy = (index: number, busy: boolean) => {
        setGamepads(gps =>
            gps.map(gp => (gp.index === index ? { ...gp, busy } : gp))
        );
    };

    return { gamepads, nextAvailable, markBusy };
};

// ------------------- useGamepadJoystick -------------------
export const useGamepadJoystick = ({
                                       id,
                                       onLeftJoystickMove,
                                       onRightJoystickMove,
                                       onButtonBinary,
                                       onButtonAnalog,
                                       joystickRateHz = 30,
                                       joystickEmitMode = JOYSTICK_EMIT_ON_CHANGE,
                                       deadzone = 0.1,
                                       triggerThreshold = 0.1,
                                       triggerEpsilon = 0.01
                                   }: GamepadJoystickProps) => {

    const lastEmitTimeRef = useRef(0);
    const lastNonNeutralRef = useRef<Record<Side, boolean>>({ left: false, right: false });
    const prevAxesRef = useRef<Record<Side, { dx: number; dy: number }>>({
        left: { dx: 0, dy: 0 },
        right: { dx: 0, dy: 0 }
    });
    const prevButtonsRef = useRef<Record<string, number>>({});

    useEffect(() => {
        const intervalMs = 1000 / joystickRateHz;

        const poll = () => {
            const gps = navigator.getGamepads ? navigator.getGamepads() : [];
            const gp = gps[id];
            if (!gp) return requestAnimationFrame(poll);

            const now = performance.now();
            const shouldEmit = (now - lastEmitTimeRef.current) >= intervalMs;

            const axesRaw: Record<Side, { dx: number; dy: number }> = {
                left: {
                    dx: Math.abs(gp.axes[0]) > deadzone ? gp.axes[0] : 0,
                    dy: Math.abs(gp.axes[1]) > deadzone ? -gp.axes[1] : 0
                },
                right: {
                    dx: Math.abs(gp.axes[2]) > deadzone ? gp.axes[2] : 0,
                    dy: Math.abs(gp.axes[3]) > deadzone ? -gp.axes[3] : 0
                }
            };

            (["left", "right"] as Side[]).forEach(side => {
                const next = axesRaw[side];
                const prev = prevAxesRef.current;
                const callback = side === "left" ? onLeftJoystickMove : onRightJoystickMove;

                const isNeutral = next.dx === 0 && next.dy === 0;
                const changed = next.dx !== prev[side].dx || next.dy !== prev[side].dy;

                if (joystickEmitMode === JOYSTICK_EMIT_ALWAYS) {
                    if (callback && shouldEmit) callback(next.dx, next.dy);
                } else {
                    // JOYSTICK_EMIT_ON_CHANGE
                    const wasNonNeutral = lastNonNeutralRef.current[side];
                    if (isNeutral) {
                        if (wasNonNeutral && callback) callback(0, 0);
                    } else {
                        if (callback && (changed || shouldEmit)) callback(next.dx, next.dy);
                    }
                }

                prev[side] = next;
                lastNonNeutralRef.current[side] = !isNeutral;
            });

            // --- BUTTONS ---
            gp.buttons.forEach((btn, i) => {
                const name = STANDARD_BUTTONS[i] ?? `Button${i}`;
                const value = btn.value;
                const prevValue = prevButtonsRef.current[name] ?? 0;

                const isTrigger = i === 6 || i === 7;
                const pressed = value > triggerThreshold;
                const prevPressed = prevValue > triggerThreshold;

                if (!prevPressed && pressed) onButtonBinary?.(name, true);
                if (prevPressed && !pressed) onButtonBinary?.(name, false);
                if (isTrigger && Math.abs(value - prevValue) > triggerEpsilon)
                    onButtonAnalog?.(name, value);

                prevButtonsRef.current[name] = value;
            });

            if (shouldEmit) lastEmitTimeRef.current = now;

            requestAnimationFrame(poll);
        };

        lastEmitTimeRef.current = performance.now();
        requestAnimationFrame(poll);
    }, [
        id, joystickRateHz, joystickEmitMode,
        deadzone, triggerThreshold, triggerEpsilon,
        onLeftJoystickMove, onRightJoystickMove,
        onButtonBinary, onButtonAnalog
    ]);
};
