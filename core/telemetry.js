function normalizeSpan(span){
  const a=span.attributes||{};
  return {
    id:span.spanId||span.id||'unknown',
    traceId:span.traceId||span.trace_id||null,
    name:span.name||a['gen_ai.operation.name']||'unknown',
    kind:a['gen_ai.operation.name']||a['rpc.method']||span.kind||'unknown',
    agent:a['gen_ai.agent.name']||a['agent.name']||null,
    model:a['gen_ai.request.model']||a['gen_ai.response.model']||null,
    tool:a['gen_ai.tool.name']||a['tool.name']||null,
    inputTrust:a['security.input_trust']||null,
    outputTrust:a['security.output_trust']||null,
    authority:a['security.authority']??null,
    scope:a['security.scope']||null,
    canary:a['security.canary']||null,
    outcome:a['security.outcome']||span.status?.code||null,
    raw:span
  };
}
function ingestTelemetry(payload){
  const spans=[];
  if(Array.isArray(payload)) spans.push(...payload);
  else if(Array.isArray(payload?.spans)) spans.push(...payload.spans);
  else if(Array.isArray(payload?.resourceSpans)){
    for(const rs of payload.resourceSpans) for(const ss of (rs.scopeSpans||rs.instrumentationLibrarySpans||[])) spans.push(...(ss.spans||[]));
  }
  return spans.map(normalizeSpan);
}
function deriveRuntimeEdges(spans){
  const edges=[];
  for(const s of spans){
    if(s.agent&&s.tool) edges.push({from:`agent:${s.agent}`,to:`tool:${s.tool}`,kind:'runtime-tool-call',risk:'HIGH',evidence:{traceId:s.traceId,spanId:s.id}});
    if(s.agent&&s.model) edges.push({from:`agent:${s.agent}`,to:`model:${s.model}`,kind:'runtime-model-call',risk:'MEDIUM',evidence:{traceId:s.traceId,spanId:s.id}});
  }
  return edges;
}
module.exports={normalizeSpan,ingestTelemetry,deriveRuntimeEdges};
