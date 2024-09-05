import React, { useState, ChangeEvent } from 'react';
import { Dispatch, SetStateAction } from 'react';

interface Vec3 {
    x: number;
    y: number;
    z: number;
}

interface ControlsProps {
    posProps: {
        vector: Vec3;
        setVector: Dispatch<SetStateAction<Vec3>>;
        floatVar1: number;
        setFloatVar1: Dispatch<SetStateAction<number>>;
        floatVar2: number;
        setFloatVar2: Dispatch<SetStateAction<number>>;
        fps: number;
    }
}

const Controls: React.FC<ControlsProps> = (props) => {
    const posProps = props.posProps;
    if (!posProps) { return }
    const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

    const handleSliderChange = (axis: 'x' | 'y' | 'z') => (event: ChangeEvent<HTMLInputElement>) => {
        // create copy, set value, trigger event
        const newVector = { ...posProps.vector }; 
        newVector[axis] = parseFloat(event.target.value);
        posProps.setVector(newVector);
    };

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <div className={`vector-controls ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="header" onClick={toggleCollapse}>
                <h4 id="ControlsHeader">Controls</h4>
                <span className="carot">{isCollapsed ? '▲' : '▼'}</span>
            </div>
            <div className="controls-content">
                {/* <div className="control">
                    <label>X: {posProps.vector.x}</label>
                    <input
                        type="range"
                        id="x-axis"
                        min="0"
                        max="1"
                        step="0.05"
                        value={posProps.vector.x}
                        onChange={handleSliderChange('x')}
                    />
                </div>
                <div className="control">
                    <label>Y: {posProps.vector.y}</label>
                    <input
                        type="range"
                        id="y-axis"
                        min="0"
                        max="1"
                        step="0.05"
                        value={posProps.vector.y}
                        onChange={handleSliderChange('y')}
                    />
                </div>
                <div className="control">
                    <label>Z: {posProps.vector.z}</label>
                    <input
                        type="range"
                        id="z-axis"
                        min="0"
                        max="1"
                        step="0.05"
                        value={posProps.vector.z}
                        onChange={handleSliderChange('z')}
                    />
                </div> */}
                {/* <div className="control">
                    <label>Var 1: {posProps.floatVar1}</label>
                    <input
                        type="range"
                        id="floatVar1"
                        min="0"
                        max="100"
                        step="5"
                        value={posProps.floatVar1}
                        onChange={
                            (event) => { posProps.setFloatVar1(parseFloat(event.target.value)); }
                        }
                    />
                </div> */}
                <div className="control">
                    <label>
                        SMAA Active
                    </label>
                    <input
                        type="checkbox"
                        id="floatVar1"
                        checked={posProps.floatVar1 === 1}
                        onChange={() => {
                        posProps.setFloatVar1(posProps.floatVar1 === 1 ? 0 : 1);
                        }}
                    />
                </div>
                {/* <div className="control">
                    <label>Var 2: {posProps.floatVar2}</label>
                    <input
                        type="range"
                        id="floatVar2"
                        min="0"
                        max="100"
                        step="5"
                        value={posProps.floatVar2}
                        onChange={
                            (event) => { posProps.setFloatVar2(parseFloat(event.target.value)); }
                        }
                    />
                </div> */}
                <h5>Stats</h5>
                <div className="fps">
                    <h6>{posProps.fps.toFixed(0)} FPS</h6>
                </div>
            </div>
        </div>
    );
};

export default Controls;