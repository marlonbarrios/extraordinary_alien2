attribute vec3 aPosition;
attribute vec2 aTexCoord;

varying vec2 vTexCoord;
varying vec3 vPosition;

void main() {
  vTexCoord = aTexCoord;
  vPosition = aPosition;
  gl_Position = vec4(aPosition, 1.0);
} 