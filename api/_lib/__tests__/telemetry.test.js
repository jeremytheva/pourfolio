import assert from 'node:assert/strict'
import test from 'node:test'
import { createTelemetryEvent, SAFE_TELEMETRY_FIELDS, safeCorrelationId } from '../telemetry.js'

const SENTINELS = {
  authorization: 'Bearer SENTINEL-CREDENTIAL', cookie: 'session=SENTINEL-COOKIE',
  request_body: 'SENTINEL-REQUEST-BODY', response_body: 'SENTINEL-RESPONSE-BODY',
  query: 'search=SENTINEL-QUERY', ip: '203.0.113.42', email: 'sentinel-private@example.test',
  user_id: 'SENTINEL-USER-ID', private_record: 'SENTINEL-CELLAR-RECORD',
  provider_url: 'https://provider-sentinel.example.test/private',
  provider_response: 'SENTINEL-PROVIDER-DETAIL'
}

test('telemetry uses the documented field allowlist only', () => {
  assert.deepEqual(SAFE_TELEMETRY_FIELDS, [
    'environment', 'route_template', 'method', 'status_class', 'duration_ms',
    'event_name', 'deployment', 'commit', 'region', 'correlation_id'
  ])
  const serialised = JSON.stringify(createTelemetryEvent({
    environment: 'production', route_template: '/api/nocodebackend/:resource', method: 'POST',
    status_class: '5xx', duration_ms: 123.6, event_name: 'gateway_failure',
    deployment: 'candidate.example.test', commit: 'abc123', region: 'syd1',
    correlation_id: 'sentinel-correlation-id', ...SENTINELS
  }))
  assert.deepEqual(JSON.parse(serialised), {
    environment: 'production', route_template: '/api/nocodebackend/:resource', method: 'POST',
    status_class: '5xx', duration_ms: 124, event_name: 'gateway_failure',
    deployment: 'candidate.example.test', commit: 'abc123', region: 'syd1',
    correlation_id: 'sentinel-correlation-id'
  })
  for (const sentinel of Object.values(SENTINELS)) assert.equal(serialised.includes(sentinel), false)
})

test('caller correlation IDs remain correlation-only and cannot inject log lines', () => {
  assert.equal(safeCorrelationId('caller-value\r\nSENTINEL-INJECTED-HEADER'), 'caller-valueSENTINEL-INJECTED-HEADER')
  assert.equal(safeCorrelationId(['first', 'second']), 'first')
  assert.equal(safeCorrelationId('', () => 'generated-id'), 'generated-id')
})
