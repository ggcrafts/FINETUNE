// particles.frag.glsl — soft round glints, additive.
in float vTwinkle;
in float vHue;
in float vNear;
uniform float uIntensity;
out vec4 fragColor;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float a = exp(-dot(d, d) * 18.0);
  vec3 col = mix(spectral(vHue), vec3(1.0), 0.55);
  fragColor = vec4(col * a * vTwinkle * (0.9 + vNear * 1.5) * uIntensity, 1.0);
}
