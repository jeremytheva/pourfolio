export default function handler(_request, response) {
  response.setHeader('Cache-Control', 'no-store')
  response.status(404).json({ error: 'Application data route not found.' })
}
