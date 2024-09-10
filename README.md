# SMAA WebGL Implementation
Subpixel Morphological Antialiasing implementation based on the paper and code of iryoku (See References)

Code for SMAA specifically is in `src/engine/SMAA/` and includes a class that can be called by any WebGL render engine

This code uses functions from `wglUtils` in `src/engine/` as well as type definitions in the same folder. These can be copied into the folder to consolidate if you would like to bring it out into another project.

Outside of the SMAA folder is a demo with two fragment shaders (one raymarched 3D octet, and one 2D black and white grid) which shows a side-by-side comparison of the technique on and off.

## Reference and Credit
[SMAA original repo](https://github.com/iryoku/smaa)

[Paper](https://www.iryoku.com/smaa/)

Shaders are ported from (https://github.com/dmnsgn/glsl-smaa)

JS code is heavily referencing (https://github.com/mrdoob/three.js/blob/dev/examples/jsm/postprocessing/SMAAPass.js)

## License
License as copied from iryoku/smaa repo (linked above):

Copyright © 2013 Jorge Jimenez (jorge@iryoku.com)
Copyright © 2013 Jose I. Echevarria (joseignacioechevarria@gmail.com)
Copyright © 2013 Belen Masia (bmasia@unizar.es)
Copyright © 2013 Fernando Navarro (fernandn@microsoft.com)
Copyright © 2013 Diego Gutierrez (diegog@unizar.es)
Permission is hereby granted, free of charge, to any person obtaining a copy this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. As clarification, there is no requirement that the copyright notice and permission be included in binary distributions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
