precision mediump float;
uniform vec2 uResolution;
uniform float uTime;
// uniform sampler2D uImage;

void main()
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = gl_FragCoord.xy / uResolution.xy;

    // Center the UV coordinates and apply rotation
    uv -= 0.5;
    float angle = 3.14159/64. + uTime * 0.01;  // Slow rotation over time
    uv = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * uv;
    uv += 0.5;

    // Adjust grid spacing
    float spacingX = 0.05 + mod(floor(uv.y * 100.0), 10.0) * 0.02;
    float spacingY = 0.05 + mod(floor(uv.x * 100.0), 10.0) * 0.02;

    // Calculate the grid lines
   float lineX = step(0.22, spacingX);
    float lineY = step(0.22, spacingY);

    // Combine the horizontal and vertical lines
    float line = lineX + lineY;

    // Set the color (white lines on black background)
    vec3 color = mix(vec3(0.0), vec3(1.0), line);
    
    // Output to screen
    gl_FragColor = vec4(color, 1.0);
}