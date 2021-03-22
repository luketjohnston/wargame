

function vecFromPolar(theta,len) {
  x = Math.cos(theta) * len
  y = Math.sin(theta) * len
  return [x,y]
}

function rotateVec(vec, theta) {
  theta0 = Math.atan2(vec[1], vec[2])
  len = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1])
  return vecFromPolar(theta0 + theta, len)
}
  

export {vecFromPolar, rotateVec}
