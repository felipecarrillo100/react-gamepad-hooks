import { useEffect, useRef, useState } from "react";

export const JOYSTICK_EMIT_ALWAYS = "JoystickEmitAlways";
export const JOYSTICK_EMIT_ON_CHANGE = "JoystickEmitOnChange";

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

// ------------------- useGamepadManager -------------------
export const useGamepadManager = (): GamepadManagerHook => {
    const [gamepads, setGamepads] = useState<GamepadInfo[]>([]);

    const updateGamepads = () => {
        const gps = navigator.getGamepads ? navigator.getGamepads() : [];
        const gpInfos: GamepadInfo[] = [];

        for (const gp of gps) {
            if (!gp) continue;
            const battery = (gp as any).batteryLevel ?? null;
            gpInfos.push({
                connected: gp.connected,
                id: gp.id,
                index: gp.index,
                mapping: gp.mapping,
                axes: gp.axes.length,
                buttons: gp.buttons.length,
                battery,
                busy: gamepads.find(g => g.index === gp.index)?.busy ?? false,
            });
        }

        setGamepads(gpInfos);
    };

    useEffect(() => {
        updateGamepads();

        const handleConnect = () => updateGamepads();
        const handleDisconnect = () => updateGamepads();

        window.addEventListener("gamepadconnected", handleConnect);
        window.addEventListener("gamepaddisconnected", handleDisconnect);

        const poll = setInterval(updateGamepads, 1000); // in case gamepads were connected before

        return () => {
            window.removeEventListener("gamepadconnected", handleConnect);
            window.removeEventListener("gamepaddisconnected", handleDisconnect);
            clearInterval(poll);
        };
    }, []);

    const nextAvailable = () => {
        const available = gamepads.find(gp => gp.connected && !gp.busy);
        return available ? available.index ?? null : null;
    };

    const markBusy = (index: number, busy: boolean) => {
        setGamepads(gps =>
            gps.map(gp => (gp.index === index ? { ...gp, busy } : gp))
        );
    };

    return { gamepads, nextAvailable, markBusy };
};

// ------------------- useGamepadJoystick -------------------
export interface GamepadJoystickProps {
    id: number;
    onLeftJoystickMove?: (dx: number, dy: number) => void;
    onRightJoystickMove?: (dx: number, dy: number) => void;
    onButtonBinary?: (name: string, value: boolean) => void;
    onButtonAnalog?: (name: string, value: number) => void;
    joystickRateHz?: number;
    joystickEmitMode?: typeof JOYSTICK_EMIT_ALWAYS | typeof JOYSTICK_EMIT_ON_CHANGE;
    triggerThreshold?: number;
    triggerEpsilon?: number;
}

export const STANDARD_BUTTONS = [
    "Face1","Face2","Face3","Face4",
    "LeftBumper","RightBumper","LeftTrigger","RightTrigger",
    "Share","Options","LeftStick","RightStick",
    "DPadUp","DPadDown","DPadLeft","DPadRight",
    "Home"
];

export const useGamepadJoystick = ({
                                       id,
                                       onLeftJoystickMove,
                                       onRightJoystickMove,
                                       onButtonBinary,
                                       onButtonAnalog,
                                       joystickRateHz = 30,
                                       joystickEmitMode = JOYSTICK_EMIT_ON_CHANGE,
                                       triggerThreshold = 0.1,
                                       triggerEpsilon = 0.01
                                   }: GamepadJoystickProps) => {
    const lastUpdateRef = useRef(0);
    const prevAxesRef = useRef({ left: { dx: 0, dy: 0 }, right: { dx: 0, dy: 0 } });
    const prevButtonsRef = useRef<Record<string, number>>({});

    useEffect(() => {
        const intervalMs = 1000 / joystickRateHz;

        const pollGamepad = () => {
            const gps = navigator.getGamepads ? navigator.getGamepads() : [];
            const gp = gps[id];
            if (!gp) {
                requestAnimationFrame(pollGamepad);
                return;
            }

            const now = performance.now();
            const allowAxesUpdate = now - lastUpdateRef.current >= intervalMs;

            // --- AXES ---
            if (allowAxesUpdate) {
                lastUpdateRef.current = now;

                const leftX = Math.abs(gp.axes[0]) > 0.1 ? gp.axes[0] : 0;
                const leftY = Math.abs(gp.axes[1]) > 0.1 ? -gp.axes[1] : 0;
                const rightX = Math.abs(gp.axes[2]) > 0.1 ? gp.axes[2] : 0;
                const rightY = Math.abs(gp.axes[3]) > 0.1 ? -gp.axes[3] : 0;

                if (onLeftJoystickMove) {
                    const changed = leftX !== prevAxesRef.current.left.dx || leftY !== prevAxesRef.current.left.dy;
                    if (joystickEmitMode === JOYSTICK_EMIT_ALWAYS || changed) {
                        onLeftJoystickMove(leftX, leftY);
                        prevAxesRef.current.left = { dx: leftX, dy: leftY };
                    }
                }

                if (onRightJoystickMove) {
                    const changed = rightX !== prevAxesRef.current.right.dx || rightY !== prevAxesRef.current.right.dy;
                    if (joystickEmitMode === JOYSTICK_EMIT_ALWAYS || changed) {
                        onRightJoystickMove(rightX, rightY);
                        prevAxesRef.current.right = { dx: rightX, dy: rightY };
                    }
                }
            }

            // --- BUTTONS ---
            gp.buttons.forEach((btn, idx) => {
                const name = STANDARD_BUTTONS[idx] ?? `Button${idx}`;
                const isTrigger = idx === 6 || idx === 7;

                const value = btn.value;
                const pressed = value > triggerThreshold;

                const prevValue = prevButtonsRef.current[name] ?? 0;
                const prevPressed = prevValue > triggerThreshold;

                if (!prevPressed && pressed) onButtonBinary?.(name, true);
                if (prevPressed && !pressed) onButtonBinary?.(name, false);
                if (isTrigger && Math.abs(value - prevValue) > triggerEpsilon) {
                    onButtonAnalog?.(name, value);
                }

                prevButtonsRef.current[name] = value;
            });

            requestAnimationFrame(pollGamepad);
        };

        pollGamepad();
    }, [
        id, onLeftJoystickMove, onRightJoystickMove,
        onButtonBinary, onButtonAnalog,
        joystickRateHz, joystickEmitMode, triggerThreshold, triggerEpsilon
    ]);
};
