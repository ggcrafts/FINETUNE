// bright.frag.glsl — soft-knee threshold so only the hottest light blooms (spec §19).
in vec2 vUv;
uniform sampler2D uTex;
uniform float uThreshold;
out vec4 fragColor;
void main() {
  vec3 c = texture(uTex, vUv).rgb;
  float br = max(c.r, max(c.g, c.b));
  float knee = uThreshold * 0.5 + 1e-4;
  float soft = clamp(br - uThreshold + knee, 0.0, 2.0 * knee);
  soft = soft * soft / (4.0 * knee);
  float w = max(soft, br - uThreshold) / max(br, 1e-4);
  fragColor = vec4(c * w, 1.0);
}
