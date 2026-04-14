import { NodeSDK } from "@opentelemetry/sdk-node"
import { trace } from "@opentelemetry/api"
import { logs } from "@opentelemetry/api-logs"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import { SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs"
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express"
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http"
import { env } from "./env"

const sdk = new NodeSDK({
  serviceName: env.OTEL_SERVICE_NAME,
  traceExporter: new OTLPTraceExporter({
    url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
  }),
  logRecordProcessors: [
    new SimpleLogRecordProcessor(
      new OTLPLogExporter({ url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/logs` }),
    ),
  ],
  instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
})

sdk.start()

process.on("SIGTERM", () => sdk.shutdown())
process.on("SIGINT", () => sdk.shutdown())

export const logger = logs.getLogger(env.OTEL_SERVICE_NAME)
export const tracer = trace.getTracer(env.OTEL_SERVICE_NAME)
