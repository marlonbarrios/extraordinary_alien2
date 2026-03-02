precision mediump float;

varying vec2 vTexCoord;
varying vec3 vPosition;

uniform sampler2D u_texture;
uniform float u_time;
uniform vec2 u_resolution;

void main() {
  vec2 uv = vTexCoord;
  
  // Add more pronounced distortion
  float distortion = sin(uv.y * 10.0 + u_time) * 0.005;
  uv.x += distortion;
  
  // Sample the texture
  vec4 color = texture2D(u_texture, uv);
  
  // Enhance glow effect
  float glow = sin(u_time * 2.0) * 0.2 + 1.2;
  color.rgb *= glow;
  
  // More pronounced chromatic aberration
  float offset = 0.008;
  color.r = texture2D(u_texture, vec2(uv.x + offset, uv.y)).r;
  color.b = texture2D(u_texture, vec2(uv.x - offset, uv.y)).b;
  
  // Enhance brightness
  color.rgb *= 1.5;
  
  gl_FragColor = color;
} 