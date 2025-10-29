import React, { useState, useEffect } from "react";
import {
    useGamepadManager,
    useGamepadJoystick,
    JOYSTICK_EMIT_ON_CHANGE,
    JOYSTICK_EMIT_ALWAYS,
    STANDARD_BUTTONS
} from "../../src";
import { useFrequencyMeter } from "./utils/useFrequencyMeter";

export const GameJoystickControls: React.FC<{
    joystickEmitMode?: typeof JOYSTICK_EMIT_ALWAYS | typeof JOYSTICK_EMIT_ON_CHANGE;
    joystickRateHz?: number;
}> = ({
          joystickEmitMode = JOYSTICK_EMIT_ON_CHANGE,
          joystickRateHz = 30,
      }) => {
    const { gamepads, nextAvailable, markBusy } = useGamepadManager();
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [left, setLeft] = useState({ dx: 0, dy: 0 });
    const [right, setRight] = useState({ dx: 0, dy: 0 });
    const [buttons, setButtons] = useState<Record<string, boolean | number>>({});
    const { trigger, frequencies } = useFrequencyMeter();

    // Automatically select next available gamepad on mount or when gamepads list changes
    useEffect(() => {
        if (selectedId !== null) return; // already selected
        const nextId = nextAvailable();
        if (nextId !== null) {
            setSelectedId(nextId);
            markBusy(nextId, true);
        }
    }, [gamepads, selectedId, nextAvailable, markBusy]);

    // Hook to listen to the selected gamepad
    useGamepadJoystick({
        id: selectedId ?? -1, // invalid id ignored by hook
        joystickRateHz,
        joystickEmitMode,
        onLeftJoystickMove: (dx, dy) => {
            setLeft({ dx, dy });
            trigger("J1");
        },
        onRightJoystickMove: (dx, dy) => {
            setRight({ dx, dy });
            trigger("J2");
        },
        onButtonBinary: (name, value) => setButtons(b => ({ ...b, [name]: value })),
        onButtonAnalog: (name, value) => setButtons(b => ({ ...b, [name]: value })),
    });

    return (
        <div className="gamepad-example-panel">
            <h2>Gamepad Example</h2>

            {/* Gamepad selection */}
            <div className="gamepad-selection">
                <h3>Select Gamepad:</h3>
                {gamepads.length === 0 && <p>No gamepads detected</p>}
                <ul>
                    {gamepads.map(gp => (
                        <li key={gp.index}>
                            <button
                                onClick={() => {
                                    if (selectedId !== null) markBusy(selectedId, false);
                                    setSelectedId(gp.index ?? null);
                                    markBusy(gp.index ?? -1, true);
                                }}
                                disabled={gp.busy}
                            >
                                {gp.id ?? "Unknown"} {gp.busy ? "(Busy)" : ""}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Axes display */}
            <div className="axes-state">
                <h3>Left Joystick</h3>
                <p>dx: {left.dx.toFixed(2)}, dy: {left.dy.toFixed(2)}</p>
                <h3>Right Joystick</h3>
                <p>dx: {right.dx.toFixed(2)}, dy: {right.dy.toFixed(2)}</p>
                <h4>Frequency</h4>
                <p>J1 Hz: {frequencies.J1?.toFixed(2)}</p>
                <p>J2 Hz: {frequencies.J2?.toFixed(2)}</p>
            </div>

            {/* Buttons display */}
            <div className="buttons-state">
                <h3>Buttons</h3>
                {STANDARD_BUTTONS.map(name => {
                    const val = buttons[name];
                    let display: string;
                    if (typeof val === "number") display = val.toFixed(2); // analog trigger
                    else display = val ? "ON" : "OFF"; // digital button
                    return (
                        <p key={name}>
                            {name}: <span className={val ? "active" : ""}>{display}</span>
                        </p>
                    );
                })}
            </div>
        </div>
    );
};
