import React from "react";
import './App.css';
import {GameJoystickControls} from "./GameJoystickControls";

const App: React.FC = () => {
    return (
        <div className="app-container">
            <GameJoystickControls />
        </div>
    );
};

export default App;
