precision highp float;

uniform sampler2D uWeightsTexture;
uniform sampler2D uRenderTexture;
uniform float uLinePosition;
uniform vec2 uResolution;

varying vec2 vTexCoord;
varying vec4 vOffset;

// Conditional move
void SMAAMovc(bvec2 cond, inout vec2 variable, vec2 value) {
  if (cond.x) variable.x = value.x;
  if (cond.y) variable.y = value.y;
}

void SMAAMovc(bvec4 cond, inout vec4 variable, vec4 value) {
  SMAAMovc(cond.xy, variable.xy, value.xy);
  SMAAMovc(cond.zw, variable.zw, value.zw);
}

void main() {
    vec4 color;

    // Get the blending weights for this fragment (x is right, y is top, z is bottom, w is left)
    vec4 a;
    a.x = texture2D(uWeightsTexture, vOffset.xy).a; 
    a.y = texture2D(uWeightsTexture, vOffset.zw).g; 
    a.wz = texture2D(uWeightsTexture, vTexCoord).xz; 

    // Check for blending weight greater than 0
    if (dot(a, vec4(1.0, 1.0, 1.0, 1.0)) <= 1e-5) {
        color = texture2D(uRenderTexture, vTexCoord);
    } else {
        bool h = max(a.x, a.z) > max(a.y, a.w); // max(horizontal) > max(vertical)

        // Get the blending offsets
        vec4 blendingOffset = vec4(0.0, a.y, 0.0, a.w);
        vec2 blendingWeight = a.yw;
        SMAAMovc(bvec4(h, h, h, h), blendingOffset, vec4(a.x, 0.0, a.z, 0.0));
        SMAAMovc(bvec2(h, h), blendingWeight, a.xz);
        blendingWeight /= dot(blendingWeight, vec2(1.0, 1.0));

        // Get the texture coordinates
        vec2 resVals = vec2(1.0 / uResolution.x, 1.0 / uResolution.y);
        vec4 blendingCoord = vTexCoord.xyxy + blendingOffset * vec4(resVals, -resVals);

        // Mix current fragment and neighbor with bilinear interpolation
        color = blendingWeight.x * texture2D(uRenderTexture, blendingCoord.xy);
        color += blendingWeight.y * texture2D(uRenderTexture, blendingCoord.zw);
    }

    // gl_FragColor = color;

    // Option to show split screen (uncomment above and comment this to remove, or set uLinePosition to 0.0)
    float leftStepVal = uLinePosition - 0.002;
    float rightStepVal = uLinePosition;
    vec4 colorAAOff = (1.0-step(leftStepVal, vTexCoord.x)) * texture2D(uRenderTexture, vTexCoord);
    vec4 colorAAOn = step(rightStepVal, vTexCoord.x) * color;
    vec4 line = (step(rightStepVal, vTexCoord.x) - step(leftStepVal, vTexCoord.x)) * vec4(0.75, 0.0, 0.0, 1.0);
    gl_FragColor = colorAAOff + colorAAOn - line;
}