# React Gamepad Hooks

A modern, lightweight, **React-first library** to handle gamepad input with ease directly in your browser.
Supports joysticks, buttons (digital and analog), triggers, and multiple controllers — perfect for games, simulations, VR/AR, robotics dashboards, and interactive web apps.

---

## Why You’ll Love It

* 🎮 **Plug-and-play** – Detects gamepads instantly, even if already connected before page load.
* ⚡ **Ultra-responsive** – Joystick movements and button presses trigger instantly.
* 🕹️ **Supports all controllers** – Xbox, PlayStation, generic USB controllers — analog and digital buttons fully supported.
* 🔄 **Flexible event system** – Emit updates on change or continuously, including analog trigger values.
* 🧩 **React-native integration** – Built as hooks for modern functional components.
* 💡 **Precision control** – Configurable joystick deadzones, trigger thresholds, and update rates.
* 🏎️ **Perfect for interactive apps** – Games, simulators, robotics dashboards, and experimental interfaces.
* 🏆 **Lightweight & dependency-free** – Pure React + browser Gamepad API, no extra dependencies.

---

## Installation

```bash
npm install react-gamepad-hooks
# or
yarn add react-gamepad-hooks
```

---

## Hooks

### `useGamepadManager()`

Tracks all connected gamepads and their status.

```ts
import { useGamepadManager } from "react-gamepad-hooks";

const { gamepads, nextAvailable, markBusy } = useGamepadManager();
```

#### Returns

* `gamepads: GamepadInfo[]` – List of connected gamepads
* `nextAvailable(): number | null` – Index of next free gamepad
* `markBusy(index: number, busy: boolean)` – Mark a gamepad busy or available

#### `GamepadInfo`

```ts
interface GamepadInfo {
  connected: boolean;
  id?: string;
  index?: number;
  mapping?: string;
  axes?: number;
  buttons?: number;
  battery?: number | null;
  busy?: boolean;
}
```

---

### `useGamepadJoystick(props)`

Tracks a single gamepad’s joysticks and buttons.

```ts
import { useGamepadJoystick, JOYSTICK_EMIT_ON_CHANGE, JOYSTICK_EMIT_ALWAYS } from "react-gamepad-hooks";

useGamepadJoystick({
  id: selectedGamepadIndex,
  joystickRateHz: 60,
  joystickEmitMode: JOYSTICK_EMIT_ON_CHANGE,
  onLeftJoystickMove: (dx, dy) => console.log("Left stick:", dx, dy),
  onRightJoystickMove: (dx, dy) => console.log("Right stick:", dx, dy),
  onButtonBinary: (name, pressed) => console.log("Button", name, pressed),
  onButtonAnalog: (name, value) => console.log("Trigger", name, value)
});
```

#### Props

| Prop                  | Type                      | Description                                                    |                     |
| --------------------- | ------------------------- | -------------------------------------------------------------- | ------------------- |
| `id`                  | `number`                  | Gamepad index to listen to                                     |                     |
| `onLeftJoystickMove`  | `(dx, dy) => void`        | Called when left joystick moves                                |                     |
| `onRightJoystickMove` | `(dx, dy) => void`        | Called when right joystick moves                               |                     |
| `onButtonBinary`      | `(name, pressed) => void` | Called on button press/release                                 |                     |
| `onButtonAnalog`      | `(name, value) => void`   | Called for analog triggers on value change                     |                     |
| `joystickRateHz`      | `number`                  | Axes update frequency (default 30 Hz)                          |                     |
| `joystickEmitMode`    | `'JoystickEmitAlways'     | 'JoystickEmitOnChange'`                                        | Event emission mode |
| `triggerThreshold`    | `number`                  | Minimum analog trigger value to consider pressed (default 0.1) |                     |
| `triggerEpsilon`      | `number`                  | Minimum analog trigger change to emit event (default 0.01)     |                     |

---

### Standard Button Names

```ts
[
  "Face1","Face2","Face3","Face4",
  "LeftBumper","RightBumper","LeftTrigger","RightTrigger",
  "Share","Options","LeftStick","RightStick",
  "DPadUp","DPadDown","DPadLeft","DPadRight",
  "Home"
]
```

---

## Example Usage

```tsx
import React, { useState } from "react";
import { useGamepadManager, useGamepadJoystick, STANDARD_BUTTONS } from "react-gamepad-hooks";

export const GameJoystickControls = () => {
  const { gamepads, nextAvailable, markBusy } = useGamepadManager();
  const [selectedId, setSelectedId] = useState<number | null>(nextAvailable());
  const [buttons, setButtons] = useState<Record<string, boolean | number>>({});

  useGamepadJoystick({
    id: selectedId ?? -1,
    onButtonBinary: (name, pressed) => setButtons(b => ({ ...b, [name]: pressed })),
    onButtonAnalog: (name, value) => setButtons(b => ({ ...b, [name]: value })),
  });

  return (
    <div>
      <h2>Gamepad Buttons</h2>
      {STANDARD_BUTTONS.map(name => (
        <p key={name}>{name}: {buttons[name] ? buttons[name].toString() : "OFF"}</p>
      ))}
    </div>
  );
};
```

---

## Notes

* Gamepads may require a first interaction (button press or stick move) for the browser to report them.
* Analog triggers are fully supported, yet can also act as digital buttons.
* Works on all modern browsers supporting the [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API).

---

## License

MIT
