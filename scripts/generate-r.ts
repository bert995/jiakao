export function generateR(t: number = 1): string {
  const n = Math.abs(
    parseInt(String(Date.now() * Math.random() * 1e4))
  ).toString()
  let o = 0
  for (let i = 0; i < n.length; i++) o += parseInt(n[i])
  o += n.length
  const oStr = o.toString().padStart(3, '0')
  return t.toString() + n + oStr
}
