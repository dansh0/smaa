import React, { useRef, useEffect } from 'react'
import { Dispatch, SetStateAction } from 'react';
import Engine from './engine';

interface Vec3 {
    x: number;
    y: number;
    z: number;
  }

interface WGLCanvasProps {
    vector: Vec3;
    floatVar1: number;
    floatVar2: number;
    setFPS: Dispatch<SetStateAction<number>>;
}

const WebGLCanvas:React.FC<WGLCanvasProps> = (props) => {
    let vector = props.vector;
    let floatVar1 = props.floatVar1;
    let floatVar2 = props.floatVar2;
    let setFPS = props.setFPS;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engine = useRef<Engine | null>(null);

    // run once on mounted
    useEffect(() => {
        engine.current = new Engine(canvasRef.current!, setFPS);
    }, []);

    // update parameters
    useEffect(() => {
        engine.current!.updatePosition(floatVar1, floatVar2, vector);
    }, [floatVar1, floatVar2, vector]);
    
    return <canvas className="webglCanvas" ref={canvasRef} />
}


export default WebGLCanvas