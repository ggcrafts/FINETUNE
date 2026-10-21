// up.frag.glsl — dual-Kawase upsample (8-tap tent) accumulated onto the level below.
in vec2 vUv;
uniform sampler2D uTex;   // smaller level (already accumulated)
uniform sampler2D uBase;  // same-size downsample level
uniform vec2 uTexel;      // 1 / smaller level size
out vec4 fragColor;
void main() {
  vec2 o = uTexel;
  vec3 s = vec3(0.0);
  s += texture(uTex, vUv + vec2(-o.x * 2.0, 0.0)).rgb;
  s += texture(uTex, vUv + vec2(-o.x, o.y)).rgb * 2.0;
  s += texture(uTex, vUv + vec2(0.0, o.y * 2.0)).rgb;
  s += texture(uTex, vUv + vec2(o.x, o.y)).rgb * 2.0;
  s += texture(uTex, vUv + vec2(o.x * 2.0, 0.0)).rgb;
  s += texture(uTex, vUv + vec2(o.x, -o.y)).rgb * 2.0;
  s += texture(uTex, vUv + vec2(0.0, -o.y * 2.0)).rgb;
  s += texture(uTex, vUv + vec2(-o.x, -o.y)).rgb * 2.0;
  fragColor = vec4(s / 12.0 + texture(uBase, vUv).rgb, 1.0);
}
