precision mediump float;
uniform vec2 uResolution;
// uniform float uTime;
uniform float uRotation;

#define MAX_STEPS 1000
#define MAX_DIST 200.
#define MIN_DIST 0.0001
#define DOTS_PER_MM 10.
#define NORM_EPS 0.001
#define PI 3.141592
#define PHI 1.618

// PARAMS
float scale = 25.; // Geo scale
float cameraDist = 100.; // Camera distance from center
vec3 objCol = vec3(1.0, 1.0, 1.0); // Base material color
vec3 lightCol = vec3(1.0, 1.0, 1.0); // Light color
vec3 lightPos = vec3(50.); // Light source position
float ambiStrength = 0.6; // Ambient light strength
float diffStength = 0.6; // Diffuse light strength
float specStrength = 0.4; // Specular light strength
float specPow = 4.0; // Specular light power (spread)

// MATH TOOLS

// Vector Component Max
float vmax(vec3 vec) {
	return max(max(vec.x, vec.y), vec.z);
}

// Smooth Max
float smoothMax(float distA, float distB, float factor) {
    return log(exp(factor * distA) + exp(factor * distB)) / factor;
}

// Smooth Min
float smoothMin(float distA, float distB, float factor) {
    return -smoothMax(-distA, -distB, factor);
}

// 3D repition from HG_SDF https://mercury.sexy/hg_sdf/
void pMod3(inout vec3 p, vec3 size) {
	p = mod(p + size*0.5, size) - size*0.5;
}


// GEOMETRY

// Box
float distBox(vec3 point, vec3 center, float halfSideLen, float edgeRadius) {
    float boxHeight = 1.; //abs(sin(uTime*0.25)) * halfSideLen;
    // center.y = center.y - (halfSideLen - boxHeight);
    vec3 transPoint = (point - center);
    //vec3 size = vec3(halfSideLen, abs(sin(uTime*0.25)) * halfSideLen, halfSideLen);
    vec3 size = vec3(halfSideLen, halfSideLen, halfSideLen);
    vec3 cheapDist = abs(transPoint) - (size - edgeRadius);
    return length(max(cheapDist, vec3(0.))) + vmax(min(cheapDist, vec3(0.))) - edgeRadius;
}

// Beam
float distBeam(vec3 point, vec3 normal, float radius) {
    return length(point - dot(point, normal) * normal) - radius;
}
    
// Sphere
float distSphere(vec3 point, vec3 center, float radius) {
    vec3 transPoint = (point - center);
    return length(transPoint) - radius;
}
    
    
// GEOMETRY COMBINATIONS

// Distance Function Combine
float distCombine( vec3 position ) {
    
    // geometry
    float box = distBox(position, vec3(0.), scale, 0.0);
    
    float spacing = scale;
    float beamRadius = scale/10.0;
    
    vec3 positionShiftXZ = position + vec3(spacing/2.0, 0.0, spacing/2.0);
    vec3 positionShiftXY = position + vec3(spacing/2.0, spacing/2.0, 0.0);
    
    pMod3( position, vec3(spacing));
    position.x = abs(position.x);
    position.y = abs(position.y);
    position.z = abs(position.z);
    if (position.y > position.x) { position.xy = position.yx; } 
    if (position.z > position.y) { position.yz = position.zy; } 
    
    float beamPlanar = distBeam(position, normalize(vec3(1.0,1.0,0.0)), beamRadius); 
    
    pMod3( positionShiftXZ, vec3(spacing));
    positionShiftXZ.x = abs(positionShiftXZ.x);
    positionShiftXZ.y = abs(positionShiftXZ.y);
    positionShiftXZ.z = abs(positionShiftXZ.z);
    if (positionShiftXZ.y > positionShiftXZ.x) { positionShiftXZ.xy = positionShiftXZ.yx; } 
    if (positionShiftXZ.z > positionShiftXZ.y) { positionShiftXZ.yz = positionShiftXZ.zy; } 

    float beamAngles = distBeam(positionShiftXZ, normalize(vec3(1.0,1.0,0.0)), beamRadius);
    
    
    pMod3( positionShiftXY, vec3(spacing));
    positionShiftXY = abs(positionShiftXY);
    float beamSection = distBeam(positionShiftXY, normalize(vec3(1.0,0.0,1.0)), beamRadius);
    
    float beams = min(min(beamPlanar, beamAngles), beamSection);
    
    return max(box, beams);
    
}     

    
// RAY TOOLS
    
// Ray March
float marcher(vec3 position, vec3 direction) {
    float dist = 0.;
    for (int iStep=0; iStep<MAX_STEPS; iStep++) {
        float safeMarchDist = distCombine(position);
        if (safeMarchDist > MIN_DIST && dist < MAX_DIST) {
            position += safeMarchDist * direction;
            dist += safeMarchDist;
        } else {
            return dist;
        }
    }
    return 0.;
}
    
// Normal Test
vec3 marchNormal(vec3 position, vec3 direction) {
    float xChange = marcher(position + vec3(NORM_EPS, 0, 0), direction) - marcher(position - vec3(NORM_EPS, 0, 0), direction);
    float yChange = marcher(position + vec3(0, NORM_EPS, 0), direction) - marcher(position - vec3(0, NORM_EPS, 0), direction);
    float zChange = marcher(position + vec3(0, 0, NORM_EPS), direction) - marcher(position - vec3(0, 0, NORM_EPS), direction);
    return normalize( vec3(xChange, yChange, zChange) );
}


// CAMERA TOOLS

// Orbit Controls
vec3 orbitControls(float cameraDist, vec2 sphericalAngles) {
    // spherical angles is x = theta -PI to PI and y = phi -PI/2 to PI/2
    float xPos = cameraDist * cos(sphericalAngles.x) * sin(sphericalAngles.y);
    float zPos = cameraDist * sin(sphericalAngles.x) * sin(sphericalAngles.y);
    float yPos = cameraDist * cos(sphericalAngles.y);
    return vec3(xPos, yPos, zPos);  
}    


// Camera Fragment Position (Orthographic)
vec3 orthoFragPos(vec3 cameraPos, vec3 cameraDir, vec2 cameraSize, vec2 fragCoord) {
    vec3 initialUp = vec3(0.0, 1.0, 0.0);
    if (cameraDir.x == 0.0 && cameraDir.z == 0.0 && cameraDir.y != 0.0) {
        initialUp = vec3(0.0, 0.0, 1.0);
    }
    vec2 offset = ((fragCoord / uResolution.xy) * cameraSize) - (cameraSize * 0.5);
    vec3 rightChange = normalize(cross(cameraDir, initialUp));
    vec3 upChange = normalize(cross(rightChange, cameraDir));
    vec3 worldOffset = offset.x * rightChange + offset.y * upChange;
    return cameraPos + worldOffset;
}

    
// MAIN
void main()
{
    // Background color default
    vec3 col = vec3(0.0);
    
    // Init camera
    vec2 cameraSize = uResolution.xy / DOTS_PER_MM;
    
    // time effects on camera
    // float rotateSpeed = uRotateSpeed * 0.1;
    vec2 rotAngles = vec2(uRotation + PI/4., uRotation + PI/4.);
    vec3 cameraPos = orbitControls(cameraDist, rotAngles);
    vec3 cameraDir = normalize(-cameraPos);
    vec3 fragPos = orthoFragPos(cameraPos, cameraDir, cameraSize, gl_FragCoord.xy);
    
    // Animated Light Source
    vec2 lightSphericalPos = vec2(0.5, 0.2); //vec2(uTime*0.5, uTime*0.2);
    lightPos = orbitControls(cameraDist, lightSphericalPos);
    
    // Ray March
    float objDist = marcher(fragPos.xyz, cameraDir);
    vec3 objPos = fragPos + cameraDir * objDist;
    
    if (objDist < MAX_DIST) {
        // Find Normal
        vec3 normal = marchNormal(fragPos.xyz, cameraDir);
        objCol = 1.0-0.25*abs(normal);
        
        // Ambient Lighting
        vec3 ambiLight = lightCol * ambiStrength;
        
        // Diffuse Lighting
        vec3 diffDir = normalize(lightPos - objPos);
        vec3 diffLight = lightCol * diffStength * max(dot(normal, diffDir), 0.0);
        
        // Specular Lighting
        vec3 reflDir = reflect(-diffDir, normal);
        float specFact = pow(max(dot(-cameraDir, reflDir), 0.0), specPow);
        vec3 specLight = lightCol * specStrength * specFact;
        
        // Phong Combined Lighting
        vec3 combLight = ambiLight + diffLight + specLight;
        col = combLight * objCol;

    } 

    // Output to screen
    gl_FragColor = vec4(col,1.0);
    
}