import { useState } from "react";
import WebGLCanvas from "./engine/graphicsCanvas";
import Controls from "./controls";

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export default function Home() {
  const [vector, setVector] = useState<Vec3>({ x: 0.5, y: 0.5, z: 0.5 });
  const [floatVar1, setFloatVar1] = useState<number>(1);
  const [floatVar2, setFloatVar2] = useState<number>(50);
  const [fps, setFPS] = useState<number>(0);

  const posProps = {
    vector,
    setVector,
    floatVar1,
    setFloatVar1,
    floatVar2, 
    setFloatVar2,
    fps
  }

  return (
    <>
      <WebGLCanvas vector={vector} floatVar1={floatVar1} floatVar2={floatVar2} setFPS={setFPS}/>
      <Controls posProps={posProps}/>
    </>
  );
}
