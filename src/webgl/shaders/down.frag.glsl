// down.frag.glsl — dual-Kawase downsample (5 taps). Cheap, stable blur.
in vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel; // 1 / source size
out vec4 fragColor;
void main() {
  vec2 o = uTexel;
  vec3 s = texture(uTex, vUv).rgb * 4.0;
  s += texture(uTex, vUv + vec2(-o.x, -o.y)).rgb;
  s += texture(uTex, vUv + vec2( o.x, -o.y)).rgb;
  s += texture(uTex, vUv + vec2(-o.x,  o.y)).rgb;
  s += texture(uTex, vUv + vec2( o.x,  o.y)).rgb;
  fragColor = vec4(s / 8.0, 1.0);
}
