// -----------------------------------------------------------------------------
// glass.vert.glsl — the sculptural optical core (procedural mesh from OpticalObject).
// Column shape: a slow, breathing twist keeps the form "partially unresolved".
// Crystal shape: rigid (it rotates through the model matrix only).
// -----------------------------------------------------------------------------

layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in float aEdge; // crystal only: 1 on facet edges

uniform mat4 uProj;
uniform mat4 uView;
uniform mat4 uModel;
uniform vec2 uLensShift;
uniform float uTime;
uniform float uShape; // 0 = twisted column, 1 = crystal (rigid: no twist)

out vec3 vWorldPos;
out vec3 vNormal;
out vec3 vLocal;
out vec4 vClip;
out float vEdge;

void main() {
  // twist that varies along height; rotate normal with the same angle
  float a = sin(uTime * 0.35) * 0.22 * aPos.y * (1.0 - uShape);
  float ca = cos(a), sa = sin(a);
  vec3 p = vec3(aPos.x * ca - aPos.z * sa, aPos.y, aPos.x * sa + aPos.z * ca);
  vec3 n = vec3(aNormal.x * ca - aNormal.z * sa, aNormal.y, aNormal.x * sa + aNormal.z * ca);

  vec4 world = uModel * vec4(p, 1.0);
  vWorldPos = world.xyz;
  vNormal = normalize(mat3(uModel) * n);
  vLocal = p;
  vec4 c = uProj * uView * world;
  c.xy += uLensShift * c.w; // off-axis framing (lens shift)
  vClip = c;
  vEdge = aEdge;
  gl_Position = c;
}
